-- Telegram: sabah özeti günde bir kez (tg_morning_at) ve komut webhook'u için gizli doğrulama belirteci (Vault'ta). Additive.
alter table public.ops_autopilot add column if not exists tg_morning_at timestamptz;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'embay_telegram_webhook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'embay_telegram_webhook_secret', 'Telegram webhook secret_token');
  end if;
end $$;

create or replace function public.verify_telegram_secret(p_secret text)
returns boolean language sql stable security definer set search_path = public, vault as $$
  select coalesce(length(p_secret) >= 32 and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'embay_telegram_webhook_secret'), false);
$$;
revoke all on function public.verify_telegram_secret(text) from public, anon, authenticated;
grant execute on function public.verify_telegram_secret(text) to service_role;

create or replace function public.telegram_webhook_secret()
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'embay_telegram_webhook_secret';
$$;
revoke all on function public.telegram_webhook_secret() from public, anon, authenticated;
grant execute on function public.telegram_webhook_secret() to service_role;
