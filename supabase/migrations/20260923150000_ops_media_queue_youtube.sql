-- EMBAY AI OPS — Telefondan medya yükleme + zamanlı paylaşım kuyruğu + YouTube botu (additive; DROP yok)

-- Görsel/video yükleme deposu (Instagram/YouTube API'leri medyayı herkese açık URL'den çeker)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-uploads', 'media-uploads', true, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'media_uploads_team_insert') then
    create policy media_uploads_team_insert on storage.objects for insert to authenticated with check (bucket_id = 'media-uploads' and public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'media_uploads_team_update') then
    create policy media_uploads_team_update on storage.objects for update to authenticated using (bucket_id = 'media-uploads' and public.is_team_member());
  end if;
end $$;

-- YouTube botu (bağlantı bekler) + Instagram botunun görevi netleşir
insert into public.automation_bots (slug, name, bot_type, platform, icon, description, connector_key, status, ai_agent_id, instructions)
select 'youtube-bot', 'YouTube Bot', 'social', 'youtube', 'share-2',
  'Verdiğiniz videoları (Shorts / normal video) belirlediğiniz tarih ve saatte resmi YouTube Data API ile yükler; başlık, açıklama ve etiketleri hazırlar.',
  'youtube', 'waiting_connection', a.id, 'Başlık 100 karakteri geçmesin; Shorts için #Shorts ekle; açıklamada telefon ve web sitesi olsun.'
from public.ai_agents a where a.agent_key = 'content-writer'
on conflict (slug) do nothing;

insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, 0 from public.automation_bots b join public.automation_skills s on s.skill_key = 'social_publisher' where b.slug = 'youtube-bot'
on conflict do nothing;

update public.automation_bots set name = 'Instagram Bot (Gönderi + Reels)',
  description = 'Verdiğiniz görsel ve videoları (gönderi, Reels, hikâye) belirlediğiniz saatte resmi Graph API ile paylaşır; günlük içerik taslağı hazırlar.'
 where slug = 'instagram-bot' and name = 'Instagram Bot';
