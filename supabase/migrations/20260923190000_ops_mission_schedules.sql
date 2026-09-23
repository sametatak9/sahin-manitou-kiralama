-- EMBAY AI OPS — Otomatik (zamanlanmış) bot görevleri: ör. "İhale alarmı" her sabah 08:00'de kendiliğinden başlar,
-- yalnızca DAHA ÖNCE BULUNMAMIŞ kayıtları raporlar. Additive; DROP yok.

create table if not exists public.mission_schedules (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references public.automation_bots(id) on delete set null,
  title text not null check (length(btrim(title)) between 2 and 200),
  goal text not null check (length(btrim(goal)) between 3 and 4000),
  search_for text, report_spec text, target_url text check (target_url is null or target_url ~* '^https?://'),
  model text check (model is null or model in ('claude-opus-5', 'claude-sonnet-5')),
  duration_minutes int not null default 10 check (duration_minutes between 1 and 120),
  run_hour int not null default 8 check (run_hour between 0 and 23),            -- İstanbul saati
  weekdays int[] not null default '{1,2,3,4,5}',                                 -- 1=Pzt … 7=Paz
  only_new boolean not null default true,                                        -- önceki çalışmalarda bulunanları tekrar raporlama
  enabled boolean not null default true,
  last_run_at timestamptz,
  last_mission_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mission_schedules enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'mission_schedules' and policyname = 'mission_schedules_team_select') then
    create policy mission_schedules_team_select on public.mission_schedules for select to authenticated using (public.is_team_member());
    create policy mission_schedules_team_insert on public.mission_schedules for insert to authenticated with check (public.is_team_member());
    create policy mission_schedules_team_update on public.mission_schedules for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
    create policy mission_schedules_admin_delete on public.mission_schedules for delete to authenticated using (public.is_team_admin());
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'mission_schedules_updated') then
    create trigger mission_schedules_updated before update on public.mission_schedules for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.bot_missions add column if not exists schedule_id uuid references public.mission_schedules(id) on delete set null;
create index if not exists bot_missions_schedule_idx on public.bot_missions (schedule_id, created_at desc) where schedule_id is not null;

-- Zamanı gelen otomatik görevleri başlatır (cron 10 dakikada bir). Gün içinde bir kez; hafta günü filtreli.
create or replace function public.start_scheduled_missions() returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_now timestamptz := now(); v_local timestamp := (now() at time zone 'Europe/Istanbul'); v_n int := 0; v_id uuid; v_steps int;
begin
  for r in
    select s.* from public.mission_schedules s
     where s.enabled
       and extract(isodow from v_local)::int = any (s.weekdays)
       and extract(hour from v_local)::int >= s.run_hour
       and (s.last_run_at is null or (s.last_run_at at time zone 'Europe/Istanbul')::date < v_local::date)
     for update skip locked
  loop
    v_steps := case when r.duration_minutes <= 15 then r.duration_minutes else least(40, ceil(r.duration_minutes / 3.0)::int) end;
    insert into public.bot_missions (bot_id, schedule_id, title, goal, target_url, search_for, report_spec, duration_minutes, max_steps, deadline_at, model, created_by)
    values (r.bot_id, r.id, r.title || ' · ' || to_char(v_local, 'DD.MM.YYYY'), r.goal, r.target_url, r.search_for, r.report_spec,
            r.duration_minutes, v_steps, v_now + make_interval(mins => r.duration_minutes), r.model, r.created_by)
    returning id into v_id;
    update public.mission_schedules set last_run_at = v_now, last_mission_id = v_id where id = r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.start_scheduled_missions() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'embay-mission-schedules') then
    perform cron.schedule('embay-mission-schedules', '*/10 * * * *', 'select public.start_scheduled_missions()');
  end if;
end $$;

-- Hazır otomatik görev: İhale alarmı (hafta içi her sabah 08:00, 10 dk, ekonomik model, yalnızca yeni ihaleler)
-- last_run_at = şimdi: ilk çalışma yarın sabah (bugün hemen başlamasın)
insert into public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, created_by, last_run_at)
select (select id from public.automation_bots where slug = 'market-intel-bot'),
  'İhale alarmı — iş makinesi & inşaat',
  'Son 7 günde yayımlanmış, İstanbul ve çevresindeki kamu ve kurum ihalelerini bul: iş makinesi / teleskopik yükleyici / vinç kiralama, hafriyat, kentsel dönüşüm ve bina yapım işleri. Kaynaklar: EKAP (ekap.kik.gov.tr) duyuruları, ilan.gov.tr ihale ilanları, TOKİ ihaleleri, İBB ve ilçe belediyelerinin ihale sayfaları, İstanbul Proje Koordinasyon Birimi (ipkb.gov.tr). Her ihale ayrı bulgu: başlık = ihalenin adı, company = ihaleyi yapan kurum, location = ilçe, posted = ilan veya ihale tarihi, detail = işin kısa tanımı + ihale kayıt no (İKN) + son teklif tarihi, phone/email = kurumun ilan metnindeki resmi iletişimi, url = ilanın kendi linki. Yalnızca kaynağı gösterilebilen gerçek ilanlar.',
  'ihale, iş makinesi kiralama, kentsel dönüşüm, yapım işi, İstanbul, İKN',
  'Yeni ihaleler listesi: ihale adı, kurum, ilçe, tarih, son teklif tarihi, İKN, link',
  'claude-sonnet-5', 10, 8, '{1,2,3,4,5}',
  (select user_id from public.team_members where role = 'admin' order by created_at limit 1), now()
where not exists (select 1 from public.mission_schedules where title = 'İhale alarmı — iş makinesi & inşaat');
