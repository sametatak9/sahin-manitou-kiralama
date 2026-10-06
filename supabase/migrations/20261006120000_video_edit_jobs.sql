-- Panelden video düzenleme: kurgu (klip seç/sırala/kırp/yazı/müzik) ve düzeltme (kırp, aralık kes, sessize al) işleri.
-- Render GitHub Actions'ta yapılır (kuyruk yalnızca herkese açık medya adreslerini ve metinleri içerir). Silme yok: iptal/arşiv.
create table if not exists public.video_edit_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.agency_clients(id),
  kind text not null check (kind in ('montage','fix')),
  title text not null default 'Yeni video',
  spec jsonb not null default '{}'::jsonb,
  caption text,
  hashtags text[] not null default '{}',
  source_url text,
  parent_id uuid references public.video_edit_jobs(id),
  version int not null default 1,
  status text not null default 'queued' check (status in ('queued','rendering','done','failed','cancelled')),
  output_url text,
  cover_url text,
  qc jsonb,
  error text,
  media_id uuid,
  draft_ids uuid[] not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  archived_at timestamptz
);
create index if not exists video_edit_jobs_status_idx on public.video_edit_jobs (status, created_at);
alter table public.video_edit_jobs enable row level security;
create policy "ekip okur" on public.video_edit_jobs for select to authenticated using (public.is_team_member());
create policy "ekip ekler" on public.video_edit_jobs for insert to authenticated with check (public.is_team_member());
create policy "ekip gunceller" on public.video_edit_jobs for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
-- DELETE politikası yok.
create or replace function public.video_edit_jobs_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger video_edit_jobs_touch before update on public.video_edit_jobs for each row execute function public.video_edit_jobs_touch();
grant select, insert, update on public.video_edit_jobs to authenticated;
