import { useState } from 'react';
import { Copy, Check, Globe, Code, ShieldAlert, CheckCircle2, Instagram, Search, FileCode2, ExternalLink } from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

export function TwoPageSiteKit() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'architecture' | 'page1' | 'page2' | 'embed' | 'searchconsole'>('architecture');

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // HTML Skeleton for Page 1: Insaat / Embay Yapı (Root /)
  const page1Html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Embay Yapı | Güngören Konut İnşaatı & Kentsel Dönüşüm</title>
  <meta name="description" content="Embay Yapı: Güngören Tozkoparan'da depreme dayanıklı modern konut inşaatı ve kentsel dönüşüm taahhüt. Kendi iş makinesi filomuzla hızlı teslimat. Tel: 0531 436 29 04">
  <link rel="canonical" href="https://sahin-manitou-kiralama.vercel.app/">
  <!-- Google Search Console Doğrulama Meta Kodu -->
  <!-- <meta name="google-site-verification" content="BURAYA_GSC_DOGRULAMA_KODUNUZ" /> -->
  
  <!-- Schema.org GeneralContractor & LocalBusiness -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    "name": "Embay Yapı",
    "telephone": "+905314362904",
    "url": "https://sahin-manitou-kiralama.vercel.app/",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Cevat Açıkalın Cad. Tozkoparan Mah.",
      "addressLocality": "Güngören",
      "addressRegion": "İstanbul",
      "postalCode": "34173",
      "addressCountry": "TR"
    },
    "sameAs": ["https://www.instagram.com/embayyapi/"],
    "areaServed": ["Güngören", "Bağcılar", "Bakırköy", "Zeytinburnu", "İstanbul"]
  }
  </script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; line-height: 1.6; }
    header, footer { background: #1e293b; padding: 1.5rem; text-align: center; }
    .container { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
    .btn { display: inline-block; background: #eab308; color: #0f172a; font-weight: bold; padding: 0.8rem 1.5rem; border-radius: 8px; text-decoration: none; margin: 0.5rem 0.25rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .interlink { background: #0284c7; color: white; padding: 0.75rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; }
  </style>
</head>
<body>
  <header>
    <h1>Embay Yapı & İnşaat Taahhüt</h1>
    <p>Güngören Tozkoparan Merkezli Modern Konut & Kentsel Dönüşüm</p>
    <a href="tel:05314362904" class="btn">📞 0531 436 29 04</a>
    <a href="/manitou" class="interlink">🚜 Kiralık Manitou Hizmetimiz</a>
  </header>

  <main class="container">
    <section class="card">
      <h2>Güngören ve Çevresinde Güvenli Konut İnşaatı</h2>
      <p>Embay Yapı olarak; Güngören, Tozkoparan ve İstanbul Avrupa Yakası'nda deprem yönetmeliğine tam uyumlu, anahtar teslim konut inşaatları ve kentsel dönüşüm bina yenileme projeleri yürütüyoruz.</p>
      <p><strong>Özmal İş Makinesi Gücümüz:</strong> Projelerimizde malzeme taşıma ve yükleme işlerini kendi bünyemizdeki <strong>Şahin Manitou</strong> teleskopik yükleyicilerimizle yürüterek sıfır gecikme ve maksimum emniyet sağlıyoruz.</p>
      <p><a href="/manitou">Teleskopik yükleyici kiralama çözümlerimiz hakkında bilgi almak için tıklayın &rarr;</a></p>
    </section>

    <section class="card">
      <h2>Sahadaki Son Çalışmalarımız (@embayyapi)</h2>
      <p>Şantiyelerimizden canlı kareleri ve tamamlanan projelerimizi resmi Instagram hesabımızdan takip edebilirsiniz:</p>
      <a href="https://www.instagram.com/embayyapi/" target="_blank" rel="noopener" class="btn" style="background:#ec4899; color:white;">📸 Instagram'da @embayyapi'yi Takip Edin</a>
    </section>
  </main>

  <footer>
    <p>📍 Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul 34173</p>
    <p>İletişim & Teklif: 0531 436 29 04 | <a href="/manitou" style="color:#eab308;">Kiralık Manitou Sayfası</a></p>
  </footer>
</body>
</html>`;

  // HTML Skeleton for Page 2: Kiralık Manitou (/manitou)
  const page2Html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kiralık Manitou İstanbul Güngören | Şahin Manitou Kiralama</title>
  <meta name="description" content="Güngören, Bağcılar ve İstanbul Avrupa Yakası kiralık Manitou (teleskopik yükleyici). Dar sokaklarda katlara palet indirme & malzeme verme. Teklif: 0531 436 29 04">
  <link rel="canonical" href="https://sahin-manitou-kiralama.vercel.app/manitou">
  
  <!-- Schema.org LocalBusiness -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Şahin Manitou Kiralama",
    "telephone": "+905314362904",
    "url": "https://sahin-manitou-kiralama.vercel.app/manitou",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Cevat Açıkalın Cad. Tozkoparan Mah.",
      "addressLocality": "Güngören",
      "addressRegion": "İstanbul",
      "postalCode": "34173",
      "addressCountry": "TR"
    },
    "sameAs": ["https://www.instagram.com/embayyapi/"],
    "areaServed": ["Güngören", "Bağcılar", "Bakırköy", "Zeytinburnu", "Merter", "İstanbul Avrupa Yakası"]
  }
  </script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; line-height: 1.6; }
    header, footer { background: #1e293b; padding: 1.5rem; text-align: center; }
    .container { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
    .btn { display: inline-block; background: #eab308; color: #0f172a; font-weight: bold; padding: 0.8rem 1.5rem; border-radius: 8px; text-decoration: none; margin: 0.5rem 0.25rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .interlink { background: #0284c7; color: white; padding: 0.75rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; }
  </style>
</head>
<body>
  <header>
    <h1>Şahin Manitou Kiralama</h1>
    <p>İstanbul Avrupa Yakası Teleskopik Yükleyici & Şantiye Malzeme İndirme</p>
    <a href="tel:05314362904" class="btn">📞 0531 436 29 04</a>
    <a href="/" class="interlink">🏢 Embay Yapı İnşaat Taahhüt</a>
  </header>

  <main class="container">
    <section class="card">
      <h2>İstanbul Güngören Kiralık Manitou Hizmetlerimiz</h2>
      <p>Şahin Manitou Kiralama olarak; Güngören, Tozkoparan, Bağcılar, Bakırköy ve tüm Avrupa Yakası şantiyelerinde 14-18 metre bom erişimli teleskopik yükleyici temini sağlıyoruz.</p>
      <ul>
        <li>Tırdan paletli tuğla, ytong, seramik ve çimento indirme</li>
        <li>Dar sokaklarda 4-5. katlara doğrudan malzeme sevkiyatı</li>
        <li>Operatörlü veya operatörsüz saatlik/günlük esnek çalışma</li>
      </ul>
      <p><strong>Kurumsal Çatımız:</strong> Firmamız aynı zamanda <strong>Embay Yapı</strong> bünyesinde konut inşaatları ve kentsel dönüşüm taahhütleri üstlenmektedir. <a href="/">Embay Yapı projelerini incelemek için tıklayın &rarr;</a></p>
    </section>
  </main>

  <footer>
    <p>📍 Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul 34173</p>
    <p>İletişim & Fiyat Teklifi: 0531 436 29 04 | <a href="/" style="color:#eab308;">Embay Yapı Ana Sayfa</a></p>
  </footer>
</body>
</html>`;

  // Official Instagram Embed Block
  const officialIgEmbed = `<!-- Instagram Resmi Embed Kodu (Örnek Şantiye Gönderisi için) -->
<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/embayyapi/" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:12px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%;">
  <div style="padding:16px;">
    <a href="https://www.instagram.com/embayyapi/" target="_blank" rel="noopener" style="background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;">
      <p style="color:#000; font-family:Arial,sans-serif; font-size:14px; line-height:17px; font-weight:bold;">
        Embay Yapı & Şahin Manitou Şantiye Paylaşımları (@embayyapi)
      </p>
      <p style="color:#8c8c8c; font-family:Arial,sans-serif; font-size:12px; line-height:14px;">
        Instagram'da Gör &rarr;
      </p>
    </a>
  </div>
</blockquote>
<script async src="//www.instagram.com/embed.js"></script>`;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/30 mb-2">
              <Globe className="w-3.5 h-3.5" />
              Google Kurallarına %100 Uyumlu Site Mimarisi
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              2 Ana Sayfalı Site Mimarisi, Search Console & Instagram Entegrasyonu
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Tek sayfa yerine <strong>İnşaat (Embay Yapı)</strong> ve <strong>İş Makinesi (Şahin Manitou)</strong> olarak 2 ayrı URL yapıldığında Google botları arama niyetini (search intent) çok daha net anlar ve sıralama yükselir.
            </p>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'architecture' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Bilgi Mimarisi & İç Linkler
          </button>
          <button
            onClick={() => setActiveTab('page1')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'page1' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
            Sayfa 1: İnşaat (/)
          </button>
          <button
            onClick={() => setActiveTab('page2')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'page2' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
            Sayfa 2: Manitou (/manitou)
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'embed' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Instagram className="w-3.5 h-3.5 text-pink-400" />
            Instagram Embed Kodu
          </button>
          <button
            onClick={() => setActiveTab('searchconsole')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'searchconsole' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            Search Console Rehberi
          </button>
        </div>
      </div>

      {/* 1. MİMARİ & İÇ LİNKLEME */}
      {activeTab === 'architecture' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Neden 2 Sayfa Olmalı? (Google Arama Mantığı)
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Google arama motorunda "kiralık manitou" arayan bir müteahhit doğrudan iş makinesi özelliklerini, bom yüksekliğini ve malzeme indirme detaylarını görmek ister. 
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              "Güngören kentsel dönüşüm" veya "konut inşaatı" arayan mülk sahibi ise mühendislik kadrosunu ve bina projelerini görmek ister. Bu iki hizmeti 2 ayrı URL'ye ayırıp birbirine iç link (internal link) verdiğimizde Google iki kelimede de sitenizi ilk sıralara çıkarır.
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-amber-300">
                <span>Sayfa 1: <code>/</code> (Ana Sayfa)</span>
                <span>Embay Yapı / Konut İnşaatı</span>
              </div>
              <div className="flex justify-between items-center text-emerald-300">
                <span>Sayfa 2: <code>/manitou</code></span>
                <span>Şahin Manitou Kiralama</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              İç Linkleme (Cross-Linking) Stratejisi
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="p-2 rounded bg-slate-950 border border-slate-800">
                <strong>İnşaat Sayfasından &rarr; Manitou'ya:</strong> "Projelerimizdeki katlara malzeme verme işlerini kendi bünyemizdeki <em>Şahin Manitou</em> filosuyla yürütmekteyiz." (Link metni: /manitou)
              </li>
              <li className="p-2 rounded bg-slate-950 border border-slate-800">
                <strong>Manitou Sayfasından &rarr; İnşaat'a:</strong> "Şahin Manitou kiralama firmamız aynı zamanda <em>Embay Yapı</em> konut ve kentsel dönüşüm çatısı altındadır." (Link metni: /)
              </li>
            </ul>

            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300">
              ✅ Bu sayede hem iki marka birbirini besler hem de Google botları sitenin iki sayfası arasında otorite (PageRank) aktarır.
            </div>
          </div>
        </div>
      )}

      {/* 2. SAYFA 1: İNŞAAT HTML */}
      {activeTab === 'page1' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase">Sayfa 1: Ana Sayfa / İnşaat (index.html)</span>
              <h3 className="text-base font-bold text-white">Embay Yapı Konut İnşaatı & Kentsel Dönüşüm</h3>
            </div>
            <button
              onClick={() => handleCopy('page1-code', page1Html)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'page1-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'page1-code' ? 'HTML Kopyalandı!' : 'Tam HTML Kodunu Kopyala'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300/90 overflow-x-auto max-h-96 leading-relaxed select-all">
            {page1Html}
          </pre>
        </div>
      )}

      {/* 3. SAYFA 2: MANITOU HTML */}
      {activeTab === 'page2' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase">Sayfa 2: Kiralık Manitou (manitou.html)</span>
              <h3 className="text-base font-bold text-white">Şahin Manitou Kiralama & Katlara Yük Verme</h3>
            </div>
            <button
              onClick={() => handleCopy('page2-code', page2Html)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'page2-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'page2-code' ? 'HTML Kopyalandı!' : 'Tam HTML Kodunu Kopyala'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-96 leading-relaxed select-all">
            {page2Html}
          </pre>
        </div>
      )}

      {/* 4. INSTAGRAM EMBED KODU */}
      {activeTab === 'embed' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold text-pink-400 uppercase">Resmi Meta/Instagram Embed Standardı</span>
              <h3 className="text-base font-bold text-white">Sitede Gerçek Instagram Gönderilerini Gösterme</h3>
            </div>
            <button
              onClick={() => handleCopy('ig-embed', officialIgEmbed)}
              className="px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'ig-embed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'ig-embed' ? 'Kopyalandı!' : 'Embed Kodunu Kopyala'}
            </button>
          </div>

          <p className="text-xs text-slate-300">
            Instagram API anahtarı olmadan sahte feed kurmak Google spam politikalarına ve Instagram kurallarına aykırıdır. En temiz ve resmi yöntem, Meta'nın resmi <code>embed.js</code> kütüphanesini kullanarak @embayyapi profil veya gönderilerini siteye eklemektir.
          </p>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-pink-300 overflow-x-auto leading-relaxed select-all">
            {officialIgEmbed}
          </pre>
        </div>
      )}

      {/* 5. GOOGLE SEARCH CONSOLE REHBERİ */}
      {activeTab === 'searchconsole' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-cyan-400 uppercase">Google Arama Motoru Taraması</span>
            <h3 className="text-base font-bold text-white">Google Search Console 4 Adımlı Mini Kurulum</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400">1. Adım: Mülk Ekleme (URL Ön Eki)</span>
              <p className="text-xs text-slate-300">
                search.google.com/search-console adresine gidin. "URL ön eki" seçeneğine <code>https://sahin-manitou-kiralama.vercel.app/</code> adresinizi yapıştırın.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400">2. Adım: HTML Etiketiyle Doğrulama</span>
              <p className="text-xs text-slate-300">
                "HTML Etiketi" yöntemini seçin. Size vereceği <code>&lt;meta name="google-site-verification" content="..." /&gt;</code> kodunu sitenizin &lt;head&gt; alanına ekleyip "Doğrula"ya basın.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-blue-400">3. Adım: Site Haritası (Sitemap) Gönderme</span>
              <p className="text-xs text-slate-300">
                Sol menüden "Site Haritaları"na (Sitemaps) tıklayın. Kutuya <code>sitemap.xml</code> yazıp gönderin. İki sayfanız da anında taranma kuyruğuna alınır.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-purple-400">4. Adım: Dizine Eklenmesini İste (Hızlı İndeks)</span>
              <p className="text-xs text-slate-300">
                En üstteki arama çubuğuna site URL'nizi yapıştırıp Enter'a basın, ardından <strong>"Dizine Eklenmesini İste"</strong> butonuna tıklayın. 24-48 saat içinde Google aramalarına düşer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
