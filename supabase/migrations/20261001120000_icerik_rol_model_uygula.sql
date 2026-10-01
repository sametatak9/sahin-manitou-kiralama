-- Onaylı plan: rol modeller sabit + içerik botları bugün Embay özgün içerik üretsin (Ikranur tarzı şablon, kopya metin değil)

update public.automation_bots set
  status = 'active',
  instructions = $i$
Sen Embay Yapı için çelik/prefabrik villa içerik stil analisti ve şablon üreticisisin.

SABİT ROL MODELLER (Instagram):
1) @ikranurprefabrik — ANA STİL (vizyoner dil, renk/estetik, m²+oda turu, uzun hikâye caption)
2) @marmara_yapii — saha/kurulum videosu, lokasyon+m²
3) @artvilacelikyapi — model kodu, plan ölçüleri, teknik+estetik

Kurallar:
- Bu profillerin tarzını çıkar; Embay Yapı adına ÖZGÜN caption yaz (rakip metnini birebir kopyalama).
- Uydurma metrik/fiyat yok. Kaynak olarak handle belirt.
- Platform: Instagram + Facebook uyumlu metin.
- Her çıktı onay için listelensin; otomatik yayın yok.
$i$,
  description = 'İkranur/Marmara/Artvila tarzından Embay özgün içerik şablonları üretir.'
where slug = 'celik-stil-kopya';

update public.automation_skills set
  instructions = $s$
Sadece şu 3 Instagram hesabını referans al:
- https://www.instagram.com/ikranurprefabrik/ (ANA)
- https://www.instagram.com/marmara_yapii/
- https://www.instagram.com/artvilacelikyapi/

Her biri için: ton, hook kalıbı, görsel dil, hashtag, CTA, tipik format (Reels/tur/teslim).
Sonra Embay Yapı (İstanbul, çelik/inşaat) için 6 ÖZGÜN şablon:
başlık, caption (TR), görsel brief, 8-12 hashtag, CTA.
Rakip cümlesini aynen kopyalama. Fiyat uydurma.
$s$,
  test_goal = '3 rol model stil kartı + Embay için 6 özgün Instagram/Facebook caption',
  search_terms = array[
    'ikranurprefabrik çelik villa',
    'marmara_yapii çelik ev',
    'artvilacelikyapi çelik konstrüksiyon',
    'çelik villa istanbul caption'
  ],
  lifecycle = 'approved',
  enabled = true
where skill_key in ('celik_rol_model_kesfi', 'celik_stil_ayristirma', 'celik_sablon_paketi');

update public.automation_bots set
  status = 'active',
  instructions = coalesce(instructions, '') || E'\n\n[2026-10-01] Embay Yapı özgün içerik. Stil referansı: @ikranurprefabrik (vizyoner, m² turu, sıcak renk). Asla rakip metnini kopyalama. Instagram + Facebook. Her taslak onaya gitsin.'
where slug in ('content-bot', 'icerik-fabrikasi', 'instagram-bot', 'facebook-bot', 'social-bot');

update public.automation_bots set status = 'active'
where slug in ('content-bot', 'icerik-fabrikasi', 'social-bot')
  and status is distinct from 'archived';

insert into public.mission_schedules (
  bot_id, title, goal, search_for, report_spec, duration_minutes, run_hour, weekdays, only_new, enabled
)
select
  b.id,
  'Embay — gunluk ozgun icerik (IG+FB)',
  $g$Embay Yapı için BUGÜN Instagram ve Facebook özgün içerik üret.

Stil referansı (kopyalama, tarz al):
- @ikranurprefabrik: vizyoner dil, m² + oda turu, sıcak estetik, DM/telefon CTA
- @marmara_yapii: saha/kurulum, lokasyon
- @artvilacelikyapi: model/plan netliği

Üret (3 paket):
1) Reels caption: çelik villa / şantiye progress (hook + 80-120 kelime + hashtag)
2) Feed post: proje/teslim hikâyesi (İkranur tarzı yapı, Embay ismi)
3) Facebook kısa versiyon (biraz daha bilgilendirici)

Kurallar: uydurma fiyat/müşteri yok; spam hashtag yok; satış baskısı yumuşak CTA.
Çıktı: kopyalanabilir caption + görsel brief + önerilen paylaşım saati (İstanbul).
$g$,
  'çelik villa reels caption, şantiye progress instagram, embay yapı inşaat istanbul',
  'A) 3 caption (IG Reels, IG Feed, FB) B) Görsel brief C) Hashtag D) Saat önerisi',
  45,
  10,
  array[1,2,3,4,5,6,7],
  true,
  true
from public.automation_bots b
where b.slug = 'content-bot'
  and not exists (
    select 1 from public.mission_schedules ms
    where ms.bot_id = b.id and ms.title = 'Embay — gunluk ozgun icerik (IG+FB)'
  );

insert into public.mission_schedules (
  bot_id, title, goal, search_for, report_spec, duration_minutes, run_hour, weekdays, only_new, enabled
)
select
  b.id,
  'Embay stil — Ikranur mottolu 6 sablon',
  $g$Rol modeller: @ikranurprefabrik (ANA), @marmara_yapii, @artvilacelikyapi.
Stil kartı çıkar; Embay Yapı için 6 özgün Instagram/Facebook caption + görsel brief üret.
Birebir kopya yasak. Fiyat uydurma yasak.
$g$,
  'ikranurprefabrik, marmara_yapii, artvilacelikyapi, çelik villa istanbul',
  'Stil kartları + 6 Embay şablonu (caption, brief, hashtag, CTA)',
  60,
  11,
  array[1,2,3,4,5],
  true,
  true
from public.automation_bots b
where b.slug = 'celik-stil-kopya'
  and not exists (
    select 1 from public.mission_schedules ms
    where ms.bot_id = b.id and ms.title = 'Embay stil — Ikranur mottolu 6 sablon'
  );

insert into public.automation_bots (slug, name, bot_type, platform, icon, description, status, instructions)
select
  'content-bot',
  'Content Bot',
  'content',
  'multi',
  'pen-line',
  'Günlük Embay Yapı Instagram/Facebook içerik taslakları (İkranur tarzı, özgün metin).',
  'active',
  'Embay Yapı özgün içerik. Stil: @ikranurprefabrik. Platform: Instagram + Facebook. Onaya gönder.'
where not exists (select 1 from public.automation_bots where slug = 'content-bot');
