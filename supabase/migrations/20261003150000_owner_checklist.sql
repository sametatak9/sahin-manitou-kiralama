-- Yönetici kontrol listesi (reklam hesabı açıldı mı, ortak gönderi yapıldı mı …): telefondan da bilgisayardan da aynı görünür. Additive.
create table if not exists public.owner_checklist (
  key text primary key,
  done_at timestamptz,
  done_by uuid references auth.users(id),
  note text,
  updated_at timestamptz not null default now()
);
alter table public.owner_checklist enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'owner_checklist' and policyname = 'owner_checklist_team_all') then
    create policy owner_checklist_team_all on public.owner_checklist for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
  end if;
end $$;
