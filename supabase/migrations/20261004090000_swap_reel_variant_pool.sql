-- Sürüm değiştirme her iki taraftan çalışır: takvimdeki Reels'ten (ikizi havuzdan gelir) veya havuzdaki ikizden (takvimdekinin yerine geçer). Silme yok. Additive.
create or replace function public.swap_reel_variant(p_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare d record; slug text; partner_slug text; p record; s record; q record; n integer := 0; begin
  if auth.uid() is not null and not public.is_team_member() then raise exception 'yetki yok'; end if;
  for d in select * from social_drafts where id = any(p_ids) and format = 'reel' and archived_at is null and archive_status = 'active'
             and workflow_status in ('scheduled', 'approved', 'draft') and video_url is not null loop
    partner_slug := null;
    slug := regexp_replace(d.video_url, '^.*/([^/]+)\.mp4$', '\1');
    select m.edit->>'variant_of' into partner_slug from media_library m where m.archived_at is null and m.edit->>'slug' = slug and m.edit ? 'variant_of' limit 1;
    if partner_slug is null then
      select m.edit->>'slug' into partner_slug from media_library m where m.archived_at is null and m.edit->>'variant_of' = slug limit 1;
    end if;
    continue when partner_slug is null;
    if d.workflow_status = 'draft' then
      -- havuzdaki sürüm seçildi: takvimdeki ikizinin yerine geçer
      select * into p from social_drafts x where x.format = 'reel' and x.primary_platform = d.primary_platform and x.archived_at is null and x.archive_status = 'active'
        and x.video_url like '%/' || partner_slug || '.mp4' and x.workflow_status in ('scheduled', 'approved') and x.id <> d.id order by x.scheduled_at limit 1;
      continue when not found;
      s := p; q := d;
    else
      select * into p from social_drafts x where x.format = 'reel' and x.primary_platform = d.primary_platform and x.archived_at is null and x.archive_status = 'active'
        and x.video_url like '%/' || partner_slug || '.mp4' and x.workflow_status not in ('published', 'processing') and x.id <> d.id
        order by (x.workflow_status = 'draft') desc, x.updated_at desc limit 1;
      continue when not found;
      s := d; q := p;
    end if;
    update social_drafts set scheduled_at = s.scheduled_at, workflow_status = s.workflow_status, status = s.status, approved_at = coalesce(s.approved_at, now()), error = null, updated_at = now() where id = q.id;
    update social_drafts set workflow_status = 'draft', status = 'taslak', updated_at = now() where id = s.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.swap_reel_variant(uuid[]) from public, anon;
grant execute on function public.swap_reel_variant(uuid[]) to authenticated, service_role;
