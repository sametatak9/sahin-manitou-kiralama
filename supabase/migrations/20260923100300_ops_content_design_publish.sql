-- EMBAY AI OPS — 4/7: içerik planlama, marka kiti, Design Studio, yayın kaydı, metrikler, connector durumu

-- ── Aylık kampanya / plan ────────────────────────────────────────────────────
create table if not exists public.content_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  month date not null check (extract(day from month) = 1),
  brand text not null default 'İkisi',
  goal text,
  platforms text[] not null default '{}',
  status text not null default 'planning' check (status in ('planning','active','completed','archived')),
  plan jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_campaigns_month_idx on public.content_campaigns (month desc);
create trigger content_campaigns_updated before update on public.content_campaigns for each row execute function public.set_updated_at();

-- ── Marka kiti ───────────────────────────────────────────────────────────────
create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  company_name text not null,
  logo_url text,
  primary_color text not null default '#3DAA5C' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#115A31' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#F5B301' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#0F1A14' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_heading text not null default 'Inter',
  font_body text not null default 'Inter',
  phone text,
  website text,
  instagram text,
  address text,
  default_cta text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists brand_kits_single_default on public.brand_kits (is_default) where is_default;
create trigger brand_kits_updated before update on public.brand_kits for each row execute function public.set_updated_at();

-- ── Tasarım şablonları ve tasarımlar ─────────────────────────────────────────
create table if not exists public.design_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  format_key text not null,
  platform text not null,
  width integer not null check (width between 100 and 4000),
  height integer not null check (height between 100 and 4000),
  layout jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger design_templates_updated before update on public.design_templates for each row execute function public.set_updated_at();

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.social_drafts(id) on delete set null,
  template_id uuid references public.design_templates(id) on delete set null,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  provider text not null default 'embay_studio' check (provider in ('embay_studio','canva')),
  name text not null default 'Yeni tasarım',
  format_key text not null,
  width integer not null,
  height integer not null,
  layers jsonb not null default '[]'::jsonb,
  canva_design_id text,
  canva_edit_url text,
  canva_view_url text,
  export_url text,
  export_path text,
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft','exported','synced','error')),
  last_synced_at timestamptz,
  last_error text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists designs_content_idx on public.designs (content_id);
create trigger designs_updated before update on public.designs for each row execute function public.set_updated_at();

-- ── social_drafts: içerik üretim merkezi alanları ────────────────────────────
alter table public.social_drafts add column if not exists workflow_status text not null default 'draft';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'social_drafts_workflow_status_check') then
    alter table public.social_drafts add constraint social_drafts_workflow_status_check check (workflow_status in ('draft','pending_approval','approved','rejected','scheduled','processing','published','failed','cancelled'));
  end if;
end $$;
-- Mevcut Türkçe durumları kanonik akışa eşle (şu an 0 satır; ileride gelenler için güvenli)
update public.social_drafts set workflow_status = case status
  when 'onay_bekliyor' then 'pending_approval' when 'onaylandi' then 'approved' when 'planlandi' then 'scheduled'
  when 'yayinda' then 'published' when 'hata' then 'failed' else 'draft' end
where workflow_status = 'draft' and status <> 'taslak';

alter table public.social_drafts add column if not exists campaign_id uuid references public.content_campaigns(id) on delete set null;
alter table public.social_drafts add column if not exists bot_id uuid references public.automation_bots(id) on delete set null;
alter table public.social_drafts add column if not exists skill_id uuid references public.automation_skills(id) on delete set null;
alter table public.social_drafts add column if not exists task_id uuid references public.automation_tasks(id) on delete set null;
alter table public.social_drafts add column if not exists design_id uuid references public.designs(id) on delete set null;
alter table public.social_drafts add column if not exists brand_kit_id uuid references public.brand_kits(id) on delete set null;
alter table public.social_drafts add column if not exists approval_request_id uuid references public.approval_requests(id) on delete set null;
alter table public.social_drafts add column if not exists ai_generation_id uuid references public.ai_generations(id) on delete set null;
alter table public.social_drafts add column if not exists primary_platform text;
alter table public.social_drafts add column if not exists format text;
alter table public.social_drafts add column if not exists headline text;
alter table public.social_drafts add column if not exists caption text;
alter table public.social_drafts add column if not exists hashtags text[] not null default '{}';
alter table public.social_drafts add column if not exists cta text;
alter table public.social_drafts add column if not exists audience text;
alter table public.social_drafts add column if not exists objective text;
alter table public.social_drafts add column if not exists tone text;
alter table public.social_drafts add column if not exists image_brief text;
alter table public.social_drafts add column if not exists design_brief text;
alter table public.social_drafts add column if not exists video_url text;
create index if not exists social_drafts_workflow_idx on public.social_drafts (workflow_status, scheduled_at);
create index if not exists social_drafts_campaign_idx on public.social_drafts (campaign_id);

-- ── Connector durumu: social_accounts platform hesabı olarak genişler ────────
alter table public.social_accounts add column if not exists connector_key text;
alter table public.social_accounts add column if not exists connection_status text not null default 'not_connected';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'social_accounts_connection_status_check') then
    alter table public.social_accounts add constraint social_accounts_connection_status_check check (connection_status in ('not_connected','oauth_required','config_required','api_key_required','connected','expired','error','manual_only','api_unavailable'));
  end if;
