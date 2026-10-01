-- Embay: her aktif bota 3 ortak skill + takipci bota 3 net skill + 60dk schedule
-- lifecycle: approved (production YOK)

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'saatlik_ozet_raporu',
  'Saatlik ozet rapor',
  'Gorevin sonunda ne bulundu / ne yapilamadi / siradaki aksiyonu 5 satirda ozetler.',
  'rapor', 'clock', 'agent', '{}', false, true,
  array['research', 'report'],
  'approved',
  'Her gorev bitince raporun EN USTUNE: 1) SAAT/TARIH 2) NE ARANDI 3) NE BULUNDU 4) NE BULUNAMADI 5) SIZE AKSIYON. Madde isaretli.',
  'Bu gorevin 5 satirlik saatlik ozetini yaz.',
  array['ozet rapor', 'aksiyon listesi'],
  array[]::text[],
  'SAAT 10:00 · 12 hesap adayi · 3 yorum sablonu',
  'Sayfalarca ham arama dokumu'
where not exists (select 1 from public.automation_skills where skill_key = 'saatlik_ozet_raporu');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'kalite_kontrol_filtresi',
  'Kalite kontrol filtresi',
  'Eski, alakasiz, tamamlanmis veya spam kayitlari eleyip guncel bulgulari birakir.',
  'kalite', 'filter', 'agent', '{}', false, true,
  array['research', 'report'],
  'approved',
  '60 gunden eski / yuklenici belirlendi / sozlesme imzalandi / is tamamlandi -> RED. Kaynaksiz iddia RED. Sadece gecenleri raporla.',
  'Ornek listeden eski olanlari ele.',
  array['guncel ilan', 'aktif ihale', '2026'],
  array[]::text[],
  '12 aday · 4 red · 8 gecerli',
  '2024 tamamlanmis ihaleyi firsat yazmak'
where not exists (select 1 from public.automation_skills where skill_key = 'kalite_kontrol_filtresi');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'aksiyon_listesi_uret',
  'Aksiyon listesi uret',
  'Raporu okuyanın telefondan yapacagi somut adimlari numarali listeler.',
  'rapor', 'list', 'agent', '{}', false, true,
  array['report'],
  'approved',
  'Rapor sonuna SIZE AKSIYON (max 8 madde). Otomatik takip/begeni/DM onerme. Satis slogani yok.',
  'Bu bulgular icin 5 elle aksiyon yaz.',
  array['aksiyon', 'yapilacaklar'],
  array[]::text[],
  '1) 3 hesabi takip et 2) 2 yoruma sablon yapistir',
  'Bot otomatik takip etsin'
where not exists (select 1 from public.automation_skills where skill_key = 'aksiyon_listesi_uret');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'hedef_hesap_skorlama',
  'Hedef hesap skorlama',
  'Aday IG/FB hesaplarini 0-100 skorlar; once yuksek skorlulari listeler.',
  'sosyal', 'star', 'agent', '{}', true, true,
  array['research', 'report'],
  'approved',
  'Skor: +30 insaat isi net +20 aktif santiye icerik +15 kurumsal iletisim +15 takipci 200-20k +10 yerel -50 bireysel/spam. Sirali liste. Otomatik takip YOK.',
  '10 insaat isletme hesabini skorla.',
  array['istanbul muteahhit instagram', 'yap sat firma ig'],
  array['instagram.com', 'facebook.com'],
  '92 · @ornek_yapsat · aktif kaba insaat Reels',
  'Skorsuz rastgele influencer'
where not exists (select 1 from public.automation_skills where skill_key = 'hedef_hesap_skorlama');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'yerel_mahalle_kesfi',
  'Yerel mahalle / bolge kesfi',
  'Gungoren, Catalca, Hadimkoy, Silivri ve Avrupa Yakasi odakh yerel yapi hesaplari.',
  'sosyal', 'map', 'agent', '{}', true, true,
  array['research', 'report'],
  'approved',
  'Oncelik: Gungoren, Catalca, Hadimkoy, Silivri, Buyukcekmece. Manitou/kiralama YOK. Otomatik takip YOK.',
  'Gungoren ve Catalca icin 8 yerel insaat hesabi bul.',
  array['gungoren muteahhit', 'catalca insaat', 'hadimkoy yapi'],
  array['instagram.com', 'facebook.com'],
  'Catalca · @xxx_yapi · villa kaba insaat',
  'Ankara genel hesap'
