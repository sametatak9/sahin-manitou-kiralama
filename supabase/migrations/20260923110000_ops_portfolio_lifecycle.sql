-- EMBAY AI OPS — Portföy + yaşam döngüsü + araştırma kanıtı (additive; DROP yok, veri silme yok)
-- İNTERNET → PAZAR ARAŞTIRMASI → PROJE KEŞFİ → FİRMA KEŞFİ → FIRSAT → PORTFÖY → CRM
-- Kurallar:
--   * Firma/proje kaydı kaynak URL olmadan oluşmaz; her alan için kanıt (portfolio_evidence) tutulur.
--   * Aynı firma ikinci kez oluşturulmaz: domain / telefon / normalize ad ile eşleşir, mevcut kayıt zenginleştirilir.
--   * Yaşam döngüsü (DISCOVERED→…→WON/LOST) yalnızca advance_lifecycle() ile değişir ve her geçiş lifecycle_events'e yazılır.
--   * Botlar en fazla CONTACTABLE aşamasına taşıyabilir; iletişim ve sonrası insan işidir.

-- ── Yardımcılar ──────────────────────────────────────────────────────────────
create or replace function public.normalize_firm_name(p text) returns text
language sql immutable as $$
  select nullif(btrim(regexp_replace(
    regexp_replace(
      regexp_replace(
        translate(lower(translate(coalesce(p, ''), 'İIŞĞÜÖÇ', 'iışğüöç')), 'ışğüöçâîû', 'isguocaiu'),
        '[^a-z0-9 ]', ' ', 'g'),
      '\m(ltd|sti|limited|sirketi|sirket|as|a s|anonim|tic|ticaret|san|sanayi|ve|ins|insaat|taah|taahhut|muh|muhendislik|co|inc|gmbh)\M', ' ', 'g'),
    '\s+', ' ', 'g')), '')
$$;

create or replace function public.lifecycle_rank(p text) returns int
language sql immutable as $$
  select case p when 'DISCOVERED' then 1 when 'QUALIFIED' then 2 when 'CONTACTABLE' then 3 when 'CONTACTED' then 4
    when 'RESPONSE' then 5 when 'MEETING' then 6 when 'OFFER' then 7 when 'WON' then 8 when 'LOST' then 9 else 0 end
$$;

-- ── Firma portföyü: companies genişletilir ───────────────────────────────────
alter table public.companies add column if not exists name_norm text generated always as (public.normalize_firm_name(firm_name)) stored;
alter table public.companies add column if not exists lifecycle_stage text not null default 'DISCOVERED';
alter table public.companies add column if not exists il text;
alter table public.companies add column if not exists address text;
alter table public.companies add column if not exists contact_person text;
alter table public.companies add column if not exists contact_title text;
alter table public.companies add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists ai_notes text;
alter table public.companies add column if not exists priority_score int;
alter table public.companies add column if not exists priority_reasons jsonb not null default '[]'::jsonb;
alter table public.companies add column if not exists first_seen_at timestamptz not null default now();
alter table public.companies add column if not exists last_checked_at timestamptz;
alter table public.companies add column if not exists source_count int not null default 1;
alter table public.companies add column if not exists conflicts jsonb not null default '[]'::jsonb;
alter table public.companies add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.companies add column if not exists next_action text;
alter table public.companies add column if not exists next_action_at timestamptz;
alter table public.companies add column if not exists merged_into uuid references public.companies(id) on delete set null;
alter table public.companies add column if not exists archived_at timestamptz;
alter table public.companies add column if not exists finding_id uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'companies_lifecycle_stage_check') then
    alter table public.companies add constraint companies_lifecycle_stage_check check (public.lifecycle_rank(lifecycle_stage) > 0);
  end if;
end $$;
create index if not exists companies_name_norm_idx on public.companies (name_norm);
create index if not exists companies_lifecycle_idx on public.companies (lifecycle_stage) where archived_at is null;

-- Mevcut satırların aşaması eski durumdan türetilir (veri kaybı yok; status korunur)
update public.companies set lifecycle_stage = case status when 'iletisim' then 'CONTACTED' when 'teklif' then 'OFFER' when 'musteri' then 'WON' when 'red' then 'LOST' else 'DISCOVERED' end
 where lifecycle_stage = 'DISCOVERED' and status <> 'aday';

