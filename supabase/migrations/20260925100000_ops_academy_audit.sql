-- EMBAY AI OPS — Akademi (yetenek eğitimi/testi) · Uygulama (yalnızca onaylı yetenek) · Denetim (bulgu doğrulama + koç önerisi).
-- Tamamen additive: DROP yok, veri silinmez. CHECK listeleri yalnızca GENİŞLETİLİR.

-- 1) Yetenek yaşam döngüsü: taslak → testte → onaylı → emekli. Mevcut yetenekler çalışmaya devam etsin diye "onaylı" başlar.
alter table public.automation_skills add column if not exists lifecycle text not null default 'approved';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'automation_skills_lifecycle_check') then
    alter table public.automation_skills add constraint automation_skills_lifecycle_check check (lifecycle in ('draft', 'testing', 'approved', 'retired'));
  end if;
end $$;
alter table public.automation_skills add column if not exists version int not null default 1;
alter table public.automation_skills add column if not exists search_terms text[] not null default '{}';   -- bu yeteneğin arama terimleri
alter table public.automation_skills add column if not exists sources text[] not null default '{}';        -- tercih edilen kaynak alan adları
alter table public.automation_skills add column if not exists good_examples text;                          -- "iyi bulgu" örnekleri
alter table public.automation_skills add column if not exists bad_examples text;                           -- "elenecek" örnekler
alter table public.automation_skills add column if not exists test_goal text;                              -- test görevinin amacı
alter table public.automation_skills add column if not exists test_score numeric;                          -- son test doğruluk puanı (0-100)
alter table public.automation_skills add column if not exists test_findings int;                           -- son testte doğrulanmış bulgu sayısı
alter table public.automation_skills add column if not exists last_tested_at timestamptz;
alter table public.automation_skills add column if not exists last_test_mission_id uuid;
alter table public.automation_skills add column if not exists approved_at timestamptz;
alter table public.automation_skills add column if not exists approved_by uuid references auth.users(id) on delete set null;

-- 2) Görev: hangi yeteneklerle çalıştığı, amacı (görev / yetenek testi) ve denetim sonucu
alter table public.bot_missions add column if not exists skill_ids uuid[] not null default '{}';
alter table public.bot_missions add column if not exists purpose text not null default 'task';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bot_missions_purpose_check') then
    alter table public.bot_missions add constraint bot_missions_purpose_check check (purpose in ('task', 'skill_test'));
  end if;
end $$;
alter table public.bot_missions add column if not exists audit jsonb;          -- {verified, suspicious, rejected, accuracy, checked_at, notes}
alter table public.bot_missions add column if not exists coach_note text;      -- koçun teşhisi (neden az/çok bulgu, ne düzeltilmeli)

-- 3) Koç önerileri: denetimden sonra yeteneği iyileştirme önerisi. Yönetici "Uygula" derse yetenek güncellenir (sürüm +1).
create table if not exists public.skill_improvements (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.automation_skills(id) on delete cascade,
  mission_id uuid references public.bot_missions(id) on delete set null,
  diagnosis text not null,
  instructions_add text,
  search_terms_add text[] not null default '{}',
  search_terms_remove text[] not null default '{}',
  sources_add text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'applied', 'dismissed')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists skill_improvements_skill_idx on public.skill_improvements (skill_id, created_at desc);
alter table public.skill_improvements enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'skill_improvements' and policyname = 'skill_improvements_team_select') then
    create policy skill_improvements_team_select on public.skill_improvements for select to authenticated using (public.is_team_member());
    create policy skill_improvements_admin_update on public.skill_improvements for update to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
  end if;
end $$;

