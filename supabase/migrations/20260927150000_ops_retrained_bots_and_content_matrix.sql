-- EMBAY AI OPS — İŞ ARAYAN BOTLARIN EĞİTİMİ & SABİTLENMİŞ YAYIN EMRİ MATRİSİ
-- 1. Genel İnşaat İş Bulucu: Rakip firmalar KESİNLİKLE filtrelenir; götürü işler, müteahhitlik, yap-sat, kalıp-demir ve taşeron arayanlar hedeflenir.
-- 2. Manitou İş Bulucu: Tek uzman bot; ilan siteleri ve şantiyelerden makine ihtiyacı olanları bulur, kiralık manitoucu rakipleri eler.
-- 3. İçerik Fabrikası: 1 Reels (kurgulu+müzikli), 1 Genel İnşaat post, 1 Manitou post, 1 Şantiye hikayesi ve tekrar önleme koruması.

-- A) Genel İnşaat İş Bulucu Botunun Eğitimi ve Talimatlarının Güncellenmesi
update public.automation_bots
set instructions = 'AMAÇ: Embay Yapı için Genel İnşaat alanında GERÇEK İŞ VE MÜŞTERİ TALEPLERİ bulmak. '
  || 'BULUNACAK HEDEF İŞLER: (1) Götürü kaba inşaat işleri; (2) Anahtar teslim müteahhitlik ve yap-sat projeleri için arsa sahipleri / kat karşılığı talepler; '
  || '(3) Temelden çatıya kalıp, demir, beton dökümü taşeronluğu arayan ana yükleniciler; (4) Usta kalıpçı ekibi ve demirci ekibi arayan projeler; '
  || '(5) Kentsel dönüşüm için müteahhit arayan bina ve site yönetimleri; (6) Müstakil villa yaptırmak isteyen şahıslar. '
  || 'KESİN YASAK / RAKİP KORUMASI: Diğer müteahhitlik şirketleri, inşaat taahhüt şirketleri, mimarlık firmaları veya onların reklam/portföy sayfaları KESİNLİKLE BULGU DEĞİLDİR. '
  || 'Bize rakip değil, bize iş verecek müşteri bulacaksın. KVKK kurallarına uy, şahısların kişisel numarasını yazma, talebi anonim özetle ve ilan linkiyle ver.',
  description = 'Genel İnşaat alanında götürü işler, müteahhitlik taahhüdü, arsa karşılığı yap-sat, temelden kalıp-demir ve kentsel dönüşüm taleplerini bulur (rakipleri eler).'
where slug = 'insaat-is-bulucu';

-- Yeteneği güncelle
update public.automation_skills
set instructions = 'Embay Yapı için Genel İnşaat alanında doğrudan iş fırsatları ve müşteri talepleri bul: '
  || 'Götürü kaba inşaat, müteahhitlik, arsa sahibi yap-sat anlaşmaları, temelden kalıp-demir taşeronlukları, usta kalıpçı ekibi arayışları ve kentsel dönüşüm toplantıları. '
  || 'RAKİP FİRMALARI ASLA RAPORLAMA. Yalnızca iş arayan veya iş veren somut kayıtları listele.',
  search_terms = array[
    'götürü kaba inşaat taşeronu aranıyor', 'kalıp demir ustası ekibi aranıyor', 'kat karşılığı müteahhit arayan arsa sahibi',
    'kentsel dönüşüm müteahhit seçimi toplantısı', 'arsa karşılığı yap sat müteahhit', 'temelden çatıya inşaat taşeronu',
    'villa yaptırmak istiyorum müteahhit tavsiye', 'kooperatif yüklenici aranıyor', 'bina kentsel dönüşüm kararı alındı'
  ]
where skill_key = 'ozel_insaat_is_bulma';

-- B) Manitou İş Bulucu Botunun Eğitimi (Tek ve Uzman İş Makinesi Botu)
update public.automation_bots
set instructions = 'AMAÇ: Şahin Manitou için İstanbul, Tekirdağ ve Kocaeli bölgesinde teleskopik yükleyici (Manitou / telehandler) kiralama işi bulmak. '
  || 'HEDEF KAYNAKLAR: İlan siteleri (sahibinden, ilan.gov.tr, kariyer/eleman ilanları), çelik konstrüksiyon montaj projeleri, prefabrik fabrika inşaatları ve şantiyeler. '
  || 'BULUNACAK HEDEF SİNYALLER: "Manitou operatörü aranıyor", "teleskopik forklift aranıyor", "çatı montajı için telehandler ihtiyacı", "yüksekte palet taşıma sepetli vinç talebi". '
  || 'KESİN YASAK: Diğer vinç ve Manitou kiralama firmalarını KESİNLİKLE RAPORLAMA. Yalnızca makineye ihtiyacı olan müşterileri bul.',
  description = 'İlan sitelerinden ve şantiyelerden operatörlü 14m/18m Manitou telehandler ihtiyacı olan firmaları ve projeleri bulur.'
where slug = 'manitou-is-bulucu';

update public.automation_skills
set instructions = 'Teleskopik yükleyici kiralama ihtiyacı olan şantiye, fabrika, depo ve montaj projelerini tespit et. '
  || 'İlan sitelerinde operatör/makine arayan firmaları incele. Diğer kiralık manitou firmalarını tamamen filtrele.',
  search_terms = array[
    'kiralık manitou aranıyor', 'manitou operatörü aranıyor', 'telehandler operatörü iş ilanı',
    'teleskopik forklift kiralık talep', 'çelik konstrüksiyon montaj işi telehandler', 'prefabrik depo şantiyesine makine kiralama'
  ]
where skill_key = 'manitou_is_bulma';

-- C) Görev Planlarını Yeni Arama Terimleriyle Güçlendir
update public.mission_schedules
set search_for = 'götürü kaba inşaat, kalıp demir ekibi aranıyor, kat karşılığı müteahhit arayan, kentsel dönüşüm müteahhit seçimi, arsa sahibi yap sat',
    goal = 'İstanbul genelinde götürü kaba inşaat, yap-sat arsa sahipleri, kalıp-demir taşeronluğu ve kentsel dönüşüm taleplerini bul. Rakip inşaat firmalarını kesinlikle hariç tut.'
where bot_id = (select id from public.automation_bots where slug = 'insaat-is-bulucu');

update public.mission_schedules
set search_for = 'kiralık manitou aranıyor, manitou operatörü aranıyor, teleskopik yükleyici ihtiyacı, çelik çatı montajı telehandler',
    goal = 'İstanbul, Tekirdağ ve Kocaeli hattında şantiyesinde Manitou teleskopik yükleyici ihtiyacı olan firmaları ve ilanları bul. Kiralama yapan rakip firmaları hariç tut.'
where bot_id = (select id from public.automation_bots where slug = 'manitou-is-bulucu');
