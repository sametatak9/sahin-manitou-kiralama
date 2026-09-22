import { PostTemplate, KeywordCategory, DayPlan } from '../types';

export const BUSINESS_INFO = {
  name: 'Embay Yapı ve Kiralık İş Makineleri',
  phone: '0531 436 29 04',
  phoneRaw: '05314362904',
  instagram: '@embayyapi',
  instagramUrl: 'https://instagram.com/embayyapi',
  website: 'https://sahin-manitou-kiralama.vercel.app/',
  address: 'Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul 34173',
  districts: ['Güngören', 'Bağcılar', 'Bakırköy', 'Merter', 'Zeytinburnu', 'Bahçelievler', 'Esenler', 'İkitelli', 'Başakşehir', 'Avrupa Yakası'],
  services: [
    'Teleskopik Yükleyici (Manitou) Kiralama',
    'Operatörlü & Operatörsüz İş Makinesi Temini',
    'Şantiye Malzeme İndirme & Katlara Yükleme (Palet, Çimento, Ytong, Demir, Cam)',
    'Konut & Kentsel Dönüşüm İnşaat Taahhüt',
    'Dar Alan & Şehir İçi Yüksek Kat Yük Kaldırma Çözümleri'
  ]
};

// 1) GOOGLE BUSINESS PROFILE (GBP) GÖNDERİ METİNLERİ
export const GBP_POSTS: PostTemplate[] = [
  {
    id: 'gbp-1',
    title: 'Haftalık Güncelleme: Güngören & Avrupa Yakası Manitou Kiralama',
    category: 'gbp',
    targetAudience: 'Şantiye şefleri, müteahhitler, taşeronlar',
    content: `İstanbul Avrupa Yakası şantiyelerinde zamanla yarışanlar için güçlü çözüm! 🚜🏗️

Şahin Manitou Kiralama olarak; Güngören, Tozkoparan, Bağcılar, Bakırköy ve çevre ilçelerde teleskopik yükleyici (Manitou) kiralama hizmeti sunuyoruz.

✅ Dar sokak ve zorlu şantiye zeminlerinde yüksek manevra kabiliyeti
✅ Katlara paletli malzeme (tuğla, ytong, seramik, harç) aktarımı
✅ Deneyimli operatör ve bakımlı iş makineleri
✅ Saatlik, günlük, haftalık ve proje bazlı esnek çalışma

İşinizin aksamaması için doğru makine ve tecrübeli ekiple yanınızdayız. Projenize özel net teklif almak için hemen arayın!

📍 Adres: Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul 34173
📞 İletişim & Teklif: 0531 436 29 04
🌐 Web: https://sahin-manitou-kiralama.vercel.app/
📸 İnşaat projelerimiz için: @embayyapi`,
    callToAction: 'Hemen Ara: 0531 436 29 04',
    tip: 'Google Haritalar panelinde "Yenilik / Gönderi Ekle" butonuna basıp sahada çekilen dikey veya yatay net bir Manitou çalışma fotoğrafı ekleyerek paylaşın.'
  },
  {
    id: 'gbp-2',
    title: 'Şantiye Malzeme Boşaltma & Katlara Sevkiyat',
    category: 'gbp',
    targetAudience: 'Malzeme indirme sorunu yaşayan şantiye sorumluları',
    content: `TIR geldi, vinç giremiyor veya sokak dar mı? Çözüm: Manitou! 🏗️📦

Kentsel dönüşüm ve bina inşaatlarında tır veya kamyon üstünden malzeme indirmek, ardından 3-4-5. katlara doğrudan palet uzatmak Şahin Manitou ile dakikalar sürer.

Demir, çimento, alçıpan, dış cephe iskele elemanları ve paletli her türlü inşaat yükünü güvenle kaldırıyoruz.

İnşaatınızın hızlanması, iş gücü tasarrufu ve sıfır fire için arayın:
📞 0531 436 29 04
📍 Merkez: Güngören / İstanbul
🌐 https://sahin-manitou-kiralama.vercel.app/
🏗️ Yapı ve müteahhitlik işleriniz için: Embay Yapı (@embayyapi)`,
    callToAction: 'Teklif Al: 0531 436 29 04',
    tip: 'Malzeme indirilirken çekilen çatallı Manitou fotoğrafıyla paylaşın.'
  },
  {
    id: 'gbp-3',
    title: 'Acil / Nöbetçi İş Makinesi İhtiyacı',
    category: 'gbp',
    targetAudience: 'Aynı gün içinde acil yükleyici arayan ustalar',
    content: `Şantiyenizde işiniz durmasın! Acil kiralık Manitou ihtiyacınızda hızlı sevkiyat. 🚨⚡

Güngören, Merter, Zeytinburnu ve Bağcılar hattında acil şantiye yükleme, indirme ve katlara malzeme aktarma taleplerinize en hızlı şekilde yanıt veriyoruz.

İşin metrajına ve süresine göre şeffaf, net teklif almak için:
📞 Doğrudan Arayın: 0531 436 29 04
📍 Tozkoparan Mah. Cevat Açıkalın Cad. Güngören
🌐 https://sahin-manitou-kiralama.vercel.app/
📸 @embayyapi`,
    callToAction: 'Doğrudan Ara',
    tip: 'Hafta sonu veya sabah erken saatlerde GBP üzerinde yayınlamak acil arayan müşteriyi yakalar.'
  },
  {
    id: 'gbp-4',
    title: 'Embay Yapı: Konut & Kentsel Dönüşüm İnşaat Taahhüt',
    category: 'gbp',
    targetAudience: 'Bina yenileme, kat karşılığı, konut inşaatı düşünen mülk sahipleri',
    content: `Güngören ve çevresinde güvenli, modern ve depreme dayanıklı yapılar inşa ediyoruz. 🏢🔨

Embay Yapı olarak şantiye disiplini, kendi özmal iş makinesi parkımız (Şahin Manitou) ve uzman mühendislik kadromuzla projelerimizi zamanında teslim ediyoruz.

Kat karşılığı inşaat, kentsel dönüşüm proje danışmanlığı ve anahtar teslim konut yapımı için ofisimize bekleriz.

📍 Adres: Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul 34173
📞 Telefon: 0531 436 29 04
📸 Instagram: @embayyapi
🌐 Web sitemiz: https://sahin-manitou-kiralama.vercel.app/`,
    callToAction: 'Bilgi Al: 0531 436 29 04',
    tip: 'Tamamlanan kaba inşaat veya şantiye tabelası eşliğinde paylaşın.'
  }
];

