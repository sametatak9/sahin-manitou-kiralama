-- Takipci botu 24s kurulum + yeni skill'ler + insaat odakli organik yontemler
-- Otomatik begeni/takip/yorum YOK — sadece liste + sablon + plan (insan uygular)

update public.automation_bots
set status = 'active',
    name = 'Takipci Buyume Botu',
    description = 'Her gun hedef kitle hesap kesfi, etkilesim listesi ve hashtag plani uretir. Takip/yorum elle yapilir.',
    instructions = 'AMAC: Embay Yapi Instagram/Facebook icin NITELIKLI insaat sektoru takipcisi kazandirmak.
HEDEF KITLE (sadece isletme / kurum hesaplari):
1) Yap-sat muteahhitleri, konut ureticileri (Istanbul, Kocaeli, Tekirdag)
2) Kaba/ince insaat kalfasi, kalip-demir, santiye ustasi hesaplari
3) Santiye sefi, insaat muhendisi, mimarlik ofisleri
4) Gungoren, Catalca, Hadimkoy, Silivri, Avrupa Yakasi yerel yapi malzemesi ve proje hesaplari
5) Kentsel donusum / kat karsiligi bilgilendirme sayfalari

YONTEM (Meta + KVKK uyumlu — ASLA bozma):
- Hesaplari ve gonderileri LISTELE; profil URL + handle + neden uygun yaz
- Her gonderi icin 1 kisa, samimi, satis kokmayan yorum sablonu oner
- OTOMATIK takip / begeni / yorum / DM YAPMA
- Bireysel kisisel hesaplari, takipci satan hesaplari, alakasiz viral hesaplari ELE
- Manitou / makine kiralama odakli arama YAPMA — sadece insaat isi ve sektor agi
- Raporu net ayir: (A) Takip edilecek hesaplar (B) Bugun etkilesim (yorum) listesi (C) Hashtag seti'
where slug = 'sosyal-buyume';

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'hedef_kitle_kesfi',
  'Hedef kitle hesap kesfi',
  'Instagram/Facebook uzerinde insaat sektoru isletme hesaplarini bulur; takip listesine aday ekler.',
  'sosyal', 'users', 'agent', '{}', true, true,
  array['research', 'report'],
  'production',
  'Amac: Embay Yapi icin takip edilecek NITELIKLI isletme hesaplari bul. Sadece isletme/kurum. Bireysel/spam reject. Otomatik takip yok. Cikti: 8-15 hesap adayi.',
  'Istanbul insaat sektorunden 10 isletme Instagram hesabi bul; handle + URL + neden uygun.',
  array['istanbul muteahhit instagram', 'yap sat firma instagram', 'santiye ustasi hesap', 'kentsel donusum istanbul sayfa', 'yapi malzemesi tedarikci ig'],
  array['instagram.com', 'facebook.com'],
  array['@xxx_insaat — Gungoren yap-sat, aktif santiye Reels'],
  array['bireysel influencer', 'follow for follow', 'yabanci meme hesabi']
where not exists (select 1 from public.automation_skills where skill_key = 'hedef_kitle_kesfi');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'gunluk_etkilesim_plani',
  'Gunluk etkilesim plani',
  'Her gun elle yapilacak begeni+yorum listesi ve yorum sablonlari uretir (spam yok).',
  'sosyal', 'heart', 'agent', '{}', true, true,
  array['research', 'report'],
  'production',
  'Amac: Bugun yoneticinin telefonundan yapacagi 8-12 anlamli etkilesimi planla. Her satir: URL + yorum sablonu. Satis/link/spam YOK. Max 12. Son 14 gun gonderiler.',
  'Bugun icin 8 insaat gonderisi + yorum sablonu ve 5 takip adayi listele.',
  array['istanbul santiye reels', 'yap sat proje videosu', 'kaba insaat progress', 'kentsel donusum before after'],
  array['instagram.com'],
  array['Begen+yorum: https://instagram.com/p/... — "Donati isciligi net gorunuyor, basarilar"'],
  array['100 hesap toplu takip listesi', 'spam yorum', 'satis linki']
