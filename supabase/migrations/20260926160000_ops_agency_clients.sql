-- EMBAY AI OPS — Ajans modeli + sürekli öğrenme temeli.
-- Panel bir reklam ajansı gibi birden çok müşteriye (marka) çalışır: bugün Embay Yapı ve Şahin Manitou, yarın ör. bir emlakçı.
--   • agency_clients: müşteri (marka) kaydı; sektör, marka kiti, durum.
--   • client_id: bot, zamanlanmış görev, görev, içerik ve marka kitine eklenir (boş = ortak/ajans geneli).
--   • bot_learning_log: botların her gün öğrendikleri (Claude denetimi, sektör kıyası, yayın performansı, yönetici notu).
--     Yetenek sürümleri (automation_skills.version) + bu günlük = botun kalıcı "hafızası".
-- Additive; DROP yok, veri silinmez. Mevcut kayıtlar Embay Yapı / Şahin Manitou'ya bağlanır.

create table if not exists public.agency_clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (length(btrim(name)) between 2 and 120),
  sector text not null default 'insaat',          -- insaat | makine_kiralama | emlak | …
  services text[] not null default '{}',
  region text,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table public.agency_clients enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'agency_clients' and policyname = 'agency_clients_team_select') then
    create policy agency_clients_team_select on public.agency_clients for select to authenticated using (public.is_team_member());
    create policy agency_clients_admin_insert on public.agency_clients for insert to authenticated with check (public.is_team_admin());
    create policy agency_clients_admin_update on public.agency_clients for update to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'agency_clients_updated') then
    create trigger agency_clients_updated before update on public.agency_clients for each row execute function public.set_updated_at();
  end if;
end $$;

insert into public.agency_clients (slug, name, sector, services, region, brand_kit_id)
select 'embay-yapi', 'Embay Yapı', 'insaat',
       array['villa', 'müstakil ev', 'betonarme', 'çelik yapı', 'kentsel dönüşüm', 'tadilat', 'dış cephe'],
       'Çatalca / İstanbul', (select id from public.brand_kits where name = 'Embay Yapı' limit 1)
on conflict (slug) do nothing;
insert into public.agency_clients (slug, name, sector, services, region, brand_kit_id)
select 'sahin-manitou', 'Şahin Manitou', 'makine_kiralama',
       array['operatörlü Manitou kiralama', 'teleskopik yükleyici'],
       'İstanbul / Kocaeli / Tekirdağ', (select id from public.brand_kits where name = 'Şahin Manitou' limit 1)
on conflict (slug) do nothing;

alter table public.automation_bots   add column if not exists client_id uuid references public.agency_clients(id) on delete set null;
alter table public.mission_schedules add column if not exists client_id uuid references public.agency_clients(id) on delete set null;
alter table public.bot_missions      add column if not exists client_id uuid references public.agency_clients(id) on delete set null;
alter table public.social_drafts     add column if not exists client_id uuid references public.agency_clients(id) on delete set null;
alter table public.brand_kits        add column if not exists client_id uuid references public.agency_clients(id) on delete set null;
alter table public.automation_skills add column if not exists sector text;   -- boş = her sektörde kullanılabilir

-- Mevcut kayıtları müşterilere bağla (yalnızca boş olanlar)
update public.brand_kits k set client_id = c.id from public.agency_clients c where k.client_id is null and c.brand_kit_id = k.id;
update public.automation_bots set client_id = (select id from public.agency_clients where slug = 'sahin-manitou') where client_id is null and slug = 'manitou-is-bulucu';
update public.automation_bots set client_id = (select id from public.agency_clients where slug = 'embay-yapi') where client_id is null and slug <> 'manitou-is-bulucu';
update public.mission_schedules s set client_id = b.client_id from public.automation_bots b where s.client_id is null and s.bot_id = b.id;
update public.bot_missions m set client_id = b.client_id from public.automation_bots b where m.client_id is null and m.bot_id = b.id;
update public.social_drafts set client_id = (select id from public.agency_clients where slug = 'embay-yapi') where client_id is null;
update public.automation_skills set sector = 'makine_kiralama' where sector is null and skill_key = 'manitou_is_bulma';
update public.automation_skills set sector = 'insaat' where sector is null and skill_key in ('ozel_insaat_is_bulma', 'tadilat_tamirat_talebi', 'sektor_hesap_kesfi');

-- Zamanlanmış görevden doğan görev, müşteriyi taşır
create or replace function public.bot_missions_inherit_client() returns trigger language plpgsql as $$
begin
  if new.client_id is null then
    select coalesce(s.client_id, b.client_id) into new.client_id
      from (select 1) x
      left join public.mission_schedules s on s.id = new.schedule_id
      left join public.automation_bots b on b.id = new.bot_id;
  end if;
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'bot_missions_client') then
    create trigger bot_missions_client before insert on public.bot_missions for each row execute function public.bot_missions_inherit_client();
  end if;
end $$;

-- Botların öğrenme günlüğü
create table if not exists public.bot_learning_log (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references public.automation_bots(id) on delete set null,
  skill_id uuid references public.automation_skills(id) on delete set null,
  client_id uuid references public.agency_clients(id) on delete set null,
  source text not null check (source in ('claude_audit', 'benchmark', 'performance', 'admin_note', 'training')),
  lesson text not null check (length(btrim(lesson)) between 3 and 4000),
  evidence jsonb not null default '[]'::jsonb,       -- kaynak linkleri / ölçümler
  applied boolean not null default false,            -- talimata / yeteneğe işlendi mi
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists bot_learning_log_bot_idx on public.bot_learning_log (bot_id, created_at desc);
alter table public.bot_learning_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'bot_learning_log' and policyname = 'bot_learning_log_team_select') then
    create policy bot_learning_log_team_select on public.bot_learning_log for select to authenticated using (public.is_team_member());
    create policy bot_learning_log_team_insert on public.bot_learning_log for insert to authenticated with check (public.is_team_member());
  end if;
end $$;
