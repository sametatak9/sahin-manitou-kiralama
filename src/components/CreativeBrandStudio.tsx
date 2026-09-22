import { useState } from 'react';
import { 
  Sparkles, 
  Leaf, 
  Smile, 
  Calendar, 
  Share2, 
  Copy, 
  Check, 
  Flame, 
  Award, 
  Send, 
  Heart, 
  TrendingUp, 
  MessageCircle, 
  Eye, 
  Lightbulb,
  TreePine,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

interface BrandPillar {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  description: string;
}

interface CreativePost {
  id: string;
  category: 'meme' | 'eco_green' | 'special_days' | 'human_story';
  categoryTitle: string;
  hookHeadline: string;
  visualConcept: string;
  caption: string;
  hashtags: string[];
  whyItWorks: string;
}

const CREATIVE_POSTS: CreativePost[] = [
  // 1. MEME & MİZAH (Viral & Esprili Şantiye Gerçekleri)
  {
    id: 'meme-1',
    category: 'meme',
    categoryTitle: '😂 Güncel Şantiye Mizahı / Meme',
    hookHeadline: '"Abi vinç çağırdık ama sokakta araba varmış, giremiyor..."',
    visualConcept: 'İki kareli görsel (Meme formatı):\nÜstte: Dar Tozkoparan sokağında sıkışıp kalmış, yolu tıkayan dev mobil vinç ve arkasında çaresiz korna çalan taksiler (Alt yazı: "Büyük vinç çağıran müteahhidin hüznü").\nAltta: 4 tekerini birden kırıp aradan jilet gibi sıyrılan ve çatallarıyla 4. kata tuğla uzatan Şahin Manitou (Alt yazı: "Bizim şantiyeye gelen o makine...").',
    caption: `İstanbul sokaklarında şantiye yönetmek sabır işidir... 😂🚜

"Usta tır geldi ama vinç sokağa sığmıyor" cümlesini tarihe gömüyoruz. 4 tekerden bağımsız manevra kabiliyetiyle Şahin Manitou, Güngören'in en dar çıkmaz sokaklarında bile tereyağından kıl çeker gibi çalışır!

Günün sonunda malzeme kırılmasın, yol kapanmasın, şantiye şefinin tansiyonu çıkmasın diyorsanız:
📞 Şantiye Hattı: 0531 436 29 04
🏗️ Güvenli Kentsel Dönüşüm: @embayyapi`,
    hashtags: ['#şantiyemizahı', '#inşaatcaps', '#güngören', '#tozkoparan', '#manitou', '#işmakinesi', '#şantiyegünlükleri', '#embayyapi'],
    whyItWorks: 'İstanbul\'daki tüm kalfalar, şantiye şefleri ve kamyoncular dar sokak çilesini bildiği için bu postu arkadaşlarına ve müteahhit WhatsApp gruplarına fırlatır (Organik viral yayılma).'
  },
  {
    id: 'meme-2',
    category: 'meme',
    categoryTitle: '😂 Güncel Şantiye Mizahı / Meme',
    hookHeadline: '"Merdivenden 300 torba çimento taşımayı teklif eden kalfa vs. Şahin Manitou"',
    visualConcept: 'Popüler "Drake No / Drake Yes" veya "GigaChad" formatı:\nSol: "10 kişi tutalım, 3 günde sırtımızda 4. kata çıkarırız (bel fıtığı garanti)".\nSağ: "Şahin Manitou çağırıp 45 dakikada kahve içerken kat tabliyesine koydururuz."',
    caption: `Ustalarımızın beli kıymetli, şantiyenin vakti nakit! ☕💪

Eski usul amelelikle taşınan malzemenin en az %15'i merdivenlerde heba olur. Şahin Manitou teleskopik bomuyla tırdan alır, balkona sıfır zayiatla kondurur.

Hem ustalar yorulmaz, hem malzeme kırılmaz!
📞 7/24 Kiralama: 0531 436 29 04
📍 İstanbul Avrupa Yakası`,
    hashtags: ['#zamandantasarruf', '#inşaatustası', '#işgüvenliği', '#kiralıkmanitou', '#akıllışantiye', '#embayyapi'],
    whyItWorks: 'Müteahhide hem paradan hem zamandan nasıl tasarruf ettiğini esprili ve doğrudan kafasına kazıyarak anlatır.'
  },

  // 2. DOĞAYI KORUYAN & GERİ DÖNÜŞÜMCÜ İNŞAAT (Sıfır Atık / Yeşil Müteahhitlik)
  {
    id: 'eco-1',
    category: 'eco_green',
    categoryTitle: '🌱 Doğa Dostu & Sıfır Atık Şantiye',
    hookHeadline: '"Yıkılan Her Binanın Molozu Çöp Değildir: Döngüsel Dönüşüm!"',
    visualConcept: 'Arka planda ayrıştırılan kentsel dönüşüm molozları (demirler bir yanda, kırma betonlar diğer yanda). Ön planda temiz yeşil baretli Embay Yapı mühendisi ve yemyeşil bir fidan tutan eller.',
    caption: `Gelecek nesillere sadece sağlam binalar değil, yaşanabilir bir dünya bırakmak zorundayız. 🌍🏗️

Embay Yapı olarak Güngören ve çevresindeki kentsel dönüşüm şantiyelerimizde:
♻️ Yıkım atıklarını kaynağında ayrıştırıyor, geri dönüştürülebilir demir ve çeliği ekonomiye kazandırıyoruz.
🚜 Teleskopik makinelerimizle paletleri kırmadan taşıyarak malzeme israfını (sıfır atık) minimuma indiriyoruz.
🌳 Tamamladığımız her konut projesinde beton kadar yeşil peyzaja ve çevre düzenlemesine yer açıyoruz.

Çevreye saygılı, depreme dayanıklı yuvalar inşa ediyoruz.
📍 Embay Yapı | Tozkoparan / İstanbul
📞 İletişim: 0531 436 29 04`,
    hashtags: ['#sıfıratık', '#yeşilinşaat', '#döngüseleonomi', '#çevredostu', '#kentseldönüşüm', '#embayyapi', '#doğayısaygı'],
    whyItWorks: 'Klasik tozlu, gürültülü müteahhit algısını yıkar; yeni nesil arsa sahiplerine "Bilinçli, çevreye saygılı ve kurumsal bir firma" imajı aşılar.'
  },
  {
    id: 'eco-2',
    category: 'eco_green',
    categoryTitle: '🌱 Doğa Dostu & Sıfır Atık Şantiye',
    hookHeadline: '"Her Teslim Ettiğimiz Anahtar İçin Şantiye Adına 10 Fidan Dikiyoruz"',
    visualConcept: 'Tamamlanan modern bir binanın önünde dikilen fidanlar ve TEMA / Orman Genel Müdürlüğü fidan bağış sertifikası görseli.',
    caption: `Beton dökerken toprağı unutmuyoruz! 🌱🏢

Embay Yapı güvencesiyle yenilediğimiz her kentsel dönüşüm binasında, hak sahiplerimiz adına doğaya 10 fidan armağan ediyoruz. Şantiyelerimiz sadece tuğla ve harçtan değil; insana, doğaya ve geleceğe duyduğumuz saygıdan yükseliyor.

Depreme dayanıklı, yeşille barışık güvenli yuvanız için tanışalım.
📞 0531 436 29 04 | @embayyapi`,
    hashtags: ['#fidandikimi', '#yeşilgelecek', '#sosyalsorumluluk', '#embayyapi', '#depremegüvenli', '#tozkoparan'],
    whyItWorks: 'Müşteri yorumlarında ve Instagram algoritmalarında en yüksek paylaşım ve kaydetme alan sosyal sorumluluk formatıdır.'
  },

  // 3. ÖZEL GÜNLER & GÜNDEME DUYARLI PAYLAŞIMLAR
  {
    id: 'day-1',
    category: 'special_days',
    categoryTitle: '🇹🇷 Özel Gün & Anlamlı Mesaj',
    hookHeadline: '17 Ağustos Deprem Şehitlerini Anma & Tavizsiz Güvenlik Mesajı',
    visualConcept: 'Sade ve vakur siyah-gri arka plan, ortada sağlam bir betonarme kolon ve yanan tek bir anma mumu. Üzerinde yazı: "Deprem değil, tedbirsizlik yıkar. Unutmadık, unutturmayacağız."',
    caption: `Acı tecrübeleri unutmadık, geleceği aynı hatalarla inşa edemeyiz. 🇹🇷🕊️

17 Ağustos ve asrın felaketinde yitirdiğimiz tüm canlarımızı rahmetle anıyoruz. Embay Yapı olarak şantiyelerimizde statik hesaplardan, demir donatısından ve C35 betondan zerre taviz vermeyişimizin en büyük sebebi; evlatlarımızın güven içinde uyuyacağı sağlam yuvalar yapma andımızdır.

Binalarımızı bilime, yönetmeliğe ve vicdana uygun yeniliyoruz.`,
    hashtags: ['#17ağustos', '#deprembilinci', '#sağlambina', '#kentseldönüşüm', '#embayyapi', '#güvenliyuva'],
    whyItWorks: 'Şirketin sadece para kazanmaya odaklanmadığını, deprem konusundaki ciddiyetini ve vicdani sorumluluğunu ortaya koyar.'
  },
  {
    id: 'day-2',
    category: 'special_days',
    categoryTitle: '🇹🇷 Özel Gün & Anlamlı Mesaj',
    hookHeadline: '1 Mayıs Emek ve Dayanışma Günü: Şantiyenin Gizli Kahramanları',
    visualConcept: 'Sabah çayı içen baretli işçiler, Manitou operatörünün gülümseyen portresi ve ellerdeki nasırların samimi bir yakın çekimi.',
    caption: `Yazın sıcağında, kışın ayazında; demiri bağlayan, betonu döken, vinci ve yükleyiciyi milimetrik kullanan tüm emekçilerimizin 1 Mayıs Emek ve Dayanışma Günü kutlu olsun! 👷‍♂️🚜

Embay Yapı & Şahin Manitou ailesi olarak en büyük gücümüz, şantiyelerimizde alın teri döken kıymetli ustalarımız ve operatörlerimizdir. İyi ki varsınız!`,
    hashtags: ['#1mayıs', '#emekvedayanışma', '#şantiyeemekçileri', '#inşaatustası', '#işçi', '#embayyapi'],
    whyItWorks: 'İşçisine ve ekibine değer veren şirkete müşteriler ve müteahhitler saygı duyar.'
  },

  // 4. İNSAN HİKAYESİ & MAHALLE KÜLTÜRÜ (Güngören / Tozkoparan Ruhu)
  {
    id: 'human-1',
    category: 'human_story',
    categoryTitle: '🤝 Mahalle Ruhu & Gerçek Hikaye',
    hookHeadline: '"Tozkoparan’da 35 Yıl Aynı Sokakta Yaşayan Ayşe Teyze’nin Yeni Evi"',
    visualConcept: 'Eski döküntü binasının önünde duran güler yüzlü teyze ile Embay Yapı yöneticisinin yeni deprem güvenli binanın balkonunda anahtar teslimindeki samimi karesi.',
    caption: `Kentsel dönüşüm sadece binaları yenilemek değil; hatıraları güvenle geleceğe taşımaktır. 🔑🏠

Tozkoparan sakinlerimizden Ayşe Teyzemiz, 35 yıl önce taşındığı sokağından ayrılmadan, yerinde dönüşümle depreme tam dayanıklı, asansörlü ve yalıtımlı yeni yuvasına kavuştu.

Biz sadece müteahhitlik yapmıyoruz; komşularımızın güvenini ve huzurunu inşa ediyoruz.
Sizin binanız da güvenle yenilensin: 0531 436 29 04`,
    hashtags: ['#yerindedönüşüm', '#tozkoparan', '#güngörenkentseldönüşüm', '#komşuluk', '#mutluevler', '#embayyapi'],
    whyItWorks: 'İnsanlar soğuk şirketlerden değil, güven veren ve komşusunu tanıyan yerel insanlardan ev yaptırır veya anlaşma yapar.'
  }
];

export function CreativeBrandStudio() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'meme' | 'eco_green' | 'special_days' | 'human_story'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPosts = selectedCategory === 'all' 
    ? CREATIVE_POSTS 
    : CREATIVE_POSTS.filter(p => p.category === selectedCategory);

  const copyPost = (post: CreativePost) => {
    const fullText = `${post.hookHeadline}\n\n${post.caption}\n\n${post.hashtags.join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ÜST VİZYON BANNERI */}
      <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-slate-900 via-fuchsia-950/30 to-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-300 text-xs font-semibold border border-fuchsia-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              Sıra Dışı Marka & Viral İtibar Stüdyosu
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              İnşaat Sadece Beton Değildir: Esprili, Çevreci & Gündeme Duyarlı Marka Kimliği
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Sosyal medyada sıkıcı inşaat şirketleri unutulur. <strong>Şahin Manitou & Embay Yapı</strong>; güncel meme'leri bilen esprili dili, sıfır atık ve fidan bağışı gibi çevreci adımları ve özel gün duyarlılığıyla İstanbul'un en çok konuşulan yerel markası haline geliyor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-bold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Yüksek Etkileşim Garantili
            </span>
          </div>
        </div>

        {/* Kategori Filtre Butonları */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedCategory === 'all' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Tüm Sıra Dışı İçerikler ({CREATIVE_POSTS.length})
          </button>
          <button
            onClick={() => setSelectedCategory('meme')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'meme' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span>😂 Şantiye Meme & Esprili Gönderiler</span>
          </button>
          <button
            onClick={() => setSelectedCategory('eco_green')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'eco_green' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            <span>🌱 Sıfır Atık & Çevre Dostu İnşaat</span>
          </button>
          <button
            onClick={() => setSelectedCategory('special_days')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'special_days' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>🇹🇷 Özel Gün & Anma Mesajları</span>
          </button>
          <button
            onClick={() => setSelectedCategory('human_story')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'human_story' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>🤝 Tozkoparan Mahalle Hikayeleri</span>
          </button>
        </div>
      </div>

      {/* İÇERİK KARTLARI LİSTESİ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPosts.map(post => (
          <div 
            key={post.id}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-fuchsia-400 px-2.5 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20">
                  {post.categoryTitle}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Keşfet Uyumlu
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                {post.hookHeadline}
              </h3>

              {/* Görsel / Video Fikri */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Çekilecek Görsel / Video Kurgusu:
                </span>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                  {post.visualConcept}
                </p>
              </div>

              {/* Açıklama Metni */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">
                  Instagram / Facebook Gönderi Metni:
                </span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto font-mono">
                  {post.caption}
                </p>
                <div className="pt-1 text-[11px] text-fuchsia-400 font-mono">
                  {post.hashtags.join(' ')}
                </div>
              </div>

              {/* Neden Tutar? / Psikolojik Etki */}
              <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300/90 leading-relaxed">
                🎯 <strong>Neden İşe Yarar?</strong> {post.whyItWorks}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={() => copyPost(post)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                {copiedId === post.id ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copiedId === post.id ? 'Tüm Post Kopyalandı!' : 'Görsel Fikri & Metni Kopyala'}
              </button>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${post.hookHeadline}\n\n${post.caption}\n\n${post.hashtags.join(' ')}`)}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 cursor-pointer transition"
                title="WhatsApp'ta Paylaş"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* MARKA KİMLİĞİ MANİFESTOSU */}
      <div className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
          <TreePine className="w-5 h-5" />
          <span>Şahin Manitou & Embay Yapı Marka Kimliği Bildirgesi</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-white block">1. Sıkıcı Değil, Yaşayan Dil</span>
            <p className="text-slate-400">Şantiyenin gerçek tozunu ve çilesini esprili bir dille anlatır, samimidir, mahalleliyle iç içedir.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-white block">2. Çevreye Saygı & Sıfır Atık</span>
            <p className="text-slate-400">Geri dönüşüm bilinciyle molozları ayrıştırır, her teslim edilen daire için TEMA fidanı diker.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-white block">3. Tavizsiz Deprem Güvenliği</span>
            <p className="text-slate-400">Özel günleri ve 17 Ağustos bilincini unutmaz; bilime, demire ve insan canına saygı duyar.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
