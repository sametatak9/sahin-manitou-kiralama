-- "Takvimi toparla": bir Reels erken yayınlanınca (Şimdi yayınla) boşalan gün kalmasın.
-- Platform başına gelecekteki planlı Reels'ler, Reels paylaşılmamış ilk günlerden başlayarak her güne 1 tane, 20:00'ye (İstanbul) yerleşir;
-- sıra en yeni üretim önce. Bugün 18:00'den sonraysa veya bugün zaten Reels paylaşıldıysa yarından başlar. Banner/kaydırmalıya dokunmaz. Additive.
create or replace function public.compact_reel_calendar(p_hhmm text default '20:00')
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; pl text; r record; d date; today date := (now() at time zone 'Europe/Istanbul')::date; busy date[]; begin
  if auth.uid() is not null and not public.is_team_member() then raise exception 'yetki yok'; end if;
  for pl in select distinct primary_platform from social_drafts where format in ('reel', 'short') and archived_at is null and workflow_status in ('scheduled', 'approved') and scheduled_at > now() loop
    -- Reels paylaşılmış günler (aynı güne ikinci Reels konmaz)
    select coalesce(array_agg(distinct (p.published_at at time zone 'Europe/Istanbul')::date), '{}') into busy
      from social_publications p join social_drafts x on x.id = p.content_id
      where p.status = 'published' and p.platform = pl and x.format in ('reel', 'short') and p.published_at > now() - interval '2 days';
    d := case when (now() at time zone 'Europe/Istanbul')::time < '18:00' then today else today + 1 end;
    for r in
      select dr.id from social_drafts dr left join media_library m on m.url = dr.video_url and m.archived_at is null
      where dr.format in ('reel', 'short') and dr.primary_platform = pl and dr.archived_at is null and dr.workflow_status in ('scheduled', 'approved') and dr.scheduled_at > now()
      order by coalesce(m.created_at, dr.created_at) desc, coalesce(dr.video_url, dr.id::text) asc
    loop
      while d = any(busy) loop d := d + 1; end loop;
      update social_drafts set scheduled_at = ((d::text || ' ' || p_hhmm)::timestamp at time zone 'Europe/Istanbul'), updated_at = now()
        where id = r.id and scheduled_at is distinct from ((d::text || ' ' || p_hhmm)::timestamp at time zone 'Europe/Istanbul');
      if found then n := n + 1; end if;
      d := d + 1;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.compact_reel_calendar(text) from public, anon;
grant execute on function public.compact_reel_calendar(text) to authenticated, service_role;
