-- EMBAY AI OPS — OAuth dönüşü: kullanıcı bağlantıyı hangi panel adresinden başlattıysa oraya geri döner (oturum o adreste). Additive.
alter table public.oauth_states add column if not exists return_to text;
