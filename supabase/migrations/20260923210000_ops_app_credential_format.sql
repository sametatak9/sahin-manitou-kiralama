-- EMBAY AI OPS — Uygulama giriş bilgilerinde biçim kontrolü: yanlış alana yapıştırılan / eksik kopyalanan değer
-- kaydedilmeden Türkçe açıklamayla reddedilir. Additive: yalnız fonksiyon eklenir/yeniden tanımlanır; DROP yok.

create or replace function public.app_credential_format_error(p_name text, p_value text) returns text
language sql immutable as $$
  select case
    when p_name = 'META_APP_ID' and p_value !~ '^[0-9]{6,20}$'
      then 'Meta Uygulama Kimliği yalnızca rakamlardan oluşur (ör. 1234567890123456).'
    when p_name = 'META_APP_SECRET' and p_value !~ '^[0-9a-f]{32}$'
      then 'Meta Uygulama Gizli Anahtarı 32 karakterdir (0-9, a-f). Girilen ' || length(p_value) || ' karakter: “Göster”e basıp tamamını kopyalayın.'
    when p_name = 'GOOGLE_CLIENT_ID' and p_value !~ '\.apps\.googleusercontent\.com$'
      then 'Google İstemci Kimliği “….apps.googleusercontent.com” ile biter.'
    when p_name = 'GOOGLE_CLIENT_SECRET' and p_value ~ 'googleusercontent\.com'
      then 'Buraya İstemci Kimliği yapıştırılmış. İstemci gizli anahtarı genelde “GOCSPX-” ile başlar.'
    when p_name = 'GOOGLE_CLIENT_SECRET' and (length(p_value) < 20 or length(p_value) > 60)
      then 'Google İstemci gizli anahtarı 20-60 karakter olmalı (genelde “GOCSPX-” ile başlar).'
    when p_name = 'TELEGRAM_BOT_TOKEN' and p_value !~ '^[0-9]+:[A-Za-z0-9_-]{30,}$'
      then 'Telegram bot anahtarı “123456789:AA…” biçimindedir (BotFather verir).'
    when p_name = 'RESEND_API_KEY' and p_value !~ '^re_'
      then 'Resend API anahtarı “re_” ile başlar.'
    when p_name = 'EMAIL_FROM' and p_value !~ '@'
      then 'Gönderen e-posta adresi geçersiz.'
    else null end
$$;

create or replace function public.set_app_credential(p_name text, p_value text) returns jsonb
language plpgsql security definer set search_path = public, vault as $$
declare v_existing uuid; v_id uuid; v_val text := btrim(coalesce(p_value, '')); v_err text;
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici giriş bilgisi tanımlayabilir' using errcode = '42501'; end if;
  if length(v_val) < 3 or length(v_val) > 4000 then raise exception 'Değer geçersiz'; end if;
  v_err := public.app_credential_format_error(p_name, v_val);
  if v_err is not null then raise exception '%', v_err using errcode = '22023'; end if;
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
revoke all on function public.set_app_credential(text, text) from public, anon;
grant execute on function public.set_app_credential(text, text) to authenticated;
