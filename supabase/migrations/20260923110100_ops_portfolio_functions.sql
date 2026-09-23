-- EMBAY AI OPS — Portföy fonksiyonları: aşama koruması, geçiş kuralları, upsert/merge RPC'leri (bölüm 2)
-- ── Aşama değişikliği yalnızca advance_lifecycle() üzerinden ─────────────────
create or replace function public.guard_lifecycle_stage() returns trigger
language plpgsql as $$
begin
  if new.lifecycle_stage is distinct from old.lifecycle_stage and coalesce(current_setting('embay.lifecycle_rpc', true), '') <> 'on' then
    raise exception 'Aşama yalnızca advance_lifecycle() ile değiştirilebilir (geçmiş kaydı zorunlu)' using errcode = '42501';
  end if;
  return new;
end $$;
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'companies_guard_lifecycle') then
    create trigger companies_guard_lifecycle before update of lifecycle_stage on public.companies for each row execute function public.guard_lifecycle_stage();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'portfolio_projects_guard_lifecycle') then
    create trigger portfolio_projects_guard_lifecycle before update of lifecycle_stage on public.portfolio_projects for each row execute function public.guard_lifecycle_stage();
  end if;
end $$;

-- Geçiş kuralı (TS tarafında pure/portfolio.ts canTransition ile aynı)
create or replace function public.lifecycle_transition_error(p_from text, p_to text, p_actor text) returns text
language plpgsql immutable as $$
declare f int := public.lifecycle_rank(p_from); t int := public.lifecycle_rank(p_to);
begin
  if t = 0 then return 'Geçersiz aşama: ' || coalesce(p_to, '∅'); end if;
  if p_from = p_to then return 'Kayıt zaten bu aşamada'; end if;
  if p_actor = 'bot' then
    if p_to not in ('QUALIFIED', 'CONTACTABLE') then return 'Botlar yalnızca QUALIFIED / CONTACTABLE aşamasına taşıyabilir'; end if;
    if t <= f then return 'Botlar geri taşıyamaz'; end if;
    return null;
  end if;
  if p_from in ('WON', 'LOST') and p_actor <> 'admin' then return 'Kapanmış kaydı yalnızca yönetici yeniden açabilir'; end if;
  if p_to = 'LOST' then return null; end if;
  if t < f and p_from not in ('WON', 'LOST') and p_actor <> 'admin' then return 'Geri taşıma yalnızca yönetici'; end if;
  return null;
end $$;