where not exists (select 1 from public.automation_skills where skill_key = 'gunluk_etkilesim_plani');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'kesif_hashtag_seti',
  'Kesif / Explore hashtag seti',
  'Instagram kesfete dusmeye yardimci nis+yerel hashtag setleri uretir.',
  'content', 'hash', 'agent', '{}', true, true,
  array['research', 'report', 'generate_hashtags'],
  'production',
  'Amac: Embay Yapi insaat icerikleri icin Explore dostu 8-12 hashtag. Spam etiket YASAK. Insaat/santiye/villa/kentsel donusum/Istanbul odakli.',
  'Istanbul insaat Reels icin 10 hashtaglik 2 set oner.',
  array['istanbul insaat hashtag', 'kentsel donusum reels etiket', 'santiye videosu hashtag'],
  array['instagram.com'],
  array['#istanbulinsaat #kentseldonusum #santiyeden #yapsat #gungoren'],
  array['#followforfollow', '30 alakasiz viral etiket']
where not exists (select 1 from public.automation_skills where skill_key = 'kesif_hashtag_seti');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'collab_ortaklik_onerisi',
  'Collab / ortaklik onerisi',
  'Ortak gonderi veya karsilikli etkilesim icin uygun isletme hesaplari onerir.',
  'sosyal', 'handshake', 'agent', '{}', true, true,
  array['research', 'report'],
  'testing',
  'Amac: Embay Yapi ile collab / etiket / ortak Reels yapilabilecek isletmeler. Tamamlayici iliski; dogrudan rakip calma yok. Cikti: 5 aday + yaklasim cumlesi.',
  'Istanbul Avrupa Yakasi icin 5 collab adayi isletme hesabi oner.',
  array['yapi malzemesi istanbul instagram', 'beton santral sosyal medya', 'mimarlik ofisi istanbul'],
  array['instagram.com', 'facebook.com'],
  array['Yerel yapi market X — story etiket + santiye teslim videosu'],
  array['dogrudan rakip takipci calma plani']
where not exists (select 1 from public.automation_skills where skill_key = 'collab_ortaklik_onerisi');

insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, coalesce((select max(position)+1 from public.automation_bot_skills where bot_id = b.id), 0)
from public.automation_bots b
join public.automation_skills s on s.skill_key in (
  'hedef_kitle_kesfi', 'gunluk_etkilesim_plani', 'kesif_hashtag_seti', 'collab_ortaklik_onerisi',
  'hashtag_arastirma', 'manuel_etkilesim_plani', 'sektor_hesap_kesfi', 'meta_organik_buyume'
)
where b.slug = 'sosyal-buyume'
  and not exists (select 1 from public.automation_bot_skills x where x.bot_id = b.id and x.skill_id = s.id);

update public.automation_skills
set enabled = true,
    lifecycle = case when lifecycle = 'draft' then 'testing' else lifecycle end
where skill_key in (
  'hedef_kitle_kesfi', 'gunluk_etkilesim_plani', 'kesif_hashtag_seti', 'collab_ortaklik_onerisi',
  'hashtag_arastirma', 'manuel_etkilesim_plani', 'sektor_hesap_kesfi', 'meta_organik_buyume', 'profil_optimizasyon'
);

insert into public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at, enabled)
select
  (select id from public.automation_bots where slug = 'sosyal-buyume' limit 1),
  'Takipci — gunluk hesap kesfi',
  'Istanbul ve Trakya insaat sektorunden YENI isletme Instagram/Facebook hesaplari bul. Her hesap: handle, URL, tur, neden hedef kitle. Bireysel/spam yok. Otomatik takip yok. En az 10 aday. Rapor basligi: HESAP KESFI.',
  'istanbul muteahhit instagram, yap sat firma ig, santiye ustasi hesap, kentsel donusum sayfa, yapi malzemesi tedarikci, 2026 guncel',
  'A) Yeni hesap listesi (oncelikli 10) B) Atlanacaklar kisa not',
  null, 12, 8, '{1,2,3,4,5,6,7}', true,
  (select user_id from public.team_members where role = 'admin' order by created_at limit 1),
  null, true
