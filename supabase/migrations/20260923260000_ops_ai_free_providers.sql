-- EMBAY AI OPS — Ücretsiz sağlayıcılar: OpenRouter (':free' modeller) ve GitHub Models. Additive: izinli liste genişletilir.
-- Anahtar hangi kutuya yapıştırılırsa yapıştırılsın ön ekinden tanınır ve doğru sağlayıcıya kaydedilir:
--   sk-or-… → openrouter · github_pat_… / ghp_… → github · gsk_… → groq · sk-ant-… → anthropic
alter table public.ai_provider_keys drop constraint if exists ai_provider_keys_provider_check;
alter table public.ai_provider_keys add constraint ai_provider_keys_provider_check check (provider in ('anthropic', 'gemini', 'openai', 'groq', 'openrouter', 'github'));

create or replace function public.set_ai_key(p_provider text, p_key text) returns jsonb
language plpgsql security definer set search_path = public, vault as $$
declare v_existing uuid; v_id uuid; v_key text := btrim(coalesce(p_key, '')); v_p text := p_provider;
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici AI anahtarı tanımlayabilir' using errcode = '42501'; end if;
  if length(v_key) < 20 or v_key ~ '\s' then raise exception 'Anahtar biçimi geçersiz'; end if;
  v_p := case
    when v_key ~ '^sk-or-' then 'openrouter'
    when v_key ~ '^(github_pat_|ghp_)' then 'github'
    when v_key ~ '^gsk_' then 'groq'
    when v_key ~ '^sk-ant-' then 'anthropic'
    else p_provider end;
  if v_p not in ('anthropic', 'gemini', 'openai', 'groq', 'openrouter', 'github') then raise exception 'Bilinmeyen sağlayıcı'; end if;
  if v_p = 'anthropic' and v_key !~ '^sk-ant-' then raise exception 'Anthropic anahtarı sk-ant- ile başlamalı'; end if;
  select secret_id into v_existing from public.ai_provider_keys where provider = v_p;
  if v_existing is not null then
    perform vault.update_secret(v_existing, v_key);
    v_id := v_existing;
  else
    v_id := vault.create_secret(v_key, 'ai_key_' || v_p || '_' || substr(md5(random()::text), 1, 6), 'Panelden girilen AI sağlayıcı anahtarı');
  end if;
  insert into public.ai_provider_keys (provider, secret_id, last4, updated_by, updated_at, verified_at, verify_error)
  values (v_p, v_id, right(v_key, 4), auth.uid(), now(), null, null)
  on conflict (provider) do update set secret_id = excluded.secret_id, last4 = excluded.last4, updated_by = excluded.updated_by, updated_at = now(), verified_at = null, verify_error = null;
  perform public.write_audit('set_ai_key', 'ai_provider_keys', v_p, 'AI anahtarı güncellendi (' || v_p || ' …' || right(v_key, 4) || ')', '{}'::jsonb);
  return jsonb_build_object('provider', v_p, 'last4', right(v_key, 4));
end $$;
