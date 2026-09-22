import { useState } from 'react';
import { Calculator, Send, Copy, Check, MessageSquare, PhoneCall, ShieldCheck, Clock, MapPin, Building2, Truck } from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

export function QuickQuoteCalculator() {
  const [district, setDistrict] = useState('Güngören (Tozkoparan Merkez)');
  const [duration, setDuration] = useState('Yarım Gün (1-4 Saat)');
  const [workType, setWorkType] = useState('Katlardan Palet İndirme / Malzeme Verme');
  const [operatorRequired, setOperatorRequired] = useState(true);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate customized WhatsApp proposal text
  const quoteSummary = `Sayın ${clientName ? clientName : 'Şantiye Yetkilisi'},

Görüşmemize istinaden Şahin Manitou Kiralama & Embay Yapı olarak iş teklifimiz aşağıdaki gibidir:

📍 Lokasyon: ${district}
🚜 Makine: Teleskopik Yükleyici (Manitou)
👷 Operatör Durumu: ${operatorRequired ? 'Tecrübeli Operatör Dahil' : 'Operatörsüz'}
⏱️ Süre / Kapsam: ${duration}
📦 Yapılacak İş: ${workType}
💵 Kararlaştırılan Net Teklif: ${customPrice ? `${customPrice} TL` : 'İş sahasında netleştirilecek'}

✅ İş güvenliği kurallarına tam uyum
✅ Belirtilen randevu saatinde sahada hazır sevk
📞 Doğrudan İletişim: ${BUSINESS_INFO.phone}
🌐 Web: https://sahin-manitou-kiralama.vercel.app/manitou`;

  const handleCopy = () => {
    navigator.clipboard.writeText(quoteSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`}?text=${encodeURIComponent(quoteSummary)}`
      : `https://wa.me/?text=${encodeURIComponent(quoteSummary)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/30 mb-2">
              <Calculator className="w-3.5 h-3.5" />
              Telefonda Arayan Müteahhide 30 Saniyede Teklif Gönderme
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Anlık Şantiye Teklif Oluşturucu & WhatsApp Sözleşme Kartı
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Müteahhit aradığında fiyatı havada bırakmayın. İlçeyi ve iş türünü seçip net tutarı yazın; tek tıkla resmi Şahin Manitou teklifini WhatsApp'tan ileterek işi rakiplere kaptırmadan bağlayın.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            1. Şantiye & İş Detayları
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Müşteri / Şantiye Şefi Adı</label>
              <input
                type="text"
                placeholder="Örn: Ahmet Bey (Tozkoparan Şantiyesi)"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Müşteri Telefon Numarası (WhatsApp)</label>
              <input
                type="text"
                placeholder="Örn: 0532 123 45 67"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:border-amber-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">İlçe / Bölge</label>
                <select
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 outline-none"
                >
                  <option value="Güngören (Tozkoparan Merkez)">Güngören (Tozkoparan)</option>
                  <option value="Bağcılar / Güneşli">Bağcılar / Güneşli</option>
                  <option value="Bakırköy / Ataköy / Florya">Bakırköy / Florya</option>
                  <option value="Bahçelievler / Yenibosna">Bahçelievler / Yenibosna</option>
                  <option value="Zeytinburnu / Merter">Zeytinburnu / Merter</option>
                  <option value="Başakşehir / İkitelli OSB">Başakşehir / İkitelli</option>
                  <option value="Küçükçekmece / Sefaköy">Küçükçekmece / Sefaköy</option>
                  <option value="Esenler / Bayrampaşa">Esenler / Bayrampaşa</option>
                  <option value="İstanbul Avrupa Yakası Genel">Diğer Avrupa Yakası</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Çalışma Süresi</label>
                <select
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 outline-none"
                >
                  <option value="Yarım Gün (1-4 Saat)">Yarım Gün (1-4 Saat)</option>
                  <option value="Tam Gün (8 Saat)">Tam Gün (8 Saat)</option>
                  <option value="2-3 Günlük İş">2-3 Günlük İş</option>
                  <option value="Haftalık Kiralama">Haftalık Kiralama</option>
                  <option value="Aylık / Proje Bazlı">Aylık / Proje Bazlı</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Yapılacak İş Niteliği</label>
              <select
                value={workType}
                onChange={e => setWorkType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 outline-none"
              >
                <option value="Katlardan Palet İndirme / Malzeme Verme">Katlardan Palet İndirme / Malzeme Verme</option>
                <option value="Tırdan Tuğla / Ytong Boşaltma">Tırdan Tuğla / Ytong Boşaltma</option>
                <option value="Dar Sokakta Vinç Alternatifi Yükleme">Dar Sokakta Vinç Alternatifi Yükleme</option>
                <option value="Çatı Malzemesi & Profil Kaldırma">Çatı Malzemesi & Profil Kaldırma</option>
                <option value="Konut İnşaatı Şantiye İçi Lojistik">Konut İnşaatı Şantiye İçi Lojistik</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Operatör İhtiyacı</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOperatorRequired(true)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      operatorRequired ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Operatörlü
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperatorRequired(false)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      !operatorRequired ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Operatörsüz
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kararlaştırılan Net Teklif (TL)</label>
                <input
                  type="text"
                  placeholder="Örn: 8500"
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-amber-500/50 text-xs sm:text-sm font-bold text-amber-300 focus:border-amber-400 outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview & Actions */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                2. Müşteriye Gidecek WhatsApp Metni
              </span>
              <span className="text-[11px] text-slate-400">Canlı Önizleme</span>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto mt-3">
              {quoteSummary}
            </pre>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSendWhatsApp}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                WhatsApp'tan Teklifi Gönder
              </button>

              <button
                onClick={handleCopy}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Kopyalandı' : 'Metni Kopyala'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              💡 Telefon görüşmesi biter bitmez bu mesajı attığınızda müteahhit başka firmaları aramayı bırakır ve işi kesinleştirir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
