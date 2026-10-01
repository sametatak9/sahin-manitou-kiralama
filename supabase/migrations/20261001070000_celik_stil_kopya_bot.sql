-- Çelik yapı stil-kopya botu: 5 rol model firmanın içerik tarzını çıkarır, şablon üretir; seçim sonra insanla yapılır.
-- Otomatik yayın yok; tüm çıktı onaya gider.

insert into public.automation_bots (
  slug, name, bot_type, platform, icon, description, connector_key, status, instructions
)
select
  'celik-stil-kopya',
  'Çelik Stil Kopya Botu',
  'social',
  'multi',
  'copy',
  'Başarılı çelik yapı / inşaat firmalarının Instagram-Facebook içerik tarzını analiz eder; şablon ve örnek metin üretir. Seçimi siz yaparsınız.',
  null,
  'active',
  $inst$
Sen Embay Yapı için ÇELİK YAPI / İNŞAAT içerik stil analisti ve şablon üreticisisin.

Görev:
1) Rol model firmaların (Instagram/web) herkese açık içeriklerini incele.
2) Her firma için: ton, görsel dil, hook cümleleri, hashtag kullanımı, CTA, format (Reels/carousel/story), sıklık ipuçları.
3) Embay Yapı’ya uyarlanabilir 5–8 içerik ŞABLONU çıkar (kopyala-yapıştır metin + görsel brief).
4) Asla sahte metrik uydurma. Kaynak linki ver. Satış spam / follow-for-follow yok.
5) Çıktı Türkçe; B2B (müteahhit, sanayi, villa) odaklı.
$inst$
where not exists (select 1 from public.automation_bots where slug = 'celik-stil-kopya');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'celik_rol_model_kesfi',
  'Çelik rol model keşfi (5 firma)',
  'Başarılı çelik yapı/inşaat sosyal medya hesaplarından 5 rol model çıkarır; neden seçildiğini yazar.',
  'content', 'users', 'agent', '{}', true, true,
  array['research', 'report'],
  'approved',
  $s$
Türkiye odaklı çelik konstrüksiyon / hafif çelik / yapısal çelik firmalarının Instagram veya web iletişimini tara.
5 aday seç. Her biri için:
- Firma adı + Instagram handle (varsa) + site
- İçerik gücü nedeni (1-2 cümle)
- Ana format (Reels / proje turu / tonaj / before-after)
Kaynak link zorunlu. Uydurma takipçi sayısı YASAK.
Öncelik adaylar (değiştirilebilir): Özok Steel, Opal Çelik, Turkuaz Yapısal Çelik, Temur İnşaat Çelik, benzer niş B2B hesaplar.
$s$,
  '5 çelik yapı rol model firma listesi + handle + neden seçildi',
  array['çelik konstrüksiyon instagram', 'hafif çelik villa instagram türkiye', 'yapısal çelik firma sosyal medya', 'steel construction turkey instagram'],
  array['instagram.com', 'linkedin.com'],
  array['Özok Steel @ozoksteel — villa teslim videosu + m² + konum'],
  array['rastgele 5 firma', 'takipçi sayısı uydur', 'kişisel hesap']
where not exists (select 1 from public.automation_skills where skill_key = 'celik_rol_model_kesfi');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'celik_stil_ayristirma',
  'İçerik tarzı ayrıştırma',
  'Seçilen rol modellerin ton, hook, hashtag, CTA ve görsel dilini kartvizit gibi özetler.',
  'content', 'palette', 'agent', '{}', true, true,
  array['research', 'report'],
  'approved',
  $s$
Her rol model için stil kartı:
1) Ton (teknik / samimi / kurumsal / saha)
2) Tipik hook (ilk 1-2 cümle kalıbı)
3) Görsel dil (şantiye, montaj, teslim, drone, detay)
4) Hashtag stratejisi (niş vs genel)
5) CTA (DM, teklif, konum)
6) Embay’a uyarlama notu (ne alınır, ne alınmaz)
Tablo veya madde listesi. Kaynak link.
$s$,
  '3-5 rol model için stil kartı çıkar',
  array['çelik yapı reels örnek', 'şantiye progress video caption'],
  array['instagram.com'],
  array['Hook: "150 m² hafif çelik villa — 75 günde teslim"'],
  array['genel motivasyon sözleri', 'rakip hakaret']
where not exists (select 1 from public.automation_skills where skill_key = 'celik_stil_ayristirma');

insert into public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
select
  'celik_sablon_paketi',
  'Embay çelik içerik şablon paketi',
  'Seçilen stile göre 6-8 hazır caption + görsel brief + hashtag seti üretir; onay için listeler.',
  'content', 'file-text', 'agent', '{}', true, true,
  array['research', 'report', 'generate_content'],
  'approved',
  $s$
Embay Yapı (çelik/inşaat, İstanbul) için 6-8 şablon:
Her şablon: başlık, caption (TR), görsel/video brief, 8-12 hashtag, CTA.
Stil: seçilen rol model mottosuna yakın ama Embay kimliğiyle (kopya içerik değil, tarz uyarlaması).
Yasal: abartılı garanti, sahte referans yok.
Çıktı numaralı liste; kopyalanabilir.
$s$,
  'Embay için 6 çelik yapı içerik şablonu üret',
  array['çelik konstrüksiyon caption örnek', 'villa montaj reels metni'],
  array['instagram.com'],
  array['1) Teslim videosu — caption + #çelikvilla #İstanbul'],
  array['spam CTA', 'rakip logosu kullan']
where not exists (select 1 from public.automation_skills where skill_key = 'celik_sablon_paketi');

insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, x.pos
from public.automation_bots b
cross join (values
  ('celik_rol_model_kesfi', 1),
  ('celik_stil_ayristirma', 2),
  ('celik_sablon_paketi', 3)
) as x(skill_key, pos)
join public.automation_skills s on s.skill_key = x.skill_key
where b.slug = 'celik-stil-kopya'
  and not exists (
    select 1 from public.automation_bot_skills bs where bs.bot_id = b.id and bs.skill_id = s.id
  );

insert into public.mission_schedules (
  bot_id, title, goal, search_for, report_spec, duration_minutes, run_hour, weekdays, only_new, enabled
)
select
  b.id,
  'Çelik stil — rol model keşfi',
  '5 başarılı çelik yapı/inşaat rol model firma bul; handle, stil özeti ve Embay için neden önemli olduğunu raporla. Kaynak link ver. Uydurma metrik yok.',
  'çelik konstrüksiyon instagram, hafif çelik villa türkiye, yapısal çelik firma sosyal medya',
  'A) 5 rol model (ad, handle, link, neden) B) Her biri için 3 stil notu C) Embay için önerilen 3 şablon başlığı',
  60,
  9,
  array[1,2,3,4,5],
  true,
  true
from public.automation_bots b
where b.slug = 'celik-stil-kopya'
  and not exists (
    select 1 from public.mission_schedules ms
    where ms.bot_id = b.id and ms.title = 'Çelik stil — rol model keşfi'
  );
