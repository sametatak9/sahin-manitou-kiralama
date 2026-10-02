-- KİTLE RADARI: Instagram etiket aramasıyla (resmi Graph API, işletme hesabı) villa / müstakil ev / ev yaptırma ilgisi olan gönderiler.
-- Otomatik takip/beğeni/yorum YOK (Meta kuralı): liste yöneticinin elle etkileşimi içindir. Kişisel veri tutulmaz (yalnızca herkese açık gönderi bağlantısı + açıklama özeti).
create table if not exists public.audience_radar (
  id uuid primary key default gen_random_uuid(),
  media_id text not null unique,
  permalink text not null,
  hashtag text,
  category text not null default 'kitle' check (category in ('ev_yaptiran', 'rakip_talepli', 'hayalperest', 'arsa', 'kitle')),
  caption text,
  like_count int,
  comments_count int,
  posted_at timestamptz,
  score int not null default 0,
  suggested_comment text,
  done_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists audience_radar_score_idx on public.audience_radar (score desc, posted_at desc);
alter table public.audience_radar enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'audience_radar' and policyname = 'audience_radar_team_select') then
    create policy audience_radar_team_select on public.audience_radar for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'audience_radar' and policyname = 'audience_radar_team_update') then
    create policy audience_radar_team_update on public.audience_radar for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
  end if;
end $$;
alter table public.ops_autopilot add column if not exists radar_synced_at timestamptz;
alter table public.ops_autopilot add column if not exists archive_imported_at timestamptz;
