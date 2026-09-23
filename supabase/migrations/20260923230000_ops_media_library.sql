-- EMBAY AI OPS — Video havuzu: yüklenen videolar (ve görseller) havuza kaydedilir; uygulama/format seçimi,
-- kırpma/kapak/sessiz düzenleme bilgisi, açıklama ve kuyruğa gönderim geçmişi. Additive; DROP yok, silme = arşivleme.

create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'video' check (kind in ('video', 'image')),
  title text not null check (length(btrim(title)) >= 1),
  url text not null,                       -- yayında kullanılacak (düzenlenmişse kırpılmış) dosya
  original_url text,                       -- ilk yüklenen dosya (hiç silinmez)
  storage_path text,
  cover_url text,
  mime text, size_bytes bigint, duration_sec numeric(10,2), width int, height int,
  targets text[] not null default '{}',   -- ig_reel, ig_story, ig_post, fb_post, yt_short, yt_video
  caption text, hashtags text[] not null default '{}',
  edit jsonb not null default '{}'::jsonb, -- {trim_start, trim_end, muted, cover_time}
  notes text,
  status text not null default 'pool' check (status in ('pool', 'queued', 'published', 'archived')),
  draft_ids uuid[] not null default '{}',
  queued_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_library_created_idx on public.media_library (created_at desc) where archived_at is null;

alter table public.media_library enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'media_library' and policyname = 'media_library_team_select') then
    create policy media_library_team_select on public.media_library for select to authenticated using (public.is_team_member());
    create policy media_library_team_insert on public.media_library for insert to authenticated with check (public.is_team_member());
    create policy media_library_team_update on public.media_library for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'media_library_updated') then
    create trigger media_library_updated before update on public.media_library for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'media_library_audit') then
    create trigger media_library_audit after insert or update on public.media_library for each row execute function public.log_audit();
  end if;
end $$;

-- Tarayıcıda kırpılan videolar bazı telefonlarda WebM çıkar: depoya WebM de kabul edilir (eski türler aynen kalır)
update storage.buckets
set allowed_mime_types = (select array_agg(distinct t) from unnest(coalesce(allowed_mime_types, '{}') || array['video/webm']) t)
where id = 'media-uploads';