create or replace function public.advance_lifecycle(
  p_entity_type text, p_entity_id uuid, p_to text, p_note text default null, p_next_action text default null,
  p_next_action_at timestamptz default null, p_source text default 'manual', p_bot_id uuid default null, p_run_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_from text; v_actor text; v_kind text; v_err text; v_uid uuid := auth.uid(); v_contact boolean; v_event uuid;
begin
  if v_uid is null then
    if coalesce(auth.role(), current_user) not in ('service_role', 'postgres') then raise exception 'Yetkisiz' using errcode = '42501'; end if;
    v_actor := case when p_bot_id is not null then 'bot' else 'admin' end;
    v_kind := case when p_bot_id is not null then 'bot' else 'system' end;
  else
    if not public.is_team_member() then raise exception 'Ekip üyesi değil' using errcode = '42501'; end if;
    v_actor := coalesce(public.team_role(), 'staff'); v_kind := 'user';
  end if;

  if p_entity_type = 'company' then
    select lifecycle_stage, (coalesce(public_phone, public_email, website) is not null) into v_from, v_contact from public.companies where id = p_entity_id and archived_at is null for update;
  elsif p_entity_type = 'project' then
    select lifecycle_stage, true into v_from, v_contact from public.portfolio_projects where id = p_entity_id and archived_at is null for update;
  else raise exception 'Bilinmeyen varlık: %', p_entity_type;
  end if;
  if v_from is null then raise exception 'Kayıt bulunamadı'; end if;

  v_err := public.lifecycle_transition_error(v_from, p_to, v_actor);
  if v_err is not null then raise exception '%', v_err using errcode = '22023'; end if;
  if p_to = 'CONTACTABLE' and not v_contact then raise exception 'CONTACTABLE için doğrulanmış kurumsal telefon, e-posta veya web sitesi gerekli' using errcode = '22023'; end if;
  if p_to = 'LOST' and coalesce(btrim(p_note), '') = '' then raise exception 'LOST için neden notu zorunlu' using errcode = '22023'; end if;

  perform set_config('embay.lifecycle_rpc', 'on', true);
  if p_entity_type = 'company' then
    update public.companies set lifecycle_stage = p_to, next_action = coalesce(p_next_action, next_action), next_action_at = coalesce(p_next_action_at, next_action_at),
      status = case p_to when 'CONTACTED' then 'iletisim' when 'RESPONSE' then 'iletisim' when 'MEETING' then 'iletisim' when 'OFFER' then 'teklif' when 'WON' then 'musteri' when 'LOST' then 'red' else status end
     where id = p_entity_id;
  else
    update public.portfolio_projects set lifecycle_stage = p_to, next_action = coalesce(p_next_action, next_action), next_action_at = coalesce(p_next_action_at, next_action_at) where id = p_entity_id;
  end if;
  perform set_config('embay.lifecycle_rpc', 'off', true);

  insert into public.lifecycle_events (entity_type, entity_id, from_stage, to_stage, source, note, next_action, next_action_at, actor_id, actor_kind, bot_id, run_id,
    company_id, project_id)
  values (p_entity_type, p_entity_id, v_from, p_to, coalesce(p_source, 'manual'), p_note, p_next_action, p_next_action_at, v_uid, v_kind, p_bot_id, p_run_id,
    case when p_entity_type = 'company' then p_entity_id end, case when p_entity_type = 'project' then p_entity_id end)
  returning id into v_event;
  return jsonb_build_object('event_id', v_event, 'from', v_from, 'to', p_to);
end $$;

-- ── Firma: oluştur veya birleştir (asla ikinci kayıt açma) ──────────────────
-- p: {firm_name, website, public_phone, public_email, sector, il, ilce, address, contact_person, contact_title, need, project,
--     social_links, ai_notes, priority_score, priority_reasons, source_url, source_title, source, verified_fields[]}
create or replace function public.portfolio_upsert_company(p jsonb, p_bot_id uuid default null, p_run_id uuid default null, p_finding_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p->>'firm_name', ''));
  v_src text := btrim(coalesce(p->>'source_url', ''));
  v_domain text := public.normalize_domain(nullif(p->>'website', ''));
  v_phone text := public.normalize_phone(nullif(p->>'public_phone', ''));
  v_norm text := public.normalize_firm_name(p->>'firm_name');
  v_row public.companies; v_match text; v_filled text[] := '{}'; v_conf jsonb := '[]'::jsonb; v_id uuid; v_action text;
  v_verified text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p->'verified_fields', '[]'::jsonb))), '{}');
  f text; v_new text; v_old text;
  v_fields text[] := array['website', 'public_phone', 'public_email', 'sector', 'il', 'ilce', 'address', 'contact_person', 'contact_title', 'need', 'project'];
