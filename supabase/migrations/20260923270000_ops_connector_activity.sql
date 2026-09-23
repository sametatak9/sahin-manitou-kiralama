-- EMBAY AI OPS — Uygulama bağlantı mimarisinin temeli (additive; DROP yok):
--  1) connector_activity : her uygulamada botun/hesabın yaptığı her işlem (bağlan, paylaş, istatistik, token yenile, hata, elle paylaşım, gelen olay)
--  2) bot_accounts       : hangi bot hangi bağlı hesabı hangi yetkiyle kullanır
--  3) connector_events   : platformlardan gelen olaylar (yorum, mesaj, bahsetme) — webhook gelen kutusu
--  4) connector_health   : uygulama başına sağlık özeti (son başarı, son hata, 24 saat/7 gün sayaçları)
-- Token ve gizli anahtarlar bu tablolarda TUTULMAZ (Vault'ta kalır); kişisel veri ham olarak saklanmaz.

create table if not exists public.connector_activity (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  connector_key text not null,
  account_id uuid references public.social_accounts(id) on delete set null,
  bot_id uuid references public.automation_bots(id) on delete set null,
  action text not null check (action in ('connect', 'disconnect', 'token_refresh', 'verify', 'publish', 'metrics_sync', 'manual_share', 'message_send', 'webhook', 'rate_limit', 'error')),
  status text not null check (status in ('ok', 'failed', 'skipped', 'pending')),
  ref_type text, ref_id text,               -- ör. social_publications / social_drafts kaydı
  external_id text, external_url text,      -- platformdaki gönderi/olay kimliği ve linki
  duration_ms int,
  summary text,
  error_code text, error text,
  data jsonb not null default '{}'::jsonb,
  actor uuid default auth.uid()
);
create index if not exists connector_activity_key_idx on public.connector_activity (connector_key, at desc);
create index if not exists connector_activity_account_idx on public.connector_activity (account_id, at desc);
create index if not exists connector_activity_bot_idx on public.connector_activity (bot_id, at desc);

create table if not exists public.bot_accounts (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.automation_bots(id) on delete cascade,
  account_id uuid not null references public.social_accounts(id) on delete cascade,
  role text not null default 'publish' check (role in ('publish', 'read', 'reply')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (bot_id, account_id, role)
);

create table if not exists public.connector_events (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  connector_key text not null,
  event_type text not null,                 -- comments, messages, mentions, feed …
  external_account_id text,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  signature_ok boolean not null default false,
  status text not null default 'new' check (status in ('new', 'processed', 'ignored', 'failed')),
  processed_at timestamptz,
  note text
);
create index if not exists connector_events_idx on public.connector_events (connector_key, received_at desc);

alter table public.connector_activity enable row level security;
alter table public.bot_accounts enable row level security;
alter table public.connector_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'connector_activity' and policyname = 'connector_activity_team_select') then
    create policy connector_activity_team_select on public.connector_activity for select to authenticated using (public.is_team_member());
    -- Panelden yalnızca "elle paylaşıldı" kaydı yazılabilir; diğer tüm kayıtları sunucu (service role) yazar
    create policy connector_activity_manual_insert on public.connector_activity for insert to authenticated
      with check (public.is_team_member() and action = 'manual_share' and status = 'ok');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bot_accounts' and policyname = 'bot_accounts_team_select') then
    create policy bot_accounts_team_select on public.bot_accounts for select to authenticated using (public.is_team_member());
    create policy bot_accounts_admin_write on public.bot_accounts for all to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'connector_events' and policyname = 'connector_events_team_select') then
    create policy connector_events_team_select on public.connector_events for select to authenticated using (public.is_team_member());
    create policy connector_events_team_update on public.connector_events for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'bot_accounts_audit') then
    create trigger bot_accounts_audit after insert or update or delete on public.bot_accounts for each row execute function public.log_audit();
  end if;
end $$;

create or replace view public.connector_health with (security_invoker = true) as
select
  connector_key,
  max(at) filter (where status = 'ok') as last_ok_at,
  max(at) filter (where status = 'failed') as last_failed_at,
  (array_agg(coalesce(error, summary) order by at desc) filter (where status = 'failed'))[1] as last_error,
  count(*) filter (where status = 'ok' and at > now() - interval '24 hours') as ok_24h,
  count(*) filter (where status = 'failed' and at > now() - interval '24 hours') as failed_24h,
  count(*) filter (where action in ('publish', 'manual_share') and status = 'ok' and at > now() - interval '7 days') as posts_7d,
  count(*) filter (where action = 'webhook' and at > now() - interval '7 days') as events_7d
from public.connector_activity
group by connector_key;
grant select on public.connector_health to authenticated;

-- Gelen olay (webhook) doğrulama belirteci: Vault'ta otomatik üretilir, panelde kopyalanabilir gösterilir
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'embay_webhook_verify_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(16), 'hex'), 'embay_webhook_verify_token', 'Meta webhook doğrulama belirteci');
  end if;
end $$;
create or replace function public.webhook_verify_token() returns text
language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'embay_webhook_verify_token';
$$;
revoke all on function public.webhook_verify_token() from public, anon;
grant execute on function public.webhook_verify_token() to service_role;
-- Panel için: yalnızca yönetici görebilir (Meta ayarına yapıştırmak için)
create or replace function public.webhook_verify_token_admin() returns text
language plpgsql stable security definer set search_path = public, vault as $$
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici' using errcode = '42501'; end if;
  return (select decrypted_secret from vault.decrypted_secrets where name = 'embay_webhook_verify_token');
end $$;
revoke all on function public.webhook_verify_token_admin() from public, anon;
grant execute on function public.webhook_verify_token_admin() to authenticated;
