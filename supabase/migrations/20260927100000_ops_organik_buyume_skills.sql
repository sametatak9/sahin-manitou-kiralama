-- EMBAY AI OPS — Organik büyüme skill seti (additive, DROP yok)
-- Tarih: 2026-09-27
-- Kurallar: Otomatik beğeni/takip/yorum YOK. Sadece işletme hesapları. Onay zorunlu. KVKK uyumlu.

-- 1. Gelişmiş Hashtag Araştırması
INSERT INTO public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
SELECT
  'hashtag_arastirma',
  'Gelişmiş Hashtag Araştırması',
  'Manitou kiralama, inşaat, kentsel dönüşüm ve İstanbul Avrupa Yakası için algoritmaya uygun hashtag setleri üretir.',
  'content',
  'hash',
  'agent',
  '{}',
  true,
  true,
  ARRAY['research', 'report', 'generate_hashtags'],
  'testing',
  'Amaç: Embay Yapı & Şahin Manitou Instagram/Facebook gönderileri için yüksek performanslı hashtag seti üret.
Kurallar:
- Toplam 8-12 hashtag.
- 3-4 yüksek hacimli (100K+), 4-5 orta (10K-100K), 3-4 niş/yerel (1K-10K).
- Sadece sektörle ilgili etiketler kullan (manitou, teleskopik yükleyici, inşaat, şantiye, kentsel dönüşüm, villa, İstanbul Avrupa Yakası, Güngören, Çatalca vb.).
- Algoritmayı bozan spam hashtag, takipçi arttırma etiketi, alakasız popüler etiket KULLANMA.
- Her sete kısa gerekçe ekle.
- Varsa rakip işletme hesaplarından gözlemlenen başarılı hashtag örneklerini belirt (Business Discovery veya açık kaynak).
Çıktı: 2-3 alternatif set + en iyi önerilen set.',
  'Manitou kiralama ve İstanbul Avrupa Yakası inşaat sektörü için 8-12 hashtaglik 2 alternatif set üret. Yüksek/orta/niş dengesi kur. Spam etiket kullanma.',
  ARRAY['manitou kiralama hashtag', 'teleskopik yükleyici instagram', 'istanbul inşaat hashtag', 'kentsel dönüşüm reels', 'güngören şantiye'],
  ARRAY['instagram.com', 'facebook.com'],
  'Ör: #manitoukiralama #teleskopikyukleyici #istanbuleurope #santiyemakinesi #gungoren #operatörlümanitou',
  'Ör: 30 hashtag, #takipçikazan, #followforfollow, alakasız viral etiketler, bireysel hesap etiketleri.'
WHERE NOT EXISTS (SELECT 1 FROM public.automation_skills WHERE skill_key = 'hashtag_arastirma');

-- 2. Profil Optimizasyon Önerisi
INSERT INTO public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
SELECT
  'profil_optimizasyon',
  'Profil Optimizasyon Önerisi',
  'Instagram ve Facebook işletme profili için bio, highlight, CTA ve link-in-bio önerileri üretir.',
  'social',
  'user',
  'agent',
  '{}',
  true,
  true,
  ARRAY['research', 'report', 'create_content'],
  'testing',
  'Amaç: Embay Yapı & Şahin Manitou işletme hesaplarının profilini dönüşüm odaklı optimize et.
