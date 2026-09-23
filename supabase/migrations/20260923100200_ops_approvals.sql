-- EMBAY AI OPS — 3/6: Approval Engine (sistemin merkezi)

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('content','publication','message','email','whatsapp','listing','offer','seo','ad','report','lead','other')),
  entity_id uuid,
  title text not null,
  summary text,
  bot_id uuid references public.automation_bots(id) on delete set null,
  task_id uuid references public.automation_tasks(id) on delete set null,
  run_id uuid references public.social_bot_runs(id) on delete set null,
  tool_key text,
  platform text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending_approval' check (status in ('draft','pending_approval','approved','rejected','scheduled','processing','published','failed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  requested_by uuid default auth.uid(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_note text,
  scheduled_for timestamptz,
  executed_at timestamptz,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists approval_requests_status_idx on public.approval_requests (status, created_at desc);
create index if not exists approval_requests_entity_idx on public.approval_requests (entity_type, entity_id);
create index if not exists approval_requests_due_idx on public.approval_requests (scheduled_for) where status in ('approved','scheduled');
create trigger approval_requests_updated before update on public.approval_requests for each row execute function public.set_updated_at();
create trigger approval_requests_audit after insert or update or delete on public.approval_requests for each row execute function public.log_audit();

alter table public.approval_requests enable row level security;
create policy ops_read on public.approval_requests for select to authenticated using (public.is_team_member());
create policy ops_member_insert on public.approval_requests for insert to authenticated with check (public.is_team_member());
-- Güncelleme (karar) yalnızca decide_approval() üzerinden; taslak düzenleme ekip üyesine açık
create policy ops_member_edit_open on public.approval_requests for update to authenticated
  using (public.is_team_member() and status in ('draft','pending_approval'))
  with check (public.is_team_member() and status in ('draft','pending_approval'));

-- Karar fonksiyonu: onayla / reddet / zamanla / iptal / düzenle
-- Tool min_role = admin ise yalnızca admin onaylayabilir.
create or replace function public.decide_approval(p_id uuid, p_decision text, p_note text default null, p_scheduled_for timestamptz default null, p_payload jsonb default null)
returns public.approval_requests
language plpgsql security definer set search_path = public as $$
declare
  r public.approval_requests;
  v_min_role text;
  v_new_status text;
begin
  if not public.is_team_member() then raise exception 'permission denied' using errcode = '42501'; end if;
  select * into r from public.approval_requests where id = p_id for update;
  if not found then raise exception 'approval not found'; end if;

  select min_role into v_min_role from public.automation_tools where tool_key = r.tool_key;
  if coalesce(v_min_role, 'staff') = 'admin' and not public.is_team_admin() and p_decision in ('approve','schedule') then
    raise exception 'Bu işlem yönetici onayı gerektirir' using errcode = '42501';
  end if;

  if p_decision = 'approve' then
    if r.status not in ('draft','pending_approval','rejected') then raise exception 'Bu durumda onaylanamaz: %', r.status; end if;
    v_new_status := case when coalesce(p_scheduled_for, r.scheduled_for) is not null and coalesce(p_scheduled_for, r.scheduled_for) > now() then 'scheduled' else 'approved' end;
  elsif p_decision = 'schedule' then
    if p_scheduled_for is null then raise exception 'Zamanlama tarihi gerekli'; end if;
    if r.status not in ('pending_approval','approved','scheduled') then raise exception 'Bu durumda zamanlanamaz: %', r.status; end if;
    v_new_status := 'scheduled';
  elsif p_decision = 'reject' then
    if r.status not in ('draft','pending_approval','approved','scheduled') then raise exception 'Bu durumda reddedilemez: %', r.status; end if;
    v_new_status := 'rejected';
  elsif p_decision = 'cancel' then
    if r.status in ('published','processing') then raise exception 'Yayınlanmış/işlenen kayıt iptal edilemez'; end if;
    v_new_status := 'cancelled';
  elsif p_decision = 'submit' then
    if r.status not in ('draft','rejected') then raise exception 'Bu durumda gönderilemez: %', r.status; end if;
    v_new_status := 'pending_approval';
  elsif p_decision = 'edit' then
    if r.status not in ('draft','pending_approval','rejected') then raise exception 'Bu durumda düzenlenemez: %', r.status; end if;
    v_new_status := r.status;
  else
    raise exception 'Geçersiz karar: %', p_decision;
  end if;

  update public.approval_requests set
    status = v_new_status,
    payload = coalesce(p_payload, payload),
    scheduled_for = coalesce(p_scheduled_for, scheduled_for),
    decision_note = coalesce(p_note, decision_note),
    decided_by = case when p_decision in ('approve','schedule','reject','cancel') then auth.uid() else decided_by end,
    decided_at = case when p_decision in ('approve','schedule','reject','cancel') then now() else decided_at end
  where id = p_id
  returning * into r;

  -- İçerik kaydını senkron tut
  if r.entity_type = 'content' and r.entity_id is not null then
    update public.social_drafts set
      status = case v_new_status when 'pending_approval' then 'onay_bekliyor' when 'approved' then 'onaylandi' when 'scheduled' then 'planlandi' else status end,
      workflow_status = v_new_status,
      approved_by = case when v_new_status in ('approved','scheduled') then auth.uid() else approved_by end,
      approved_at = case when v_new_status in ('approved','scheduled') then now() else approved_at end,
      scheduled_at = coalesce(r.scheduled_for, scheduled_at)
    where id = r.entity_id;
  end if;
  return r;
end $$;
revoke execute on function public.decide_approval(uuid, text, text, timestamptz, jsonb) from public, anon;
grant execute on function public.decide_approval(uuid, text, text, timestamptz, jsonb) to authenticated;

-- Yöneticiler başkasının oluşturduğu görev/koşu kayıtlarını da yönetebilsin (permissive, OR'lanır)
create policy ops_admin_manage on public.automation_tasks for all to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
create policy ops_admin_manage on public.social_bot_runs for all to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
create policy ops_admin_manage on public.social_accounts for all to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
create policy ops_admin_manage on public.communication_integrations for all to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
