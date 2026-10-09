-- Çalışma alanı belirtilmeden eklenen müşteri ilk çalışma alanına bağlanır; aksi halde client_scope yüzünden üyeler göremez.
create or replace function public.agency_clients_default_workspace()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.workspace_id is null then
    select id into new.workspace_id from public.agency_workspaces order by created_at limit 1;
  end if;
  return new;
end;
$$;

create or replace trigger agency_clients_default_workspace
  before insert on public.agency_clients
  for each row execute function public.agency_clients_default_workspace();