// 2) GOOGLE İŞLETME PROFİLİ İÇİN SORU & CEVAP (Q&A)
export const GBP_QA = [
  {
    question: 'Soru: Manitou kiralama fiyatları neye göre belirleniyor?',
    answer: 'Cevap: Sabit bir fiyat listemiz bulunmamaktadır. Kiralama bedeli; şantiyenin bulunduğu lokasyona (Güngören, Bağcılar vb.), işin süresine (saatlik, günlük veya aylık), kaldırılacak malzemenin tonajına ve operatörlü/operatörsüz tercihinize göre belirlenir. İşinize özel en uygun ve net teklifi almak için 0531 436 29 04 numaramızdan bizi doğrudan arayabilirsiniz.'
  },
  {
    question: 'Soru: Hangi bölgelere Manitou kiralama hizmeti veriyorsunuz?',
    answer: 'Cevap: Başta Güngören, Tozkoparan, Merter, Bağcılar, Bakırköy, Bahçelievler, Zeytinburnu olmak üzere İstanbul Avrupa Yakası’ndaki tüm inşaat ve şantiye sahalarına sevk sağlıyoruz. Bilgi için: 0531 436 29 04'
  },
  {
    question: 'Soru: Makineleriniz operatörlü mü kiralanıyor?',
    answer: 'Cevap: Evet, talebinize göre G sınıfı iş makinesi ehliyetine ve saha deneyimine sahip sertifikalı operatörlerimizle birlikte ya da şantiye bünyenizdeki yetkili operatör için operatörsüz olarak kiralama yapabiliyoruz.'
  },
  {
    question: 'Soru: Embay Yapı hangi alanlarda faaliyet göstermektedir?',
    answer: 'Cevap: Embay Yapı, Güngören merkezli konut inşaatı, kentsel dönüşüm bina yenileme, kaba ve ince yapı taahhüt işleri yürütmektedir. Kendi bünyesindeki Şahin Manitou makine parkıyla projeleri sıfır gecikmeyle yürütür. Detaylı portföy için Instagram: @embayyapi'
  }
];

// 3) GOOGLE İÇİN YORUM İSTEME (REVIEW GENERATION) WHATSAPP ŞABLONLARI
export const REVIEW_TEMPLATES = [
  {
    id: 'rev-samimi',
    title: 'Samimi & Esnaf Dili (Usta / Şantiye Şefi için)',
    text: `Selamünaleyküm [Müşteri / Şefim], bugün şantiyenizdeki Manitou yükleme işimizi sorunsuz tamamladık. Bizi tercih ettiğiniz için teşekkür ederiz. 

Hizmetimizden memnun kaldıysanız, Google Haritalar profilimize 1 dakikanızı ayırıp 5 yıldızlı bir yorum bırakmanız bizim için çok kıymetli olur:
👉 [GOOGLE_HARİTALAR_YORUM_LİNKİNİZ]

Bir sonraki işinizde veya inşaat ihtiyaçlarınızda doğrudan arayabilirsiniz: 0531 436 29 04
Hayırlı, bereketli işler dileriz!
Şahin Manitou & Embay Yapı (@embayyapi)`
  },
  {
    id: 'rev-kurumsal',
    title: 'Kurumsal & Resmi Dil (Müteahhit / Firma Yetkilisi için)',
    text: `Sayın Yetkili, Şahin Manitou Kiralama olarak projenizdeki teleskopik yükleyici hizmetimizi güvenle tamamlamış bulunmaktayız. İş birliğiniz için teşekkür ederiz.

Google İşletme profilimizde deneyiminizi birkaç cümleyle paylaşmanız, İstanbul genelinde yeni projelerle buluşmamıza büyük katkı sağlayacaktır:
👉 [GOOGLE_HARİTALAR_YORUM_LİNKİNİZ]

Her türlü iş makinesi ve konut inşaat taahhüt taleplerinizde yanınızdayız.
İletişim: 0531 436 29 04
Web: https://sahin-manitou-kiralama.vercel.app/
Embay Yapı & Şahin Manitou`
  }
];

