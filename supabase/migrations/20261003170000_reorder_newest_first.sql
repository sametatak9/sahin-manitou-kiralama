-- "Yeni tarz öne": gelecekteki Reels ve kaydırmalı paylaşımların SAAT KÜMESİ aynı kalır, içerikler en yeni üretim önce olacak şekilde
-- yeniden dağıtılır (platform başına). Banner'a dokunmaz. Yalnızca planlı (scheduled/approved) ve en az 2 saat sonraki paylaşımlar. Additive.
create or replace function public.reorder_newest_first(p_formats text[] default array['reel', 'carousel'])
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; c integer; f text; pl text; begin
  if auth.uid() is not null and not public.is_team_member() then raise exception 'yetki yok'; end if;
  foreach f in array p_formats loop
    for pl in select distinct primary_platform from social_drafts where format = f and archived_at is null and workflow_status in ('scheduled', 'approved') and scheduled_at > now() + interval '2 hours' loop
      with items as (
        select d.id, row_number() over (order by coalesce(m.created_at, d.created_at) desc, coalesce(d.video_url, d.media_urls[1], d.id::text) asc) rn
        from social_drafts d left join media_library m on m.url = d.video_url and m.archived_at is null
        where d.format = f and d.primary_platform = pl and d.archived_at is null and d.workflow_status in ('scheduled', 'approved') and d.scheduled_at > now() + interval '2 hours'
      ), slots as (
        select scheduled_at, row_number() over (order by scheduled_at asc) rn
        from social_drafts where format = f and primary_platform = pl and archived_at is null and workflow_status in ('scheduled', 'approved') and scheduled_at > now() + interval '2 hours'
      )
      update social_drafts d set scheduled_at = s.scheduled_at, updated_at = now()
      from items i join slots s using (rn) where d.id = i.id and d.scheduled_at is distinct from s.scheduled_at;
      get diagnostics c = row_count; n := n + c;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.reorder_newest_first(text[]) from public, anon;
grant execute on function public.reorder_newest_first(text[]) to authenticated, service_role;
