-- EMBAY Showroom: sitede sergilenen ev / villa modelleri (İkranur tarzı katalog). Yalnızca Embay ekibi (panel) ekler/düzenler;
-- ziyaretçiler yayındaki modelleri görür ve teklif ister (lead_inbox). Silme yok: arşivlenir. Tamamen ek (additive).
create table if not exists public.showroom_models (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.agency_clients(id),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  code text,                                   -- model kodu (ör. EY-120)
  title text not null,                         -- ör. "120 m² Tek Katlı Villa"
  subtitle text,                               -- kısa slogan
  system text not null default 'celik' check (system in ('celik','hafif_celik','betonarme','prefabrik','diger')),
  floors smallint check (floors between 1 and 5),
  area_m2 numeric(7,2) check (area_m2 > 0),
  rooms text,                                  -- ör. "3+1"
  room_breakdown jsonb not null default '[]'::jsonb,   -- [{label, count, m2}]
  price numeric(14,2) check (price is null or price > 0),
  price_note text,                             -- ör. "Fiyat için teklif alın" / "Temel hariç"
  delivery text not null default 'anahtar_teslim' check (delivery in ('anahtar_teslim','ileri_kaba','kaba')),
  delivery_days int check (delivery_days is null or delivery_days > 0),
  location text,                               -- gerçek proje ise ilçe
  is_real_project boolean not null default false,   -- teslim ettiğimiz gerçek proje mi (yoksa katalog modeli)
  includes text[] not null default '{}',
  excludes text[] not null default '{}',
  description text,
  cover_url text,
  gallery text[] not null default '{}',
  plan_url text,
  video_url text,
  featured boolean not null default false,
  sort int not null default 100,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists showroom_models_status_idx on public.showroom_models (status, featured desc, sort, created_at desc);

alter table public.showroom_models enable row level security;
create policy "ziyaretci yayindakileri gorur" on public.showroom_models for select to anon, authenticated using (status = 'published');
create policy "ekip okur" on public.showroom_models for select to authenticated using (public.is_team_member());
create policy "ekip ekler" on public.showroom_models for insert to authenticated with check (public.is_team_member());
create policy "ekip gunceller" on public.showroom_models for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
-- DELETE politikası yok: kayıtlar silinmez, arşivlenir.

create or replace function public.showroom_touch() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then new.published_at := coalesce(new.published_at, now()); end if;
  if new.status = 'archived' and (tg_op = 'INSERT' or old.status is distinct from 'archived') then new.archived_at := now(); end if;
  return new;
end $$;
create trigger showroom_touch before insert or update on public.showroom_models for each row execute function public.showroom_touch();

-- Teklif formu hangi modelden geldi (ek kolon)
alter table public.lead_inbox add column if not exists model_slug text;
grant select on public.showroom_models to anon;
grant select, insert, update on public.showroom_models to authenticated;