-- ── Pazar araştırması bulguları (her bot araştırmasının ham çıktısı) ─────────
create table if not exists public.research_findings (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references public.automation_bots(id) on delete set null,
  task_id uuid references public.automation_tasks(id) on delete set null,
  run_id uuid references public.social_bot_runs(id) on delete set null,
  focus text not null default 'project_discovery' check (focus in ('project_discovery', 'company_discovery', 'market', 'competitor', 'seo')),
  query text not null,
  region text,
  status text not null default 'researched' check (status in ('researching', 'researched', 'ingested', 'no_data', 'failed')),
  summary text,
  report text,
  sources jsonb not null default '[]'::jsonb,        -- [{url,title,page_age,cited_text}]
  candidates jsonb not null default '[]'::jsonb,     -- AI'nın çıkardığı adaylar (doğrulanmamış)
  accepted jsonb not null default '[]'::jsonb,       -- kaynak doğrulamasından geçip portföye yazılanlar
  rejected jsonb not null default '[]'::jsonb,       -- [{name, reason}]
  search_count int,
  tokens_in int, tokens_out int,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists research_findings_created_idx on public.research_findings (created_at desc);

-- ── Proje portföyü ───────────────────────────────────────────────────────────
create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 200),
  name_norm text generated always as (public.normalize_firm_name(name)) stored,
  project_type text not null default 'diger' check (project_type in ('kentsel_donusum', 'konut', 'ticari', 'altyapi', 'fabrika', 'depo_lojistik', 'kamu', 'diger')),
  il text,
  ilce text,
  address text,
  stage text not null default 'bilinmiyor' check (stage in ('planlama', 'ihale', 'ruhsat', 'yikim', 'kazi', 'kaba_insaat', 'ince_insaat', 'tamamlandi', 'bilinmiyor')),
  estimated_need text,
  machine_need jsonb not null default '{}'::jsonb,
  source_url text not null check (source_url ~* '^https?://'),
  source_title text,
  ai_notes text,
  priority_score int,
  priority_reasons jsonb not null default '[]'::jsonb,
  lifecycle_stage text not null default 'DISCOVERED' check (public.lifecycle_rank(lifecycle_stage) > 0),
  first_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  source_count int not null default 1,
  conflicts jsonb not null default '[]'::jsonb,
  owner_id uuid references auth.users(id) on delete set null,
  next_action text,
  next_action_at timestamptz,
  bot_id uuid references public.automation_bots(id) on delete set null,
  finding_id uuid references public.research_findings(id) on delete set null,
  merged_into uuid references public.portfolio_projects(id) on delete set null,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists portfolio_projects_name_idx on public.portfolio_projects (name_norm, ilce);
create index if not exists portfolio_projects_lifecycle_idx on public.portfolio_projects (lifecycle_stage) where archived_at is null;

create table if not exists public.portfolio_project_companies (
  project_id uuid not null references public.portfolio_projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'yuklenici' check (role in ('isveren', 'yuklenici', 'alt_yuklenici', 'mimar', 'lojistik', 'tedarikci', 'diger')),
  source_url text,
  created_at timestamptz not null default now(),
  primary key (project_id, company_id, role)
);

-- ── Alan bazlı kanıt (hangi bilgi hangi kaynaktan) ──────────────────────────
create table if not exists public.portfolio_evidence (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('company', 'project')),
  entity_id uuid not null,
  field text not null,
  value text,
  source_url text not null,
  source_title text,
  snippet text,
  verified boolean not null default false,       -- kaynak sayfası gerçekten çekildi ve değer sayfada bulundu
  verified_at timestamptz,
  finding_id uuid references public.research_findings(id) on delete set null,
  bot_id uuid references public.automation_bots(id) on delete set null,
  run_id uuid references public.social_bot_runs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists portfolio_evidence_entity_idx on public.portfolio_evidence (entity_type, entity_id);

-- ── Yaşam döngüsü geçmişi ────────────────────────────────────────────────────
create table if not exists public.lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('company', 'project')),
  entity_id uuid not null,
  from_stage text,
  to_stage text not null,
  source text not null default 'manual',
  note text,
  next_action text,
  next_action_at timestamptz,
  actor_id uuid references auth.users(id) on delete set null,
  actor_kind text not null default 'user' check (actor_kind in ('user', 'bot', 'system')),
  bot_id uuid references public.automation_bots(id) on delete set null,
  run_id uuid references public.social_bot_runs(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  project_id uuid references public.portfolio_projects(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lifecycle_events_entity_idx on public.lifecycle_events (entity_type, entity_id, created_at desc);

-- ── RLS: yalnızca ekip üyeleri; silme politikası yok (arşivleme kullanılır) ──
alter table public.research_findings enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.portfolio_project_companies enable row level security;
alter table public.portfolio_evidence enable row level security;
alter table public.lifecycle_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array['research_findings', 'portfolio_projects', 'portfolio_project_companies', 'portfolio_evidence', 'lifecycle_events'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_team_select') then
      execute format('create policy %I on public.%I for select to authenticated using (public.is_team_member())', t || '_team_select', t);
    end if;
  end loop;
  foreach t in array array['portfolio_projects', 'portfolio_project_companies', 'portfolio_evidence'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_team_insert') then
      execute format('create policy %I on public.%I for insert to authenticated with check (public.is_team_member())', t || '_team_insert', t);
    end if;
  end loop;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'portfolio_projects' and policyname = 'portfolio_projects_team_update') then
    create policy portfolio_projects_team_update on public.portfolio_projects for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
  end if;
end $$;

-- updated_at + audit (idempotent; DROP kullanılmaz)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'research_findings_updated') then
    create trigger research_findings_updated before update on public.research_findings for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'portfolio_projects_updated') then
    create trigger portfolio_projects_updated before update on public.portfolio_projects for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'portfolio_projects_audit') then
    create trigger portfolio_projects_audit after insert or update or delete on public.portfolio_projects for each row execute function public.log_audit();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'companies_audit') then
    create trigger companies_audit after insert or update or delete on public.companies for each row execute function public.log_audit();
  end if;
end $$;

