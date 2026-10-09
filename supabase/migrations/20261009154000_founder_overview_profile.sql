-- Kurucu paneli özeti (yalnız kurucu admin) ve kullanıcının kendi profilini güncellemesi.
create or replace function public.founder_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - interval '30 days';
begin
  if not public.is_team_admin() then
    raise exception 'Yalnız kurucu yönetici görebilir' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'totals', jsonb_build_object(
      'ai_cost_30d', (select round(coalesce(sum(cost_usd), 0)::numeric, 2) from ai_usage where at > since),
      'missions_30d', (select count(*) from bot_missions where created_at > since),
      'published_30d', (select count(*) from social_publications where published_at > since),
      'members', (select count(*) from agency_workspace_members where status = 'active'),
      'clients', (select count(*) from agency_clients where archived_at is null)
    ),
    'workspaces', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.id, 'name', w.name, 'slug', w.slug, 'plan_code', w.plan_code, 'status', w.status, 'created_at', w.created_at,
        'members', coalesce((
          select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'role', m.role, 'status', m.status, 'email', u.email,
            'display_name', t.display_name, 'last_sign_in_at', u.last_sign_in_at) order by m.created_at)
          from agency_workspace_members m
          left join auth.users u on u.id = m.user_id
          left join team_members t on t.user_id = m.user_id
          where m.workspace_id = w.id), '[]'::jsonb),
        'clients', coalesce((
          select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'sector', c.sector, 'region', c.region, 'status', c.status, 'color', c.color,
            'missions_30d', (select count(*) from bot_missions b where b.client_id = c.id and b.created_at > since),
            'drafts_open', (select count(*) from social_drafts d where d.client_id = c.id and d.status not in ('published', 'cancelled', 'rejected', 'PUBLISHED', 'CANCELLED', 'REJECTED')),
            'published_30d', (select count(*) from social_publications p where p.client_id = c.id and p.published_at > since),
            'accounts_connected', (select count(*) from social_accounts a where a.client_id = c.id and a.connection_status = 'connected')
          ) order by c.created_at)
          from agency_clients c
          where c.workspace_id = w.id and c.archived_at is null), '[]'::jsonb)
      ) order by w.created_at)
      from agency_workspaces w), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.founder_overview() from public, anon;
grant execute on function public.founder_overview() to authenticated, service_role;

create or replace function public.update_my_profile(p_display_name text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.team_members
  set display_name = nullif(left(trim(p_display_name), 80), '')
  where user_id = auth.uid();
$$;

revoke all on function public.update_my_profile(text) from public, anon;
grant execute on function public.update_my_profile(text) to authenticated;
