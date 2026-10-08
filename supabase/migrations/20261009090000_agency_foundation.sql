-- EMBAY AGENCY FOUNDATION
-- Ajans panelinin gelecekteki üyelik, model seçimi ve kredi/bakiye katmanı için additive temel.
-- Ödeme sağlayıcısı veya otomatik kredi yükleme yoktur; cüzdan hareketleri yalnızca güvenilir backend/webhook ile yazılabilir.

create table if not exists public.ai_model_catalog (
  model_key text primary key check (model_key ~ '^[a-z0-9][a-z0-9._-]{2,100}$'),
  provider text not null,
  display_name text not null,
  description text not null default '',
  capabilities text[] not null default '{}',
  input_usd_per_million numeric(12,6),
  output_usd_per_million numeric(12,6),
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ai_model_catalog
  (model_key, provider, display_name, description, capabilities, input_usd_per_million, output_usd_per_million, sort_order)
values
  ('claude-sonnet-5', 'anthropic', 'Claude Sonnet 5', 'Günlük bot görevleri için dengeli ve ekonomik varsayılan.', '{research,content,analysis}', 2, 10, 10),
  ('claude-opus-5', 'anthropic', 'Claude Opus 5', 'Karmaşık planlama ve yüksek muhakeme gerektiren işler.', '{research,planning,analysis}', 5, 25, 20),
  ('claude-haiku-4-5', 'anthropic', 'Claude Haiku 4.5', 'Kısa sınıflandırma, eleme ve hızlı içerik yardımcıları.', '{classification,content,fast}', null, null, 30),
  ('gemini-2.5-flash', 'gemini', 'Gemini 2.5 Flash', 'Metin sentezi ve düşük maliyetli yardımcı işler.', '{content,fast}', null, null, 40),
  ('gpt-4o-mini', 'openai', 'GPT-4o mini', 'Hızlı içerik ve yapılandırılmış yardımcı işler.', '{content,classification,fast}', null, null, 50)
on conflict (model_key) do update set
  provider = excluded.provider,
  display_name = excluded.display_name,
  description = excluded.description,
  capabilities = excluded.capabilities,
  input_usd_per_million = excluded.input_usd_per_million,
  output_usd_per_million = excluded.output_usd_per_million,
  sort_order = excluded.sort_order,
  updated_at = now();

create table if not exists public.agency_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  name text not null check (length(btrim(name)) between 2 and 120),
  plan_code text not null default 'owner' check (plan_code in ('owner', 'starter', 'growth', 'agency', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  default_model_key text not null default 'claude-sonnet-5' references public.ai_model_catalog(model_key),
  currency text not null default 'USD' check (currency in ('USD', 'TRY', 'EUR')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.agency_workspaces (slug, name, plan_code, default_model_key, currency)
values ('embay-agency', 'EMBAY Agency', 'owner', 'claude-sonnet-5', 'TRY')
on conflict (slug) do nothing;

create table if not exists public.agency_workspace_members (
  workspace_id uuid not null references public.agency_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.agency_workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agency_workspaces(id) on delete cascade,
  email text not null check (length(btrim(email)) between 5 and 320),
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  token_digest text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.agency_wallets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.agency_workspaces(id) on delete cascade,
  balance_credits numeric(18,4) not null default 0 check (balance_credits >= 0),
  reserved_credits numeric(18,4) not null default 0 check (reserved_credits >= 0),
  status text not null default 'not_configured' check (status in ('active', 'not_configured', 'frozen')),
  currency text not null default 'TRY' check (currency in ('USD', 'TRY', 'EUR')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (reserved_credits <= balance_credits)
);

insert into public.agency_wallets (workspace_id, currency)
select id, currency from public.agency_workspaces where slug = 'embay-agency'
on conflict (workspace_id) do nothing;

create table if not exists public.agency_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.agency_workspaces(id) on delete cascade,
  entry_type text not null check (entry_type in ('topup', 'debit', 'reserve', 'release', 'refund', 'adjustment')),
  amount_credits numeric(18,4) not null check (amount_credits <> 0),
  model_key text references public.ai_model_catalog(model_key) on delete set null,
  reason text not null default '',
  reference_type text,
  reference_id uuid,
  idempotency_key text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists agency_wallet_ledger_workspace_at_idx
  on public.agency_wallet_ledger(workspace_id, created_at desc);

create table if not exists public.bot_model_preferences (
  bot_id uuid primary key references public.automation_bots(id) on delete cascade,
  model_key text not null references public.ai_model_catalog(model_key),
  fallback_model_keys text[] not null default '{}',
  max_credits_per_run numeric(18,4) not null default 0 check (max_credits_per_run >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.agency_clients
  add column if not exists workspace_id uuid references public.agency_workspaces(id) on delete set null;

update public.agency_clients c
set workspace_id = w.id
from public.agency_workspaces w
where w.slug = 'embay-agency' and c.workspace_id is null;

create index if not exists agency_clients_workspace_idx on public.agency_clients(workspace_id);

alter table public.ai_model_catalog enable row level security;
alter table public.agency_workspaces enable row level security;
alter table public.agency_workspace_members enable row level security;
alter table public.agency_workspace_invites enable row level security;
alter table public.agency_wallets enable row level security;
alter table public.agency_wallet_ledger enable row level security;
alter table public.bot_model_preferences enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'ai_model_catalog' and policyname = 'ai_model_catalog_team_select') then
    create policy ai_model_catalog_team_select on public.ai_model_catalog for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'agency_workspaces' and policyname = 'agency_workspaces_team_select') then
    create policy agency_workspaces_team_select on public.agency_workspaces for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'agency_workspace_members' and policyname = 'agency_workspace_members_team_select') then
    create policy agency_workspace_members_team_select on public.agency_workspace_members for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'agency_workspace_invites' and policyname = 'agency_workspace_invites_admin_select') then
    create policy agency_workspace_invites_admin_select on public.agency_workspace_invites for select to authenticated using (public.is_team_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'agency_wallets' and policyname = 'agency_wallets_team_select') then
    create policy agency_wallets_team_select on public.agency_wallets for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'agency_wallet_ledger' and policyname = 'agency_wallet_ledger_team_select') then
    create policy agency_wallet_ledger_team_select on public.agency_wallet_ledger for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bot_model_preferences' and policyname = 'bot_model_preferences_team_select') then
    create policy bot_model_preferences_team_select on public.bot_model_preferences for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bot_model_preferences' and policyname = 'bot_model_preferences_admin_write') then
    create policy bot_model_preferences_admin_write on public.bot_model_preferences for all to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
  end if;
end $$;

create or replace function public.agency_workspace_overview(p_workspace_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_workspace public.agency_workspaces%rowtype;
  v_wallet public.agency_wallets%rowtype;
  v_today timestamptz := date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
  v_month timestamptz := date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
begin
  if auth.uid() is not null and not public.is_team_member() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  select * into v_workspace from public.agency_workspaces
  where (p_workspace_id is not null and id = p_workspace_id)
     or (p_workspace_id is null and slug = 'embay-agency')
  order by created_at
  limit 1;
  if v_workspace.id is null then return '{}'::jsonb; end if;
  select * into v_wallet from public.agency_wallets where workspace_id = v_workspace.id;
  return jsonb_build_object(
    'workspace', jsonb_build_object('id', v_workspace.id, 'slug', v_workspace.slug, 'name', v_workspace.name, 'plan_code', v_workspace.plan_code, 'status', v_workspace.status, 'default_model_key', v_workspace.default_model_key, 'currency', v_workspace.currency),
    'wallet', jsonb_build_object('balance_credits', coalesce(v_wallet.balance_credits, 0), 'reserved_credits', coalesce(v_wallet.reserved_credits, 0), 'available_credits', greatest(coalesce(v_wallet.balance_credits, 0) - coalesce(v_wallet.reserved_credits, 0), 0), 'status', coalesce(v_wallet.status, 'not_configured'), 'currency', coalesce(v_wallet.currency, v_workspace.currency)),
    'models_active', (select count(*) from public.ai_model_catalog where active),
    'budget', (select coalesce(public.ai_spend_status(), '{}'::jsonb)),
    'updated_at', greatest(v_workspace.updated_at, coalesce(v_wallet.updated_at, v_workspace.updated_at))
  );
end $$;

revoke all on function public.agency_workspace_overview(uuid) from public, anon;
grant execute on function public.agency_workspace_overview(uuid) to authenticated, service_role;
