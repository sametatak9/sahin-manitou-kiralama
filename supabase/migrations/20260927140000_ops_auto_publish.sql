-- EMBAY AI OPS — Onaysız otomatik yayın + pazar günü paylaşım (yönetici isteği, 27.09.2026). Additive; DROP yok.
alter table public.ops_autopilot add column if not exists auto_publish boolean not null default false;
update public.ops_autopilot set auto_publish = true, weekdays = '{1,2,3,4,5,6,7}', changed_at = now() where id = 1;

-- Yöneticinin panelden açıp kapatabilmesi için set_autopilot'a ek parametre (eski imza korunur)
create or replace function public.set_auto_publish(p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_admin() then raise exception 'Bu işlem yönetici yetkisi gerektirir' using errcode = '42501'; end if;
  update public.ops_autopilot set auto_publish = p_on, changed_by = auth.uid(), changed_at = now() where id = 1;
  begin
    insert into public.audit_log (actor, action, entity_type, entity_id, diff) values (auth.uid(), case when p_on then 'auto_publish_on' else 'auto_publish_off' end, 'ops_autopilot', '1', '{}'::jsonb);
  exception when others then null; end;
  return public.autopilot_state();
end $$;
revoke all on function public.set_auto_publish(boolean) from public, anon;
grant execute on function public.set_auto_publish(boolean) to authenticated;

create or replace function public.autopilot_state() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'enabled', a.enabled, 'active', public.autopilot_active(), 'auto_publish', a.auto_publish,
    'start_hour', a.start_hour, 'end_hour', a.end_hour, 'weekdays', a.weekdays,
    'changed_at', a.changed_at, 'changed_by', a.changed_by)
  from public.ops_autopilot a where a.id = 1;
$$;

-- Onay bekleyen güncel taslaklar otomatik zamanlanır (geçmiş saatliler bir sonraki uygun saate: +1 saat aralıklı)
update public.social_drafts
   set workflow_status = 'scheduled', status = 'planlandi', approved_at = now(),
       scheduled_at = greatest(scheduled_at, now() + interval '10 minutes')
 where workflow_status = 'pending_approval' and archived_at is null and scheduled_at > now() - interval '36 hours';
