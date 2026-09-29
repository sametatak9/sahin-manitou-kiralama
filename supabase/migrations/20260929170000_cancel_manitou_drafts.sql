-- Bekleyen Manitou / kiralama içeriklerini iptal et; yalnızca Embay inşaat kalsın.
update public.social_drafts
set workflow_status = 'cancelled',
    status = 'iptal',
    archived_at = coalesce(archived_at, now())
where workflow_status in ('pending_approval', 'draft', 'scheduled', 'approved')
  and archived_at is null
  and (
    coalesce(caption, '') ~* 'manitou|teleskopik yükleyici|telehandler|#şahinmanitou|#manitou'
    or coalesce(headline, '') ~* 'manitou|teleskopik'
    or coalesce(title, '') ~* 'manitou|teleskopik'
    or coalesce(body, '') ~* 'manitou kiralama|teleskopik yükleyici'
    or exists (
      select 1 from unnest(coalesce(hashtags, array[]::text[])) h
      where h ~* 'manitou|teleskopik|#şahinmanitou'
    )
  );

update public.approval_requests
set status = 'cancelled'
where status = 'pending_approval'
  and (
    coalesce(title, '') ~* 'manitou|teleskopik'
    or coalesce(summary, '') ~* 'manitou|teleskopik'
  );
