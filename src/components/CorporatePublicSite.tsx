import { useState } from 'react';
import { 
  Building2, 
  Truck, 
  Phone, 
  MessageSquare, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Instagram, 
  Clock, 
  HardHat, 
  Layers, 
  ChevronDown, 
  ExternalLink,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

export function CorporatePublicSite() {
  // Current active view: 'construction' (/) or 'manitou' (/manitou)
  const [activePage, setActivePage] = useState<'construction' | 'manitou'>('construction');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // WhatsApp click generator
  const getWhatsAppUrl = (msg: string) => {
    return `https://api.whatsapp.com/send?phone=905314362904&text=${encodeURIComponent(msg)}`;
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen(faqOpen === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP HEADER / BRAND BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-md">
              {activePage === 'construction' ? 'E' : 'Ş'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  {activePage === 'construction' ? 'EMBAY YAPI' : 'ŞAHİN MANİTOU'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  {activePage === 'construction' ? 'GÜNGÖREN' : 'KİRALAMA'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {activePage === 'construction' 
                  ? 'Konut İnşaatı & Kentsel Dönüşüm Taahhüt' 
                  : 'Teleskopik Yükleyici & Şantiye Sevkiyatı'}
              </p>
            </div>
          </div>

          {/* Center 2-Page Switch Tabs (Desktop) */}
          <nav className="hidden md:flex items-center p-1.5 rounded-full bg-slate-100 border border-slate-200">
            <button
              onClick={() => { setActivePage('construction'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activePage === 'construction'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              1. Sayfa: Embay Yapı (İnşaat)
            </button>
            <button
              onClick={() => { setActivePage('manitou'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activePage === 'manitou'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              2. Sayfa: Şahin Manitou (Kiralama)
            </button>
          </nav>

          {/* Direct Contact CTAs */}
          <div className="hidden sm:flex items-center gap-2.5">
            <a
              href="tel:05314362904"
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:border-emerald-600 text-slate-800 hover:text-emerald-700 font-bold text-xs flex items-center gap-2 transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span>0531 436 29 04</span>
            </a>
            <a
              href={getWhatsAppUrl(activePage === 'construction' ? 'Selamünaleyküm, Embay Yapı konut inşaatı ve kentsel dönüşüm hakkında bilgi almak istiyorum.' : 'Selamünaleyküm, kiralık Manitou teklifi almak istiyorum.')}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Teklif</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Page Switch Bar */}
        <div className="md:hidden grid grid-cols-2 border-t border-slate-100 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => { setActivePage('construction'); setMobileMenuOpen(false); }}
            className={`py-3 text-center border-r border-slate-200 transition ${
              activePage === 'construction' ? 'bg-white text-emerald-800 font-extrabold border-b-2 border-emerald-700' : 'text-slate-600'
            }`}
          >
            🏗️ Embay Yapı (İnşaat)
          </button>
          <button
            onClick={() => { setActivePage('manitou'); setMobileMenuOpen(false); }}
            className={`py-3 text-center transition ${
              activePage === 'manitou' ? 'bg-white text-emerald-800 font-extrabold border-b-2 border-emerald-700' : 'text-slate-600'
            }`}
          >
            🚜 Şahin Manitou (Kiralama)
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT: PAGE 1 (CONSTRUCTION) VS PAGE 2 (MANITOU) */}
      <main className="flex-1">
        {activePage === 'construction' ? (
          /* ======================================================== */
          /* SAYFA 1: EMBAY YAPI (KONUT İNŞAATI & KENTSEL DÖNÜŞÜM)     */
          /* ======================================================== */
          <div className="space-y-16 py-10">
            {/* Hero Section */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="rounded-3xl bg-slate-50 border border-slate-200/80 p-6 sm:p-12 relative overflow-hidden">
                <div className="max-w-3xl space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    İstanbul Güngören Tozkoparan Merkezli Taahhüt
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                    Deprem Yönetmeliğine Uygun <span className="text-emerald-700">Modern Konut İnşaatı</span> & Kentsel Dönüşüm
                  </h1>

                  <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                    Embay Yapı olarak Güngören, Tozkoparan ve İstanbul genelinde sağlam zemin etütleri, kaliteli yapı malzemeleri ve deprem yönetmeliğine tam uyumlu anahtar teslim konut projeleri üretiyoruz.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <a
                      href="tel:05314362904"
                      className="px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center gap-2 shadow-md transition"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Projeler & Keşif İçin Arayın</span>
                    </a>
                    <a
                      href={getWhatsAppUrl('Selamünaleyküm, Güngören Embay Yapı kentsel dönüşüm ve kat karşılığı inşaat hakkında bilgi almak istiyorum.')}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3.5 rounded-xl bg-white border border-slate-300 hover:border-emerald-600 text-slate-800 font-bold text-sm flex items-center gap-2 transition"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-700" />
                      <span>WhatsApp Bilgi Hattı</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-4 pt-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-700" /> Anahtar Teslim Taahhüt</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-700" /> Kat Karşılığı Sözleşme</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-700" /> Özmal İş Makinesi Gücü</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Hizmet Alanları */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Hizmetlerimiz</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Güvenli Yapılar, Hızlı Teslimat</h2>
                <p className="text-slate-600 text-sm">
                  Güngören'in zemin ve sokak koşullarını bilen tecrübeli inşaat ekibimizle projelerinizi zamanında tamamlıyoruz.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Kentsel Dönüşüm & Bina Yenileme</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Eski, riskli binalarınızı yerinde tespit ediyor; deprem yönetmeliğine uygun, modern ve güvenli yaşam alanlarına dönüştürüyoruz.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Kat Karşılığı Konut Yapımı</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Arsa ve mülk sahipleriyle hakkaniyetli, şeffaf kat karşılığı sözleşmelerle birinci sınıf malzeme ve modern mimariyi buluşturuyoruz.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Kendi İş Makinesi Gücümüz</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Şahin Manitou bünyesindeki teleskopik yükleyicilerimiz sayesinde inşaat sahalarımızda malzeme indirme ve katlara sevkiyat hız kesmeden yürütülür.
                  </p>
                </div>
              </div>
            </section>

            {/* Diğer Sayfaya Geçiş Bannerı */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="p-8 rounded-2xl bg-emerald-800 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="space-y-2 text-center md:text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">İş Makinesi Hizmetimiz</span>
                  <h3 className="text-xl sm:text-2xl font-black">Şantiyeniz İçin Teleskopik Yükleyici mi Lazım?</h3>
                  <p className="text-emerald-100 text-sm max-w-xl">
                    Şahin Manitou olarak tırdan malzeme indirme ve doğrudan kat tabliyelerine palet verme hizmeti sunuyoruz.
                  </p>
                </div>

                <button
                  onClick={() => { setActivePage('manitou'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-6 py-3.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Şahin Manitou Sayfasına Geç</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          </div>
        ) : (
          /* ======================================================== */
          /* SAYFA 2: ŞAHİN MANİTOU (KİRALIK TELESKOPİK YÜKLEYİCİ)   */
          /* ======================================================== */
          <div className="space-y-16 py-10">
            {/* Hero Section */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="rounded-3xl bg-slate-50 border border-slate-200/80 p-6 sm:p-12 relative overflow-hidden">
                <div className="max-w-3xl space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                    <Truck className="w-3.5 h-3.5 text-emerald-700" />
                    İstanbul Güngören & Avrupa Yakası Manitou Kiralama
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                    Kiralık Manitou <span className="text-emerald-700">(Teleskopik Yükleyici)</span>
                  </h1>

                  <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                    Mobil vinçlerin yanaşamadığı dar sokaklarda ve kentsel dönüşüm şantiyelerinde tır üzerinden paletli tuğla, ytong, harç ve seramik indirme; doğrudan kat balkonlarına sıfır zayiatla teslimat.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <a
                      href="tel:05314362904"
                      className="px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center gap-2 shadow-md transition"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Net Fiyat Teklifi İçin Ara: 0531 436 29 04</span>
                    </a>
                    <a
                      href={getWhatsAppUrl('Selamünaleyküm, şantiyemize kiralık Manitou teklifi almak istiyorum.')}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3.5 rounded-xl bg-white border border-slate-300 hover:border-emerald-600 text-slate-800 font-bold text-sm flex items-center gap-2 transition"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-700" />
                      <span>WhatsApp İle Teklif Al</span>
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-700" /> Saatlik / Günlük / Proje Bazlı</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-700" /> Deneyimli Operatörlü</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-700" /> Sabit Liste Yok, İşe Özel Net Fiyat</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Manitou Avantajları */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Neden Teleskopik Yükleyici?</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Dar Sokakta Vinçten Hızlı, İskeleden Güvenli</h2>
                <p className="text-slate-600 text-sm">
                  Günlerce sürebilecek beden gücüyle malzeme taşımayı saatler içinde sıfır kırık ve zayiatla çözüyoruz.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Tırdan Doğrudan Kat Balkonuna</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Paletli malzemeleri yere indirmeden doğrudan çalışılacak katın tabliyesine veya balkonuna emniyetle uzatıyoruz.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Dar Sokak Manevra Kabiliyeti</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    4 tekerden yönlendirmeli çevik şasi yapısıyla Tozkoparan, Güngören ve Bağcılar'ın en dar çıkmaz sokaklarında bile rahatça konumlanır.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
                    <HardHat className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Şantiye Tecrübeli Operatör</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Zorlu şantiye koşullarında binlerce saat yük kaldırma tecrübesine sahip operatörlerimizle iş güvenliği tavizsiz sağlanır.
                  </p>
                </div>
              </div>
            </section>

            {/* SSS (FAQ) Bölümü */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-8">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Merak Edilenler</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Sıkça Sorulan Sorular</h2>
              </div>

              <div className="space-y-3">
                {[
                  {
                    q: 'Şahin Manitou Kiralama hangi bölgelere hizmet veriyor?',
                    a: 'Merkezimiz Güngören Tozkoparan’da olup Bağcılar, Bakırköy, Merter, Zeytinburnu, Başakşehir ve tüm İstanbul Avrupa Yakası şantiyelerine sevk sağlıyoruz.'
                  },
                  {
                    q: 'Manitou kiralama fiyatları nasıl belirlenir? Sabit liste var mı?',
                    a: 'Şantiyenin konumu, çalışılacak süre (saatlik / günlük) ve yapılacak işin niteliğine göre değiştiği için sabit liste yerine işinize özel en uygun net teklifi veriyoruz: 0531 436 29 04.'
                  },
                  {
                    q: 'Operatör temin ediyor musunuz?',
                    a: 'Evet. Tüm makinelerimiz zorlu şantiye tecrübesine sahip deneyimli operatörlerimiz eşliğinde sevk edilir.'
                  },
                  {
                    q: 'Dar sokaklardaki kentsel dönüşüm binalarında malzeme verebiliyor musunuz?',
                    a: 'Evet, teleskopik yükleyicilerimiz mobil vincin yanaşamadığı dar sokaklarda manevra yaparak tırdan kat tabliyelerine palet aktarımı için en uygun makinedir.'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-4 text-left font-bold text-sm text-slate-800 flex items-center justify-between cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${faqOpen === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {faqOpen === idx && (
                      <div className="p-4 pt-0 text-xs sm:text-sm text-slate-600 border-t border-slate-100 bg-slate-50/50 leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {/* CANLI INSTAGRAM @embayyapi ŞANTİYE VİTRİNİ & ÖNİZLEME */}
        <section className="mt-16 rounded-3xl border border-pink-100 bg-gradient-to-b from-pink-50/40 via-white to-white p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold mb-2">
                <Instagram className="w-3.5 h-3.5" />
                <span>Canlı Instagram Şantiye Akışı: @embayyapi</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Şantiyelerimizden Güncel Fotoğraf & Reels Videoları
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-1">
                Tozkoparan ve çevre ilçelerdeki kentsel dönüşüm, C35 beton dökümleri ve Manitou dar sokak sevkiyatlarını anlık takip edin.
              </p>
            </div>

            <a
              href="https://www.instagram.com/embayyapi?stkn=c2tsMjF1aHN1dzg2"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 hover:opacity-95 transition shrink-0"
            >
              <Instagram className="w-4 h-4" />
              <span>Instagram'da Takip Et (@embayyapi)</span>
            </a>
          </div>

          {/* 4'lü Gerçekçi Instagram Gönderi Grid Önizlemesi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div className="aspect-square bg-slate-900 relative flex flex-col items-center justify-center p-4 text-center text-white">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-pink-600 text-[10px] font-bold">REELS</div>
                <span className="text-3xl mb-2">🚜</span>
                <span className="font-black text-xs">VİNÇ GİREMEZ DEDİLER!</span>
                <span className="text-[11px] text-slate-400 mt-1">Tozkoparan Dar Sokak Sevkiyatı</span>
              </div>
              <div className="p-3 text-xs text-slate-700 space-y-1">
                <span className="font-bold block text-slate-900">@embayyapi</span>
                <p className="line-clamp-2 text-slate-500">Tırdan aldık, 4. kata sıfır zayiatla verdik. Dar sokaklar bizim işimiz.</p>
                <span className="text-[10px] text-pink-600 font-bold block pt-1">#manitoukiralama #tozkoparan</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div className="aspect-square bg-emerald-950 relative flex flex-col items-center justify-center p-4 text-center text-white">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-[10px] font-bold">PROJE</div>
                <span className="text-3xl mb-2">🏗️</span>
                <span className="font-black text-xs">C35 RADYE TEMEL ATILDI</span>
                <span className="text-[11px] text-emerald-300 mt-1">Güngören Modern Dönüşüm</span>
              </div>
              <div className="p-3 text-xs text-slate-700 space-y-1">
                <span className="font-bold block text-slate-900">@embayyapi</span>
                <p className="line-clamp-2 text-slate-500">Statik hesaptan taviz yok. Deprem yönetmeliğine tam uyumlu yeni yuvalar yükseliyor.</p>
                <span className="text-[10px] text-emerald-700 font-bold block pt-1">#kentseldönüşüm #embayyapi</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div className="aspect-square bg-slate-950 relative flex flex-col items-center justify-center p-4 text-center text-white">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-600 text-[10px] font-bold">BÜLTEN</div>
                <span className="text-3xl mb-2">📊</span>
                <span className="font-black text-xs">HAFTANIN ŞANTİYE ENLERİ</span>
                <span className="text-[11px] text-amber-300 mt-1">142 Palet Malzeme Sevk Edildi</span>
              </div>
              <div className="p-3 text-xs text-slate-700 space-y-1">
                <span className="font-bold block text-slate-900">@embayyapi</span>
                <p className="line-clamp-2 text-slate-500">Haftalık inşaat demiri piyasa raporumuz ve biten şantiye etaplarımız yayında!</p>
                <span className="text-[10px] text-blue-600 font-bold block pt-1">#şantiyebülteni #finans</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div className="aspect-square bg-amber-950 relative flex flex-col items-center justify-center p-4 text-center text-white">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-purple-600 text-[10px] font-bold">MEME</div>
                <span className="text-3xl mb-2">😂</span>
                <span className="font-black text-xs">ŞANTİYE GERÇEKLERİ</span>
                <span className="text-[11px] text-amber-300 mt-1">Vinç Sokağa Sığmayınca...</span>
              </div>
              <div className="p-3 text-xs text-slate-700 space-y-1">
                <span className="font-bold block text-slate-900">@embayyapi</span>
                <p className="line-clamp-2 text-slate-500">Güngören sokaklarında şantiye yönetmek sabır işidir. Çözüm: Şahin Manitou!</p>
                <span className="text-[10px] text-fuchsia-600 font-bold block pt-1">#şantiyemizahı #inşaat</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* 3. KURUMSAL FOOTER (NAP TUTARLILIĞI) */}
      <footer className="border-t border-slate-200 bg-slate-50 py-10 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs text-slate-600">
            {/* Col 1 */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900">Embay Yapı & Şahin Manitou Kiralama</span>
              </div>
              <p className="text-slate-500 max-w-md leading-relaxed">
                İstanbul Güngören Tozkoparan merkezli olarak deprem yönetmeliğine uygun konut inşaatı, kentsel dönüşüm taahhüt ve profesyonel teleskopik yükleyici kiralama hizmetleri sunuyoruz.
              </p>
              <div className="flex items-center gap-2 text-slate-700 font-semibold pt-1">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{BUSINESS_INFO.address}</span>
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider block">Sayfalar</span>
              <ul className="space-y-1.5">
                <li>
                  <button 
                    onClick={() => { setActivePage('construction'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-emerald-700 cursor-pointer font-medium"
                  >
                    🏗️ Embay Yapı (Konut İnşaatı)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { setActivePage('manitou'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-emerald-700 cursor-pointer font-medium"
                  >
                    🚜 Şahin Manitou (Kiralama)
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider block">Doğrudan İletişim</span>
              <p className="font-bold text-slate-900 text-sm">
                <a href="tel:05314362904" className="hover:text-emerald-700">0531 436 29 04</a>
              </p>
              <p className="text-slate-500">Çalışma Saatleri: 7/24 Şantiye Sevkiyatı</p>
              <div className="pt-2">
                <a
                  href="https://instagram.com/embayyapi"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-pink-600 font-bold hover:underline"
                >
                  <Instagram className="w-4 h-4" />
                  <span>@embayyapi</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>© 2026 Embay Yapı & Şahin Manitou Kiralama. Tüm hakları saklıdır.</span>
            <div className="flex items-center gap-4">
              <span>📍 Güngören / İstanbul</span>
              <span>•</span>
              <span>Sabit Fiyat Yok, İşe Özel Net Teklif</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 4. MOBİL FLOATING HIZLI ARAMA & WHATSAPP ÇUBUĞU */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 sm:hidden z-50 flex items-center gap-2 shadow-2xl">
        <a
          href="tel:05314362904"
          className="flex-1 py-3 px-3 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/30"
        >
          <Phone className="w-4 h-4" />
          <span>Hemen Ara (0531 436 29 04)</span>
        </a>
        <a
          href={getWhatsAppUrl(activePage === 'construction' ? 'Selamünaleyküm, Embay Yapı inşaat projeleriniz için bilgi almak istiyorum.' : 'Selamünaleyküm, kiralık Manitou teklifi almak istiyorum.')}
          target="_blank"
          rel="noreferrer"
          className="py-3 px-4 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300 flex items-center gap-1.5"
        >
          <MessageSquare className="w-4 h-4 text-emerald-800" />
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
