-- Site yazıları (Ev & Yapı Rehberi): Editör Bot'un sitede yayınladığı görselli, ön yazılı paylaşımlar (ilçe rehberleri, proje tanıtımları).
-- Google'da görünürlük için her yazının SEO başlığı/açıklaması ve ilçe etiketi var. Silme yok: arşivlenir. Tamamen ek (additive).
create table if not exists public.site_posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.agency_clients(id),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  kind text not null default 'rehber' check (kind in ('rehber','proje','ilce')),
  title text not null,
  excerpt text,
  body text,                       -- paragraflar boş satırla ayrılır; "## " ile başlayan satır ara başlıktır
  cover_url text,
  images text[] not null default '{}',
  district text,                   -- ilçe adı (ör. Çatalca)
  district_slug text,
  tags text[] not null default '{}',
  model_slug text,
  seo_title text,
  seo_description text,
  source text not null default 'bot' check (source in ('bot','ekip')),
  status text not null default 'published' check (status in ('draft','published','archived')),
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_posts_pub_idx on public.site_posts (status, published_at desc);
create index if not exists site_posts_district_idx on public.site_posts (district_slug, published_at desc);
alter table public.site_posts enable row level security;
create policy "ziyaretci yayindaki yazilari gorur" on public.site_posts for select to anon, authenticated using (status = 'published');
create policy "ekip yazilari okur" on public.site_posts for select to authenticated using (public.is_team_member());
create policy "ekip yazi ekler" on public.site_posts for insert to authenticated with check (public.is_team_member());
create policy "ekip yazi gunceller" on public.site_posts for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
grant select on public.site_posts to anon;
grant select, insert, update on public.site_posts to authenticated;

create or replace function public.site_posts_touch() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then new.published_at := coalesce(new.published_at, now()); end if;
  if new.status = 'archived' and (tg_op = 'INSERT' or old.status is distinct from 'archived') then new.archived_at := now(); end if;
  return new;
end $$;
create trigger site_posts_touch before insert or update on public.site_posts for each row execute function public.site_posts_touch();
