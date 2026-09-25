-- EMBAY AI OPS — İçerik Fabrikası: 5 platform × günde 3 içerik (1 kısa video + 2 banner/kampanya), kota takibi, hatırlatma.
-- Botlar her sabah taslakları üretir (onay kuyruğuna); bağlı platformlarda onay sonrası otomatik, bağlı olmayanlarda "Telefondan paylaş".
-- Additive; DROP yok.

create table if not exists public.content_quota (
  platform text primary key check (platform in ('instagram', 'facebook', 'tiktok', 'youtube', 'x')),
  enabled boolean not null default true,
  video_per_day int not null default 1 check (video_per_day between 0 and 5),
  image_per_day int not null default 2 check (image_per_day between 0 and 5),
  slot_times text[] not null default '{"09:30","13:30","19:30"}',          -- İstanbul saati
  width int not null default 1080, height int not null default 1350,     -- banner ölçüsü
  updated_at timestamptz not null default now()
);
alter table public.content_quota enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'content_quota' and policyname = 'content_quota_team_select') then
    create policy content_quota_team_select on public.content_quota for select to authenticated using (public.is_team_member());
    create policy content_quota_admin_update on public.content_quota for update to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
  end if;
end $$;
insert into public.content_quota (platform, width, height, slot_times) values
  ('instagram', 1080, 1350, '{"09:30","13:30","19:30"}'),
  ('facebook', 1080, 1350, '{"10:00","14:00","20:00"}'),
  ('tiktok', 1080, 1920, '{"12:00","18:00","21:00"}'),
  ('youtube', 1080, 1920, '{"11:00","17:00","20:30"}'),
  ('x', 1600, 900, '{"09:00","13:00","18:30"}')
on conflict (platform) do nothing;

-- Günlük fabrika kaydı (günde bir kez üretim + sabah/akşam bildirimleri)
create table if not exists public.content_factory_days (
  day date primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created int not null default 0,
  errors jsonb not null default '[]',
  morning_sent_at timestamptz,
  evening_sent_at timestamptz
);
alter table public.content_factory_days enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'content_factory_days' and policyname = 'content_factory_days_team_select') then
    create policy content_factory_days_team_select on public.content_factory_days for select to authenticated using (public.is_team_member());
  end if;
end $$;

-- Bugünün kota durumu: platform başına hedef / üretilen / onaylı / paylaşılan
create or replace function public.content_quota_today() returns table (
  platform text, enabled boolean, target int, video_target int, image_target int, drafted int, videos int, banners int, approved int, published int)
language sql stable security definer set search_path = public as $$
  with d as (
    select (now() at time zone 'Europe/Istanbul')::date as day
  ), c as (
    select s.primary_platform as platform, s.format, s.workflow_status
    from public.social_drafts s, d
    where (s.scheduled_at at time zone 'Europe/Istanbul')::date = d.day and s.workflow_status <> 'cancelled' and coalesce(s.archive_status, 'active') <> 'archived'
  )
  select q.platform, q.enabled, q.video_per_day + q.image_per_day, q.video_per_day, q.image_per_day,
    count(c.*)::int, count(c.*) filter (where c.format = 'reel')::int, count(c.*) filter (where c.format = 'banner')::int,
    count(c.*) filter (where c.workflow_status in ('approved', 'scheduled', 'processing', 'published'))::int,
    count(c.*) filter (where c.workflow_status = 'published')::int
  from public.content_quota q left join c on c.platform = q.platform
  group by q.platform, q.enabled, q.video_per_day, q.image_per_day
  order by array_position(array['instagram', 'tiktok', 'youtube', 'facebook', 'x'], q.platform)
$$;
revoke all on function public.content_quota_today() from public, anon;
grant execute on function public.content_quota_today() to authenticated, service_role;

-- İçerik Fabrikası botu
insert into public.automation_bots (slug, name, bot_type, platform, icon, description, instructions, status)
select 'icerik-fabrikasi', 'İçerik Fabrikası', 'content', null, 'factory',
  'Her sabah 5 platform (Instagram, TikTok, YouTube, Facebook, X) için günde 3''er içerik taslağı üretir: 1 kısa video (Reels/Shorts/TikTok) + 2 banner/kampanya gönderisi.',
  'Gerçek proje ve makinelerimiz; uydurma müşteri/rakam yok. Platform kurallarına uygun uzunluk ve hashtag. Her içerik insan onayından sonra paylaşılır.', 'active'
where not exists (select 1 from public.automation_bots where slug = 'icerik-fabrikasi');
