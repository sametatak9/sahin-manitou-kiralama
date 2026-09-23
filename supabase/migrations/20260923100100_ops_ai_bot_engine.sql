-- EMBAY AI OPS — 2/6: AI katmanı + Bot Engine (bot, skill, tool, run, log)

-- ── AI agent konfigürasyonu (provider bağımsız) ──────────────────────────────
create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null unique,
  name text not null,
  provider text not null default 'anthropic' check (provider in ('anthropic','openai','gemini')),
  model text not null,
  temperature numeric not null default 0.6 check (temperature between 0 and 2),
  max_tokens integer not null default 2000 check (max_tokens between 64 and 64000),
  system_prompt text not null default '',
  tool_keys text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger ai_agents_updated before update on public.ai_agents for each row execute function public.set_updated_at();

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.ai_agents(id) on delete set null,
  provider text not null,
  model text not null,
  kind text not null,
  status text not null check (status in ('succeeded','failed','configuration_required')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  tokens_in integer,
  tokens_out integer,
  duration_ms integer,
  run_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists ai_generations_created_idx on public.ai_generations (created_at desc);

-- ── Tool registry ────────────────────────────────────────────────────────────
create table if not exists public.automation_tools (
  id uuid primary key default gen_random_uuid(),
  tool_key text not null unique,
  name text not null,
  description text not null,
  category text not null default 'content',
  min_role text not null default 'staff' check (min_role in ('staff','admin')),
  approval_required boolean not null default false,
  platform text,
  input_schema jsonb not null default '{"type":"object","properties":{}}'::jsonb,
  output_schema jsonb not null default '{"type":"object"}'::jsonb,
  handler text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger automation_tools_updated before update on public.automation_tools for each row execute function public.set_updated_at();

-- ── Skill genişletme (mevcut 5 skill korunur) ────────────────────────────────
alter table public.automation_skills add column if not exists category text not null default 'general';
alter table public.automation_skills add column if not exists icon text;
alter table public.automation_skills add column if not exists instructions text not null default '';
alter table public.automation_skills add column if not exists execution_mode text not null default 'agent';
alter table public.automation_skills add column if not exists pipeline text[] not null default '{}';
alter table public.automation_skills add column if not exists output_schema jsonb;
alter table public.automation_skills add column if not exists updated_at timestamptz not null default now();
alter table public.automation_skills add column if not exists archived_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'automation_skills_execution_mode_check') then
    alter table public.automation_skills add constraint automation_skills_execution_mode_check check (execution_mode in ('agent','pipeline'));
  end if;
end $$;
drop trigger if exists automation_skills_updated on public.automation_skills;
create trigger automation_skills_updated before update on public.automation_skills for each row execute function public.set_updated_at();

create table if not exists public.automation_skill_tools (
  skill_id uuid not null references public.automation_skills(id) on delete cascade,
  tool_id uuid not null references public.automation_tools(id) on delete cascade,
  primary key (skill_id, tool_id)
);
create index if not exists automation_skill_tools_tool_idx on public.automation_skill_tools (tool_id);

-- ── Botlar: configuration + skills + tools + permissions + schedules ─────────
create table if not exists public.automation_bots (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}$'),
  name text not null,
  bot_type text not null default 'custom',
  platform text,
  icon text not null default 'bot',
  description text not null default '',
  instructions text not null default '',
  ai_agent_id uuid references public.ai_agents(id) on delete set null,
  connector_key text,
  permissions jsonb not null default '{"denied_tools":[],"max_runs_per_day":24}'::jsonb,
  status text not null default 'active' check (status in ('active','paused','waiting_connection','archived')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists automation_bots_status_idx on public.automation_bots (status);
create trigger automation_bots_updated before update on public.automation_bots for each row execute function public.set_updated_at();

create table if not exists public.automation_bot_skills (
  bot_id uuid not null references public.automation_bots(id) on delete cascade,
  skill_id uuid not null references public.automation_skills(id) on delete cascade,
  position integer not null default 0,
  primary key (bot_id, skill_id)
);
create index if not exists automation_bot_skills_skill_idx on public.automation_bot_skills (skill_id);

-- ── Görevler: scheduler alanları ─────────────────────────────────────────────
alter table public.automation_tasks add column if not exists bot_id uuid references public.automation_bots(id) on delete set null;
alter table public.automation_tasks add column if not exists title text;
alter table public.automation_tasks add column if not exists content_id uuid references public.social_drafts(id) on delete set null;
alter table public.automation_tasks add column if not exists cron_expression text;
alter table public.automation_tasks add column if not exists run_at timestamptz;
alter table public.automation_tasks add column if not exists run_time text;
alter table public.automation_tasks add column if not exists timezone text not null default 'Europe/Istanbul';
alter table public.automation_tasks add column if not exists enabled boolean not null default true;
alter table public.automation_tasks add column if not exists last_run_at timestamptz;
alter table public.automation_tasks add column if not exists last_run_status text;
alter table public.automation_tasks add column if not exists attempt integer not null default 0;
alter table public.automation_tasks add column if not exists max_retries integer not null default 3 check (max_retries between 0 and 10);
alter table public.automation_tasks add column if not exists timeout_seconds integer not null default 120 check (timeout_seconds between 5 and 600);
alter table public.automation_tasks add column if not exists locked_by text;
alter table public.automation_tasks add column if not exists locked_until timestamptz;
alter table public.automation_tasks add column if not exists dead_lettered_at timestamptz;
alter table public.automation_tasks add column if not exists last_error text;
alter table public.automation_tasks add column if not exists archived_at timestamptz;

alter table public.automation_tasks drop constraint if exists automation_tasks_status_check;
alter table public.automation_tasks add constraint automation_tasks_status_check check (status in ('queued','scheduled','running','paused','completed','failed','cancelled','dead_letter'));
alter table public.automation_tasks drop constraint if exists automation_tasks_schedule_type_check;
alter table public.automation_tasks add constraint automation_tasks_schedule_type_check check (schedule_type in ('manual','once','hourly','daily','weekly','monthly','cron','event'));
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'automation_tasks_run_time_check') then
    alter table public.automation_tasks add constraint automation_tasks_run_time_check check (run_time is null or run_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  end if;
end $$;

create index if not exists automation_tasks_due_idx on public.automation_tasks (next_run_at) where enabled and archived_at is null and status in ('queued','scheduled','running');
create index if not exists automation_tasks_bot_idx on public.automation_tasks (bot_id);
drop trigger if exists automation_tasks_updated on public.automation_tasks;
create trigger automation_tasks_updated before update on public.automation_tasks for each row execute function public.set_updated_at();

-- ── Çalışma geçmişi: mevcut social_bot_runs genişletilir (duplicate tablo yok) ─
alter table public.social_bot_runs add column if not exists task_id uuid references public.automation_tasks(id) on delete set null;
alter table public.social_bot_runs add column if not exists bot_id uuid references public.automation_bots(id) on delete set null;
alter table public.social_bot_runs add column if not exists skill_id uuid references public.automation_skills(id) on delete set null;
alter table public.social_bot_runs add column if not exists attempt integer not null default 1;
alter table public.social_bot_runs add column if not exists trigger text not null default 'manual';
alter table public.social_bot_runs add column if not exists worker_id text;
alter table public.social_bot_runs add column if not exists input jsonb not null default '{}'::jsonb;
alter table public.social_bot_runs add column if not exists output jsonb;
alter table public.social_bot_runs add column if not exists summary text;
alter table public.social_bot_runs add column if not exists error text;
alter table public.social_bot_runs add column if not exists error_code text;
alter table public.social_bot_runs add column if not exists duration_ms integer;
alter table public.social_bot_runs add column if not exists tokens_in integer;
alter table public.social_bot_runs add column if not exists tokens_out integer;
alter table public.social_bot_runs drop constraint if exists social_bot_runs_status_check;
alter table public.social_bot_runs add constraint social_bot_runs_status_check check (status in ('planned','queued','running','completed','blocked','failed','timeout','awaiting_approval'));
create index if not exists social_bot_runs_bot_idx on public.social_bot_runs (bot_id, created_at desc);
create index if not exists social_bot_runs_task_idx on public.social_bot_runs (task_id, created_at desc);
create index if not exists social_bot_runs_created_idx on public.social_bot_runs (created_at desc);

create table if not exists public.automation_run_logs (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.social_bot_runs(id) on delete cascade,
  at timestamptz not null default now(),
  level text not null default 'info' check (level in ('debug','info','warn','error')),
  message text not null,
  data jsonb
);
create index if not exists automation_run_logs_run_idx on public.automation_run_logs (run_id, at);

-- ── RLS ──────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['ai_agents','automation_tools','automation_skill_tools','automation_bots','automation_bot_skills'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ops_read on public.%I for select to authenticated using (public.is_team_member())', t);
    execute format('create policy ops_admin_write on public.%I for insert to authenticated with check (public.is_team_admin())', t);
    execute format('create policy ops_admin_update on public.%I for update to authenticated using (public.is_team_admin()) with check (public.is_team_admin())', t);
    execute format('create policy ops_admin_delete on public.%I for delete to authenticated using (public.is_team_admin())', t);
  end loop;
end $$;
alter table public.ai_generations enable row level security;
create policy ops_read on public.ai_generations for select to authenticated using (public.is_team_member());
alter table public.automation_run_logs enable row level security;
create policy ops_read on public.automation_run_logs for select to authenticated using (public.is_team_member());

do $$
declare t text;
begin
  foreach t in array array['ai_agents','automation_tools','automation_bots','automation_bot_skills','automation_skill_tools'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_audit()', t || '_audit', t);
  end loop;
end $$;

-- ── Scheduler RPC'leri (yalnızca service_role / worker) ──────────────────────
-- Aynı görevin iki worker tarafından aynı anda çalışmasını SKIP LOCKED + lease ile engeller.
create or replace function public.claim_due_tasks(p_worker text, p_limit integer default 5, p_lease_seconds integer default 300)
returns setof public.automation_tasks
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select t.id from public.automation_tasks t
    left join public.automation_bots b on b.id = t.bot_id
    where t.enabled and t.archived_at is null and t.next_run_at is not null and t.next_run_at <= now()
      and (b.id is null or b.status in ('active','waiting_connection'))
      and (
        (t.status in ('queued','scheduled') and (t.locked_until is null or t.locked_until < now()))
        or (t.status = 'running' and t.locked_until < now())
      )
    order by t.next_run_at
    limit greatest(1, least(p_limit, 25))
    for update of t skip locked
  )
  update public.automation_tasks t
     set status = 'running', locked_by = p_worker, locked_until = now() + make_interval(secs => p_lease_seconds), attempt = t.attempt + 1
    from due where t.id = due.id
  returning t.*;
end $$;
revoke execute on function public.claim_due_tasks(text, integer, integer) from public, anon, authenticated;

-- Tek bir görevi hemen kilitle (Şimdi çalıştır). Zaten çalışıyorsa null döner.
create or replace function public.claim_task_now(p_task_id uuid, p_worker text, p_lease_seconds integer default 300)
returns setof public.automation_tasks
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.automation_tasks t
     set status = 'running', locked_by = p_worker, locked_until = now() + make_interval(secs => p_lease_seconds), attempt = t.attempt + 1, next_run_at = coalesce(t.next_run_at, now())
   where t.id = p_task_id and t.archived_at is null
     and not (t.status = 'running' and t.locked_until > now())
  returning t.*;
end $$;
revoke execute on function public.claim_task_now(uuid, text, integer) from public, anon, authenticated;