Çıktı zorunlu alanlar:
1. Bio metni (Instagram 150 karakter limiti, anahtar kelime + net CTA)
2. İsim alanı önerisi
3. Highlight başlıkları ve önerilen sıra (Projeler, Manitou / Telehandler, Müşteri Yorumları, Hizmet Bölgesi, İletişim)
4. Link-in-bio stratejisi (mevcut site: https://sahin-manitou-kiralama.vercel.app)
5. 3 farklı CTA örneği (WhatsApp, teklif formu, telefon)
Kurallar: Abartılı vaat yok, sahte sosyal kanıt yok, sadece gerçek hizmetler.',
  'Şahin Manitou Kiralama Instagram profili için bio + highlight + CTA + link-in-bio önerisi hazırla. 150 karakter limitine uy.',
  ARRAY['instagram bio inşaat', 'manitou kiralama profil', 'işletme hesabı optimizasyon'],
  ARRAY['instagram.com', 'facebook.com'],
  'Ör: Bio — "İstanbul Avrupa Yakası Manitou & teleskopik yükleyici kiralama | Operatörlü/operatörsüz | Güngören merkez | Hemen teklif al"',
  'Ör: "1 günde 1000 takipçi", sahte müşteri sayısı, abartılı fiyat vaadi.'
WHERE NOT EXISTS (SELECT 1 FROM public.automation_skills WHERE skill_key = 'profil_optimizasyon');

-- 3. Manuel Etkileşim Planı
INSERT INTO public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
SELECT
  'manuel_etkilesim_plani',
  'Manuel Etkileşim Planı',
  'Haftalık sürdürülebilir manuel etkileşim rutini ve öncelikli işletme hesap listesi üretir. Otomatik takip/beğeni yapmaz.',
  'social',
  'users',
  'agent',
  '{}',
  true,
  true,
  ARRAY['research', 'report'],
  'testing',
  'Amaç: Embay Yapı & Şahin Manitou için spam riski düşük, değer katan manuel etkileşim planı çıkar.
Kurallar (kesin):
- Otomatik beğeni, otomatik takip, otomatik yorum, toplu DM YASAK.
- Sadece İŞLETME / kurum hesapları (rakip, tedarikçi, sektör medyası, yerel işletme).
- Bireysel kişilerin hesapları, beğenen/yorum yapan kişi listeleri TOPLANMAZ.
- Günlük anlamlı etkileşim kotası öner (ör. 8-12 yorum veya hikâye yanıtı).
- Yorumlar değer katsın, satış kokmasın.
Çıktı:
1. Öncelikli takip öneri listesi (hesap, platform, tür, neden, öncelik skoru)
2. Haftalık rutin (hangi gün hangi tür hesaplarla)
3. 5 adet değer katan yorum şablonu
4. Yapılmaması gerekenler listesi',
  'Bu hafta için Manitou/inşaat sektörü işletme hesaplarıyla manuel etkileşim planı hazırla. Takip listesi + günlük kota + yorum şablonları. Otomatik işlem önerme.',
  ARRAY['instagram inşaat firması İstanbul', 'manitou kiralama rakip', 'yapı malzemesi tedarikçi instagram', 'kentsel dönüşüm sayfası'],
  ARRAY['instagram.com', 'facebook.com'],
  'Ör: günde 10 anlamlı yorum, rakip Reels altına teknik soru, tedarikçi hikayesine yanıt.',
  'Ör: otomatik takip botu, bireysel hesap listesi, "harika post" spam yorumları, takipçi satın alma.'
WHERE NOT EXISTS (SELECT 1 FROM public.automation_skills WHERE skill_key = 'manuel_etkilesim_plani');

-- 4. Meta Organik Büyüme Yöntemi (güçlendirilmiş — mevcut varsa atla)
INSERT INTO public.automation_skills (
  skill_key, display_name, description, category, icon,
  execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples
)
SELECT
  'meta_organik_buyume',
  'Meta organik büyüme yöntemi (Instagram · Facebook · WhatsApp)',
  'Instagram, Facebook ve WhatsApp için yasal organik büyüme planı: hashtag, profil, içerik takvimi, manuel etkileşim ve collab fırsatları.',
  'social',
  'trending-up',
  'agent',
  '{}',
  true,
  true,
  ARRAY['research', 'report', 'create_content', 'generate_hashtags', 'save_draft'],
  'testing',
  'Amaç: Embay Yapı & Şahin Manitou hesaplarını Meta kuralları içinde organik büyüt.
Kapsam:
1. Hashtag stratejisi (gelişmiş setler)
2. Profil optimizasyonu
3. 30 günlük içerik takvimi (Reels öncelikli, before-after, saha videosu, operatörlü kiralama avantajı, Çatalca/İstanbul odaklı)
4. Manuel etkileşim planı (işletme hesapları, kota, şablon)
5. Collab / ortak gönderi fırsatları (sadece işletme hesaplarıyla)
6. Haftalık performans kontrol listesi
Kesin yasaklar: otomatik beğeni, otomatik takip, otomatik yorum, spam, takipçi satın alma, bireysel veri toplama.
Her öneri onay kuyruğuna düşer. İnsan uygular.',
  '30 günlük organik büyüme planı çıkar: hashtag setleri + profil önerisi + içerik takvimi + manuel etkileşim rutini. Sadece yasal yöntemler.',
  ARRAY['organik instagram büyüme inşaat', 'manitou kiralama reels', 'iş makinesi kiralama içerik planı'],
  ARRAY['instagram.com', 'facebook.com', 'business.facebook.com'],
  'Ör: Reels serisi "Manitou 17m nasıl çalışır", before-after karusel, haftada 3-4 değer katan yorum.',
  'Ör: takipçi satın alma, otomatik takip botu, spam yorum, bireysel hesap avı.'
WHERE NOT EXISTS (SELECT 1 FROM public.automation_skills WHERE skill_key = 'meta_organik_buyume');

-- Botlara bağlama (sosyal-buyume + ilgili botlar, id dinamik)
INSERT INTO public.automation_bot_skills (bot_id, skill_id, position)
SELECT b.id, s.id, 20 + row_number() OVER (PARTITION BY b.id ORDER BY s.skill_key)
FROM public.automation_bots b
JOIN public.automation_skills s ON s.skill_key IN ('hashtag_arastirma','profil_optimizasyon','manuel_etkilesim_plani','meta_organik_buyume')
WHERE b.slug IN ('sosyal-buyume')
  AND NOT EXISTS (
    SELECT 1 FROM public.automation_bot_skills x
    WHERE x.bot_id = b.id AND x.skill_id = s.id
  );

-- Uzun vadeli Meta Algoritma Motoru schedule örnekleri (additive)
INSERT INTO public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at)
SELECT
  (SELECT id FROM public.automation_bots WHERE slug = 'sosyal-buyume' LIMIT 1),
  'Meta Algoritma — Haftalık hashtag + rakip format',
  'Meta Algoritma Motoru — Haftalık hashtag ve rakip format. Platform: Instagram + Facebook. 1) Manitou + inşaat + İstanbul Avrupa Yakası için 8-12 hashtaglik 2 set (yüksek/orta/niş). 2) Önde gelen 5-8 rakip/tedarikçi işletme hesabının son dönem format özeti. Sadece işletme hesapları. Otomatik beğeni/takip/yorum yok. Raporunda hashtag_arastirma ve meta_organik_buyume belirt.',
  'instagram manitou kiralama, instagram inşaat firması İstanbul, teleskopik yükleyici hashtag',
  'Hashtag setleri + rakip format özeti; en iyi 2 set başta.',
  null, 15, 9, '{1}', true,
  (SELECT user_id FROM public.team_members WHERE role = 'admin' ORDER BY created_at LIMIT 1),
  null
