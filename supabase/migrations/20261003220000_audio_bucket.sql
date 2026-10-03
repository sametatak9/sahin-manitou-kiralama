-- Reels sunucu sesi (seslendirme) dosyaları için herkese açık okunur 'audio' deposu. Yazma yalnızca sunucu (service role). Additive.
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('audio', 'audio', true, array['audio/wav', 'audio/x-wav', 'audio/mpeg'], 20971520)
on conflict (id) do nothing;