// 4) YEREL VE SEKTÖREL ANAHTAR KELİME LİSTESİ
export const KEYWORD_CATEGORIES: KeywordCategory[] = [
  {
    title: 'İş Makinesi & Manitou Odaklı Aramalar',
    intent: 'İş Makinesi Kiralama',
    keywords: [
      { term: 'kiralık manitou', monthlyInterest: 'Çok Yüksek', usageArea: 'Ana sayfa H1, Google İşletme Hizmetler' },
      { term: 'kiralık manitou İstanbul', monthlyInterest: 'Çok Yüksek', usageArea: 'Meta Başlık ve Açıklamalar' },
      { term: 'teleskopik yükleyici kiralama', monthlyInterest: 'Yüksek', usageArea: 'Hizmet sayfaları ve teknik içerikler' },
      { term: 'günlük kiralık manitou', monthlyInterest: 'Yüksek', usageArea: 'GBP gönderileri, SSS bölümü' },
      { term: 'operatörlü manitou kiralama', monthlyInterest: 'Yüksek', usageArea: 'Teklif metinleri, WhatsApp' },
      { term: 'şantiye malzeme indirme manitou', monthlyInterest: 'Hedef / Spesifik', usageArea: 'Reels açıklamaları, Blog/Site' }
    ]
  },
  {
    title: 'Bölgesel / Yerel İlçe Aramaları (Local SEO)',
    intent: 'Bölgesel / Semt Bazlı',
    keywords: [
      { term: 'kiralık manitou Güngören', monthlyInterest: 'Çok Yüksek', usageArea: 'Yerel Haritalar 1. Sıra Hedefi' },
      { term: 'Tozkoparan kiralık manitou', monthlyInterest: 'Hedef / Spesifik', usageArea: 'NAP ve Mahalle landing sayfası' },
      { term: 'kiralık manitou Bağcılar', monthlyInterest: 'Yüksek', usageArea: 'İlçe etiketleri ve gönderiler' },
      { term: 'kiralık manitou Bakırköy', monthlyInterest: 'Yüksek', usageArea: 'Bölge servis ağı metinleri' },
      { term: 'kiralık manitou Merter / Zeytinburnu', monthlyInterest: 'Yüksek', usageArea: 'Tekstil/sanayi malzeme aktarımı' },
      { term: 'kiralık manitou İkitelli / Başakşehir', monthlyInterest: 'Yüksek', usageArea: 'Sanayi siteleri ve depo sevkiyatı' },
      { term: 'İstanbul Avrupa Yakası kiralık manitou', monthlyInterest: 'Çok Yüksek', usageArea: 'Site footer ve schema konumu' }
    ]
  },
  {
    title: 'İnşaat, Kentsel Dönüşüm & Embay Yapı Aramaları',
    intent: 'İnşaat & Taahhüt',
    keywords: [
      { term: 'konut inşaatı Güngören', monthlyInterest: 'Yüksek', usageArea: 'Embay Yapı konut tanıtımları' },
      { term: 'inşaat taahhüt Tozkoparan', monthlyInterest: 'Hedef / Spesifik', usageArea: 'Kentsel dönüşüm teklifleri' },
      { term: 'Güngören kentsel dönüşüm müteahhit', monthlyInterest: 'Yüksek', usageArea: 'Instagram bio ve gönderi metni' },
      { term: 'kat karşılığı inşaat Güngören', monthlyInterest: 'Yüksek', usageArea: 'Web sitesi Embay Yapı bölümü' },
      { term: 'bina yenileme Tozkoparan', monthlyInterest: 'Hedef / Spesifik', usageArea: 'Proje teslim paylaşımları' }
    ]
  }
];

// 5) INSTAGRAM (@embayyapi) İÇİN BİO, REELS VE STORY ŞABLONLARI
export const INSTAGRAM_BIOS = [
  {
    id: 'bio-1',
    title: 'Önerilen Standart Bio (Tavsiye Edilen - Net & Güçlü)',
    lines: [
      '🚜 Şahin Manitou Kiralama & Embay Yapı',
      '🏗️ İstanbul Avrupa Yakası Teleskopik Yükleyici & İnşaat',
      '📦 Katlara malzeme verme | Şantiye yükleme & boşaltma',
      '📍 Tozkoparan, Güngören / İst',
      '📞 Hızlı Teklif: 0531 436 29 04',
      '🔗 sahin-manitou-kiralama.vercel.app'
    ],
    note: 'Instagram 150 karakter sınırına tam uyumludur. Bio linkine Vercel sitesini ekleyin.'
  },
  {
    id: 'bio-2',
    title: 'Saha & Güven Odaklı Bio (Kentsel Dönüşüm Vurgulu)',
    lines: [
      'EMBAY YAPI & ŞAHİN MANİTOU',
      'Depreme dayanıklı konut & profesyonel iş makinesi parkı',
      'Teleskopik yükleyici (Manitou) kiralama | Güngören - İst',
      '🚜 Kendi makinemiz, kendi işimiz',
      '📞 İletişim: 0531 436 29 04',
      '👇 Projeler & Teklif'
    ],
    note: 'Hem inşaat hem makine kiralama gücünü tek çatı altında verir.'
  }
];