begin
  if auth.uid() is not null and not public.is_team_member() then raise exception 'Ekip üyesi değil' using errcode = '42501'; end if;
  if auth.uid() is null and coalesce(auth.role(), current_user) not in ('service_role', 'postgres') then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  if length(v_name) < 2 then raise exception 'Firma adı gerekli'; end if;
  if v_src !~* '^https?://' then raise exception 'Kaynak URL zorunlu (gerçek kaynak olmadan kayıt açılmaz)'; end if;

  -- Eşleştirme sırası: domain → telefon → normalize ad (tek eşleşme ise)
  if v_domain is not null then select * into v_row from public.companies where domain_norm = v_domain and merged_into is null limit 1; if found then v_match := 'domain'; end if; end if;
  if v_match is null and v_phone is not null then select * into v_row from public.companies where phone_norm = v_phone and merged_into is null limit 1; if found then v_match := 'phone'; end if; end if;
  if v_match is null and v_norm is not null and (select count(*) from public.companies where name_norm = v_norm and merged_into is null) = 1 then
    select * into v_row from public.companies where name_norm = v_norm and merged_into is null; v_match := 'name';
  end if;

  if v_match is null then
    insert into public.companies (firm_name, website, public_phone, public_email, sector, il, ilce, address, contact_person, contact_title, need, project,
      social_links, ai_notes, priority_score, priority_reasons, source_url, source, bot_id, status, lifecycle_stage, first_seen_at, last_checked_at, finding_id)
    values (left(v_name, 160), nullif(p->>'website', ''), nullif(p->>'public_phone', ''), nullif(p->>'public_email', ''), nullif(p->>'sector', ''),
      nullif(p->>'il', ''), nullif(p->>'ilce', ''), nullif(p->>'address', ''), nullif(p->>'contact_person', ''), nullif(p->>'contact_title', ''),
      nullif(p->>'need', ''), nullif(p->>'project', ''), coalesce(p->'social_links', '{}'::jsonb), nullif(p->>'ai_notes', ''),
      nullif(p->>'priority_score', '')::int, coalesce(p->'priority_reasons', '[]'::jsonb), v_src, coalesce(nullif(p->>'source', ''), 'bot_research'),
      p_bot_id, 'aday', 'DISCOVERED', now(), now(), p_finding_id)
    returning id into v_id;
    v_action := 'created';
    insert into public.lifecycle_events (entity_type, entity_id, from_stage, to_stage, source, note, actor_id, actor_kind, bot_id, run_id, company_id)
    values ('company', v_id, null, 'DISCOVERED', coalesce(nullif(p->>'source', ''), 'bot_research'), 'Kaynak: ' || v_src, auth.uid(),
      case when p_bot_id is not null then 'bot' when auth.uid() is null then 'system' else 'user' end, p_bot_id, p_run_id, v_id);
  else
    v_id := v_row.id; v_action := 'merged';
    -- Boş alanları doldur; dolu ve farklı değerleri üzerine yazma, çakışma olarak kaydet
    foreach f in array v_fields loop
      v_new := nullif(btrim(coalesce(p->>f, '')), '');
      if v_new is null then continue; end if;
      execute format('select ($1).%I::text', f) using v_row into v_old;
      if v_old is null then
        execute format('update public.companies set %I = $1 where id = $2', f) using v_new, v_id;
        v_filled := v_filled || f;
      elsif lower(v_old) <> lower(v_new) and not (f = 'public_phone' and public.normalize_phone(v_old) = public.normalize_phone(v_new))
        and not (f = 'website' and public.normalize_domain(v_old) = public.normalize_domain(v_new)) then
        v_conf := v_conf || jsonb_build_object('field', f, 'current', v_old, 'incoming', v_new, 'source_url', v_src, 'at', now());
      end if;
    end loop;
    update public.companies set
      last_checked_at = now(), source_count = source_count + 1,
      social_links = social_links || coalesce(p->'social_links', '{}'::jsonb),
      ai_notes = case when nullif(p->>'ai_notes', '') is null then ai_notes
                      when ai_notes is null then p->>'ai_notes'
                      when position(p->>'ai_notes' in ai_notes) > 0 then ai_notes
                      else ai_notes || E'\n' || to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD') || ': ' || (p->>'ai_notes') end,
      priority_score = coalesce(nullif(p->>'priority_score', '')::int, priority_score),
      priority_reasons = case when jsonb_array_length(coalesce(p->'priority_reasons', '[]'::jsonb)) > 0 then p->'priority_reasons' else priority_reasons end,
      conflicts = conflicts || v_conf
     where id = v_id;
  end if;

  -- Alan kanıtları
  insert into public.portfolio_evidence (entity_type, entity_id, field, value, source_url, source_title, verified, verified_at, finding_id, bot_id, run_id)
  select 'company', v_id, k, p->>k, v_src, nullif(p->>'source_title', ''), k = any(v_verified), case when k = any(v_verified) then now() end, p_finding_id, p_bot_id, p_run_id
    from unnest(array['firm_name'] || v_fields) k where nullif(btrim(coalesce(p->>k, '')), '') is not null;

  return jsonb_build_object('company_id', v_id, 'action', v_action, 'matched_on', v_match, 'filled', to_jsonb(v_filled), 'conflicts', v_conf);
end $$;

-- ── Proje: oluştur veya birleştir ───────────────────────────────────────────
create or replace function public.portfolio_upsert_project(p jsonb, p_bot_id uuid default null, p_run_id uuid default null, p_finding_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p->>'name', ''));
  v_src text := btrim(coalesce(p->>'source_url', ''));
  v_norm text := public.normalize_firm_name(p->>'name');
  v_ilce text := nullif(btrim(coalesce(p->>'ilce', '')), '');
  v_row public.portfolio_projects; v_id uuid; v_action text; v_filled text[] := '{}'; v_conf jsonb := '[]'::jsonb;
  v_verified text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p->'verified_fields', '[]'::jsonb))), '{}');
  f text; v_new text; v_old text;
  v_fields text[] := array['il', 'ilce', 'address', 'estimated_need', 'source_title'];
