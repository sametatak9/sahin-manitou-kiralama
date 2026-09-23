-- EMBAY AI OPS — Yapay zekâ harcama freni: günlük / aylık / görev başı dolar sınırı + harcama defteri.
-- Sınır dolunca yeni AI çağrısı yapılmaz; görev "bütçe sınırı" ile durur. Additive; DROP yok (yalnız CHECK listeleri genişletildi).

create table if not exists public.ai_budget (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  daily_usd numeric(10,2) not null default 0.50 check (daily_usd >= 0),
  monthly_usd numeric(10,2) not null default 5.00 check (monthly_usd >= 0),
  per_mission_usd numeric(10,2) not null default 0.30 check (per_mission_usd >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.ai_budget (id) values (1) on conflict (id) do nothing;

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  source text not null check (source in ('mission', 'agent', 'generate', 'test', 'backfill')),
  ref_id uuid,
  provider text, model text,
  tokens_in int not null default 0, tokens_out int not null default 0, searches int not null default 0,
  cost_usd numeric(10,4) not null default 0
);
create index if not exists ai_usage_at_idx on public.ai_usage (at desc);

alter table public.ai_budget enable row level security;
alter table public.ai_usage enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'ai_budget' and policyname = 'ai_budget_team_select') then
    create policy ai_budget_team_select on public.ai_budget for select to authenticated using (public.is_team_member());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ai_usage' and policyname = 'ai_usage_team_select') then
    create policy ai_usage_team_select on public.ai_usage for select to authenticated using (public.is_team_member());
  end if;
end $$;

alter table public.bot_missions add column if not exists cost_usd numeric(10,4) not null default 0;
alter table public.bot_missions add column if not exists web_searches int not null default 0;

alter table public.bot_missions drop constraint if exists bot_missions_finish_reason_check;
alter table public.bot_missions add constraint bot_missions_finish_reason_check check (finish_reason = any (array['deadline', 'stop_condition', 'admin_stop', 'max_steps', 'error', 'no_ai', 'budget']));
alter table public.bot_missions drop constraint if exists bot_missions_error_kind_check;
alter table public.bot_missions add constraint bot_missions_error_kind_check check (error_kind is null or error_kind = any (array['ai_credit', 'ai_auth', 'repeated_error', 'timeout', 'budget']));

-- Harcama durumu (İstanbul günü / ayı)
create or replace function public.ai_spend_status() returns jsonb
language sql stable security definer set search_path = public as $$
  with b as (select * from public.ai_budget where id = 1),
  t as (select date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul' d0,
               date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul' m0)
  select jsonb_build_object(
    'enabled', b.enabled, 'daily_usd', b.daily_usd, 'monthly_usd', b.monthly_usd, 'per_mission_usd', b.per_mission_usd,
    'today_usd', coalesce((select sum(cost_usd) from public.ai_usage, t where at >= t.d0 and source <> 'backfill'), 0),
    'month_usd', coalesce((select sum(cost_usd) from public.ai_usage, t where at >= t.m0), 0),
    'updated_at', b.updated_at)
  from b;
$$;
revoke all on function public.ai_spend_status() from public, anon;
grant execute on function public.ai_spend_status() to authenticated, service_role;

create or replace function public.set_ai_budget(p_enabled boolean, p_daily numeric, p_monthly numeric, p_per_mission numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici harcama sınırını değiştirebilir' using errcode = '42501'; end if;
  if p_daily < 0 or p_monthly < 0 or p_per_mission < 0 then raise exception 'Sınır negatif olamaz'; end if;
  update public.ai_budget set enabled = p_enabled, daily_usd = p_daily, monthly_usd = p_monthly, per_mission_usd = p_per_mission, updated_by = auth.uid(), updated_at = now() where id = 1;
  perform public.write_audit('set_ai_budget', 'ai_budget', '1', format('Harcama sınırı: günlük $%s · aylık $%s · görev başı $%s · %s', p_daily, p_monthly, p_per_mission, case when p_enabled then 'açık' else 'KAPALI' end), '{}'::jsonb);
  return public.ai_spend_status();
end $$;
revoke all on function public.set_ai_budget(boolean, numeric, numeric, numeric) from public, anon;
grant execute on function public.set_ai_budget(boolean, numeric, numeric, numeric) to authenticated;

-- Geçmiş görevlerin tahmini maliyeti (aylık toplamda görünsün): Opus 5 $5/$25, Sonnet 5 $2/$10 (1M token başına)
insert into public.ai_usage (at, source, ref_id, provider, model, tokens_in, tokens_out, cost_usd)
select m.created_at, 'backfill', m.id, m.provider, m.model, m.tokens_in, m.tokens_out,
  round((m.tokens_in * case when m.model like 'claude-opus%' then 5 else 2 end + m.tokens_out * case when m.model like 'claude-opus%' then 25 else 10 end) / 1e6, 4)
from public.bot_missions m
where (m.tokens_in > 0 or m.tokens_out > 0) and not exists (select 1 from public.ai_usage u where u.ref_id = m.id);
update public.bot_missions m set cost_usd = u.cost_usd from public.ai_usage u where u.ref_id = m.id and u.source = 'backfill' and m.cost_usd = 0;