// REELS KANCA (HOOK) + SENARYO + CAPTION + TEMİZ ETİKETLER
export const REELS_SCRIPTS = [
  {
    id: 'reels-1',
    title: 'Reels #1: Dar Sokakta Milimetrik Yükleme (En Çok Keşfete Düşen Format)',
    hookText: '“İstanbul’un bu dar sokağında vinç çalışamaz dediler… İzleyin!”',
    visualIdea: 'Operatör kabininden veya sokak seviyesinden dar sokakta Manitou’nun tekerlek dönüşü ve bomun 4. kata tam hizalanışı gösterilir. Arkada doğal motor sesi veya ritmik şantiye sesi.',
    caption: `Dar sokaklar işinizi durduramaz! 🚜🏗️

Güngören şantiyemizde tırdan aldığımız paletli malzemeyi 4. kat balkonuna sıfır fireyle teslim ettik. Şahin Manitou ile dar alanlar engel değil, çözüm noktasıdır.

Projelerinizde saatlik, günlük veya haftalık Manitou kiralama için net teklif alın.

📞 Arayın: 0531 436 29 04
📍 Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul
🌐 https://sahin-manitou-kiralama.vercel.app/
🏗️ Yapı projelerimiz için takip edin: @embayyapi`,
    hashtags: ['#kiralıkmanitou', '#manitouistanbul', '#şahinmanitou', '#embayyapı', '#güngören', '#işmakinesi', '#şantiyegünlükleri', '#inşaat']
  },
  {
    id: 'reels-2',
    title: 'Reels #2: Şantiyede 3 Saatte Bitecek İşi 20 Dakikaya İndiren Güç',
    hookText: '“10 amelenin akşama kadar taşıyamayacağı paleti 15 dakikada kata verdik.”',
    visualIdea: 'Önce yerde duran 10 palet tuğla gösterilir. Ardından hızlandırılmış (timelapse) şekilde Manitou bomunun yukarı aşağı çalışarak katlara malzeme bırakışı.',
    caption: `Zaman = Şantiyede nakit paradır! ⏱️💪

Tuğla, ytong, seramik veya harç torbaları... İskele kurup elle taşımakla vakit kaybetmeyin. Teleskopik yükleyicimizle malzemelerinizi doğrudan çalışılacak kata teslim ediyoruz.

✅ Sıfır malzeme firesi
✅ Maksimum iş güvenliği
✅ Hızlı teslimat

Bölgenizdeki müsaitlik durumu ve projenize özel teklif için:
📞 0531 436 29 04
🌐 https://sahin-manitou-kiralama.vercel.app/
📍 Tozkoparan / Güngören - İstanbul
Takip: @embayyapi`,
    hashtags: ['#manitou', '#inşaat', '#şantiyeci', '#müteahhit', '#şahinmanitou', '#embayyapi', '#istanbulinşaat']
  },
  {
    id: 'reels-3',
    title: 'Reels #3: Operatörün Gözünden Şantiye (POV / Samimi Usta İçeriği)',
    hookText: '“Günün ilk yükü 18 metreye uzanıyor. Hadi bismillah!”',
    visualIdea: 'Kabin içinden operatörün joystick kontrolü, aynadan görünüş ve bomun tepeye doğru uzanışı. "İşte İstanbul şantiyelerinde sabah mesaisi böyle başlar" seslendirmesi.',
    caption: `Sabahın erken saatlerinde Güngören şantiyesinde mesaideyiz. 🚜🌤️

Her işin başı emniyet, tecrübe ve dikkat. Şahin Manitou olarak iş makinesi kiralama ve Embay Yapı olarak konut inşaatlarında kaliteyi elden bırakmıyoruz.

Siz de şantiyenize güvenilir bir çözüm ortağı arıyorsanız:
📞 0531 436 29 04
📍 Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul 34173
Web: https://sahin-manitou-kiralama.vercel.app/
Hesabımızı takip etmeyi unutmayın: @embayyapi`,
    hashtags: ['#manitoukiralama', '#şantiyeortamı', '#operatör', '#güngöreninşaat', '#embayyapi', '#teleskopikyükleyici']
  }
];

