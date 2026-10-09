-- Çok müşterili ayrım: oturum açmış kullanıcı yalnızca üyesi olduğu çalışma alanının müşteri verisini görür/yazar.
-- Kurucu (team_members.role = 'admin') tüm müşterileri görür. client_id'si olmayan ortak kayıtlar etkilenmez.
-- Mevcut izin kuralları korunur; üstüne RESTRICTIVE kural eklenir. Ziyaretçi (anon) kuralları etkilenmez.

insert into public.agency_workspace_members (workspace_id, user_id, role, status)
select w.id, t.user_id, case when t.role = 'admin' then 'owner' else 'member' end, 'active'
from public.team_members t cross join public.agency_workspaces w
on conflict (workspace_id, user_id) do nothing;

create or replace function public.can_access_client(p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_client is null
    or public.is_team_admin()
    or exists (
      select 1
      from public.agency_clients c
      join public.agency_workspace_members m on m.workspace_id = c.workspace_id
      where c.id = p_client and m.user_id = auth.uid() and m.status = 'active'
    );
$$;

revoke all on function public.can_access_client(uuid) from public;
grant execute on function public.can_access_client(uuid) to authenticated, service_role;

do $$
declare
  t text;
begin
  foreach t in array array[
    'audience_radar', 'automation_bots', 'bot_learning_log', 'bot_missions', 'brand_kits', 'content_plan',
    'growth_snapshots', 'media_library', 'mission_schedules', 'showroom_models', 'site_posts', 'social_accounts',
    'social_drafts', 'social_inbox', 'social_publications', 'video_edit_jobs'
  ] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'client_scope') then
      execute format(
        'create policy client_scope on public.%I as restrictive for all to authenticated using (public.can_access_client(client_id)) with check (public.can_access_client(client_id))',
        t
      );
    end if;
  end loop;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'agency_clients' and policyname = 'client_scope') then
    create policy client_scope on public.agency_clients as restrictive for all to authenticated
      using (public.can_access_client(id)) with check (public.can_access_client(id));
  end if;
end $$;