where not exists (select 1 from public.automation_skills where skill_key = 'yerel_mahalle_kesfi');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'gece_gunduz_aktivite_ozeti',
  'Gece / gunduz aktivite ozeti',
  'Son calismanin gece mi gunduz mu oldugunu kartvizit ozetine cevirir.',
  'rapor', 'moon', 'agent', '{}', false, true,
  array['report'],
  'approved',
  'Rapor basina: DILIM Gece/Gunduz · SAAT · BOT · CIKTI · SONRAKI. Tek bakista anlasilsin.',
  'Bu gorevi gece/gunduz kartvizit ozetine cevir.',
  array['ozet', 'gece', 'gunduz'],
  array[]::text[],
  'DILIM Gunduz · 10:05 · 11 hesap',
  'Ozetsiz uzun metin'
where not exists (select 1 from public.automation_skills where skill_key = 'gece_gunduz_aktivite_ozeti');

insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, 90 + row_number() over (partition by b.id order by s.skill_key)
from public.automation_bots b
cross join public.automation_skills s
where b.status = 'active'
  and s.skill_key in ('saatlik_ozet_raporu', 'kalite_kontrol_filtresi', 'aksiyon_listesi_uret')
  and not exists (select 1 from public.automation_bot_skills x where x.bot_id = b.id and x.skill_id = s.id);

insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, 20 + row_number() over (order by s.skill_key)
from public.automation_bots b
cross join public.automation_skills s
where b.slug = 'sosyal-buyume'
  and s.skill_key in ('hedef_hesap_skorlama', 'yerel_mahalle_kesfi', 'gece_gunduz_aktivite_ozeti')
  and not exists (select 1 from public.automation_bot_skills x where x.bot_id = b.id and x.skill_id = s.id);

update public.automation_skills
set enabled = true,
    lifecycle = case when lifecycle in ('draft', 'testing') then 'approved' else lifecycle end
where skill_key in (
  'saatlik_ozet_raporu', 'kalite_kontrol_filtresi', 'aksiyon_listesi_uret',
  'hedef_hesap_skorlama', 'yerel_mahalle_kesfi', 'gece_gunduz_aktivite_ozeti',
  'hedef_kitle_kesfi', 'gunluk_etkilesim_plani', 'kesif_hashtag_seti', 'collab_ortaklik_onerisi'
);

insert into public.mission_schedules (
  bot_id, title, goal, search_for, report_spec, model,
  duration_minutes, run_hour, weekdays, only_new, enabled, created_by
)
select
  b.id,
  'Toplu 60dk — ' || coalesce(b.name, b.slug),
  'Bu botun yeteneklerine gore 60 dakikalik derin tarama. Rapor basina SAAT/TARIH, NE BULUNDU, NE BULUNAMADI, SIZE AKSIYON. 60 gunden eski kayitlari ele. Embay Yapi insaat odakli; Manitou yok. Otomatik takip/begeni/yorum yok.',
  'istanbul insaat, guncel 2026, santiye, muteahhit, kentsel donusum',
  'Kartvizit ozet + madde madde bulgular + aksiyon listesi',
  null,
  60,
  7 + (row_number() over (order by b.name) % 12),
  '{1,2,3,4,5,6,7}',
  true,
  true,
  (select user_id from public.team_members where role = 'admin' order by created_at limit 1)
from public.automation_bots b
where b.status = 'active'
  and not exists (
    select 1 from public.mission_schedules ms
    where ms.bot_id = b.id and ms.title like 'Toplu 60dk — %'
  );

update public.automation_bots set status = 'active' where slug = 'sosyal-buyume';

select 'bot' as t, slug, status from public.automation_bots where status = 'active'
union all
select 'skill', skill_key, lifecycle from public.automation_skills
where skill_key in (
  'saatlik_ozet_raporu', 'kalite_kontrol_filtresi', 'aksiyon_listesi_uret',
  'hedef_hesap_skorlama', 'yerel_mahalle_kesfi', 'gece_gunduz_aktivite_ozeti'
)
union all
select 'sched', title, case when enabled then 'on' else 'off' end
from public.mission_schedules where title like 'Toplu 60dk — %' or title like 'Takipci —%';
