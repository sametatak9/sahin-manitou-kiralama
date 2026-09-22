import { useState } from 'react';
import { Sparkles, Copy, Check, Send, MapPin, Truck, Phone } from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

export function QuickFieldGenerator() {
  const [district, setDistrict] = useState('Güngören - Tozkoparan');
  const [material, setMaterial] = useState('Paletli Ytong & Tuğla');
  const [actionDetail, setActionDetail] = useState('Tırdan indirildi, dar sokaktan 4. kat balkonuna sıfır fireyle verildi');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Generated outputs
  const gbpText = `Bugün ${district} şantiyesinde mesaideyiz! 🚜🏗️

${material} sevkiyatını Şahin Manitou ile hızlı ve güvenli şekilde tamamladık: ${actionDetail}.

Dar sokaklarda vinçlerin yanaşamadığı noktalarda teleskopik yükleyicimizle zaman ve iş gücü kazandırıyoruz.

İstanbul Avrupa Yakası kiralık Manitou ihtiyaçlarınız için projenize özel net teklif alın.
📞 İletişim: ${BUSINESS_INFO.phone}
📍 Adres: ${BUSINESS_INFO.address}
🌐 Web: ${BUSINESS_INFO.website}
📸 @embayyapi`;

  const reelsText = `İstanbul’un dar sokaklarında iş durmaz! 🚜💪

${district} şantiyemizde ${material} aktarımını gerçekleştirdik. ${actionDetail}.

Vinç giremeyen, dar sokaklı kentsel dönüşüm şantiyelerinde hızlı ve ekonomik çözüm: Şahin Manitou!

Siz de şantiyenize makine ayırtmak için doğrudan arayın:
📞 ${BUSINESS_INFO.phone}
📍 Güngören / İstanbul
Web: ${BUSINESS_INFO.website}
Takip edin: ${BUSINESS_INFO.instagram}

#kiralıkmanitou #manitouistanbul #şahinmanitou #embayyapi #güngören #işmakinesi #şantiyegünlükleri`;

  const whatsappText = `Selamlar şefim, ${district} bölgesindeki şantiyeniz için Manitou kiralama talebinizi aldık. 

Sahadaki işinizin detaylarına göre (${material} indirme / katlara verme) makinemiz ve deneyimli operatörümüz ile en uygun zaman diliminde hizmet verebiliriz.

Lokasyon ve iş süresine özel net fiyat teklifimizi görüşmek için doğrudan arayabilirsiniz:
📞 ${BUSINESS_INFO.phone}
Şahin Manitou & Embay Yapı (${BUSINESS_INFO.website})`;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          Saha Operasyonundan Anında İçerik Üretimi
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          Şantiyede Yapılan İşi Yazın, 3 Platform İçin Anında Dönüştürün
        </h2>
        <p className="text-slate-300 text-sm mt-1 max-w-3xl">
          Sahada makine çalışırken sadece 2-3 kelime girin; sistem Google Haritalar, Instagram ve WhatsApp müşteri teklif metnini otomatik formatlar.
        </p>
      </div>

      {/* Input Form */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              İlçe / Mahalle / Şantiye Yeri:
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Örn: Güngören - Tozkoparan"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              Taşınan / İndirilen Malzeme:
            </label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Örn: Paletli Tuğla, Ytong, Çimento"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Yapılan İş Detayı (Bom, Kat, Zorluk):
            </label>
            <input
              type="text"
              value={actionDetail}
              onChange={(e) => setActionDetail(e.target.value)}
              placeholder="Örn: 4. kata verildi, dar sokakta vinç giremiyordu"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 3 Result Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* GBP Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Google Haritalar (GBP)
              </span>
              <button
                onClick={() => handleCopy('gbp-quick', gbpText)}
                className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'gbp-quick' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Kopyala
              </button>
            </div>
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-72 overflow-y-auto select-all">
              {gbpText}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            📍 Google İşletme Profili güncellemeleri için
          </span>
        </div>

        {/* Instagram Reels Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                Instagram Reels / Post
              </span>
              <button
                onClick={() => handleCopy('ig-quick', reelsText)}
                className="px-2.5 py-1 rounded bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'ig-quick' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Kopyala
              </button>
            </div>
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-72 overflow-y-auto select-all">
              {reelsText}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            📸 @embayyapi Reels açıklaması için
          </span>
        </div>

        {/* WhatsApp Offer Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                WhatsApp Teklif Mesajı
              </span>
              <button
                onClick={() => handleCopy('wa-quick', whatsappText)}
                className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'wa-quick' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Kopyala
              </button>
            </div>
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-72 overflow-y-auto select-all">
              {whatsappText}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            💬 Arayan müşteriye WhatsApp'tan atılacak teklif
          </span>
        </div>
      </div>
    </div>
  );
}
