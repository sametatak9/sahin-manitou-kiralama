-- EMBAY AI OPS — İş bulucu botlar ve Akademi yetenekleri: (1) Manitou kiralama işi bulma (2) Özel inşaat işi bulma
-- (villa, prefabrik, betonarme ev, bina). Yetenekler "TESTTE" başlar; Akademi'de test + onaydan sonra görevlerde kullanılır.
-- KVKK: şahıslara ait kişisel veri (telefon, e-posta, ad) TOPLANMAZ; şahıs talebi yalnızca herkese açık bağlantısıyla ve anonim özetle kaydedilir.
-- Additive: yalnızca INSERT (varsa atlanır) ve mevcut günlük görevin bota bağlanması.

insert into public.automation_skills (skill_key, display_name, description, category, icon, execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples)
select 'manitou_is_bulma', 'Manitou kiralama işi bulma', 'Önümüzdeki 30 günde teleskopik yükleyici (Manitou) kiralamaya ihtiyaç duyacak şantiye ve firmaları bulur.',
  'arastirma', 'truck', 'agent', '{}', true, true, array['research', 'report'], 'testing',
  'Amaç: Şahin Manitou için İstanbul, Kocaeli ve Tekirdağ''da teleskopik yükleyici (Manitou / telehandler) KİRALAMA işi bulmak. '
  || 'Güçlü sinyaller: (1) kaba inşaat aşamasındaki veya yeni başlayan bina/site projeleri; (2) prefabrik, çelik konstrüksiyon, depo, fabrika, lojistik merkezi montaj ve inşaatları; '
  || '(3) cephe, çatı, yüksekte malzeme taşıma gerektiren işler; (4) "manitou operatörü aranıyor" / "telehandler operatörü" iş ilanı veren firmalar (makineye ihtiyaçları var demektir); '
  || '(5) "kiralık manitou / teleskopik forklift aranıyor" talepleri; (6) tarım-hayvancılık tesisi, fuar/etkinlik kurulumu gibi yükleme işleri. '
  || 'Her bulguda: firma veya proje adı, ilçe, işin ne olduğu, NEDEN Manitou gerektiği (fit), mümkünse firmanın kendi web sitesindeki kurumsal telefon/e-posta. '
  || 'Şahıslara ait kişisel numara/e-posta yazma. Genel sektör haberi, makine satış reklamı, kaza haberi bulgu değildir.',
  'İstanbul, Kocaeli veya Tekirdağ''da şu an devam eden ya da önümüzdeki 30 günde başlayacak, teleskopik yükleyici (Manitou) kiralamaya ihtiyaç duyabilecek en az 5 somut şantiye/firma bul: proje adı, firma, ilçe, iş, neden Manitou gerektiği ve kaynak linki.',
  array['kiralık manitou aranıyor', 'manitou operatörü aranıyor', 'telehandler operatörü iş ilanı', 'teleskopik forklift kiralama ihtiyacı', 'çelik konstrüksiyon montaj işi İstanbul',
        'prefabrik depo inşaatı başladı', 'fabrika inşaatı temel atma', 'lojistik merkezi inşaatı başladı', 'yeni konut projesi inşaatı başladı İstanbul', 'kaba inşaat devam eden proje'],
  array['yapi.com.tr', 'insaathaber.com', 'emlakkulisi.com', 'ilan.gov.tr', 'kariyer.net'],
  'Ör: "X Yapı, Tuzla''da 12 bloklu konut projesinin kaba inşaatına başladı" (şantiye = Manitou ihtiyacı) · "Y Çelik, Gebze''de depo montajı için telehandler operatörü arıyor" (firma makine kullanıyor) · "Z Lojistik, Hadımköy''de lojistik merkezi temeli attı".',
  'Ör: iş makinesi kazası haberi · Manitou satış/fiyat reklamı · borsa/ekonomi haberi · başka ilde proje · tarihi belirsiz eski haber · sadece "inşaat sektörü büyüyor" gibi genel yorum.'
