import json
rows=json.load(open('scripts/media-sheets/list.json'))
ID=lambda n: rows[n-1]['id']
PH='📞 0536 784 62 22 · 0531 436 29 04'
END=f"\n\nAynı kalitede bir ev hayal ediyorsanız fiyat ve detaylı bilgi için DM'den ya da WhatsApp'tan yazın 👇\n{PH}\n🇹🇷 Türkiye'nin 81 iline kurulum!"
EDU="Her gün inşaata dair yeni bir şey öğreniyoruz! 📚\n\n"
ASK="\n\nSiz evinizde bunu ister miydiniz? Yorumlara yazın 👇"
BASE=['#embayyapı','#keşfet','#reels','#villa','#villainşaatı','#müstakilev','#anahtarteslim','#evyapımı','#hayalimdekiev','#bahçeliev','#evyaptırmak','#içmimari','#dekorasyon','#lüksev','#yenievimiz','#inşaat','#mimarlık','#istanbul','#çatalca','#silivri','#architecture','#interiordesign','#homedesign','#villaprojesi','#embay']
def tags(extra): 
  out=[]
  for t in extra+BASE:
    if t not in out: out.append(t)
  return out[:28]
P=[]
def add(day,slot,fmt,badge,nums,head,sub,cap,extra,cta='WhatsApp: 0531 436 29 04'):
  P.append(dict(day=day,slot=slot,format=fmt,badge=badge,media=[ID(n) for n in nums],headline=head,subtitle=sub,caption=cap,hashtags=tags(extra),cta=cta))

d='2026-10-03'
add(d,'10:00','banner','PROJEMİZDEN',[59],'Taş Şömineli Salon','Galeri boşluklu, ferah ve sıcak bir yaşam alanı',
 "Teslime hazır projemizden bir kare 🏡✨\n\nİki kat yüksekliğindeki salonun kalbinde doğal taş kaplı şömine, yanında gömme raflar ve üst katta ferforje korkuluklu asma kat. Gün ışığını içeri dolduran siyah çerçeveli pencerelerle sıcak ve ferah bir yaşam alanı.\n\nEmbay Yapı olarak her detayı ilk günkü planda olduğu gibi uyguluyoruz."+END,
 ['#şömine','#taşşömine','#salondekorasyonu','#galeriboşluğu'])
add(d,'13:00','banner','BUGÜN ÖĞRENİYORUZ',[7],'Çelik Doğrama Pencere Nedir?','İnce profil, geniş cam, güçlü görünüm',
 EDU+"Bu karede gördüğünüz siyah çerçeveli pencereler çelik doğramadır 🪟\n\n✅ İnce profil sayesinde cam alanı geniştir, manzara içeri girer\n✅ Sağlam ve uzun ömürlüdür\n✅ Modern ve klasik mimariye aynı şıklıkta uyar\n✅ Isı yalıtımlı camla birlikte kullanıldığında konfor artar\n\nPencere seçimi, evin hem görünüşünü hem de enerji faturasını etkiler. Projede erken karar verilmesi gereken konulardan biridir."+ASK+f"\n\n{PH}\n🇹🇷 Türkiye'nin 81 iline kurulum!",
 ['#çelikdoğrama','#pencere','#inşaatbilgisi','#öğreniyoruz','#yapısistemleri'])
add(d,'18:00','banner','PROJEMİZDEN',[49],'Banyoda Klasik Dokunuş','Altın çerçeveli ayna, aplikler ve taş lavabo',
 "Banyo da evin vitrinidir 🛁✨\n\nProjemizin misafir banyosunda altın çerçeveli ayna, iki yanında duvar aplikleri, çanak lavabo ve çekmeceli klasik dolap. Dokulu duvar kaplamasıyla sıcak ve şık bir alan.\n\nEmbay Yapı olarak ince işlerde de aynı titizliği gösteriyoruz."+END,
 ['#banyo','#banyodekorasyonu','#banyotasarımı','#tadilat'])
add(d,'20:00','reel','BİTEN PROJEMİZ',[124,125],'Bitmiş Villamızda Kısa Tur','',
 "Biten projemizde kısa bir tura ne dersiniz? 🎬🏡\n\nYemek alanı, taş şömineli galeri salon ve asma kat… Hayallerinizdeki evi aynı özenle sizin için de yapıyoruz.\n\nSÖZÜMÜZÜN ARKASINDAYIZ 🔑"+END,
 ['#villaturu','#evturu','#reelsinstagram','#keşfetbeniöneçıkar'])