WHERE EXISTS (SELECT 1 FROM public.automation_bots WHERE slug = 'sosyal-buyume')
  AND NOT EXISTS (SELECT 1 FROM public.mission_schedules WHERE title = 'Meta Algoritma — Haftalık hashtag + rakip format');

INSERT INTO public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at)
SELECT
  (SELECT id FROM public.automation_bots WHERE slug = 'sosyal-buyume' LIMIT 1),
  'Meta Algoritma — Manuel etkileşim planı',
  'Meta Algoritma Motoru — Bu haftanın manuel etkileşim planı. 1) Öncelikli işletme hesap listesi 2) Günlük kota 3) 5 değer katan yorum şablonu 4) Yapılmaması gerekenler. Otomatik takip/beğeni/yorum YASAK. Raporunda manuel_etkilesim_plani belirt.',
  'instagram inşaat firması İstanbul, manitou kiralama rakip, yapı malzemesi tedarikçi',
  'Takip listesi + kota + şablonlar.',
  null, 15, 10, '{2}', true,
  (SELECT user_id FROM public.team_members WHERE role = 'admin' ORDER BY created_at LIMIT 1),
  null
WHERE EXISTS (SELECT 1 FROM public.automation_bots WHERE slug = 'sosyal-buyume')
  AND NOT EXISTS (SELECT 1 FROM public.mission_schedules WHERE title = 'Meta Algoritma — Manuel etkileşim planı');

INSERT INTO public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at)
SELECT
  (SELECT id FROM public.automation_bots WHERE slug = 'sosyal-buyume' LIMIT 1),
  'Meta Algoritma — 7 günlük Reels içerik önerisi',
  'Meta Algoritma Motoru — Önümüzdeki 7 gün Reels öncelikli içerik önerisi. Manitou kiralama, before-after, saha videosu, operatörlü avantaj, Çatalca/İstanbul odaklı. Her öneri için format, konu, kısa caption iskeleti, hashtag seti. Onay kuyruğuna düşsün. Otomatik yayın yok.',
  'manitou reels, inşaat before after, şantiye videosu',
  '7 günlük Reels/karusel öneri listesi.',
  null, 15, 9, '{3}', true,
  (SELECT user_id FROM public.team_members WHERE role = 'admin' ORDER BY created_at LIMIT 1),
  null
WHERE EXISTS (SELECT 1 FROM public.automation_bots WHERE slug = 'sosyal-buyume')
  AND NOT EXISTS (SELECT 1 FROM public.mission_schedules WHERE title = 'Meta Algoritma — 7 günlük Reels içerik önerisi');
