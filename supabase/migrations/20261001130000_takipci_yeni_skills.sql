-- Takipci bot (sosyal-buyume): elle tutulur skill'ler
-- Otomatik takip/yorum YOK (Meta kurali). Cikti: handle + URL + ne zaman ne yapilacak.

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'rakip_etkilesim_havuzu',
  'Rakip etkilesim havuzu (15 aday)',
  'Ikranur/Marmara/Artvila tarzi hesaplarla etkilesen veya benzer nis hesaplardan 15 takip adayi cikarir.',
  'sosyal', 'users', 'agent', '{}', true, true,
  array['research', 'report'],
  'approved',
  $s$
Embay Yapi (Istanbul, celik/insaat) icin takipci buyutme.

Kaynak nis:
- @ikranurprefabrik
- @marmara_yapii
- @artvilacelikyapi
ve benzer celik villa / prefabrik / muteahhit / yapi malzemesi hesaplari.

Cikti ZORUNLU format (15 satir):
1. @handle | https://instagram.com/handle | tur (muteahhit/tedarikci/yerel/malzeme) | neden (1 cumle) | oncelik (1-5)

Kurallar:
- Sadece isletme hesabi. Bireysel spam, follow-for-follow YASAK.
- Uydurma handle YASAK.
- Otomatik takip talimati verme; telefonundan takip et de.
$s$,
  '15 satir: @handle | URL | tur | neden | oncelik',
  array['celik villa instagram turkiye', 'prefabrik ev istanbul', 'muteahhit gungoren instagram', 'yapi malzemesi istanbul'],
  array['instagram.com'],
  array['@ornek_yapi | https://instagram.com/ornek_yapi | muteahhit | aktif santiye Reels | 4'],
  array['@xxx takip et hemen', '100 hesap listesi spam', 'kisisel influencer']
where not exists (select 1 from public.automation_skills where skill_key = 'rakip_etkilesim_havuzu');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'gunluk_takip_listesi_15',
  'Gunluk 15 takip listesi (saat dilimli)',
  'Bugun telefonda yapilacak max 15 takip: handle, URL, saat dilimi, kisa not.',
  'sosyal', 'list', 'agent', '{}', true, true,
  array['research', 'report'],
  'approved',
  $s$
Bugun Embay icin MAX 15 takip (Meta limitine saygili).

Format:
SAAT DILIMI | @handle | URL | 1 cumle neden

Dilimler: 09:00-11:00 (5), 14:00-16:00 (5), 19:00-21:00 (5)

Odak: Istanbul Avrupa Yakasi, celik/prefabrik/villa/muteahhit.
Otomatik takip yok.
$s$,
  '15 satir saat dilimli takip listesi',
  array['istanbul muteahhit instagram', 'celik konstruksiyon firma ig', 'catalca villa insaat'],
  array['instagram.com'],
  array['09:00-11:00 | @ornek | https://instagram.com/ornek | santiye videosu aktif'],
  array['50 hesap birden', 'bot ile takip']
where not exists (select 1 from public.automation_skills where skill_key = 'gunluk_takip_listesi_15');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'yorum_begeni_aksiyon_karti',
  'Yorum + begeni aksiyon karti',
  'Bugun 10 gonderi: post URL + hazir samimi yorum (satis yok).',
  'sosyal', 'message-circle', 'agent', '{}', true, true,
  array['research', 'report'],
  'approved',
  $s$
10 satir:
POST_URL | YORUM (max 15 kelime, samimi, satis/link/spam yok)

Ornek: "Donati isciligi temiz gorunuyor, kolay gelsin."
Son 14 gun insaat/celik/santiye gonderileri.
$s$,
  '10 satir: post URL + yorum sablonu',
  array['istanbul santiye reels', 'celik villa teslim videosu', 'kaba insaat progress'],
  array['instagram.com'],
  array['https://instagram.com/p/xxx | Donati net, kolay gelsin ekibe'],
  array['takip et beni', 'whatsapp link', 'superrrr!!!']