end $$;
alter table public.social_accounts add column if not exists external_account_id text;
alter table public.social_accounts add column if not exists external_account_name text;
alter table public.social_accounts add column if not exists scopes text[] not null default '{}';
alter table public.social_accounts add column if not exists token_expires_at timestamptz;
alter table public.social_accounts add column if not exists last_verified_at timestamptz;
alter table public.social_accounts add column if not exists capabilities jsonb not null default '{}'::jsonb;
alter table public.social_accounts add column if not exists credential_secret_id uuid;
alter table public.social_accounts add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.social_accounts add column if not exists last_error text;
create unique index if not exists social_accounts_connector_ext_uniq on public.social_accounts (connector_key, external_account_id) where external_account_id is not null;
drop trigger if exists social_accounts_updated on public.social_accounts;
create trigger social_accounts_updated before update on public.social_accounts for each row execute function public.set_updated_at();

alter table public.communication_integrations drop constraint if exists communication_integrations_channel_check;
alter table public.communication_integrations add constraint communication_integrations_channel_check check (channel in ('whatsapp_web','whatsapp_cloud','email','telegram'));

-- OAuth state (PKCE) — yalnızca service_role erişir (RLS açık, politika yok)
create table if not exists public.oauth_states (
  state text primary key,
  provider text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text,
  redirect_to text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);
alter table public.oauth_states enable row level security;

-- Token'lar Vault'ta; yalnızca service_role bu sarmalayıcıları çağırabilir
create or replace function public.store_connector_secret(p_name text, p_secret text, p_existing uuid default null)
returns uuid language plpgsql security definer set search_path = public, vault as $$
declare v_id uuid;
begin
  if p_existing is not null and exists (select 1 from vault.secrets where id = p_existing) then
    perform vault.update_secret(p_existing, p_secret, p_name);
    return p_existing;
  end if;
  select vault.create_secret(p_secret, p_name || '_' || replace(gen_random_uuid()::text, '-', ''), 'embay connector token') into v_id;
  return v_id;
end $$;
revoke execute on function public.store_connector_secret(text, text, uuid) from public, anon, authenticated;

create or replace function public.read_connector_secret(p_id uuid)
returns text language sql security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_id;
$$;
revoke execute on function public.read_connector_secret(uuid) from public, anon, authenticated;

-- ── Yayın kaydı ve metrikler ─────────────────────────────────────────────────
create table if not exists public.social_publications (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.social_drafts(id) on delete set null,
  design_id uuid references public.designs(id) on delete set null,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  platform text not null,
  account_id uuid references public.social_accounts(id) on delete set null,
  caption text not null default '',
  media_urls text[] not null default '{}',
  scheduled_at timestamptz,
  published_at timestamptz,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','rejected','scheduled','processing','published','failed','cancelled')),
  external_post_id text,
  external_url text,
  error text,
  api_response jsonb,
  attempt integer not null default 0,
  next_attempt_at timestamptz,
  created_by uuid default auth.uid(),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_publications_due_idx on public.social_publications (scheduled_at) where status in ('approved','scheduled');
create index if not exists social_publications_content_idx on public.social_publications (content_id);
create trigger social_publications_updated before update on public.social_publications for each row execute function public.set_updated_at();
create trigger social_publications_audit after insert or update or delete on public.social_publications for each row execute function public.log_audit();

create table if not exists public.social_post_metrics (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.social_publications(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  source text not null default 'api' check (source in ('api','manual')),
  reach integer, impressions integer, likes integer, comments integer, shares integer, saves integer, clicks integer, video_views integer,
  raw jsonb
);
create index if not exists social_post_metrics_pub_idx on public.social_post_metrics (publication_id, fetched_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['content_campaigns','designs','social_publications','social_post_metrics'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ops_read on public.%I for select to authenticated using (public.is_team_member())', t);
    execute format('create policy ops_insert on public.%I for insert to authenticated with check (public.is_team_member())', t);
    execute format('create policy ops_update on public.%I for update to authenticated using (public.is_team_member()) with check (public.is_team_member())', t);
    execute format('create policy ops_admin_delete on public.%I for delete to authenticated using (public.is_team_admin())', t);
  end loop;
  foreach t in array array['brand_kits','design_templates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ops_read on public.%I for select to authenticated using (public.is_team_member())', t);
    execute format('create policy ops_admin_write on public.%I for insert to authenticated with check (public.is_team_admin())', t);
    execute format('create policy ops_admin_update on public.%I for update to authenticated using (public.is_team_admin()) with check (public.is_team_admin())', t);
    execute format('create policy ops_admin_delete on public.%I for delete to authenticated using (public.is_team_admin())', t);
  end loop;
end $$;
-- Yayın durumunu yalnızca worker (service_role) "published" yapabilir
create or replace function public.guard_publication_status() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.role() = 'authenticated' and new.status in ('published','processing') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    raise exception 'Yayın durumu yalnızca platform API yanıtıyla güncellenebilir' using errcode = '42501';
  end if;
  if auth.role() = 'authenticated' and tg_op = 'UPDATE' and (new.external_post_id is distinct from old.external_post_id) then
    raise exception 'external_post_id yalnızca platform API yanıtından yazılır' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger social_publications_guard before insert or update on public.social_publications for each row execute function public.guard_publication_status();

-- ── Storage: tasarım çıktıları (Instagram API public URL ister) ──────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('design-exports', 'design-exports', true, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy design_exports_member_insert on storage.objects for insert to authenticated with check (bucket_id = 'design-exports' and public.is_team_member());
create policy design_exports_member_update on storage.objects for update to authenticated using (bucket_id = 'design-exports' and public.is_team_member());
create policy design_exports_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'design-exports' and public.is_team_admin());
