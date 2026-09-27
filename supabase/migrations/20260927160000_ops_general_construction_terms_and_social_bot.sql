-- EMBAY AI OPS — GENEL İNŞAAT TERİMLERİ (KALFALIK, YAP-SAT, BİNA YAPIMI, KABA/İNCE İNŞAAT) & TAKİPÇİ KAZANIM EĞİTİMİ
-- 1. İnşaat İş Bulucu Botu: Kalfalık, yap-sat, bina yapımı, kaba ve ince inşaat terimleriyle bilinçlendirildi.
-- 2. Sosyal Büyüme & Takipçi Botu: Yap-sat müteahhitleri, kalfalar ve şantiye şeflerini hedefleyen ELLE etkileşim listesi hazırlar (otomatik takip/beğeni yok).

update public.automation_bots
set instructions = 'AMAÇ: Embay Yapı için Genel İnşaat alanında GERÇEK İŞ VE MÜŞTERİ TALEPLERİ bulmak. '
  || 'BULUNACAK HEDEF İŞLER VE TERİMLER: '
  || '(1) KALFALIK & USTA EKİBİ TALEPLERİ: Kalıp-demir kalfası arayanlar, kaba inşaat kalfalığı, şantiye taşeronluğu, usta ekibi arayan yap-sat firmaları; '
  || '(2) YAP-SAT VE BİNA YAPIMI: İstanbul ve Trakya genelinde temelden çatıya bina yapımı, arsa karşılığı / kat karşılığı konut projeleri; '
  || '(3) KABA VE İNCE İNŞAAT: Radye temel, perde beton, kolon-kiriş kalıp ve demiri ile şap, sıva, mantolama ve ince işçilik taşeronlukları; '
  || '(4) GÖTÜRÜ İŞLER: Metrekare veya götürü usulü kaba ve ince inşaat yaptırmak isteyen müteahhitler, kooperatifler ve arsa sahipleri; '
  || '(5) VİLLA VE MÜSTAKİL EV: Çatalca ve Silivri arsa sahiplerine anahtar teslim müstakil ev / villa yapımı. '
  || 'KESİN YASAK / RAKİP KORUMASI: Diğer müteahhitlik şirketleri, inşaat taahhüt şirketleri, mimarlık firmaları veya onların reklam/portföy sayfaları KESİNLİKLE BULGU DEĞİLDİR. '
  || 'Bize rakip değil, bize iş verecek müşteri bulacaksın.',
  description = 'Kalfalık, yap-sat, bina yapımı, kaba ve ince inşaat alanında götürü iş ve taşeronluk arayan gerçek müşterileri bulur.'
where slug = 'insaat-is-bulucu';

-- Sosyal Büyüme & Takipçi Kazanım Botu Eğitimi
update public.automation_bots
set instructions = 'AMAÇ: Embay Yapı için inşaat sektöründen NİTELİKLİ VE HEDEF KİTLE TAKİPÇİ KAZANDIRMAK. '
  || 'HEDEF KİTLE PROFİLLERİ: '
  || '(1) Yap-sat müteahhitleri ve konut üreticileri; '
  || '(2) Kaba ve ince inşaat kalfaları, kalıp-demir taşeronları ve şantiye ustaları; '
  || '(3) Şantiye şefleri, inşaat mühendisleri ve mimarlar; '
  || '(4) Güngören, Çatalca, Hadımköy ve Silivri bölgesindeki kentsel dönüşüm arsa ve kat malikleri. '
  || 'EYLEM YÖNTEMİ (Meta kurallarına uygun): '
  || '- Hedef kitledeki hesapları ve şantiye paylaşımlarını LİSTELE; takip, beğeni ve yorum yöneticinin telefonundan ELLE yapılır; '
  || '- Her gönderi için yapıcı, samimi ve teknik takdir içeren bir yorum önerisi yaz ("Emeğinize sağlık ustam, kalıp ve donatı işçiliği çok temiz"); '
  || '- OTOMATİK takip / beğeni / yorum YAPMA (hesabı kapattırır).',
  description = 'Yap-sat müteahhitleri, kalfalar ve şantiye şefleriyle etkileşime girerek sisteme hedef kitle takipçisi kazandırır.'
where slug = 'sosyal-buyume';
