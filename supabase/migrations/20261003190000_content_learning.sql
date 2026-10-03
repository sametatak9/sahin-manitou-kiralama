-- Öğrenme döngüsü: yayınlanan her içeriğin son ölçümü (beğeni + 3×yorum) → tür ve konu (rozet) bazında ortalama.
-- İçerik Fabrikası en iyi giden konuya her gün bir yer ayırır (en az 3 ölçüm); diğerleri dönüşümlü (yeni konular denenmeye devam eder). Additive.
create or replace function public.content_learning(p_days integer default 45)
returns table (format text, pillar text, n integer, score numeric, best_headline text)
language sql stable security definer set search_path = public as $$
  with last as (
    select distinct on (publication_id) publication_id, likes, comments from social_post_metrics order by publication_id, fetched_at desc
  ), rows as (
    select d.format, coalesce(d.content_pillar, '-') pillar, d.headline, coalesce(l.likes, 0) + 3 * coalesce(l.comments, 0) s
    from social_publications p join social_drafts d on d.id = p.content_id join last l on l.publication_id = p.id
    where p.status = 'published' and p.platform = 'instagram' and p.published_at > now() - make_interval(days => p_days)
  )
  select format, pillar, count(*)::int, round(avg(s), 1), (array_agg(headline order by s desc))[1]
  from rows group by format, pillar order by round(avg(s), 1) desc, count(*) desc
$$;
revoke all on function public.content_learning(integer) from public, anon;
grant execute on function public.content_learning(integer) to authenticated, service_role;