where not exists (select 1 from public.automation_skills where skill_key = 'manitou_is_bulma');

insert into public.automation_skills (skill_key, display_name, description, category, icon, execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples)
select 'ozel_insaat_is_bulma', 'Özel inşaat işi bulma (villa, prefabrik, betonarme, bina)', 'İhale dışı: villa, prefabrik, betonarme ev ve bina yaptırmak isteyen şahıs/arsa sahibi/kooperatif/site taleplerini bulur.',
  'arastirma', 'home', 'agent', '{}', true, true, array['research', 'report'], 'testing',
  'Amaç: Embay Yapı için İHALE DIŞI özel inşaat işi bulmak: villa, prefabrik ev, betonarme müstakil ev, apartman/bina yapımı, kat karşılığı ve kentsel dönüşüm. '
  || 'Güçlü sinyaller: (1) arsa sahibinin "kat karşılığı müteahhit aranıyor" ilanları/duyuruları; (2) kentsel dönüşüm için müteahhit seçen site/bina yönetimleri, riskli yapı kararı alan binalar; '
  || '(3) kooperatiflerin müteahhit/yüklenici arama duyuruları; (4) herkese açık forum/soru sitelerinde "villa / ev yaptırmak istiyorum, fiyat ve müteahhit arıyorum" talepleri; '
  || '(5) yeni imara açılan / imar planı onaylanan bölgeler (yakında yapılaşma olacak yerler). '
  || 'Bölge: İstanbul öncelikli, Kocaeli ve Tekirdağ. Her bulguda: talep türü (villa/prefabrik/betonarme/bina/kat karşılığı/dönüşüm), ilçe, büyüklük (varsa m², daire, kat), zaman, kaynak linki, fit. '
  || 'KVKK: şahısların adını, telefonunu, e-postasını YAZMA; talebi anonim özetle ve herkese açık bağlantısıyla ver. Kurum/kooperatif/site yönetimi/firma ise kurumsal iletişimi yazabilirsin. '
  || 'Hazır konut satış ilanı, müteahhit firmanın kendi reklamı, emlak fiyat haberi bulgu değildir.',
  'İstanbul (öncelik), Kocaeli veya Tekirdağ''da son 30 günde yayımlanmış, ihale olmayan en az 5 özel inşaat talebi bul: kat karşılığı müteahhit arayan arsa, kentsel dönüşüm için müteahhit seçen bina/site, müteahhit arayan kooperatif veya villa/ev yaptırmak isteyen talepler. Her biri için talep türü, ilçe, büyüklük, tarih ve kaynak linki.',
  array['kat karşılığı müteahhit aranıyor İstanbul', 'arsa sahibi müteahhit arıyor', 'kentsel dönüşüm müteahhit seçimi toplantısı', 'riskli yapı kararı müteahhit arıyor',
        'kooperatif müteahhit arıyor', 'villa yaptırmak istiyorum', 'betonarme ev yaptırmak istiyorum', 'prefabrik ev yaptırmak arsa', 'müstakil ev yaptırma müteahhit', 'imar planı onaylandı yapılaşma'],
  array['emlakkulisi.com', 'hurriyetemlak.com', 'yapi.com.tr', 'donanimhaber.com', 'eksisozluk.com'],
  'Ör: "Kadıköy''de 24 daireli bina için kentsel dönüşüm kararı alındı, müteahhit teklifleri toplanıyor" · "Çekmeköy''de 1.200 m² arsa için kat karşılığı müteahhit aranıyor" · forumda "Silivri''de arsama 150 m² betonarme villa yaptırmak istiyorum, tavsiye" (anonim, link ile).',
  'Ör: satılık/kiralık hazır daire ilanı · müteahhit firmanın kendi proje reklamı · konut fiyat endeksi haberi · kamu ihalesi (ayrı botun işi) · başka ülke/il · kişinin telefon numarası.'
where not exists (select 1 from public.automation_skills where skill_key = 'ozel_insaat_is_bulma');