d='2026-10-04'
add(d,'10:00','banner','BUGÜN ÖĞRENİYORUZ',[29],'Galeri Boşluklu Salon Nedir?','İki katı birleştiren yüksek tavanlı yaşam alanı',
 EDU+"Bu fotoğrafta asma kattan aşağıdaki salona bakıyoruz. İşte buna galeri boşluğu denir 🏛️\n\n✅ Salonun tavanı iki kat yüksekliğindedir\n✅ Üst sıradaki pencerelerle gün ışığı içeri dolar\n✅ Asma kat salona açılır, ev daha ferah görünür\n⚠️ Isıtma, soğutma ve akustik projede baştan hesaplanmalıdır\n\nGaleri boşluğu, villa projelerinde en çok istenen detaylardan biridir."+ASK+f"\n\n{PH}\n🇹🇷 Türkiye'nin 81 iline kurulum!",
 ['#galeriboşluğu','#yüksektavan','#inşaatbilgisi','#öğreniyoruz','#mimaridetay'])
add(d,'13:00','banner','PROJEMİZDEN',[43],'Bahçe Köşkü','Taş kaplı, kemerli açıklıklarıyla bahçenin yeni gözdesi',
 "Bahçede ayrı bir yaşam alanı 🌿\n\nProjemizin bahçe köşkü taş kaplı cephesi ve kemerli geniş açıklıklarıyla dikkat çekiyor. Yazın misafir ağırlamak, mangal keyfi ya da dinlenmek için ideal bir yapı.\n\nBahçenize böyle bir köşk mü istiyorsunuz? Ölçüye ve arsaya göre projelendiriyoruz."+END,
 ['#bahçeköşkü','#taşkaplama','#bahçetasarımı','#peyzaj'])
add(d,'18:00','banner','PROJEMİZDEN',[53],'Kemerli Niş Detayı','Gömme dolap, açık raflar ve sıcak ışık',
 "Detaylar evi ev yapar ✨\n\nKemerli nişin içine yerleştirilen gömme dolap ve açık raflar, ahşap zemin ve sıcak spot aydınlatmayla tamamlandı. Kahve köşesi, servis alanı ya da kitaplık olarak kullanılabilir.\n\nEmbay Yapı ile planladığınız her köşe işe yarar ve güzel olur."+END,
 ['#kemer','#gömmedolap','#evdekorasyonu','#mutfaktasarımı'])
add(d,'20:00','reel','ŞANTİYE GÜNLÜĞÜ',[89,91],'Taş Şöminenin Hikâyesi','',
 "Taş kaplı şöminemiz son halini alırken 🎬🔥\n\nKorumalı zemin, beyaz duvarlar ve galeri boşluğuna yükselen doğal taş… Teslimden önceki son dokunuşlar.\n\nHer aşamayı sizinle paylaşıyoruz."+END,
 ['#şömine','#taşşömine','#şantiye','#inceinşaat'])

d='2026-10-05'
add(d,'10:00','banner','PROJEMİZDEN',[57],'Aile Sofrası','Geniş yemek alanı, sarkıt avize ve mutfak bağlantısı',
 "Bütün aile aynı masada 🍽️\n\nProjemizin yemek alanında masif ahşap masa, sarkıt avize ve doğrudan mutfağa açılan geniş bir yerleşim. Kalabalık sofralar için planlanmış ferah bir alan.\n\nEvinizi yaşam alışkanlıklarınıza göre birlikte planlıyoruz."+END,
 ['#yemekodası','#mutfak','#evdekorasyonu','#ailesofrası'])
add(d,'13:00','banner','BUGÜN ÖĞRENİYORUZ',[11],'İnce İşler Aşamasında Neler Var?','Kaba inşaat bitti, sıra detaylarda',
 EDU+"Bu karede yerler kâğıtla korunmuş, duvarlar boyanmış, pencereler takılmış. Yani ev ince işler aşamasında 🛠️\n\nİnce işlerde neler yapılır?\n1️⃣ Sıva, alçı ve boya\n2️⃣ Pencere ve kapı doğramaları\n3️⃣ Zemin kaplaması (parke, seramik)\n4️⃣ Elektrik ve sıhhi tesisatın son montajı\n5️⃣ Mutfak, banyo ve gömme dolaplar\n6️⃣ Son temizlik ve teslim\n\nBu aşamada yerleri korumak, biten işlerin zarar görmemesi için çok önemlidir."+ASK+f"\n\n{PH}\n🇹🇷 Türkiye'nin 81 iline kurulum!",
 ['#inceinşaat','#inceişler','#inşaataşamaları','#öğreniyoruz','#inşaatbilgisi'])
