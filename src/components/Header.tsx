import { useState } from 'react';
import { Phone, Instagram, Globe, MapPin, Copy, Check, ShieldCheck, Flame } from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [copiedNap, setCopiedNap] = useState(false);

  const copyNapData = () => {
    const text = `İşletme Adı: ${BUSINESS_INFO.name}\nTelefon: ${BUSINESS_INFO.phone}\nAdres: ${BUSINESS_INFO.address}\nWeb: ${BUSINESS_INFO.website}\nInstagram: ${BUSINESS_INFO.instagram}`;
    navigator.clipboard.writeText(text);
    setCopiedNap(false);
    setTimeout(() => setCopiedNap(true), 10);
    setTimeout(() => setCopiedNap(false), 2500);
  };

  const navItems = [
    { id: 'gbp', label: '1. Google GBP & Yerel SEO' },
    { id: 'feasibility', label: '📐 2. Ada/Parsel Sorgu & Mimari Fizibilite' },
    { id: 'contracts', label: '📑 3. Şantiye İSG & Hukuki Sözleşmeler' },
    { id: 'creative', label: '🎨 4. Esprili Meme, Çevreci Kimlik & Özel Günler' },
    { id: 'executive', label: '⭐ 5. Yönetici Komuta, Günlük Bülten & AI Bot' },
    { id: 'hunter', label: '6. Şantiye Avcısı & İş Bulma' },
    { id: 'reels', label: '7. Viral Reels & Video Senaryoları' },
    { id: 'leads', label: '8. Şantiye & İş Takip CRM' },
    { id: 'quote', label: '9. 30sn Teklif & WhatsApp' },
    { id: 'twopage', label: '10. 2-Sayfalı Site & Search Console' },
    { id: 'districts', label: '11. İlçe Pazar Alanları (SEO)' },
    { id: 'instagram', label: '12. Instagram & Post Rehberi' },
    { id: 'calendar', label: '13. Haftalık İçerik Planı' },
    { id: 'website', label: '14. Web Site SEO & Schema' },
    { id: 'generator', label: '15. Anlık Şantiye Post Üretici' },
    { id: 'boundaries', label: '16. Görev & Sorumluluklar' }
  ];

  return (
    <header className="border-b border-amber-500/20 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner Alert */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 px-4 py-1.5 text-xs text-slate-950 font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-slate-950 animate-pulse" />
          <span>BİRİNCİ ÖNCELİK: Google’da "Kiralık Manitou" & "İnşaat Güngören" Aramalarında 1. Sıraya Çıkış Stratejisi</span>
        </div>
        <div className="flex items-center gap-3 text-slate-900 text-xs">
          <span>📍 NAP Kuralı: %100 Tutarlı Bilgi</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">🚫 Yapay AI Stok Görsel Yasak, Gerçek Saha Fotoğrafları Şart</span>
        </div>
      </div>

      {/* Main Header Information */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xl shadow-lg shadow-amber-500/20">
                🚜
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  ŞAHİN MANİTOU & EMBAY YAPI
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Dijital Kokpit
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Google Haritalar, Organik SEO, Instagram Keşfet & Haftalık Pazar Alanı Yönetim Masası
                </p>
              </div>
            </div>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <a
              href={`tel:${BUSINESS_INFO.phoneRaw}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition-colors shadow-md shadow-emerald-950/40"
            >
              <Phone className="w-4 h-4" />
              <span>{BUSINESS_INFO.phone}</span>
            </a>

            <a
              href={BUSINESS_INFO.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-400 border border-pink-500/20 text-xs sm:text-sm font-medium transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span>{BUSINESS_INFO.instagram}</span>
            </a>

            <a
              href={BUSINESS_INFO.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/20 text-xs sm:text-sm font-medium transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden md:inline">Vercel Sitesi</span>
            </a>

            <button
              onClick={copyNapData}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              title="Her yerde aynı olması gereken İsim, Adres, Telefon (NAP) verisini kopyalar"
            >
              {copiedNap ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>NAP Verisini Kopyala</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Address Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{BUSINESS_INFO.address}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fiyatlandırma İlkesi: Sabit liste yok — şantiye lokasyonu ve süreye özel net teklif</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-4 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === item.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
