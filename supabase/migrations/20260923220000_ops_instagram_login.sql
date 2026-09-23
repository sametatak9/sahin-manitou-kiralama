-- EMBAY AI OPS — Doğrudan "Instagram ile giriş" (Facebook sayfası gerekmez): Instagram uygulama kimliği/gizli anahtarı.
-- Additive: izinli ad listesi GENİŞLETİLİR (eski değerlerin hepsi geçerli kalır, veri etkilenmez).
alter table public.app_credentials drop constraint if exists app_credentials_name_check;
alter table public.app_credentials add constraint app_credentials_name_check check (name in (
  'META_APP_ID', 'META_APP_SECRET', 'INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'CANVA_CLIENT_ID', 'CANVA_CLIENT_SECRET',
  'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'RESEND_API_KEY', 'EMAIL_FROM', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'));

create or replace function public.app_credential_format_error(p_name text, p_value text) returns text
language sql immutable as $$
  select case
    when p_name in ('META_APP_ID', 'INSTAGRAM_APP_ID') and p_value !~ '^[0-9]{6,20}$'
      then 'Uygulama kimliği yalnızca rakamlardan oluşur (ör. 1234567890123456).'
    when p_name in ('META_APP_SECRET', 'INSTAGRAM_APP_SECRET') and p_value !~ '^[0-9a-f]{32}$'
      then 'Gizli anahtar 32 karakterdir (0-9, a-f). Girilen ' || length(p_value) || ' karakter: “Göster”e basıp tamamını kopyalayın.'
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
