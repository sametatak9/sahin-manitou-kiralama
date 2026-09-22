import { useState } from 'react';
import { Phone, MessageSquare, Star, Send, Copy, Check, Sparkles, ExternalLink, Calculator } from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

export function MobileQuickActions() {
  const [customerName, setCustomerName] = useState('Ahmet Usta');
  const [district, setDistrict] = useState('Güngören Tozkoparan');
  const [workType, setWorkType] = useState('Teleskopik Manitou Palet İndirme & Katlara Verme');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Review URL
  const reviewMessage = `Selamünaleyküm ${customerName}, bugünkü şantiyenizdeki Manitou işimizi kazasız belasız tamamladık. Bizi tercih ettiğiniz için Şahin Manitou Kiralama olarak teşekkür ederiz. 

Hizmetimizden memnun kaldıysanız, Google Haritalar profilimize 1 dakikanızı ayırıp 5 yıldızlı bir yorum bırakmanız bizi çok mutlu eder:
👉 https://sahin-manitou-kiralama.vercel.app/

Yeni projelerinizde doğrudan arayabilirsiniz: ${BUSINESS_INFO.phone}
Hayırlı işler dileriz!
Şahin Manitou & Embay Yapı (@embayyapi)`;

  const quoteMessage = `Sayın ${customerName}, 

${district} şantiyeniz için talep ettiğiniz "${workType}" işinize istinaden Şahin Manitou Kiralama & Embay Yapı teklif detaylarımız aşağıdaki gibidir:

🚜 Ekipman: Teleskopik Yükleyici (Manitou - Yüksek Emniyetli & Bakımlı)
👷 Operatör: Sertifikalı & Zorlu Şantiye Tecrübeli
📍 Şantiye Lokasyonu: ${district}
⏱️ Sevk Zamanı: Randevu saatinde eksiksiz adreste

İşinizin metrajına ve çalışma saatine göre en uygun net fiyat teklifimizi onaylamak için arayabilirsiniz:
📞 ${BUSINESS_INFO.phone}
📍 Adres: ${BUSINESS_INFO.address}
🌐 https://sahin-manitou-kiralama.vercel.app/`;

  const openWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 p-4 sm:p-6 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Phone className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              📱 Telefondasınız: 1 Tıkla WhatsApp & Saha Eylemleri
            </h3>
            <p className="text-xs text-slate-300">
              Müşteriye teklif atarken veya iş bittiğinde yorum toplarken tek dokunuşla WhatsApp'ı açar.
            </p>
          </div>
        </div>

        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30 w-fit">
          Mobil Uyumlu & Hızlı
        </span>
      </div>

      {/* Quick Field Form for Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">Müşteri / Şantiye Şefi Adı:</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
            placeholder="Örn: Ahmet Usta / Ali Bey"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">Şantiye İlçesi / Yeri:</label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
            placeholder="Örn: Güngören Tozkoparan"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">Yapılan İş / Yük Tipi:</label>
          <input
            type="text"
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
            placeholder="Örn: Palet İndirme & 4. Kata Verme"
          />
        </div>
      </div>

      {/* 2 Primary Big Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Action 1: WhatsApp Yorum İste */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                İş Bitince: 5 Yıldızlı Yorum İsteme
              </span>
              <button
                onClick={() => handleCopy('wa-rev', reviewMessage)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'wa-rev' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'wa-rev' ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              "{customerName}, bugünkü şantiyenizdeki Manitou işimizi tamamladık... 5 yıldızlı yorum bırakırsanız..."
            </p>
          </div>

          <button
            onClick={() => openWhatsApp(reviewMessage)}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>WhatsApp ile Müşteriye Gönder</span>
          </button>
        </div>

        {/* Action 2: WhatsApp Teklif Gönder */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-400" />
                Arayan Müşteriye: Resmi Teklif Gönderme
              </span>
              <button
                onClick={() => handleCopy('wa-quote', quoteMessage)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'wa-quote' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'wa-quote' ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              "Sayın {customerName}, {district} şantiyeniz için {workType} işinize istinaden Şahin Manitou teklifimiz..."
            </p>
          </div>

          <button
            onClick={() => openWhatsApp(quoteMessage)}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>WhatsApp ile Teklif Gönder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