-- Öneriyi uygula: talimata ekle, terimleri birleştir/çıkar, kaynakları ekle, sürüm +1. Denetim kaydı yazılır.
create or replace function public.apply_skill_improvement(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; v_terms text[];
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici uygulayabilir' using errcode = '42501'; end if;
  select * into r from public.skill_improvements where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Öneri bulunamadı veya zaten karara bağlanmış'; end if;
  select array(select distinct t from unnest(s.search_terms || r.search_terms_add) t where t <> all (r.search_terms_remove) and length(btrim(t)) > 1)
    into v_terms from public.automation_skills s where s.id = r.skill_id;
  update public.automation_skills s set
    instructions = case when coalesce(btrim(r.instructions_add), '') = '' then s.instructions
                        else left(coalesce(s.instructions, '') || E'\n\n[Sürüm ' || (s.version + 1) || ' — denetimden öğrenilen] ' || r.instructions_add, 8000) end,
    search_terms = coalesce(v_terms, s.search_terms),
    sources = array(select distinct x from unnest(s.sources || r.sources_add) x where length(btrim(x)) > 3),
    version = s.version + 1, updated_at = now()
  where s.id = r.skill_id;
  update public.skill_improvements set status = 'applied', decided_by = auth.uid(), decided_at = now() where id = p_id;
  perform public.write_audit('skill_improve', 'automation_skills', r.skill_id::text, 'Yetenek iyileştirildi (koç önerisi uygulandı)', jsonb_build_object('improvement_id', p_id));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.apply_skill_improvement(uuid) from public, anon;
grant execute on function public.apply_skill_improvement(uuid) to authenticated;

-- Yetenek onayı / emekliye ayırma (yalnızca yönetici). Onaylı olmayan yetenek görevlerde kullanılmaz.
create or replace function public.set_skill_lifecycle(p_skill uuid, p_lifecycle text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_admin() then raise exception 'Yalnızca yönetici değiştirebilir' using errcode = '42501'; end if;
  if p_lifecycle not in ('draft', 'testing', 'approved', 'retired') then raise exception 'Geçersiz durum'; end if;
  update public.automation_skills set lifecycle = p_lifecycle,
    approved_at = case when p_lifecycle = 'approved' then now() else approved_at end,
    approved_by = case when p_lifecycle = 'approved' then auth.uid() else approved_by end, updated_at = now()
  where id = p_skill;
  perform public.write_audit('skill_lifecycle', 'automation_skills', p_skill::text, 'Yetenek durumu: ' || p_lifecycle, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'lifecycle', p_lifecycle);
end $$;
revoke all on function public.set_skill_lifecycle(uuid, text) from public, anon;
grant execute on function public.set_skill_lifecycle(uuid, text) to authenticated;

-- 4) Web araması anahtarı (Tavily — ayda 1000 ücretsiz arama). İzinli ad listesi genişletilir.
alter table public.app_credentials drop constraint if exists app_credentials_name_check;
alter table public.app_credentials add constraint app_credentials_name_check check (name in (
  'META_APP_ID', 'META_APP_SECRET', 'INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'CANVA_CLIENT_ID', 'CANVA_CLIENT_SECRET',
  'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'RESEND_API_KEY', 'EMAIL_FROM', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TAVILY_API_KEY'));

create or replace function public.app_credential_format_error(p_name text, p_value text) returns text
language sql immutable as $$
  select case
    when p_name in ('META_APP_ID', 'INSTAGRAM_APP_ID') and p_value !~ '^[0-9]{6,20}$'
      then 'Uygulama kimliği yalnızca rakamlardan oluşur (ör. 1234567890123456).'
    when p_name in ('META_APP_SECRET', 'INSTAGRAM_APP_SECRET') and p_value !~ '^[0-9a-f]{32}$'
      then 'Gizli anahtar 32 karakterdir (0-9, a-f). Girilen ' || length(p_value) || ' karakter: “Göster”e basıp tamamını kopyalayın.'
    when p_name = 'GOOGLE_CLIENT_ID' and p_value !~ '\.apps\.googleusercontent\.com$'
      then 'Google İstemci Kimliği “….apps.googleusercontent.com” ile biter.'
    when p_name = 'GOOGLE_CLIENT_SECRET' and p_value ~ 'googleusercontent\.com'
      then 'Buraya İstemci Kimliği yapıştırılmış. İstemci gizli anahtarı genelde “GOCSPX-” ile başlar.'
    when p_name = 'GOOGLE_CLIENT_SECRET' and (length(p_value) < 20 or length(p_value) > 60)
      then 'Google İstemci gizli anahtarı 20-60 karakter olmalı (genelde “GOCSPX-” ile başlar).'
    when p_name = 'TELEGRAM_BOT_TOKEN' and p_value !~ '^[0-9]+:[A-Za-z0-9_-]{30,}$'
      then 'Telegram bot anahtarı “123456789:AA…” biçimindedir (BotFather verir).'
    when p_name = 'RESEND_API_KEY' and p_value !~ '^re_'
      then 'Resend API anahtarı “re_” ile başlar.'
    when p_name = 'EMAIL_FROM' and p_value !~ '@'
      then 'Gönderen e-posta adresi geçersiz.'
    when p_name = 'TAVILY_API_KEY' and p_value !~ '^tvly-[A-Za-z0-9_-]{10,}$'
      then 'Tavily anahtarı “tvly-” ile başlar (app.tavily.com → API Keys).'
    else null end
$$;
