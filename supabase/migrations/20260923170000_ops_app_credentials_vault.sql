-- EMBAY AI OPS — Uygulama giriş bilgileri (Meta, Google/YouTube, Canva, WhatsApp Cloud API, e-posta, Telegram) panelden girilir.
-- Değerler Supabase Vault'ta şifreli durur; tarayıcı yalnızca bir kez gönderir, geri okuyamaz (yalnızca "tanımlı · son 4 hane").
-- Edge function'lar önce Edge Function Secrets'a, yoksa buraya bakar. Additive; DROP yok.

create table if not exists public.app_credentials (
  name text primary key check (name in (
    'META_APP_ID', 'META_APP_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'CANVA_CLIENT_ID', 'CANVA_CLIENT_SECRET',
    'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'RESEND_API_KEY', 'EMAIL_FROM', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID')),
  secret_id uuid not null,
  last4 text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.app_credentials enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_credentials' and policyname = 'app_credentials_team_select') then
    create policy app_credentials_team_select on public.app_credentials for select to authenticated using (public.is_team_member());
  end if;
end $$;
revoke select on public.app_credentials from anon, authenticated;
grant select (name, last4, updated_at) on public.app_credentials to authenticated;

create or replace function public.set_app_credential(p_name text, p_value text) returns jsonb
language plpgsql security definer set search_path = public, vault as $$
declare v_existing uuid; v_id uuid; v_val text := btrim(coalesce(p_value, ''));
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici giriş bilgisi tanımlayabilir' using errcode = '42501'; end if;
  if length(v_val) < 3 or length(v_val) > 4000 then raise exception 'Değer geçersiz'; end if;
  select secret_id into v_existing from public.app_credentials where name = p_name;
  if v_existing is not null then
    perform vault.update_secret(v_existing, v_val); v_id := v_existing;
  else
    v_id := vault.create_secret(v_val, 'app_' || lower(p_name) || '_' || substr(md5(random()::text), 1, 6), 'Panelden girilen uygulama giriş bilgisi');
  end if;
  insert into public.app_credentials (name, secret_id, last4, updated_by, updated_at)
  values (p_name, v_id, right(v_val, 4), auth.uid(), now())
  on conflict (name) do update set secret_id = excluded.secret_id, last4 = excluded.last4, updated_by = excluded.updated_by, updated_at = now();
  perform public.write_audit('set_app_credential', 'app_credentials', p_name, 'Giriş bilgisi güncellendi: ' || p_name, '{}'::jsonb);
  return jsonb_build_object('name', p_name, 'last4', right(v_val, 4));
end $$;

create or replace function public.clear_app_credential(p_name text) returns void
language plpgsql security definer set search_path = public, vault as $$
declare v_id uuid;
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici' using errcode = '42501'; end if;
  select secret_id into v_id from public.app_credentials where name = p_name;
  if v_id is not null then perform vault.update_secret(v_id, 'revoked'); end if;
  delete from public.app_credentials where name = p_name;
  perform public.write_audit('clear_app_credential', 'app_credentials', p_name, 'Giriş bilgisi kaldırıldı: ' || p_name, '{}'::jsonb);
end $$;

-- Yalnızca service_role (edge function) çözebilir
create or replace function public.get_app_credentials() returns jsonb
language sql stable security definer set search_path = public, vault as $$
  select coalesce(jsonb_object_agg(k.name, d.decrypted_secret), '{}'::jsonb)
    from public.app_credentials k join vault.decrypted_secrets d on d.id = k.secret_id where d.decrypted_secret <> 'revoked';
$$;

revoke all on function public.set_app_credential(text, text) from public, anon;
revoke all on function public.clear_app_credential(text) from public, anon;
revoke all on function public.get_app_credentials() from public, anon, authenticated;
grant execute on function public.set_app_credential(text, text) to authenticated;
grant execute on function public.clear_app_credential(text) to authenticated;
grant execute on function public.get_app_credentials() to service_role;

-- Sistem kontrolü: zamanlanmış işlerin (cron) son çalışma durumu. Yalnızca service_role.
create or replace function public.ops_worker_health() returns jsonb
language sql stable security definer set search_path = public, cron as $$
  select coalesce(jsonb_agg(jsonb_build_object('job', j.jobname, 'schedule', j.schedule, 'active', j.active,
    'last_run', r.end_time, 'last_status', r.status, 'last_ok', ok.end_time) order by j.jobname), '[]'::jsonb)
  from cron.job j
  left join lateral (select end_time, status from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1) r on true
  left join lateral (select end_time from cron.job_run_details d where d.jobid = j.jobid and d.status = 'succeeded' order by d.start_time desc limit 1) ok on true
  where j.jobname like 'embay-%';
$$;
revoke all on function public.ops_worker_health() from public, anon, authenticated;
grant execute on function public.ops_worker_health() to service_role;
