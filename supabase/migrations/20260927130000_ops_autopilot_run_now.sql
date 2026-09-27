-- EMBAY AI OPS — "Botları başlat" = hemen çalıştır. Otopilotu açar ve zamanlanmış tüm bot görevlerini o anda başlatır:
--   • günlük görevler (iş bulma, ihale, etkileşim listesi, Çatalca talepleri): bugün henüz çalışmadıysa,
--   • haftalık görevler (Meta algoritma, sektör keşfi, performans): son 6 günde çalışmadıysa.
-- Şu an çalışan aynı görev ikinci kez açılmaz. Yayınlar yine yalnızca yönetici onayıyla çıkar. Additive; DROP yok.
create or replace function public.autopilot_run_now() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; v_now timestamptz := now(); v_local timestamp := (now() at time zone 'Europe/Istanbul');
        v_id uuid; v_steps int; v_started jsonb := '[]'::jsonb; v_skipped int := 0;
begin
  if not public.is_team_admin() then raise exception 'Bu işlem yönetici yetkisi gerektirir' using errcode = '42501'; end if;
  update public.ops_autopilot set enabled = true, changed_by = auth.uid(), changed_at = now() where id = 1;
  for r in
    select s.* from public.mission_schedules s
      join public.automation_bots b on b.id = s.bot_id and b.status = 'active'
     where s.enabled
     for update of s skip locked
  loop
    if exists (select 1 from public.bot_missions m where m.schedule_id = r.id and m.status in ('running', 'finalizing'))
       or (cardinality(r.weekdays) >= 3 and r.last_run_at is not null and (r.last_run_at at time zone 'Europe/Istanbul')::date = v_local::date)
       or (cardinality(r.weekdays) < 3 and r.last_run_at is not null and r.last_run_at > v_now - interval '6 days') then
      v_skipped := v_skipped + 1; continue;
    end if;
    v_steps := case when r.duration_minutes <= 15 then r.duration_minutes else least(40, ceil(r.duration_minutes / 3.0)::int) end;
    insert into public.bot_missions (bot_id, schedule_id, title, goal, target_url, search_for, report_spec, duration_minutes, max_steps, deadline_at, model, created_by)
    values (r.bot_id, r.id, r.title || ' · ' || to_char(v_local, 'DD.MM.YYYY'), r.goal, r.target_url, r.search_for, r.report_spec,
            r.duration_minutes, v_steps, v_now + make_interval(mins => r.duration_minutes), r.model, coalesce(auth.uid(), r.created_by))
    returning id into v_id;
    update public.mission_schedules set last_run_at = v_now, last_mission_id = v_id where id = r.id;
    v_started := v_started || jsonb_build_object('id', v_id, 'title', r.title);
  end loop;
  begin
    insert into public.audit_log (actor, action, entity_type, entity_id, diff)
    values (auth.uid(), 'autopilot_run_now', 'ops_autopilot', '1', jsonb_build_object('started', jsonb_array_length(v_started), 'skipped', v_skipped));
  exception when others then null;
  end;
  return jsonb_build_object('started', v_started, 'skipped', v_skipped);
end $$;
revoke all on function public.autopilot_run_now() from public, anon;
grant execute on function public.autopilot_run_now() to authenticated;
