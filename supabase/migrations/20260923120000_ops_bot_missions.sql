-- EMBAY AI OPS — Bot görevleri (mission) + adım günlüğü + rapor (additive; DROP yok)
-- Kullanıcı bir bota görev verir: amaç, hedef link, aranacak şey, raporlanacak şey, süre, bitiş koşulu.
-- Worker her dakika çalışan görevlerin bir adımını yürütür; süre dolunca / bitiş koşulu sağlanınca / yönetici
-- durdurunca rapor (özet + HTML belge) üretilir. Sonuç rastgele değildir: her adım gerçek HTTP / AI çağrısıdır.

create table if not exists public.bot_missions (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references public.automation_bots(id) on delete set null,
  title text not null check (length(btrim(title)) between 2 and 200),
  goal text not null check (length(btrim(goal)) between 3 and 4000),          -- görevin açıklaması / amacı
  target_url text check (target_url is null or target_url ~* '^https?://'),   -- incelenecek link (opsiyonel)
  search_for text,                                                             -- aranacak şey
  report_spec text,                                                            -- raporda ne olmalı
  stop_condition text,                                                         -- erken bitiş koşulu (opsiyonel)
  duration_minutes int not null default 10 check (duration_minutes between 1 and 240),
  status text not null default 'running' check (status in ('running', 'finalizing', 'completed', 'stopped', 'failed', 'blocked')),
  finish_reason text check (finish_reason in ('deadline', 'stop_condition', 'admin_stop', 'max_steps', 'error', 'no_ai')),
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  finished_at timestamptz,
  next_step_at timestamptz not null default now(),
  locked_until timestamptz,
  step_count int not null default 0,
  max_steps int not null default 30 check (max_steps between 1 and 200),
  provider text,
  model text,
  findings jsonb not null default '[]'::jsonb,   -- [{title, detail, url, evidence, at}]
  sources jsonb not null default '[]'::jsonb,    -- [{url, title}]
  visited jsonb not null default '[]'::jsonb,    -- ziyaret edilen URL'ler
  summary text,
  report_html text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  error text,
  stopped_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bot_missions_bot_idx on public.bot_missions (bot_id, created_at desc);
create index if not exists bot_missions_due_idx on public.bot_missions (next_step_at) where status in ('running', 'finalizing');

create table if not exists public.bot_mission_steps (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.bot_missions(id) on delete cascade,
  step_no int not null,
  action text not null,               -- fetch | ai_research | analyze | finalize | stop | error
  target text,                        -- URL veya arama sorgusu
  message text not null,
  data jsonb,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists bot_mission_steps_mission_idx on public.bot_mission_steps (mission_id, step_no);

alter table public.bot_missions enable row level security;
alter table public.bot_mission_steps enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bot_missions' and policyname = 'bot_missions_team_select') then
    create policy bot_missions_team_select on public.bot_missions for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bot_mission_steps' and policyname = 'bot_mission_steps_team_select') then
    create policy bot_mission_steps_team_select on public.bot_mission_steps for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'bot_missions_updated') then
    create trigger bot_missions_updated before update on public.bot_missions for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'bot_missions_audit') then
    create trigger bot_missions_audit after insert or update or delete on public.bot_missions for each row execute function public.log_audit();
  end if;
end $$;
-- Yazma işlemleri yalnızca ops edge function (service role) üzerinden: görev başlat / durdur API'si rol kontrolü yapar.

-- Worker için atomik görev alma (SKIP LOCKED + lease)
create or replace function public.claim_due_missions(p_limit int default 2, p_lease_seconds int default 150)
returns setof public.bot_missions
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select id from public.bot_missions
     where status in ('running', 'finalizing') and next_step_at <= now() and (locked_until is null or locked_until < now())
     order by next_step_at
     for update skip locked
     limit greatest(1, least(p_limit, 5))
  )
  update public.bot_missions m set locked_until = now() + make_interval(secs => p_lease_seconds)
    from due where m.id = due.id
  returning m.*;
end $$;
revoke all on function public.claim_due_missions(int, int) from public, anon, authenticated;
grant execute on function public.claim_due_missions(int, int) to service_role;

do $$
declare t text;
begin
  foreach t in array array['bot_missions', 'bot_mission_steps'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- pg_cron → missions worker (her dakika). Worker gizli anahtarı Vault'tan okunur.
do $$ begin
  if not exists (select 1 from cron.job where jobname = 'embay-missions-worker') then
    perform cron.schedule('embay-missions-worker', '* * * * *', $cron$
      select net.http_post(
        url := 'https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/missions/worker',
        headers := jsonb_build_object('content-type', 'application/json', 'x-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'embay_worker_secret')),
        body := '{"source":"pg_cron"}'::jsonb,
        timeout_milliseconds := 150000
      );
    $cron$);
  end if;
end $$;
