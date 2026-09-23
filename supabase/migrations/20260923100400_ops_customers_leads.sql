-- EMBAY AI OPS — 5/7: iki ayrı müşteri modülü (inşaat / makine kiralama) + lead genişletme + duplicate kontrolü

create or replace function public.normalize_phone(p text) returns text
language sql immutable set search_path = public as $$
  select case
    when p is null then null
    when length(regexp_replace(p, '\D', '', 'g')) < 10 then null
    else right(regexp_replace(p, '\D', '', 'g'), 10) end;
$$;
create or replace function public.normalize_email(p text) returns text
language sql immutable set search_path = public as $$ select nullif(lower(trim(p)), ''); $$;
create or replace function public.normalize_domain(p text) returns text
language sql immutable set search_path = public as $$
  select nullif(regexp_replace(regexp_replace(lower(trim(coalesce(p, ''))), '^https?://(www\.)?', ''), '/.*$', ''), '');
$$;

-- ── İnşaat müşterileri ───────────────────────────────────────────────────────
create table if not exists public.construction_customers (
  id uuid primary key default gen_random_uuid(),
  customer_kind text not null default 'bireysel' check (customer_kind in ('bireysel','kurumsal','yatirimci','kat_maliki_grubu')),
  full_name text,
  company text,
  phone text,
  email text,
  website text,
  project_type text not null default 'kentsel_donusum' check (project_type in ('kentsel_donusum','konut','ticari','tadilat','altyapi','diger')),
  ilce text,
  mahalle text,
  address text,
  ada text,
  parsel text,
  parcel_id uuid references public.parcels(id) on delete set null,
  unit_count integer check (unit_count is null or unit_count >= 0),
  budget_range text,
  timeline text,
  project_stage text not null default 'fikir' check (project_stage in ('fikir','kesif','proje','ruhsat','insaat','teslim')),
  source text not null default 'manual' check (source in ('manual','website','google_business','social','campaign','referral','listing','bot_research','phone','field')),
  status text not null default 'yeni' check (status in ('yeni','gorusme','kesif','teklif','sozlesme','kazanildi','kaybedildi')),
  priority text not null default 'normal' check (priority in ('dusuk','normal','yuksek','acil')),
  estimated_value numeric check (estimated_value is null or estimated_value >= 0),
  next_action_at timestamptz,
  notes text,
  kvkk_consent boolean not null default false,
  kvkk_consent_at timestamptz,
  ticari_ileti_izni boolean not null default false,
  ticari_ileti_izin_tarihi timestamptz,
  lead_id uuid references public.leads(id) on delete set null,
  lead_inbox_id uuid references public.lead_inbox(id) on delete set null,
  assigned_to uuid references auth.users(id),
  phone_norm text generated always as (public.normalize_phone(phone)) stored,
  email_norm text generated always as (public.normalize_email(email)) stored,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint construction_customers_identity check (coalesce(full_name, company) is not null),
  constraint construction_customers_personal_consent check ((phone is null and email is null) or kvkk_consent or customer_kind = 'kurumsal'),
  constraint construction_customers_ticari check (not ticari_ileti_izni or ticari_ileti_izin_tarihi is not null)
);
create unique index if not exists construction_customers_phone_uniq on public.construction_customers (phone_norm) where phone_norm is not null and archived_at is null;
create unique index if not exists construction_customers_email_uniq on public.construction_customers (email_norm) where email_norm is not null and archived_at is null;
create index if not exists construction_customers_status_idx on public.construction_customers (status, created_at desc);
create index if not exists construction_customers_ilce_idx on public.construction_customers (ilce);