// 6) HAFTALIK MİNİ YAYIN PLANI
export const WEEKLY_SCHEDULE: DayPlan[] = [
  {
    day: 'Pazartesi',
    dayNumber: 1,
    platform: 'Google GBP',
    action: 'Haftalık Saha Başlangıç Güncellemesi',
    goal: 'Google Haritalar algoritmasına işletmenin bu hafta aktif olduğunu bildirmek.',
    details: 'Pazartesi sabahı şantiyeden çekilmiş net bir Manitou fotoğrafı ile GBP gönderisi paylaşılır.',
    copyText: `Yeni haftaya şantiyelerimizde hız kesmeden başladık! Güngören ve İstanbul Avrupa Yakası'nda kiralık Manitou ihtiyaçlarınız için hazırız. 📞 0531 436 29 04 | https://sahin-manitou-kiralama.vercel.app/ | @embayyapi`
  },
  {
    day: 'Salı',
    dayNumber: 2,
    platform: 'Instagram (@embayyapi)',
    action: 'Reels Videosu (Dar sokakta manevra veya yükleme)',
    goal: 'Instagram Keşfet algoritmasını tetiklemek ve yerel müteahhitlere erişmek.',
    details: '15-25 saniyelik şantiye videosu. Reels #1 veya #2 metni ile ses trendi kullanılarak paylaşılır.',
    copyText: `Dar sokaklar Şahin Manitou ile engel değil! 🚜 Teklif ve kiralama için arayın: 0531 436 29 04 📍 Tozkoparan / Güngören @embayyapi`
  },
  {
    day: 'Çarşamba',
    dayNumber: 3,
    platform: 'Müşteri WhatsApp',
    action: 'Tamamlanan İşlerden Yorum Toplama',
    goal: 'Google İşletme profilindeki yorum sayısını ve yıldız puanını artırmak (Doğrudan SEO sıralama faktörü).',
    details: 'Bu hafta iş yapılan 2-3 şantiye şefine veya müteahhite hazırlanan WhatsApp yorum şablonu atılır.',
    copyText: `Selamlar şefim, bugünkü Manitou işimiz bitti. Hizmetimizden memnunsanız Google Haritalar profilimize 1 dakikanızı ayırıp 5 yıldızlı yorum bırakırsanız çok mutlu oluruz: [LİNK] 0531 436 29 04`
  },
  {
    day: 'Perşembe',
    dayNumber: 4,
    platform: 'Instagram (@embayyapi)',
    action: '3 Parçalı Hikaye (Story) Dizisi',
    goal: 'Mevcut takipçilerle etkileşim kurmak ve güven tazelemek.',
    details: 'Story 1: "Bugün hangi şantiyedeyiz?" (Konum: Güngören). Story 2: Bom uzanırken anket ("Kaçıncı kata gidiyor sizce? 3 mü 5 mi?"). Story 3: "İş makinesi ihtiyacınız için DM veya Tel: 0531 436 29 04"',
    copyText: `Bugün Tozkoparan şantiyesindeyiz! Malzeme indirme ve katlara verme işlerinizde bir telefon uzağınızdayız: 0531 436 29 04 | @embayyapi`
  },
  {
    day: 'Cuma',
    dayNumber: 5,
    platform: 'Google GBP',
    action: 'Hizmet & Güven Odaklı GBP Gönderisi',
    goal: 'Hafta sonu veya gelecek hafta için şantiye planı yapan karar vericileri yakalamak.',
    details: 'GBP_POSTS içindeki "Haftalık Güncelleme" veya "Embay Yapı İnşaat Taahhüt" şablonu paylaşılır.',
    copyText: `Hafta sonu ve gelecek hafta şantiye programınız için Şahin Manitou yanınızda. Operatörlü & operatörsüz teleskopik yükleyici kiralama: 0531 436 29 04 | Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul 34173`
  },
  {
    day: 'Cumartesi',
    dayNumber: 6,
    platform: 'Instagram (@embayyapi)',
    action: 'Haftalık Kapanış / Bitirilen İş Özeti',
    goal: 'Haftanın sahadaki emeğini ve teslim edilen işleri göstererek kurumsal + sempatik imajı güçlendirmek.',
    details: 'Makinelerin yıkanması, bakımı veya şantiyeden ayrılış karesi.',
    copyText: `Bu haftayı da kazasız belasız şantiyelerimizi tamamlayarak bitirdik. Pazartesi başlayacak işleriniz için şimdiden makinenizi ayırtın: 0531 436 29 04 @embayyapi`
  },
  {
    day: 'Pazar',
    dayNumber: 7,
    platform: 'Web Sitesi',
    action: 'Haftalık SEO & Sıralama Kontrolü',
    goal: 'Google’da "kiralık manitou Güngören", "teleskopik yükleyici İstanbul" aramalarındaki sırayı kontrol etmek.',
    details: 'Gizli sekmede arama yapın, sitenizin ve harita kaydınızın durumunu not edin.',
    copyText: `Site kontrolü: https://sahin-manitou-kiralama.vercel.app/ - Arama terimi testleri.`
  }
];