begin
  if auth.uid() is not null and not public.is_team_member() then raise exception 'Ekip üyesi değil' using errcode = '42501'; end if;
  if auth.uid() is null and coalesce(auth.role(), current_user) not in ('service_role', 'postgres') then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  if length(v_name) < 2 then raise exception 'Proje adı gerekli'; end if;
  if v_src !~* '^https?://' then raise exception 'Kaynak URL zorunlu'; end if;

  select * into v_row from public.portfolio_projects
   where merged_into is null and ((name_norm = v_norm and (v_ilce is null or ilce is null or lower(ilce) = lower(v_ilce))) or source_url = v_src and name_norm = v_norm)
   order by created_at limit 1;

  if not found then
    insert into public.portfolio_projects (name, project_type, il, ilce, address, stage, estimated_need, machine_need, source_url, source_title, ai_notes,
      priority_score, priority_reasons, bot_id, finding_id, last_checked_at)
    values (left(v_name, 200),
      case when p->>'project_type' in ('kentsel_donusum', 'konut', 'ticari', 'altyapi', 'fabrika', 'depo_lojistik', 'kamu', 'diger') then p->>'project_type' else 'diger' end,
      nullif(p->>'il', ''), v_ilce, nullif(p->>'address', ''),
      case when p->>'stage' in ('planlama', 'ihale', 'ruhsat', 'yikim', 'kazi', 'kaba_insaat', 'ince_insaat', 'tamamlandi', 'bilinmiyor') then p->>'stage' else 'bilinmiyor' end,
      nullif(p->>'estimated_need', ''), coalesce(p->'machine_need', '{}'::jsonb), v_src, nullif(p->>'source_title', ''), nullif(p->>'ai_notes', ''),
      nullif(p->>'priority_score', '')::int, coalesce(p->'priority_reasons', '[]'::jsonb), p_bot_id, p_finding_id, now())
    returning id into v_id;
    v_action := 'created';
    insert into public.lifecycle_events (entity_type, entity_id, from_stage, to_stage, source, note, actor_id, actor_kind, bot_id, run_id, project_id)
    values ('project', v_id, null, 'DISCOVERED', coalesce(nullif(p->>'source', ''), 'bot_research'), 'Kaynak: ' || v_src, auth.uid(),
      case when p_bot_id is not null then 'bot' when auth.uid() is null then 'system' else 'user' end, p_bot_id, p_run_id, v_id);
  else
    v_id := v_row.id; v_action := 'merged';
    foreach f in array v_fields loop
      v_new := nullif(btrim(coalesce(p->>f, '')), '');
      if v_new is null then continue; end if;
      execute format('select ($1).%I::text', f) using v_row into v_old;
      if v_old is null then
        execute format('update public.portfolio_projects set %I = $1 where id = $2', f) using v_new, v_id;
        v_filled := v_filled || f;
      elsif lower(v_old) <> lower(v_new) then
        v_conf := v_conf || jsonb_build_object('field', f, 'current', v_old, 'incoming', v_new, 'source_url', v_src, 'at', now());
      end if;
    end loop;
    update public.portfolio_projects set
      last_checked_at = now(), source_count = source_count + 1, conflicts = conflicts || v_conf,
      -- Aşama ilerlediyse güncelle (ör. ruhsat → kazı), geri gitmez
      stage = case when p->>'stage' in ('planlama', 'ihale', 'ruhsat', 'yikim', 'kazi', 'kaba_insaat', 'ince_insaat', 'tamamlandi')
                    and array_position(array['bilinmiyor', 'planlama', 'ihale', 'ruhsat', 'yikim', 'kazi', 'kaba_insaat', 'ince_insaat', 'tamamlandi'], p->>'stage')
                      > array_position(array['bilinmiyor', 'planlama', 'ihale', 'ruhsat', 'yikim', 'kazi', 'kaba_insaat', 'ince_insaat', 'tamamlandi'], stage)
                   then p->>'stage' else stage end,
      machine_need = machine_need || coalesce(p->'machine_need', '{}'::jsonb),
      ai_notes = case when nullif(p->>'ai_notes', '') is null then ai_notes when ai_notes is null then p->>'ai_notes'
                      when position(p->>'ai_notes' in ai_notes) > 0 then ai_notes
                      else ai_notes || E'\n' || to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD') || ': ' || (p->>'ai_notes') end,
      priority_score = coalesce(nullif(p->>'priority_score', '')::int, priority_score),
      priority_reasons = case when jsonb_array_length(coalesce(p->'priority_reasons', '[]'::jsonb)) > 0 then p->'priority_reasons' else priority_reasons end
     where id = v_id;
  end if;

  insert into public.portfolio_evidence (entity_type, entity_id, field, value, source_url, source_title, verified, verified_at, finding_id, bot_id, run_id)
  select 'project', v_id, k, p->>k, v_src, nullif(p->>'source_title', ''), k = any(v_verified), case when k = any(v_verified) then now() end, p_finding_id, p_bot_id, p_run_id
    from unnest(array['name', 'project_type', 'stage', 'il', 'ilce', 'address', 'estimated_need']) k where nullif(btrim(coalesce(p->>k, '')), '') is not null;

  return jsonb_build_object('project_id', v_id, 'action', v_action, 'filled', to_jsonb(v_filled), 'conflicts', v_conf);