where not exists (select 1 from public.automation_skills where skill_key = 'yorum_begeni_aksiyon_karti');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'takipci_ceken_icerik_fikri',
  'Takipci ceken icerik fikri (5)',
  'Embay profiline takipci cekecek 5 Reels/post fikri + hook + CTA (Ikranur tarzi).',
  'content', 'sparkles', 'agent', '{}', true, true,
  array['research', 'report', 'generate_content'],
  'approved',
  $s$
5 fikir: Baslik, Hook, 3 madde akis, CTA, Hashtag 8-12.
Stil: @ikranurprefabrik — kopya metin degil.
Konu: celik villa, santiye progress, before-after, montaj, Istanbul saha.
Fiyat uydurma yok.
$s$,
  '5 takipci odakli Reels/post fikri',
  array['celik villa reels fikir', 'santiye before after instagram'],
  array['instagram.com'],
  array['1) 90 saniyede celik karkas — hook: Iskelet boyle yukselir'],
  array['giveaway spam', 'follow for follow post']
where not exists (select 1 from public.automation_skills where skill_key = 'takipci_ceken_icerik_fikri');

insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, 30 + x.pos
from public.automation_bots b
cross join (values
  ('rakip_etkilesim_havuzu', 1),
  ('gunluk_takip_listesi_15', 2),
  ('yorum_begeni_aksiyon_karti', 3),
  ('takipci_ceken_icerik_fikri', 4)
) as x(skill_key, pos)
join public.automation_skills s on s.skill_key = x.skill_key
where b.slug = 'sosyal-buyume'
  and not exists (
    select 1 from public.automation_bot_skills bs
    where bs.bot_id = b.id and bs.skill_id = s.id
  );

update public.automation_bots set
  status = 'active',
  instructions = coalesce(instructions, '') || E'\n\n[2026-10-01 takipci] Her calismada somut @handle + URL listesi uret. Otomatik takip yok. Kullanici telefondan uygular. Nis: celik/villa/insaat Istanbul. Referans: @ikranurprefabrik @marmara_yapii @artvilacelikyapi.'
where slug = 'sosyal-buyume';

insert into public.mission_schedules (
  bot_id, title, goal, search_for, report_spec, duration_minutes, run_hour, weekdays, only_new, enabled
)
select b.id,
  'Takipci — sabah 15 handle listesi',
  'Bugun telefonda takip edilecek max 15 @handle | URL | neden | saat dilimi. Uydurma handle yok. Otomatik takip yok.',
  'istanbul muteahhit instagram, celik villa firma, prefabrik istanbul, gungoren insaat',
  'A) 15 satir handle listesi B) Oncelik 1-5 C) Saat dilimleri',
  40, 8, array[1,2,3,4,5,6,7], true, true
from public.automation_bots b
where b.slug = 'sosyal-buyume'
  and not exists (select 1 from public.mission_schedules where title = 'Takipci — sabah 15 handle listesi');

insert into public.mission_schedules (
  bot_id, title, goal, search_for, report_spec, duration_minutes, run_hour, weekdays, only_new, enabled
)
select b.id,
  'Takipci — ogle yorum+begeni karti',
  '10 post URL + samimi yorum. Satis/link/spam yok. Telefondan uygulanacak.',
  'istanbul santiye reels, celik villa teslim, kaba insaat progress',
  '10 satir: URL | yorum',
  30, 13, array[1,2,3,4,5,6,7], true, true
from public.automation_bots b
where b.slug = 'sosyal-buyume'
  and not exists (select 1 from public.mission_schedules where title = 'Takipci — ogle yorum+begeni karti');

insert into public.mission_schedules (
  bot_id, title, goal, search_for, report_spec, duration_minutes, run_hour, weekdays, only_new, enabled
)
select b.id,
  'Takipci — aksam icerik fikri',
  'Embay icin 5 Reels/post fikri (Ikranur tarzi, ozgun). Hook + CTA + hashtag.',
  'celik villa reels, santiye before after',
  '5 fikir karti',
  25, 18, array[1,2,3,4,5,6,7], true, true
from public.automation_bots b
where b.slug = 'sosyal-buyume'
  and not exists (select 1 from public.mission_schedules where title = 'Takipci — aksam icerik fikri');