// 7) WEB SİTESİ İÇİN BAŞLIK, META VE SCHEMA VERİSİ
export const WEBSITE_SEO_DATA = {
  title: 'Şahin Manitou Kiralama & Embay Yapı | Güngören İstanbul',
  metaDescription: 'İstanbul Güngören ve Avrupa Yakası kiralık Manitou (teleskopik yükleyici) ve konut inşaatı. Katlara malzeme verme, şantiye yükleme. Teklif: 0531 436 29 04.',
  h1: 'İstanbul Güngören Kiralık Manitou & İnşaat Taahhüt Çözümleri',
  h2s: [
    'Teleskopik Yükleyici (Manitou) Kiralama Hizmetlerimiz',
    'Neden Şahin Manitou? Dar Sokaklar ve Zorlu Zeminlerde Üstün Güç',
    'Embay Yapı: Güngören Konut ve Kentsel Dönüşüm Projeleri',
    'Sıkça Sorulan Sorular & Fiyat Teklifi Alma'
  ],
  jsonLdSchema: `{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "@id": "https://sahin-manitou-kiralama.vercel.app/#business",
      "name": "Şahin Manitou Kiralama",
      "telephone": "+905314362904",
      "url": "https://sahin-manitou-kiralama.vercel.app/",
      "priceRange": "$$",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Cevat Açıkalın Cad. Tozkoparan Mah.",
        "addressLocality": "Güngören",
        "addressRegion": "İstanbul",
        "postalCode": "34173",
        "addressCountry": "TR"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 41.0182,
        "longitude": 28.8953
      },
      "sameAs": [
        "https://www.instagram.com/embayyapi"
      ],
      "areaServed": [
        "Güngören",
        "Bağcılar",
        "Bakırköy",
        "Zeytinburnu",
        "Merter",
        "İstanbul Avrupa Yakası"
      ]
    },
    {
      "@type": "GeneralContractor",
      "@id": "https://sahin-manitou-kiralama.vercel.app/#contractor",
      "name": "Embay Yapı",
      "telephone": "+905314362904",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Cevat Açıkalın Cad. Tozkoparan Mah.",
        "addressLocality": "Güngören",
        "addressRegion": "İstanbul",
        "postalCode": "34173",
        "addressCountry": "TR"
      }
    }
  ]
}`
};

// 8) GOOGLE İŞLETME PROFİLİ HİZMETLER (SERVICES) LİSTESİ METİNLERİ
export const GBP_SERVICES_LIST = [
  {
    name: 'Teleskopik Yükleyici (Manitou) Kiralama',
    category: 'İş Makinesi Kiralama Hizmeti',
    description: 'İstanbul Güngören, Tozkoparan, Bağcılar ve Avrupa Yakası genelinde bakımlı teleskopik yükleyici kiralama. Saatlik, günlük ve proje bazlı çalışma. Sabit liste yoktur, net teklif için: 0531 436 29 04.'
  },
  {
    name: 'Şantiye Katlara Malzeme Sevkiyatı',
    category: 'Yükleme & Boşaltma Hizmeti',
    description: 'Tır ve kamyondan paletli tuğla, ytong, seramik ve harç malzemelerinin doğrudan kat balkonlarına veya tabliyelere zayiat vermeden teslim edilmesi. İletişim: 0531 436 29 04.'
  },
  {
    name: 'Operatörlü Manitou Kiralama',
    category: 'İş Makinesi Hizmeti',
    description: 'Şantiye tecrübesine sahip deneyimli operatör eşliğinde teleskopik yükleyici temini. Net fiyat teklifi ve sevk için: 0531 436 29 04.'
  },
  {
    name: 'Konut İnşaatı & Kentsel Dönüşüm Taahhüt',
    category: 'Müteahhitlik & Genel İnşaat',
    description: 'Embay Yapı bünyesinde Güngören ve çevresinde deprem yönetmeliğine uygun, modern, anahtar teslim konut yapımı, kat karşılığı taahhüt ve kentsel dönüşüm. Bilgi: 0531 436 29 04 | @embayyapi.'
  },
  {
    name: 'Dar Alan & Vinç Alternatifi Yük Kaldırma',
    category: 'Özel Kaldırma Çözümleri',
    description: 'Mobil vincin yanaşamadığı dar cadde ve sokaklardaki şantiyelerde teleskopik yükleyici ile pratik ve emniyetli malzeme kaldırma. Net teklif: 0531 436 29 04.'
  }
];

