-- Yayın kaydı müşterisiz gelirse müşteri taslaktan, yoksa paylaşan hesaptan alınır (müşteri bazlı rapor ve client_scope için).
create or replace function public.social_publications_client_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.client_id is null then
    select coalesce(
      (select d.client_id from public.social_drafts d where d.id = new.content_id),
      (select a.client_id from public.social_accounts a where a.id = new.account_id)
    ) into new.client_id;
  end if;
  return new;
end;
$$;

create or replace trigger social_publications_client_link
  before insert on public.social_publications
  for each row execute function public.social_publications_client_link();

update public.social_publications p
set client_id = coalesce(d.client_id, a.client_id)
from public.social_publications p2
left join public.social_drafts d on d.id = p2.content_id
left join public.social_accounts a on a.id = p2.account_id
where p.id = p2.id and p.client_id is null and coalesce(d.client_id, a.client_id) is not null;