-- ── Makine kiralama müşterileri ──────────────────────────────────────────────
create table if not exists public.rental_customers (
  id uuid primary key default gen_random_uuid(),
  company text,
  contact_name text,
  phone text,
  email text,
  website text,
  sector text,
  ilce text,
  site_address text,
  machine_type text not null default 'manitou_teleskopik' check (machine_type in ('manitou_teleskopik','manitou_rotating','forklift','platform','vinc','diger')),
  lift_height_m numeric check (lift_height_m is null or lift_height_m between 0 and 100),
  capacity_ton numeric check (capacity_ton is null or capacity_ton between 0 and 100),
  with_operator boolean not null default true,
  rental_period text check (rental_period in ('saatlik','gunluk','haftalik','aylik','proje_bazli')),
  start_date date,
  end_date date,
  frequency text not null default 'tek_seferlik' check (frequency in ('tek_seferlik','ara_sira','duzenli')),
  source text not null default 'manual' check (source in ('manual','website','google_business','social','campaign','referral','listing','bot_research','phone','field')),
  status text not null default 'yeni' check (status in ('yeni','iletisim','teklif','kiralamada','tamamlandi','tekrar','kaybedildi')),
  priority text not null default 'normal' check (priority in ('dusuk','normal','yuksek','acil')),
  quoted_price numeric check (quoted_price is null or quoted_price >= 0),
  next_action_at timestamptz,
  notes text,
  kvkk_consent boolean not null default false,
  kvkk_consent_at timestamptz,
  ticari_ileti_izni boolean not null default false,
  ticari_ileti_izin_tarihi timestamptz,
  lead_id uuid references public.leads(id) on delete set null,
  lead_inbox_id uuid references public.lead_inbox(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  assigned_to uuid references auth.users(id),
  phone_norm text generated always as (public.normalize_phone(phone)) stored,
  email_norm text generated always as (public.normalize_email(email)) stored,
  domain_norm text generated always as (public.normalize_domain(website)) stored,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint rental_customers_identity check (coalesce(company, contact_name) is not null),
  constraint rental_customers_dates check (end_date is null or start_date is null or end_date >= start_date),
  constraint rental_customers_personal_consent check (contact_name is null or phone is null or kvkk_consent or company is not null),
  constraint rental_customers_ticari check (not ticari_ileti_izni or ticari_ileti_izin_tarihi is not null)
);
create unique index if not exists rental_customers_phone_uniq on public.rental_customers (phone_norm) where phone_norm is not null and archived_at is null;
create unique index if not exists rental_customers_email_uniq on public.rental_customers (email_norm) where email_norm is not null and archived_at is null;
create index if not exists rental_customers_domain_idx on public.rental_customers (domain_norm);
create index if not exists rental_customers_status_idx on public.rental_customers (status, created_at desc);

-- ── Ortak aktivite zaman çizelgesi ───────────────────────────────────────────
create table if not exists public.customer_activities (
  id uuid primary key default gen_random_uuid(),
  customer_module text not null check (customer_module in ('construction','rental')),
  customer_id uuid not null,
  activity_type text not null check (activity_type in ('not','arama','ziyaret','teklif','whatsapp','eposta','toplanti','durum')),
  body text not null,
  due_at timestamptz,
  done boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists customer_activities_customer_idx on public.customer_activities (customer_module, customer_id, created_at desc);
create index if not exists customer_activities_due_idx on public.customer_activities (due_at) where not done;

do $$
declare t text;
begin
  foreach t in array array['construction_customers','rental_customers'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_audit()', t || '_audit', t);
  end loop;
  foreach t in array array['construction_customers','rental_customers','customer_activities'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ops_read on public.%I for select to authenticated using (public.is_team_member())', t);
    execute format('create policy ops_insert on public.%I for insert to authenticated with check (public.is_team_member())', t);
    execute format('create policy ops_update on public.%I for update to authenticated using (public.is_team_member()) with check (public.is_team_member())', t);
    execute format('create policy ops_admin_delete on public.%I for delete to authenticated using (public.is_team_admin())', t);
  end loop;
end $$;

-- ── Lead genişletme (mevcut KVKK check'leri korunur) ─────────────────────────
alter table public.leads add column if not exists company text;
alter table public.leads add column if not exists website text;
alter table public.leads add column if not exists location text;
alter table public.leads add column if not exists project text;
alter table public.leads add column if not exists need text;
alter table public.leads add column if not exists priority text not null default 'normal';
alter table public.leads add column if not exists customer_module text;
alter table public.leads add column if not exists converted_customer_id uuid;
alter table public.leads add column if not exists bot_id uuid references public.automation_bots(id) on delete set null;
alter table public.leads add column if not exists phone_norm text generated always as (public.normalize_phone(phone)) stored;
alter table public.leads add column if not exists email_norm text generated always as (public.normalize_email(email)) stored;
create index if not exists leads_phone_norm_idx on public.leads (phone_norm);
create index if not exists leads_email_norm_idx on public.leads (email_norm);

-- B2B firma adayları (bot araştırması): domain/telefon normalize + tekrar engeli
alter table public.companies add column if not exists domain_norm text generated always as (public.normalize_domain(website)) stored;
alter table public.companies add column if not exists phone_norm text generated always as (public.normalize_phone(public_phone)) stored;
alter table public.companies add column if not exists source text not null default 'manual';
alter table public.companies add column if not exists need text;
alter table public.companies add column if not exists project text;
alter table public.companies add column if not exists priority text not null default 'normal';
alter table public.companies add column if not exists bot_id uuid references public.automation_bots(id) on delete set null;
create unique index if not exists companies_domain_uniq on public.companies (domain_norm) where domain_norm is not null;
create index if not exists companies_phone_norm_idx on public.companies (phone_norm);

-- Tüm modüllerde duplicate arama
create or replace function public.find_customer_duplicates(p_phone text default null, p_email text default null, p_website text default null, p_name text default null)
returns table (module text, id uuid, label text, match_on text, status text)
language sql stable security invoker set search_path = public as $$
  with q as (select public.normalize_phone(p_phone) ph, public.normalize_email(p_email) em, public.normalize_domain(p_website) dm, nullif(lower(trim(p_name)), '') nm)
  select 'construction', c.id, coalesce(c.company, c.full_name), case when c.phone_norm = q.ph then 'telefon' when c.email_norm = q.em then 'e-posta' else 'isim' end, c.status
    from public.construction_customers c, q
   where c.archived_at is null and ((q.ph is not null and c.phone_norm = q.ph) or (q.em is not null and c.email_norm = q.em) or (q.nm is not null and lower(coalesce(c.company, c.full_name)) = q.nm))
  union all
  select 'rental', r.id, coalesce(r.company, r.contact_name), case when r.phone_norm = q.ph then 'telefon' when r.email_norm = q.em then 'e-posta' when r.domain_norm = q.dm then 'web sitesi' else 'isim' end, r.status
    from public.rental_customers r, q
   where r.archived_at is null and ((q.ph is not null and r.phone_norm = q.ph) or (q.em is not null and r.email_norm = q.em) or (q.dm is not null and r.domain_norm = q.dm) or (q.nm is not null and lower(coalesce(r.company, r.contact_name)) = q.nm))
  union all
  select 'lead', l.id, coalesce(l.company, l.full_name), case when l.phone_norm = q.ph then 'telefon' else 'e-posta' end, l.stage
    from public.leads l, q
   where (q.ph is not null and l.phone_norm = q.ph) or (q.em is not null and l.email_norm = q.em)
  union all
  select 'company', co.id, co.firm_name, case when co.domain_norm = q.dm then 'web sitesi' when co.phone_norm = q.ph then 'telefon' else 'isim' end, co.status
    from public.companies co, q
   where (q.dm is not null and co.domain_norm = q.dm) or (q.ph is not null and co.phone_norm = q.ph) or (q.nm is not null and lower(co.firm_name) = q.nm);
$$;
revoke execute on function public.find_customer_duplicates(text, text, text, text) from public, anon;
grant execute on function public.find_customer_duplicates(text, text, text, text) to authenticated;
