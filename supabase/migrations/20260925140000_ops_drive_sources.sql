-- EMBAY AI OPS — Google Drive medya kaynakları: herkese açık paylaşılan klasör → Video / Fotoğraf havuzu (her sabah otomatik eşitleme).
-- Anahtar saklanmaz (yalnızca herkese açık klasör linki). Silme = arşiv (archived_at). Additive; DROP yok.
create table if not exists public.drive_sources (
  id uuid primary key default gen_random_uuid(),
  folder_id text not null unique,
  url text not null,
  title text,
  enabled boolean not null default true,
  last_synced_at timestamptz,
  last_result jsonb,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.drive_sources enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'drive_sources' and policyname = 'drive_sources_team_select') then
    create policy drive_sources_team_select on public.drive_sources for select to authenticated using (public.is_team_member());
    create policy drive_sources_admin_insert on public.drive_sources for insert to authenticated with check (public.is_team_admin());
    create policy drive_sources_admin_update on public.drive_sources for update to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
  end if;
end $$;
create index if not exists media_library_storage_path_idx on public.media_library (storage_path);

-- Firma medya klasörü (kullanıcının paylaştığı)
insert into public.drive_sources (folder_id, url, title, created_by)
select '1ei3Ro5-0FzIsHWHPjVQaO9zI8OGM9tMd', 'https://drive.google.com/drive/folders/1ei3Ro5-0FzIsHWHPjVQaO9zI8OGM9tMd', 'Asa',
  (select user_id from public.team_members where role = 'admin' order by created_at limit 1)
on conflict (folder_id) do nothing;
