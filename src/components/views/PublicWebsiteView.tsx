import React, { useState } from 'react';
import {
  Phone,
  MessageCircle,
  Building2,
  Truck,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowRight,
  HardHat,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface PublicWebsiteViewProps {
  onLeadSubmitted: (leadData: {
    name: string;
    phone: string;
    companyName: string;
    serviceType: string;
    notes: string;
  }) => void;
}

export const PublicWebsiteView: React.FC<PublicWebsiteViewProps> = ({ onLeadSubmitted }) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'EMBAY' | 'MANITOU'>('ALL');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [serviceType, setServiceType] = useState('18 Metre Manitou Kiralama');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const PHONE_DISPLAY = '0531 436 29 04';
  const PHONE_CLEAN = '05314362904';
  const WHATSAPP_URL = `https://wa.me/90${PHONE_CLEAN}?text=${encodeURIComponent('Merhaba Embay Yapı & Şahin Manitou, şantiyem için bilgi ve teklif almak istiyorum.')}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    onLeadSubmitted({
      name: fullName,
      phone,
      companyName: companyName || 'Bireysel / Şantiye',
      serviceType,
      notes: notes || 'Web sitesi teklif formu üzerinden doğrudan iletildi.'
    });

    setIsSuccess(true);
    setTimeout(() => {
      setFullName('');
      setPhone('');
      setCompanyName('');
      setNotes('');
      setIsSuccess(false);
    }, 3500);
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 pb-20">
      {/* Top Banner with Direct Call */}
      <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>İstanbul Güngören & Trakya Geneli Kesintisiz Şantiye Desteği</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={`tel:${PHONE_CLEAN}`} className="flex items-center gap-1.5 hover:underline font-bold">
              <Phone className="w-3.5 h-3.5" />
              <span>{PHONE_DISPLAY}</span>
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Bilgi Hattı</span>
            </a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Güngören Tozkoparan & İstanbul Şantiye Çözümleri</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Deprem Yönetmeliğine Uygun Konut & 14m - 18m Manitou Kiralama
            </h1>

            <p className="text-base sm:text-lg text-slate-600 mt-4 leading-relaxed">
              <strong>Embay Yapı</strong> güvencesiyle sağlam zeminli modern kentsel dönüşüm taahhüdü;{' '}
              <strong>Şahin Manitou</strong> filosuyla şantiyelerinizde yüksek irtifa telehandler kiralama desteği.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={`tel:${PHONE_CLEAN}`}
                className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <Phone className="w-4 h-4" />
                Hemen Arayın: {PHONE_DISPLAY}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                WhatsApp ile Teklif İste
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Showcase: Dual Pillar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pillar 1: Embay Yapı */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Embay Yapı İnşaat</h2>
                <p className="text-xs text-emerald-700 font-semibold">Güngören Tozkoparan Kentsel Dönüşüm</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Tozkoparan ve çevre mahallelerde riskli binalarınız için radye jeneral temel, C35 hazır beton ve statik dayanıklılık standartlarında anahtar teslim müteahhitlik ve taahhüt hizmeti sunuyoruz.
            </p>

            <div className="space-y-2.5 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ücretsiz bina zemin etüdü ve statik keşif raporlaması</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hak sahipleri ile şeffaf sözleşme ve noter onaylı taahhüt</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zamanında teslim ve deprem yönetmeliği tam uyumu</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900">
              📍 <strong>Ofis & Şantiye Merkezi:</strong> Tozkoparan Mah. Güngören / İstanbul
            </div>
          </div>

          {/* Pillar 2: Şahin Manitou */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Şahin Manitou Kiralama</h2>
                <p className="text-xs text-amber-800 font-semibold">14m & 18m Teleskopik Yükleyici Filosu</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              İstanbul, Hadımköy, Esenyurt ve Çorlu bölgesindeki sanayi inşaatları, lojistik depolar ve cephe sandviç panel montajları için sertifikalı operatörlü ya da operatörsüz Manitou MT-X kiralama.
            </p>

            <div className="space-y-2.5 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>18 Metre Bom Uzanımı & 4.000 kg Taşıma Kapasitesi (MT-X 1840)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>14 Metre Kompakt Manevra Modelleri (MT-X 1440)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Geniş Ataşman Seçeneği: Çatal, Açılır Kova ve Güvenli Çalışma Sepeti</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-900">
              ⚡ <strong>Hızlı Şantiye Teslimi:</strong> Aynı gün lowbed ile şantiyenize sevk edilir.
            </div>
          </div>
        </div>
      </div>

      {/* Online Request Form (Pushes into Operations Panel Leads!) */}
      <div id="kesif-formu" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md shadow-slate-200/50 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
              ONLINE KEŞİF & FİYAT TEKLİFİ ALIN
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900">
              Şantiyeniz veya Binanız İçin Bilgi Bırakın
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Talebiniz anında Embay Yapı & Şahin Manitou Operasyon Merkezine iletilir ve yetkilimiz sizi 15 dakika içinde arar.
            </p>
          </div>

          {isSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold text-center flex items-center justify-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Talebiniz başarıyla alındı! Operasyon panelimize düştü, Samet Bey en kısa sürede arayacaktır.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Adınız Soyadınız *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ahmet Kaya"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Telefon Numaranız *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0532 ... veya 0531 ..."
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Şirket / Kurum (Varsa)</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Örn: Yılmaz İnşaat Ltd."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hizmet Türü</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="18 Metre Manitou Kiralama">18 Metre Manitou Kiralama</option>
                  <option value="14 Metre Manitou Kiralama">14 Metre Manitou Kiralama</option>
                  <option value="Güngören Tozkoparan Kentsel Dönüşüm Keşfi">Güngören Tozkoparan Kentsel Dönüşüm Keşfi</option>
                  <option value="Müteahhitlik & Kat Karşılığı İnşaat">Müteahhitlik & Kat Karşılığı İnşaat</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Şantiye veya Talep Detayları</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Örn: Hadımköy şantiyemize çatı paneli için 1 ay kiralık makine lazım..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
            >
              <Sparkles className="w-4 h-4" />
              Teklif Talebini İlet (Operasyon Merkezine Gönder)
            </button>
          </form>
        </div>
      </div>

      {/* Floating Bottom Sticky Bar (From screenshot 1) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-lg flex items-center justify-between max-w-lg mx-auto rounded-t-2xl sm:max-w-xl">
        <a
          href={`tel:${PHONE_CLEAN}`}
          className="flex-1 mr-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Hemen Ara ({PHONE_DISPLAY})</span>
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
};
