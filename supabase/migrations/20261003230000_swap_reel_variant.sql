-- Reels ikizleri: aynı videonun sunuculu (sesli) ve sunucusuz sürümü. media_library.edit->>'variant_of' sesli sürümün hangi videonun ikizi olduğunu tutar.
-- swap_reel_variant: takvimdeki Reels'i ikiziyle yer değiştirir — ikiz aynı gün/saatte planlanır, eski sürüm havuza (taslak) döner. Hiçbir şey silinmez. Additive.
create or replace function public.swap_reel_variant(p_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare d record; slug text; partner_slug text; p record; n integer := 0; begin
  if auth.uid() is not null and not public.is_team_member() then raise exception 'yetki yok'; end if;
  for d in select * from social_drafts where id = any(p_ids) and format = 'reel' and archived_at is null and archive_status = 'active'
             and workflow_status in ('scheduled', 'approved') and video_url is not null loop
    partner_slug := null;
    slug := regexp_replace(d.video_url, '^.*/([^/]+)\.mp4$', '\1');
    select m.edit->>'variant_of' into partner_slug from media_library m where m.archived_at is null and m.edit->>'slug' = slug and m.edit ? 'variant_of' limit 1;
    if partner_slug is null then
      select m.edit->>'slug' into partner_slug from media_library m where m.archived_at is null and m.edit->>'variant_of' = slug limit 1;
    end if;
    continue when partner_slug is null;
    select * into p from social_drafts s where s.format = 'reel' and s.primary_platform = d.primary_platform and s.archived_at is null and s.archive_status = 'active'
      and s.video_url like '%/' || partner_slug || '.mp4' and s.workflow_status not in ('published', 'processing') and s.id <> d.id
      order by (s.workflow_status = 'draft') desc, s.updated_at desc limit 1;
    continue when not found;
    update social_drafts set scheduled_at = d.scheduled_at, workflow_status = d.workflow_status, status = d.status, approved_at = coalesce(d.approved_at, now()), error = null, updated_at = now() where id = p.id;
    update social_drafts set workflow_status = 'draft', status = 'taslak', updated_at = now() where id = d.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.swap_reel_variant(uuid[]) from public, anon;
grant execute on function public.swap_reel_variant(uuid[]) to authenticated, service_role;