end $$;

create or replace function public.portfolio_link(p_project_id uuid, p_company_id uuid, p_role text default 'yuklenici', p_source_url text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_team_member() then raise exception 'Ekip üyesi değil' using errcode = '42501'; end if;
  if auth.uid() is null and coalesce(auth.role(), current_user) not in ('service_role', 'postgres') then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  insert into public.portfolio_project_companies (project_id, company_id, role, source_url)
  values (p_project_id, p_company_id, case when p_role in ('isveren', 'yuklenici', 'alt_yuklenici', 'mimar', 'lojistik', 'tedarikci', 'diger') then p_role else 'diger' end, p_source_url)
  on conflict do nothing;
end $$;

-- Manuel birleştirme (yalnızca yönetici): kaynak kayıt arşivlenir, silinmez
create or replace function public.merge_companies(p_keep uuid, p_merge uuid, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_src public.companies;
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici birleştirebilir' using errcode = '42501'; end if;
  if p_keep = p_merge then raise exception 'Aynı kayıt'; end if;
  select * into v_src from public.companies where id = p_merge and merged_into is null for update;
  if not found then raise exception 'Birleştirilecek kayıt bulunamadı'; end if;
  -- Önce birleştirilen kayıt arşivlenir (tekil domain indeksi çakışmasın diye website kanıt tablosunda kalır, kayıttan boşaltılır)
  update public.companies set merged_into = p_keep, archived_at = now(), website = null,
    note = concat_ws(E'\n', note, 'Birleştirildi → ' || p_keep || coalesce(' · ' || p_note, '')) where id = p_merge;
  update public.companies k set
    website = coalesce(k.website, v_src.website), public_phone = coalesce(k.public_phone, v_src.public_phone), public_email = coalesce(k.public_email, v_src.public_email),
    sector = coalesce(k.sector, v_src.sector), il = coalesce(k.il, v_src.il), ilce = coalesce(k.ilce, v_src.ilce), address = coalesce(k.address, v_src.address),
    contact_person = coalesce(k.contact_person, v_src.contact_person), need = coalesce(k.need, v_src.need), project = coalesce(k.project, v_src.project),
    social_links = v_src.social_links || k.social_links, source_count = k.source_count + v_src.source_count,
    first_seen_at = least(k.first_seen_at, v_src.first_seen_at), note = concat_ws(E'\n', k.note, v_src.note)
   where k.id = p_keep;
  update public.portfolio_evidence set entity_id = p_keep where entity_type = 'company' and entity_id = p_merge;
  update public.portfolio_project_companies set company_id = p_keep where company_id = p_merge
    and not exists (select 1 from public.portfolio_project_companies x where x.project_id = portfolio_project_companies.project_id and x.company_id = p_keep and x.role = portfolio_project_companies.role);
  perform public.write_audit('merge', 'companies', p_keep::text, 'Firma birleştirildi', jsonb_build_object('merged', p_merge, 'note', p_note));
  return jsonb_build_object('kept', p_keep, 'merged', p_merge);
end $$;

revoke all on function public.advance_lifecycle(text, uuid, text, text, text, timestamptz, text, uuid, uuid) from public, anon;
revoke all on function public.portfolio_upsert_company(jsonb, uuid, uuid, uuid) from public, anon;
revoke all on function public.portfolio_upsert_project(jsonb, uuid, uuid, uuid) from public, anon;
revoke all on function public.portfolio_link(uuid, uuid, text, text) from public, anon;
revoke all on function public.merge_companies(uuid, uuid, text) from public, anon;
grant execute on function public.advance_lifecycle(text, uuid, text, text, text, timestamptz, text, uuid, uuid) to authenticated, service_role;
grant execute on function public.portfolio_upsert_company(jsonb, uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.portfolio_upsert_project(jsonb, uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.portfolio_link(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.merge_companies(uuid, uuid, text) to authenticated;

-- Realtime
do $$
declare t text;
begin
  foreach t in array array['research_findings', 'portfolio_projects', 'companies', 'lifecycle_events'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
