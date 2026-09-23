-- EMBAY AI OPS — 1/6: güvenlik sertleştirme + audit log
-- Additive: mevcut politikalar silinmez; üstlerine RESTRICTIVE ekip politikası eklenir.

-- Kullanıcının ekip rolünü döndürür (admin | staff | null)
create or replace function public.team_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.team_members where user_id = auth.uid();
$$;
revoke execute on function public.team_role() from public, anon;
grant execute on function public.team_role() to authenticated;

-- Aşırı izinli (using true) tabloları ekip üyeleriyle sınırla
do $$
declare t text;
begin
  foreach t in array array['automation_skills','automation_tasks','communication_integrations','social_accounts','social_prospects','social_bot_runs','social_platform_reports'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'ops_team_only') then
      execute format('create policy ops_team_only on public.%I as restrictive for all to authenticated using (public.is_team_member()) with check (public.is_team_member())', t);
    end if;
  end loop;
end $$;

-- social_drafts: iki ayrı network check'i vardı; eskisi yeni platformları engelliyordu (genişletme, veri etkisi yok)
alter table public.social_drafts drop constraint if exists drafts_valid_networks;
alter table public.social_drafts add constraint drafts_valid_networks check (networks <@ array['instagram','facebook','tiktok','youtube','gmb','google_business','linkedin','threads','pinterest','twitter','x','bluesky','whatsapp','telegram','sahibinden','armut']::text[]);

-- Audit log: kim, neyi, ne zaman
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid default auth.uid(),
  actor_kind text not null default 'user' check (actor_kind in ('user','system','bot')),
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text,
  diff jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id, at desc);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;
create policy audit_log_member_read on public.audit_log for select to authenticated using (public.is_team_member());
-- Doğrudan insert/update/delete politikası yok: yalnızca trigger ve security definer fonksiyonlar yazar.

create or replace function public.log_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_id text;
  v_diff jsonb := '{}'::jsonb;
  v_new jsonb;
  v_old jsonb;
  k text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old); v_id := v_old->>'id'; v_diff := jsonb_build_object('old', v_old);
  elsif tg_op = 'INSERT' then
    v_new := to_jsonb(new); v_id := v_new->>'id'; v_diff := jsonb_build_object('new', v_new - 'layers' - 'api_response');
  else
    v_new := to_jsonb(new); v_old := to_jsonb(old); v_id := v_new->>'id';
    for k in select jsonb_object_keys(v_new) loop
      if k not in ('updated_at','locked_until','locked_by') and (v_new->k) is distinct from (v_old->k) then
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('from', v_old->k, 'to', v_new->k));
      end if;
    end loop;
    if v_diff = '{}'::jsonb then return new; end if;
  end if;
  insert into public.audit_log (actor, actor_kind, action, entity_type, entity_id, diff)
  values (auth.uid(), case when auth.uid() is null then 'system' else 'user' end, lower(tg_op), tg_table_name, v_id, v_diff);
  return coalesce(new, old);
end $$;
revoke execute on function public.log_audit() from public, anon, authenticated;

-- Uygulamanın anlamlı olay yazması için (ör. "bot çalıştırıldı")
create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_summary text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_member() then raise exception 'permission denied' using errcode = '42501'; end if;
  insert into public.audit_log (actor, action, entity_type, entity_id, summary, diff)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_summary, coalesce(p_data, '{}'::jsonb));
end $$;
revoke execute on function public.write_audit(text,text,text,text,jsonb) from public, anon;
grant execute on function public.write_audit(text,text,text,text,jsonb) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['team_members','automation_skills','automation_tasks','social_accounts','communication_integrations','social_drafts'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_audit') then
      execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_audit()', t || '_audit', t);
    end if;
  end loop;
end $$;