where exists (select 1 from public.automation_bots where slug = 'sosyal-buyume')
  and not exists (select 1 from public.mission_schedules where title = 'Takipci — gunluk hesap kesfi');

insert into public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at, enabled)
select
  (select id from public.automation_bots where slug = 'sosyal-buyume' limit 1),
  'Takipci — gunluk etkilesim plani',
  'Bugun ELLE yapilacak 8-12 etkilesim: son 14 gun insaat/santiye gonderileri. Her satirda URL + hazir yorum sablonu (satis yok, samimi). Ayrica 5 takip adayi. Otomatik begeni/yorum YASAK. Rapor basligi: ETKILESIM PLANI.',
  'istanbul santiye reels, yap sat progress, kaba insaat videosu, kentsel donusum before after, villa insaat istanbul',
  'A) Yorum listesi (max 12) B) Takip listesi (5) C) Yapma listesi',
  null, 12, 10, '{1,2,3,4,5,6,7}', true,
  (select user_id from public.team_members where role = 'admin' order by created_at limit 1),
  null, true
where exists (select 1 from public.automation_bots where slug = 'sosyal-buyume')
  and not exists (select 1 from public.mission_schedules where title = 'Takipci — gunluk etkilesim plani');

insert into public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at, enabled)
select
  (select id from public.automation_bots where slug = 'sosyal-buyume' limit 1),
  'Takipci — gunluk hashtag seti',
  'Bugunun Embay Yapi insaat Reels/postlari icin 8-12 kesif dostu hashtag seti uret (2 alternatif). Spam etiket yok. Manitou etiketlerini zorlama. Rapor basligi: HASHTAG SETI.',
  'istanbul insaat hashtag, kentsel donusum reels, santiye videosu etiket',
  'Onerilen set + alternatif set + 1 cumle gerekce',
  null, 8, 16, '{1,2,3,4,5,6,7}', true,
  (select user_id from public.team_members where role = 'admin' order by created_at limit 1),
  null, true
where exists (select 1 from public.automation_bots where slug = 'sosyal-buyume')
  and not exists (select 1 from public.mission_schedules where title = 'Takipci — gunluk hashtag seti');

insert into public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at, enabled)
select
  (select id from public.automation_bots where slug = 'sosyal-buyume' limit 1),
  'Takipci — haftalik collab onerisi',
  'Bu hafta collab / etiket / ortak Reels icin 5 tamamlayici isletme hesabi oner. Rakip calma yok. Rapor basligi: COLLAB.',
  'yapi malzemesi istanbul, beton, iskele, mimarlik ofisi istanbul instagram',
  '5 aday + yaklasim cumlesi',
  null, 12, 11, '{1}', true,
  (select user_id from public.team_members where role = 'admin' order by created_at limit 1),
  null, true
where exists (select 1 from public.automation_bots where slug = 'sosyal-buyume')
  and not exists (select 1 from public.mission_schedules where title = 'Takipci — haftalik collab onerisi');

update public.mission_schedules
set enabled = false
where bot_id = (select id from public.automation_bots where slug = 'sosyal-buyume' limit 1)
  and title in (
    'Meta Algoritma — Haftalik hashtag + rakip format',
    'Meta Algoritma — Manuel etkilesim plani',
    'Meta Algoritma — 7 gunluk Reels icerik onerisi'
  );

update public.automation_bots
set instructions = coalesce(instructions, '') || E'\n\n[2026-09 egitim] Gercek santiye / proje oncelikli. Slogan ve render spam yok. Komsu/durust ton. Manitou kiralama reklami uretme — Embay Yapi insaat isi. Caption kisa, hashtag 8-12, satis baskisi yok.'
where slug = 'icerik-fabrikasi'
  and coalesce(instructions, '') not like '%2026-09 egitim%';
