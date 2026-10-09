-- Son N günde AI harcamasının iş kaynağı ve modele göre dökümü (salt okunur; yalnız ekip üyeleri).
create or replace function public.ai_spend_breakdown(p_days int default 30)
returns table (source text, provider text, model text, calls bigint, tokens bigint, searches bigint, cost_usd numeric)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(u.source, 'diğer'), u.provider, u.model, count(*),
         coalesce(sum(coalesce(u.tokens_in, 0) + coalesce(u.tokens_out, 0)), 0)::bigint,
         coalesce(sum(u.searches), 0)::bigint,
         round(coalesce(sum(u.cost_usd), 0)::numeric, 4)
  from public.ai_usage u
  where public.is_team_member() and u.at > now() - make_interval(days => greatest(1, least(p_days, 365)))
  group by 1, 2, 3
  order by 7 desc, 4 desc
  limit 40;
$$;

revoke all on function public.ai_spend_breakdown(int) from public, anon;
grant execute on function public.ai_spend_breakdown(int) to authenticated, service_role;
