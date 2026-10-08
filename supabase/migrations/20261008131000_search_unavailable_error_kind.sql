-- Arama sağlayıcısı yokluğunu hatalı biçimde başarılı boş sonuç gibi göstermeyin.
-- Yalnızca izin verilen error_kind kümesine yeni bir durum eklenir; mevcut satırlar korunur.
alter table public.bot_missions drop constraint if exists bot_missions_error_kind_check;
alter table public.bot_missions add constraint bot_missions_error_kind_check
  check (error_kind is null or error_kind = any (array['ai_credit', 'ai_auth', 'repeated_error', 'timeout', 'budget', 'search_unavailable']));
