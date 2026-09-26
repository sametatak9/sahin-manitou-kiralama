-- EMBAY AI OPS — Otopilot: tek düğmeyle bütün botları başlat / durdur.
-- Mesai penceresi (varsayılan 08:00–18:00, Pzt–Cmt, İstanbul saati) içinde:
--   • zamanlanmış bot görevleri (iş bulma, ihale, sektör keşfi) başlar,
--   • onaylı içerikler yayın saatinde paylaşılır.
-- İçerik Fabrikası sabah taslakları hazırlar; hiçbir içerik yönetici onayı olmadan yayınlanmaz.
-- Additive; DROP yok, veri silinmez.

create table if not exists public.ops_autopilot (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  start_hour int not null default 8 check (start_hour between 0 and 23),
  end_hour int not null default 18 check (end_hour between 1 and 24),
  weekdays int[] not null default '{1,2,3,4,5,6}',          -- 1=Pzt … 7=Paz
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  check (end_hour > start_hour)
);
insert into public.ops_autopilot (id) values (1) on conflict (id) do nothing;

alter table public.ops_autopilot enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'ops_autopilot' and policyname = 'ops_autopilot_team_select') then
    create policy ops_autopilot_team_select on public.ops_autopilot for select to authenticated using (public.is_team_member());
  end if;
end $$;

-- Şu an otopilot penceresi içinde miyiz?
create or replace function public.autopilot_active() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select a.enabled
       and extract(isodow from (now() at time zone 'Europe/Istanbul'))::int = any (a.weekdays)
       and extract(hour from (now() at time zone 'Europe/Istanbul'))::int >= a.start_hour
       and extract(hour from (now() at time zone 'Europe/Istanbul'))::int < a.end_hour
      from public.ops_autopilot a where a.id = 1), true);
$$;

-- Panel ve worker için özet durum
create or replace function public.autopilot_state() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'enabled', a.enabled, 'active', public.autopilot_active(),
    'start_hour', a.start_hour, 'end_hour', a.end_hour, 'weekdays', a.weekdays,
    'changed_at', a.changed_at, 'changed_by', a.changed_by)
  from public.ops_autopilot a where a.id = 1;
$$;

-- Yalnızca yönetici değiştirir; her değişiklik audit_log'a yazılır.
create or replace function public.set_autopilot(p_enabled boolean, p_start_hour int default null, p_end_hour int default null, p_weekdays int[] default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old jsonb;
begin
  if not public.is_team_admin() then raise exception 'Bu işlem yönetici yetkisi gerektirir' using errcode = '42501'; end if;
  select to_jsonb(a) into v_old from public.ops_autopilot a where id = 1;
  update public.ops_autopilot set
    enabled = coalesce(p_enabled, enabled),
    start_hour = coalesce(p_start_hour, start_hour),
    end_hour = coalesce(p_end_hour, end_hour),
    weekdays = coalesce(p_weekdays, weekdays),
    changed_by = auth.uid(), changed_at = now()
  where id = 1;
  begin
    insert into public.audit_log (actor, action, entity_type, entity_id, diff)
    values (auth.uid(), case when p_enabled then 'autopilot_start' else 'autopilot_stop' end, 'ops_autopilot', '1',
            jsonb_build_object('before', v_old, 'after', (select to_jsonb(a) from public.ops_autopilot a where id = 1)));
  exception when others then null;  -- audit şeması farklıysa ana işlemi bozma
  end;
  return public.autopilot_state();
end $$;
revoke all on function public.set_autopilot(boolean, int, int, int[]) from public, anon;
grant execute on function public.set_autopilot(boolean, int, int, int[]) to authenticated;
grant execute on function public.autopilot_state() to authenticated, service_role;
grant execute on function public.autopilot_active() to authenticated, service_role;

-- Zamanlanmış görevler yalnızca otopilot açıkken ve mesai penceresinde başlar (pencere başlamadan önceki saatler pencere açılışında çalışır).
create or replace function public.start_scheduled_missions() returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_now timestamptz := now(); v_local timestamp := (now() at time zone 'Europe/Istanbul'); v_n int := 0; v_id uuid; v_steps int;
begin
  if not public.autopilot_active() then return 0; end if;
  for r in
    select s.* from public.mission_schedules s
     where s.enabled
       and extract(isodow from v_local)::int = any (s.weekdays)
       and extract(hour from v_local)::int >= s.run_hour
       and (s.last_run_at is null or (s.last_run_at at time zone 'Europe/Istanbul')::date < v_local::date)
     for update skip locked
  loop
    v_steps := case when r.duration_minutes <= 15 then r.duration_minutes else least(40, ceil(r.duration_minutes / 3.0)::int) end;
    insert into public.bot_missions (bot_id, schedule_id, title, goal, target_url, search_for, report_spec, duration_minutes, max_steps, deadline_at, model, created_by)
    values (r.bot_id, r.id, r.title || ' · ' || to_char(v_local, 'DD.MM.YYYY'), r.goal, r.target_url, r.search_for, r.report_spec,
            r.duration_minutes, v_steps, v_now + make_interval(mins => r.duration_minutes), r.model, r.created_by)
    returning id into v_id;
    update public.mission_schedules set last_run_at = v_now, last_mission_id = v_id where id = r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Akşam yayın saati mesai penceresine alınır (19:30 → 17:30). Veri silinmez, yalnızca saat güncellenir.
update public.content_quota set slot_times = array_replace(slot_times, '19:30', '17:30') where '19:30' = any (slot_times);
alter table public.content_quota alter column slot_times set default '{"09:30","13:30","17:30"}';