// 9) GOOGLE 5 YILDIZLI YORUMLARA CEVAP VERME ŞABLONLARI (SEO DESTEKLİ)
export const REVIEW_REPLIES = [
  {
    type: '5 Yıldızlı Yorum (Manitou Kiralama)',
    customerReviewExample: '"Çok memnun kaldık, makine zamanında geldi operatör çok iyiydi."',
    replyText: `Değerli yorumunuz için Şahin Manitou Kiralama ailesi olarak çok teşekkür ederiz! Güngören ve çevre şantiyelerinizde teleskopik yükleyici (Manitou) ve malzeme indirme ihtiyaçlarınızda her zaman yanınızdayız. Kazasız, bereketli çalışmalar dileriz. 
İletişim: 0531 436 29 04 | https://sahin-manitou-kiralama.vercel.app/`,
    seoTip: 'Cevapta "Güngören", "teleskopik yükleyici (Manitou)" ve "şantiye malzeme indirme" kelimeleri geçerek arama motoru sinyali üretir.'
  },
  {
    type: '5 Yıldızlı Yorum (Embay Yapı & İnşaat)',
    customerReviewExample: '"İşlerini titizlikle yapan, güvenilir bir inşaat firması."',
    replyText: `Güveniniz ve güzel geri bildiriminiz için teşekkür ederiz. Embay Yapı olarak Güngören'de güvenli, sağlam ve modern konut inşaatı ile kentsel dönüşüm projelerimize titizlikle devam ediyoruz. 
İnşaat ve iş makinesi çözümlerimiz için: 0531 436 29 04 | Instagram: @embayyapi`,
    seoTip: 'Google Haritalar "Güngören inşaat firması" aramasında profilinizi öne çıkarır.'
  }
];

// 10) GOOGLE ADS ARAMA AĞI REKLAM METİNLERİ (30 VE 90 KARAKTER LİMİTLERİNE TAM UYGUN)
export const GOOGLE_ADS_COPY = {
  headlines: [
    'Kiralık Manitou İstanbul',
    'Güngören Kiralık Manitou',
    'Teleskopik Yükleyici Kiralama',
    'Şahin Manitou: Hızlı Sevkiyat',
    'Şantiye Katlara Yük Verme',
    'Embay Yapı & İş Makinesi',
    'Uygun Fiyatlı Net Teklif Al',
    'Dar Sokaklar İçin Manitou'
  ],
  descriptions: [
    'İstanbul Avrupa Yakası kiralık Manitou. Katlara palet ve tuğla verme. Hemen net teklif alın.',
    'Güngören Tozkoparan merkezli teleskopik yükleyici kiralama. Saatlik ve günlük esnek çalışma.',
    'Vinç giremeyen dar sokaklara kesin çözüm. Operatörlü Manitou kiralama: 0531 436 29 04.',
    'Embay Yapı & Şahin Manitou güvencesiyle konut inşaatı ve şantiye yükleme çözümleri.'
  ]
};

// 11) YEREL DİZİN (CITATION) KAYIT LİSTESİ (NAP TUTARLILIĞI İÇİN)
export const DIRECTORY_CITATIONS = [
  {
    platform: 'Google Haritalar (GBP)',
    status: 'Öncelik 1 - Aktif',
    target: 'Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul 34173 - 0531 436 29 04',
    benefit: 'Aramaların %80’inin geldiği birincil pazar alanı.'
  },
  {
    platform: 'Yandex Haritalar & Navigasyon',
    status: 'Hemen Eklenmeli',
    target: 'Şahin Manitou Kiralama - Embay Yapı',
    benefit: 'İstanbul trafiğinde şantiye kamyoncuları ve müteahhitler Yandex Navigasyon’u çok yoğun kullanır.'
  },
  {
    platform: 'Apple Haritalar (Apple Business Connect)',
    status: 'Hemen Eklenmeli',
    target: 'Aynı NAP bilgileriyle ücretsiz işletme kaydı',
    benefit: 'iPhone ve Siri kullanan mimar ve müteahhit aramalarında doğrudan harita önerisi.'
  },
  {
    platform: 'Sahibinden.com / Sanayi & İş Makinesi',
    status: 'Tavsiye Edilen',
    target: 'Kiralık İş Makineleri & Konut İlanları',
    benefit: 'Makinanın boşta olduğu günlerde doğrudan kiralama talebi oluşturur.'
  },
  {
    platform: 'Sarı Sayfalar / Bulurum.com / Foursquare',
    status: 'Tamamlayıcı SEO',
    target: 'Birebir aynı isim, telefon ve adres',
    benefit: 'Google botlarına işletmenin fiziksel varlığını doğrulayan "backlink & citation" sinyali sağlar.'
  }
];