add(d,'18:00','banner','PROJEMİZDEN',[21],'Asma Katta Kütüphane','Lacivert raflar, ahşap zemin, sakin bir köşe',
 "Kitap sevenlere özel bir köşe 📚\n\nProjemizin asma katında lacivert renkli boydan boya raflar ve ahşap zemin. Çatı eğimine göre tasarlanan raflar, alanı sonuna kadar kullanıyor.\n\nEvinizde size özel bir alan mı istiyorsunuz? Birlikte tasarlayalım."+END,
 ['#kütüphane','#asmakat','#kitaplık','#çalışmaodası'])
add(d,'20:00','reel','PROJEMİZDEN',[105,107,109],'Asma Kat Turu','',
 "Asma katımızda kısa bir tur 🎬\n\nFerforje korkuluklar, kemerli niş ve çatı eğimine göre yapılan raflar… Yukarıdan galeri salona açılan bir bakış.\n\nEmbay Yapı ile her katın bir hikâyesi var."+END,
 ['#asmakat','#evturu','#ferforje','#reelsinstagram'])

d='2026-10-06'
add(d,'10:00','banner','PROJEMİZDEN',[55],'Hasır Detaylı Gömme Dolap','Koridor boyunca ahşap ve hasır dolaplar',
 "Depolama alanı hem bol hem şık olabilir 🚪\n\nKoridor boyunca uzanan ahşap gömme dolapların kapakları hasır dokulu. Ahşap zemin ve gizli aydınlatmayla sıcak bir geçiş alanı.\n\nEvinizde her metrekareyi değerlendiriyoruz."+END,
 ['#gömmedolap','#ahşap','#koridor','#evdekorasyonu'])
add(d,'13:00','banner','BUGÜN ÖĞRENİYORUZ',[41],'Taş Duvar Kaplama','Dayanıklı, doğal ve bakımı kolay',
 EDU+"Bu karede bahçe köşkünün taş kaplı duvarını görüyorsunuz 🧱\n\nTaş duvar kaplamanın avantajları:\n✅ Yağmura, güneşe ve dona karşı dayanıklıdır\n✅ Doğayla uyumlu, sıcak bir görünüm verir\n✅ Bakımı kolaydır, yıllarca rengini korur\n✅ Bahçe duvarı, istinat duvarı ve cephede kullanılabilir\n\nİstinat duvarlarında ise taşın arkasına drenaj yapılması şarttır. Yoksa suyun basıncı duvarı zorlar."+ASK+f"\n\n{PH}\n🇹🇷 Türkiye'nin 81 iline kurulum!",
 ['#taşduvar','#istinatduvarı','#taşkaplama','#öğreniyoruz','#inşaatbilgisi'])
add(d,'18:00','banner','PROJEMİZDEN',[77],'Huzurlu Bir Yatak Odası','Ahşap duvar paneli ve bol gün ışığı',
 "Günün en huzurlu köşesi 🛏️\n\nAhşap duvar paneli, siyah çerçeveli pencere ve ahşap zeminle sade ve sıcak bir yatak odası. Sabah güneşi doğrudan odaya giriyor.\n\nEmbay Yapı olarak her odayı kullanımına göre planlıyoruz."+END,
 ['#yatakodası','#yatakodasıdekorasyonu','#ahşap','#evdekorasyonu'])
add(d,'20:00','reel','BİTEN PROJEMİZ',[114,118],'Dışarıdan Villamız','',
 "Villamıza dışarıdan bir bakış 🎬🏡\n\nÜçgen cepheli büyük pencereler, açık renk dış cephe ve geniş bahçe. Peyzaj öncesi son haliyle projemiz.\n\nHayalinizdeki evi arsanıza birlikte kuralım."+END,
 ['#villacephe','#dışcephe','#bahçeliev','#reelsinstagram'])