insert into public.automation_bots (slug, name, bot_type, platform, icon, description, instructions, status)
select 'manitou-is-bulucu', 'Manitou İş Bulucu', 'research', null, 'truck',
  'Şahin Manitou için her ay teleskopik yükleyici kiralama işi arar: yeni şantiyeler, montaj işleri, makine ihtiyacı olan firmalar.',
  'Yalnızca kaynağı gösterilebilen, somut ve güncel iş fırsatlarını raporla. Firmaların yalnızca kurumsal iletişim bilgilerini kullan.', 'active'
where not exists (select 1 from public.automation_bots where slug = 'manitou-is-bulucu');

insert into public.automation_bots (slug, name, bot_type, platform, icon, description, instructions, status)
select 'insaat-is-bulucu', 'İnşaat İş Bulucu', 'research', null, 'home',
  'Embay Yapı için ihale dışı özel inşaat işi arar: villa, prefabrik, betonarme ev, bina, kat karşılığı ve kentsel dönüşüm talepleri.',
  'Şahısların kişisel verisini toplama; talebi anonim özetle ve herkese açık bağlantısıyla ver. Yalnızca somut, güncel talepler.', 'active'
where not exists (select 1 from public.automation_bots where slug = 'insaat-is-bulucu');

insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, 0 from public.automation_bots b join public.automation_skills s on s.skill_key = 'manitou_is_bulma'
where b.slug = 'manitou-is-bulucu' and not exists (select 1 from public.automation_bot_skills x where x.bot_id = b.id and x.skill_id = s.id);
insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, 0 from public.automation_bots b join public.automation_skills s on s.skill_key = 'ozel_insaat_is_bulma'
where b.slug = 'insaat-is-bulucu' and not exists (select 1 from public.automation_bot_skills x where x.bot_id = b.id and x.skill_id = s.id);

-- Günlük otomatik görevler: İnşaat İş Bulucu (mevcut "İnşaat iş fırsatları" görevini bu bota bağla) + Manitou aylık iş takibi
update public.mission_schedules set bot_id = (select id from public.automation_bots where slug = 'insaat-is-bulucu'),
  goal = 'İstanbul (öncelik), Kocaeli ve Tekirdağ''da ihale dışı özel inşaat işlerini bul: kat karşılığı müteahhit arayan arsa sahipleri, kentsel dönüşüm için müteahhit seçen bina/siteler, müteahhit arayan kooperatifler, villa / prefabrik / betonarme ev yaptırmak isteyen talepler. Her bulgu: talep türü, ilçe, büyüklük, tarih, neden Embay Yapı için uygun, kaynak linki. Şahısların kişisel verisini yazma.',
  search_for = 'kat karşılığı müteahhit aranıyor, kentsel dönüşüm müteahhit seçimi, kooperatif müteahhit arıyor, villa yaptırmak istiyorum, betonarme ev yaptırmak'
where title = 'İnşaat iş fırsatları — günlük yönlendirme';

insert into public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at)
select (select id from public.automation_bots where slug = 'manitou-is-bulucu'), 'Manitou iş takibi — günlük',
  'Şahin Manitou için İstanbul, Kocaeli ve Tekirdağ''da teleskopik yükleyici kiralama ihtiyacı doğuracak yeni ve devam eden şantiyeleri, montaj işlerini ve makine ihtiyacı olan firmaları bul. Her bulgu: firma/proje, ilçe, iş, neden Manitou gerektiği, kurumsal iletişim (varsa), kaynak linki.',
  'kiralık manitou aranıyor, manitou operatörü aranıyor, çelik konstrüksiyon montaj, depo inşaatı başladı, konut projesi inşaatı başladı',
  'Yönlendirici liste: en umut verici 3 fırsat başta; her biri için ne, kim, nerede, neden Manitou, ilk adım (ara/ziyaret/teklif), kaynak.',
  null, 15, 9, '{1,2,3,4,5,6}', true, (select user_id from public.team_members where role = 'admin' order by created_at limit 1), now()
where not exists (select 1 from public.mission_schedules where title = 'Manitou iş takibi — günlük');