// 12) İLÇE VE BÖLGE BAZLI YEREL SEO SAYFA & POST METİNLERİ (HEDEF PAZAR ALANLARI)
export const DISTRICT_LANDING_PAGES = [
  {
    district: 'Güngören & Tozkoparan',
    title: 'Güngören Kiralık Manitou & Kentsel Dönüşüm Şantiye Çözümleri',
    focus: 'Merkez lokasyon, Tozkoparan kentsel dönüşüm alanları, dar sokaklar',
    description: 'Güngören ve Tozkoparan bölgesindeki tüm inşaat, kentsel dönüşüm ve bina yenileme projelerinde Şahin Manitou olarak dakikalar içinde şantiyenizdeyiz. Vincin sığmadığı dar sokaklarda tırdan palet indirme ve 4-5. katlara doğrudan malzeme verme hizmeti.',
    h2: 'Tozkoparan ve Güngören Şantiyelerine Hızlı Manitou Sevkiyatı',
    tags: ['#güngörenmanitou', '#tozkoparankentseldönüşüm', '#kiralıkmanitougüngören'],
    seoKeywords: 'kiralık manitou Güngören, Tozkoparan manitou kiralama, Güngören inşaat iş makinesi'
  },
  {
    district: 'Bağcılar & Güneşli',
    title: 'Bağcılar Kiralık Teleskopik Yükleyici (Manitou)',
    focus: 'Yoğun kentsel dönüşüm, dar cadde yüklemeleri, paletli malzeme',
    description: 'Bağcılar Meydan, Güneşli ve Mahmutbey şantiyelerine aynı gün içinde operatörlü veya operatörsüz Manitou sevkiyatı. Kamyon ve tır boşaltma, ytong ve tuğla paletlerinin katlara transferi.',
    h2: 'Bağcılar İnşaatlarında İş Gücünü 10 Kat Hızlandıran Güç',
    tags: ['#bağcılarkiralıkmanitou', '#güneşliinşaat', '#bağcılarişmakinesi'],
    seoKeywords: 'kiralık manitou Bağcılar, Güneşli teleskopik yükleyici, Bağcılar malzeme indirme'
  },
  {
    district: 'Bakırköy, Ataköy & Florya',
    title: 'Bakırköy Kiralık Manitou & Lüks Konut Şantiye Hizmeti',
    focus: 'Bina güçlendirme, çatı aktarma, cephe iskele ve seramik yükleme',
    description: 'Bakırköy, Ataköy, Yeşilköy ve Florya hattında lüks konut, villa ve güçlendirme projelerinde çevreye zarar vermeden, gürültü ve iş güvenliği kurallarına tam uyumlu teleskopik yükleyici hizmeti.',
    h2: 'Bakırköy Bölgesinde Hassas ve Güvenli Malzeme Kaldırma',
    tags: ['#bakırköymanitou', '#ataköyinşaat', '#floryakiralıkmanitou'],
    seoKeywords: 'kiralık manitou Bakırköy, Florya iş makinesi kiralama, Ataköy kentsel dönüşüm'
  },
  {
    district: 'Merter & Zeytinburnu',
    title: 'Merter & Zeytinburnu Kiralık Manitou (Tekstil & Sanayi)',
    focus: 'Tekstil atölyeleri, kumaş paletleri, fabrika yükleme, kentsel dönüşüm',
    description: 'Merter tekstil merkezi ve Zeytinburnu sanayi/konut şantiyelerinde tırdan ağır yük ve palet boşaltma, yüksek katlı imalathanelere malzeme verme işlerinizde hızlı ve ekonomik çözüm.',
    h2: 'Merter Sanayi ve Depolarında Hızlı Palet Aktarımı',
    tags: ['#mertermanitou', '#zeytinburnuinşaat', '#kumaşpaletyükleme'],
    seoKeywords: 'kiralık manitou Merter, Zeytinburnu teleskopik yükleyici, Merter palet indirme'
  },
  {
    district: 'İkitelli OSB & Başakşehir',
    title: 'İkitelli Sanayi & Başakşehir Kiralık Manitou',
    focus: 'Organize sanayi siteleri, fabrika taşınma, depo istifleme, kaba inşaat',
    description: 'İkitelli Organize Sanayi Bölgesi (İOSB), Masko, Demirciler Sitesi ve Başakşehir toplu konut projelerine uzun bomlu Manitou temini. 14-18 metre bom erişimi ile ağır ekipman ve palet yerleştirme.',
    h2: 'İkitelli OSB Depo ve Fabrikaları İçin Güçlü Yükleyici',
    tags: ['#ikitellimanitou', '#başakşehirşantiye', '#iosbişmakinesi'],
    seoKeywords: 'kiralık manitou İkitelli, Başakşehir teleskopik yükleyici, İkitelli OSB manitou'
  }
];

// 8) YAPAMADIKLARIMIZ VS. SİZİN YAPACAĞINIZ FİZİKİ İŞLER
export const TASK_BOUNDARIES = {
  aiCanDo: [
    'Google SEO uyumlu, yüksek dönüşümlü GBP gönderi metinleri hazırlama',
    'Reels video senaryoları, dikkat çekici ilk 3 saniye kancaları (Hook) üretme',
    'WhatsApp için kopyalanıp tek tıkla şantiye şefine atılacak yorum isteme mesajları yazma',
    'Web sitesi için H1, H2, Meta Description ve Google arama motorunun bayıldığı JSON-LD Schema üretme',
    'Yerel anahtar kelime matrisi çıkarıp haftalık planlama oluşturma'
  ],
  humanMustDo: [
    'Google İşletme Profili (GBP) paneline girip gönderiyi veya fotoğrafı fiziksel olarak yüklemek',
    'Google Haritalar posta kartı / video ile işletme doğrulamasını yapmak',
    'Şantiyede telefonla gerçek video ve fotoğraf çekmek (Yapay AI stok görsel asla kullanılmamalı)',
    'Instagram @embayyapi hesabına giriş yapıp Reels videosunu reel sesle yüklemek',
    'Müşteriden gelen aramaları (0531 436 29 04) karşılayıp şantiye şartlarına göre net fiyat teklifi vermek'
  ]
};