d='2026-10-07'
add(d,'10:00','banner','PROJEMİZDEN',[63],'Ferah Yaşam Alanı','Yüksek tavan, geniş pencereler, eşyalı son hali',
 "Eşyalar yerleşti, ev yaşamaya başladı 🏡\n\nGaleri boşluklu salonun eşyalı hali: yüksek tavan, asma kat korkulukları ve bahçeye açılan geniş pencereler. Ferah, aydınlık ve sıcak.\n\nSÖZÜMÜZÜN ARKASINDAYIZ 🔑"+END,
 ['#salon','#salondekorasyonu','#yaşamalanı','#evimizyapılıyor'])
add(d,'13:00','banner','BUGÜN ÖĞRENİYORUZ',[51],'Merdivende Konfor Nasıl Sağlanır?','Basamak, ışık ve korkuluk',
 EDU+"Merdiven, evde en çok kullanılan alanlardan biridir 🪜\n\nPlanlarken dikkat edilmesi gerekenler:\n1️⃣ Basamak yüksekliği ve genişliği rahat adım atmaya uygun olmalı\n2️⃣ Merdiven boşluğu iyi aydınlatılmalı (bu karedeki gibi spot ışıklar)\n3️⃣ Korkuluk sağlam ve yeterli yükseklikte olmalı\n4️⃣ Basamak kaplaması kaymaz olmalı\n\nBu kararlar proje aşamasında verilir, sonradan değiştirmek zordur."+ASK+f"\n\n{PH}\n🇹🇷 Türkiye'nin 81 iline kurulum!",
 ['#merdiven','#iç mimari'.replace(' ',''),'#öğreniyoruz','#inşaatbilgisi','#evyaptırmak'])
add(d,'18:00','banner','PROJEMİZDEN',[73],'Taş Duvarlı Çalışma Odası','Doğal taş, ahşap raflar ve gün ışığı',
 "Evden çalışmak hiç bu kadar keyifli olmamıştı 💼\n\nDoğal taş duvara gömülü ahşap raflar, büyük pencereden giren gün ışığı ve sade mobilyalarla huzurlu bir çalışma odası.\n\nEvinizin her odasını sizin yaşamınıza göre tasarlıyoruz."+END,
 ['#çalışmaodası','#taşduvar','#homeoffice','#evdekorasyonu'])
add(d,'20:00','reel','ŞANTİYE GÜNLÜĞÜ',[112,116],'Bahçe Köşkü Yükseliyor','',
 "Bahçe köşkümüzün iç ve dış hali 🎬🌿\n\nTaş kaplı duvarlar, geniş açıklıklar ve bahçeye bakan oturma alanı. Son aşamadan kareler.\n\nBahçenize özel yapı için bize yazın."+END,
 ['#bahçeköşkü','#şantiye','#taşkaplama','#reelsinstagram'])

d='2026-10-08'
add(d,'10:00','banner','PROJEMİZDEN',[67],'Ferforje Korkuluk Detayı','Asma kattan salona bakış',
 "Yukarıdan bakınca 👀\n\nAsma kattaki ferforje korkuluklardan galeri salona ve taş şömineye bakış. Siyah metal detaylar, beyaz duvarlar ve ahşap zeminle uyum içinde.\n\nEmbay Yapı ile detaylar özenle seçilir."+END,
 ['#ferforje','#korkuluk','#asmakat','#mimaridetay'])
add(d,'13:00','banner','BUGÜN ÖĞRENİYORUZ',[3],'Anahtar Teslimden Önce Kontrol Listesi','Teslim almadan önce bunlara bakın',
 EDU+"Bu karede ev teslime hazırlanıyor, zeminler hâlâ korumada 🔑\n\nAnahtar teslim alırken kontrol edin:\n✅ Pencere ve kapılar rahat açılıp kapanıyor mu?\n✅ Prizler, aydınlatma ve sigortalar çalışıyor mu?\n✅ Musluklar, giderler ve sifonlar sızdırıyor mu?\n✅ Duvar ve tavanda çatlak ya da boya hatası var mı?\n✅ Zemin kaplamasında kabarma ya da çizik var mı?\n\nEksikler teslimden önce listelenip tamamlanmalıdır."+ASK+f"\n\n{PH}\n🇹🇷 Türkiye'nin 81 iline kurulum!",
 ['#anahtarteslim','#teslim','#öğreniyoruz','#inşaatbilgisi','#evsahibi'])
