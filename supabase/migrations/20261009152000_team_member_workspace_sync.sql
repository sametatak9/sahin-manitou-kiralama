-- Ekibe eklenen her kişi çalışma alanı üyesi olur (client_scope ancak üyelikle müşteri verisi gösterir).
create or replace function public.team_member_workspace_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agency_workspace_members (workspace_id, user_id, role, status)
  select w.id, new.user_id, case when new.role = 'admin' then 'admin' else 'member' end, 'active'
  from public.agency_workspaces w
  on conflict (workspace_id, user_id) do update
    set role = case when agency_workspace_members.role = 'owner' then 'owner' else excluded.role end,
        status = 'active';
  return new;
end;
$$;

create or replace trigger team_member_workspace_sync
  after insert or update of role on public.team_members
  for each row execute function public.team_member_workspace_sync();
