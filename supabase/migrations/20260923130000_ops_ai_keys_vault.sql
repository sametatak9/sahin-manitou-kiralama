-- EMBAY AI OPS — AI sağlayıcı anahtarlarının panelden (telefondan) girilmesi. Anahtar Supabase Vault'ta şifreli durur.
-- Tarayıcı anahtarı yalnızca bir kez gönderir; geri okunamaz (yalnızca "tanımlı · son 4 hane" görünür).
-- Edge function'lar önce Edge Secrets'a, yoksa Vault'a bakar.

create table if not exists public.ai_provider_keys (
  provider text primary key check (provider in ('anthropic', 'gemini', 'openai')),
  secret_id uuid not null,
  last4 text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  verify_error text
);
alter table public.ai_provider_keys enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_provider_keys' and policyname = 'ai_provider_keys_team_select') then
    create policy ai_provider_keys_team_select on public.ai_provider_keys for select to authenticated using (public.is_team_member());
  end if;
end $$;
-- secret_id kolonu istemciye açılmaz
revoke select on public.ai_provider_keys from anon, authenticated;
grant select (provider, last4, updated_at, verified_at, verify_error) on public.ai_provider_keys to authenticated;

create or replace function public.set_ai_key(p_provider text, p_key text) returns jsonb
language plpgsql security definer set search_path = public, vault as $$
declare v_existing uuid; v_id uuid; v_key text := btrim(coalesce(p_key, ''));
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici AI anahtarı tanımlayabilir' using errcode = '42501'; end if;
  if p_provider not in ('anthropic', 'gemini', 'openai') then raise exception 'Bilinmeyen sağlayıcı'; end if;
  if length(v_key) < 20 or v_key ~ '\s' then raise exception 'Anahtar biçimi geçersiz'; end if;
  if p_provider = 'anthropic' and v_key !~ '^sk-ant-' then raise exception 'Anthropic anahtarı sk-ant- ile başlamalı'; end if;
  select secret_id into v_existing from public.ai_provider_keys where provider = p_provider;
  if v_existing is not null then
    perform vault.update_secret(v_existing, v_key);
    v_id := v_existing;
  else
    v_id := vault.create_secret(v_key, 'ai_key_' || p_provider || '_' || substr(md5(random()::text), 1, 6), 'Panelden girilen AI sağlayıcı anahtarı');
  end if;
  insert into public.ai_provider_keys (provider, secret_id, last4, updated_by, updated_at, verified_at, verify_error)
  values (p_provider, v_id, right(v_key, 4), auth.uid(), now(), null, null)
  on conflict (provider) do update set secret_id = excluded.secret_id, last4 = excluded.last4, updated_by = excluded.updated_by, updated_at = now(), verified_at = null, verify_error = null;
  perform public.write_audit('set_ai_key', 'ai_provider_keys', p_provider, 'AI anahtarı güncellendi (…' || right(v_key, 4) || ')', '{}'::jsonb);
  return jsonb_build_object('provider', p_provider, 'last4', right(v_key, 4));
end $$;

create or replace function public.clear_ai_key(p_provider text) returns void
language plpgsql security definer set search_path = public, vault as $$
declare v_id uuid;
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici' using errcode = '42501'; end if;
  select secret_id into v_id from public.ai_provider_keys where provider = p_provider;
  if v_id is not null then perform vault.update_secret(v_id, 'revoked'); end if;
  delete from public.ai_provider_keys where provider = p_provider;
  perform public.write_audit('clear_ai_key', 'ai_provider_keys', p_provider, 'AI anahtarı kaldırıldı', '{}'::jsonb);
end $$;

-- Yalnızca service_role (edge function) çözebilir
create or replace function public.get_ai_key(p_provider text) returns text
language sql stable security definer set search_path = public, vault as $$
  select d.decrypted_secret from public.ai_provider_keys k join vault.decrypted_secrets d on d.id = k.secret_id where k.provider = p_provider and d.decrypted_secret <> 'revoked';
$$;

create or replace function public.mark_ai_key(p_provider text, p_ok boolean, p_error text default null) returns void
language sql security definer set search_path = public as $$
  update public.ai_provider_keys set verified_at = case when p_ok then now() else null end, verify_error = case when p_ok then null else left(p_error, 300) end where provider = p_provider;
$$;

revoke all on function public.set_ai_key(text, text) from public, anon;
revoke all on function public.clear_ai_key(text) from public, anon;
revoke all on function public.get_ai_key(text) from public, anon, authenticated;
revoke all on function public.mark_ai_key(text, boolean, text) from public, anon, authenticated;
grant execute on function public.set_ai_key(text, text) to authenticated;
grant execute on function public.clear_ai_key(text) to authenticated;
grant execute on function public.get_ai_key(text) to service_role;
grant execute on function public.mark_ai_key(text, boolean, text) to service_role;
