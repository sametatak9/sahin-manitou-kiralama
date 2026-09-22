import { useState } from 'react';
import { MapPin, Copy, Check, Sparkles, Send, Globe } from 'lucide-react';
import { DISTRICT_LANDING_PAGES, BUSINESS_INFO } from '../data/marketingData';

export function DistrictPagesSection() {
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICT_LANDING_PAGES[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/30 mb-2">
              <MapPin className="w-3.5 h-3.5" />
              İlçe & Bölge Bazlı Yerel Hakimiyet (Local SEO Pazar Alanı)
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              İstanbul İlçe İlçe Manitou Kiralama & İnşaat Sayfaları
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Google'da sadece "kiralık manitou" aratanlar değil, "kiralık manitou Bağcılar" veya "Merter palet indirme" gibi nokta atışı arama yapan müteahhitleri yakalayarak doğrudan iş bağlamanızı sağlar.
            </p>
          </div>
        </div>

        {/* District Selector Pill Buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
          {DISTRICT_LANDING_PAGES.map((d, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDistrict(d)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedDistrict.district === d.district
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 scale-[1.02]'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {d.district}
            </button>
          ))}
        </div>
      </div>

      {/* Selected District Content Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Main SEO Page Text */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {selectedDistrict.district} İçin Web Sayfası / İlan Metni
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">{selectedDistrict.title}</h3>
            </div>
            <button
              onClick={() => handleCopy('page-text', `${selectedDistrict.title}\n\n${selectedDistrict.h2}\n\n${selectedDistrict.description}\n\nİletişim: ${BUSINESS_INFO.phone}\nAdres: ${BUSINESS_INFO.address}\nWeb: ${BUSINESS_INFO.website}`)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedKey === 'page-text' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'page-text' ? 'Kopyalandı!' : 'Metni Kopyala'}
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-medium">Bölgesel Odak & Zorluk:</span>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-amber-300 font-semibold">
              🎯 {selectedDistrict.focus}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-medium">Alt Başlık (H2):</span>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-bold">
              {selectedDistrict.h2}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-medium">Sayfa Açıklama & Satış Metni:</span>
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed select-all">
              {selectedDistrict.description}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
            {selectedDistrict.tags.map((t, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-pink-300 font-mono">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Localized GBP & Social Post Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Hazır Yerel Gönderi (Google GBP / WhatsApp)
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  Bu İlçede Çalışırken Paylaşılacak Metin
                </h3>
              </div>
              <button
                onClick={() => handleCopy('loc-post', `📍 ${selectedDistrict.district} şantiyelerimizden kareler! 🚜🏗️\n\n${selectedDistrict.description}\n\n📞 Hemen arayın, projenize özel net fiyat teklifi alın: ${BUSINESS_INFO.phone}\nAdres: ${BUSINESS_INFO.address}\nWeb: ${BUSINESS_INFO.website}\nTakip: ${BUSINESS_INFO.instagram}\n\n${selectedDistrict.tags.join(' ')}`)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedKey === 'loc-post' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'loc-post' ? 'Kopyalandı!' : 'Gönderiyi Kopyala'}
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed select-all my-3">
              {`📍 ${selectedDistrict.district} şantiyelerimizden kareler! 🚜🏗️\n\n${selectedDistrict.description}\n\n📞 Hemen arayın, projenize özel net fiyat teklifi alın: ${BUSINESS_INFO.phone}\nAdres: ${BUSINESS_INFO.address}\nWeb: ${BUSINESS_INFO.website}\nTakip: ${BUSINESS_INFO.instagram}\n\n${selectedDistrict.tags.join(' ')}`}
            </div>
          </div>

          <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-3 text-xs text-slate-300">
            <strong className="text-amber-400 block mb-1">🔍 Google Algoritma İpucu:</strong>
            Müteahhit Google'da <em>"{selectedDistrict.seoKeywords}"</em> yazdığında bu metinler sayesinde Google Haritalar profiliniz ilk sıralara yerleşir.
          </div>
        </div>
      </div>
    </div>
  );
}