add(d,'18:00','banner','PROJEMİZDEN',[65],'Çatı Katında Giyinme Odası','Boydan boya dolaplar, aplikler ve geniş alan',
 "Çatı katını boşa harcamadık 👗\n\nÇatı katında boydan boya gömme dolaplar, duvar aplikleri ve ahşap zeminle geniş bir giyinme odası. Eğimli tavan bile işe yarar bir alana dönüştü.\n\nEvinizin her metrekaresini değerlendirelim."+END,
 ['#giyinmeodası','#çatıkatı','#gömmedolap','#evdekorasyonu'])
add(d,'20:00','reel','BİTEN PROJEMİZ',[126,128],'Galeriden Bakış','',
 "Asma kattan galeri salona bir bakış 🎬✨\n\nEşyalı son haliyle taş şömine, ferforje korkuluklar ve büyük pencereler. Yaşamaya hazır bir ev.\n\nSÖZÜMÜZÜN ARKASINDAYIZ 🔑"+END,
 ['#villaturu','#galeriboşluğu','#evturu','#reelsinstagram'])

d='2026-10-09'
add(d,'10:00','banner','PROJEMİZDEN',[47],'Avluya Açılan Kapı','Taş cephe, geniş basamaklar, oturma alanı',
 "Kapıdan girer girmez 🌤️\n\nSiyah panjurlu kapıdan avluya bakış: açık renk taş cephe, geniş basamaklar ve dışarıda keyifli bir oturma alanı.\n\nEmbay Yapı ile içi kadar dışı da güzel evler."+END,
 ['#avlu','#dışcephe','#bahçeliev','#mimari'])
add(d,'13:00','banner','BUGÜN ÖĞRENİYORUZ',[45],'Tek Katlı mı, Dubleks mi?','Karar vermeden önce bunları düşünün',
 EDU+"Bu karede tek katlı bahçeli evimiz var 🏡\n\nTek katlı evin artıları:\n✅ Merdiven yok, yaşlılar ve çocuklar için rahat\n✅ Her odadan bahçeye kolay çıkış\n\nDubleks evin artıları:\n✅ Aynı arsada daha fazla kullanım alanı\n✅ Yatak odaları üst katta, yaşam alanı altta ayrılır\n\nSeçim; arsanın büyüklüğüne, imar durumuna ve aile yapınıza göre yapılmalıdır."+ASK+f"\n\n{PH}\n🇹🇷 Türkiye'nin 81 iline kurulum!",
 ['#tekkatlıev','#dubleks','#öğreniyoruz','#inşaatbilgisi','#evyaptırmak'])
add(d,'18:00','banner','PROJEMİZDEN',[71],'Kemerler ve Işık','Kemerli niş, ferforje merdiven, gizli aydınlatma',
 "Akşam ışığında ev başka güzel 🌙\n\nKemerli nişin içindeki gizli aydınlatma, ferforje merdiven korkuluğu ve ahşap zemin. Sıcak ve davetkâr bir geçiş alanı.\n\nEmbay Yapı ile aydınlatma da projenin bir parçasıdır."+END,
 ['#kemer','#aydınlatma','#merdiven','#evdekorasyonu'])
add(d,'20:00','reel','BİTEN PROJEMİZ',[120,121],'Tek Katlı Bahçeli Evimiz','',
 "Tek katlı bahçeli evimiz 🎬🏡\n\nGeniş teras basamakları, açık renk cephe ve büyük pencereler. Peyzaj öncesi son haliyle.\n\nArsanız varsa, eviniz hazır sayılır. Bize yazın."+END,
 ['#tekkatlıev','#bahçeliev','#dışcephe','#reelsinstagram'])

json.dump(P,open('/tmp/claude-0/-home-user-sahin-manitou-kiralama/586acede-a6c6-5740-b1bd-8a7ff379f378/scratchpad/plan/plan.json','w'),ensure_ascii=False)
used=[m for p in P for m in p['media']]
print(len(P),'gönderi', len(used),'medya', len(set(used)),'farklı')
for p in P: assert len(p['hashtags'])>=20, p['headline']
print(min(len(p['hashtags']) for p in P))
