-- HAFTALIK İÇERİK PLANI: gün/saat + gözle seçilmiş gerçek görsel + o görsele göre yazılmış metin. Bot planı aynen uygular.
create table if not exists public.content_plan (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.agency_clients(id),
  day date not null,
  slot text not null,
  platforms text[] not null default array['instagram','facebook'],
  format text not null check (format in ('reel','banner')),
  pillar text,
  badge text,
  media_ids uuid[] not null default '{}',
  headline text not null,
  subtitle text,
  caption text not null,
  hashtags text[] not null default '{}',
  cta text,
  status text not null default 'planned',
  drafted_platforms text[] not null default '{}',
  draft_ids uuid[] not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_plan_day_idx on public.content_plan(day, status);
alter table public.content_plan enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'content_plan' and policyname = 'content_plan_team_select') then
    create policy content_plan_team_select on public.content_plan for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'content_plan' and policyname = 'content_plan_team_update') then
    create policy content_plan_team_update on public.content_plan for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
  end if;
end $$;
-- Görsel etiketi (içinde ne var: villa, kaba inşaat, çelik iskelet, tadilat...) — içerik metni buna göre yazılır
alter table public.media_library add column if not exists vision jsonb;
