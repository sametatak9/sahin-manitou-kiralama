import { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Search, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Send, 
  Download, 
  Calculator, 
  FileText, 
  Maximize2,
  Phone,
  ShieldCheck,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

interface DistrictZoningPreset {
  district: string;
  taks: number; // Taban Alanı Katsayısı (örn. 0.40)
  kaks: number; // Emsal (örn. 2.07)
  maxFloors: number;
  roadSetback: number;
  sideSetback: number;
  averageFlatSqm: number;
  marketSqmPrice: number; // ₺/m²
}

const ZONING_PRESETS: Record<string, DistrictZoningPreset> = {
  'Güngören - Tozkoparan (Kentsel Dönüşüm Rezervi)': {
    district: 'Güngören Tozkoparan',
    taks: 0.40,
    kaks: 2.20,
    maxFloors: 5,
    roadSetback: 5,
    sideSetback: 3,
    averageFlatSqm: 95,
    marketSqmPrice: 42000
  },
  'Güngören - Merkez / Güven / Mehmet Nesih Özmen': {
    district: 'Güngören Merkez',
    taks: 0.45,
    kaks: 2.00,
    maxFloors: 5,
    roadSetback: 4,
    sideSetback: 3,
    averageFlatSqm: 90,
    marketSqmPrice: 38000
  },
  'Bağcılar - Güneşli / Hürriyet / Çınar': {
    district: 'Bağcılar Güneşli',
    taks: 0.40,
    kaks: 2.40,
    maxFloors: 7,
    roadSetback: 5,
    sideSetback: 3.5,
    averageFlatSqm: 105,
    marketSqmPrice: 36000
  },
  'Bakırköy - Zuhuratbaba / Kartaltepe / Osmaniye': {
    district: 'Bakırköy',
    taks: 0.35,
    kaks: 1.80,
    maxFloors: 5,
    roadSetback: 5,
    sideSetback: 4,
    averageFlatSqm: 120,
    marketSqmPrice: 75000
  },
  'Bahçelievler - Şirinevler / Siyavuşpaşa': {
    district: 'Bahçelievler',
    taks: 0.40,
    kaks: 2.10,
    maxFloors: 6,
    roadSetback: 5,
    sideSetback: 3,
    averageFlatSqm: 100,
    marketSqmPrice: 40000
  }
};

export function ParcelFeasibilityStudio() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('Güngören - Tozkoparan (Kentsel Dönüşüm Rezervi)');
  const [district, setDistrict] = useState('Güngören');
  const [neighborhood, setNeighborhood] = useState('Tozkoparan Mah.');
  const [ada, setAda] = useState('1240');
  const [parsel, setParsel] = useState('8');
  const [landArea, setLandArea] = useState<number>(450); // m²
  const [currentApartmentCount, setCurrentApartmentCount] = useState<number>(10);
  const [sharePercent, setSharePercent] = useState<number>(50); // Müteahhit %50 / Arsa Sahibi %50

  const [activeArchitecturalStyle, setActiveArchitecturalStyle] = useState<'modern_residence' | 'boutique_wood_composite' | 'minimalist_grey'>('modern_residence');
  const [copiedProposal, setCopiedProposal] = useState(false);

  const preset = ZONING_PRESETS[selectedPresetKey] || ZONING_PRESETS['Güngören - Tozkoparan (Kentsel Dönüşüm Rezervi)'];

  // İmar ve Mimari Matematik Hesaplamaları
  const baseFloorArea = Math.round(landArea * preset.taks); // Taban alanı
  const totalConstructionArea = Math.round(landArea * preset.kaks); // Emsale dahil inşaat alanı
  const grossConstructionArea = Math.round(totalConstructionArea * 1.30); // Ortak alanlar, sığınak, otopark ile brüt alan
  const newApartmentCount = Math.floor(totalConstructionArea / preset.averageFlatSqm);
  const commercialShopCount = landArea >= 400 ? 2 : 1;

  // Hak Sahipleri Paylaşım Simülasyonu
  const landOwnerApartments = Math.round(newApartmentCount * (sharePercent / 100));
  const embayApartments = newApartmentCount - landOwnerApartments;

  // Finansal Değerleme
  const projectedPropertyValue = totalConstructionArea * preset.marketSqmPrice;
  const estimatedBuildCost = grossConstructionArea * 21000; // C35, 1. sınıf işçilik ve asansörlü m² maliyeti
  const landOwnerValueAdded = landOwnerApartments * (preset.averageFlatSqm * preset.marketSqmPrice);

  const proposalWhatsAppText = `🏢 EMBAY YAPI | ARSA & KENTSEL DÖNÜŞÜM ÖN FİZİBİLİTE RAPORU

📍 Konum: ${district} / ${neighborhood}
📌 Ada: ${ada} | Parsel: ${parsel}
📐 Arsa Alanı: ${landArea} m²
---------------------------------------------
📐 İMAR & PROJE KAPASİTESİ:
• Emsal (KAKS): ${preset.kaks} | Taban Alanı: ${baseFloorArea} m²
• Toplam Emsal İnşaat Alanı: ${totalConstructionArea} m²
• Kat Adedi: Zemin + ${preset.maxFloors - 1} Kat (Toplam ${preset.maxFloors} Kat)
• Üretilecek Bağımsız Bölüm: ${newApartmentCount} Lüks Daire (${preset.averageFlatSqm} m²) + ${commercialShopCount} Dükkan

🤝 PAYLAŞIM MODELİ (%${100 - sharePercent} Hak Sahibi / %${sharePercent} Yüklenici):
• Hak Sahiplerine Düşen: ${landOwnerApartments} Modern Daire
• Embay Yapı Payı: ${embayApartments} Daire
• Mevcut Bina Bağımsız Bölüm: ${currentApartmentCount} Adet
• Bitiş Süresi Taahhüdü: 14-16 Ay (Ruhsat Sonrası)

🏗️ MİMARİ VE STATİK STANDARTLAR:
✅ C35 Yüksek Dayanımlı Hazır Beton & Nervürlü Çelik Donatı
✅ Kapalı/Açık Otopark, Çift Hızlı Modern Asansör
✅ A Sınıfı Taşyünü Dış Cephe Isı ve Ses Yalıtımı
✅ Şantiye Lojistiğinde Şahin Manitou ile Sıfır Zayiat

📞 Ücretsiz Yerinde Keşif & Proje Sunumu:
Embay Yapı: ${BUSINESS_INFO.phone} (Samet Bey)
Adres: Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul`;

  const copyProposal = () => {
    navigator.clipboard.writeText(proposalWhatsAppText);
    setCopiedProposal(true);
    setTimeout(() => setCopiedProposal(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ÜST VİZYON BANNERI */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Ada/Parsel Akıllı Fizibilite & Temsili Mimari 3D Motoru
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Arsa Sahibine 30 Saniyede Özel Kentsel Dönüşüm Raporu & Mimari Proje Sunumu
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Güngören, Tozkoparan, Bağcılar ve Bakırköy’de arsa sahibinin veya bina yöneticisinin ada/parsel bilgisini ve m² alanını girin; sistem imar emsalini otomatik hesaplasın, kaç daire çıkacağını simüle etsin ve 3D temsili proje kartıyla anında WhatsApp teklifine dönüştürsün.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyProposal}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{copiedProposal ? 'Kopyalandı!' : 'WhatsApp Raporunu Kopyala'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOL PANEL: Parsel Bilgileri & İmar Hesaplama Motoru */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
              1. Ada, Parsel & İmar Bölgesi Seçimi
            </span>
            <span className="text-xs text-slate-400">İstanbul yerel imar planı katsayıları otomatik yüklenir.</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Bölge & İmar Planı Şablonu</label>
              <select
                value={selectedPresetKey}
                onChange={e => setSelectedPresetKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium focus:outline-hidden focus:border-emerald-500"
              >
                {Object.keys(ZONING_PRESETS).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Ada No</label>
                <input
                  type="text"
                  value={ada}
                  onChange={e => setAda(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Parsel No</label>
                <input
                  type="text"
                  value={parsel}
                  onChange={e => setParsel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Tapu Arsa Alanı (m²)</label>
                <input
                  type="number"
                  value={landArea}
                  onChange={e => setLandArea(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Mevcut Daire Sayısı</label>
                <input
                  type="number"
                  value={currentApartmentCount}
                  onChange={e => setCurrentApartmentCount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Paylaşım Oranı Slider */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Kat Karşılığı Paylaşım Oranı</span>
                <span className="text-emerald-400 font-mono">
                  %{100 - sharePercent} Hak Sahibi / %{sharePercent} Müteahhit
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="60"
                step="5"
                value={sharePercent}
                onChange={e => setSharePercent(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>%60 Hak Sahibi</span>
                <span>%50 / %50 Eşit</span>
                <span>%40 Hak Sahibi</span>
              </div>
            </div>

            {/* İmar Verileri Göstergesi */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Taban Alanı (TAKS)</span>
                <span className="text-xs font-bold text-white">{baseFloorArea} m²</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Emsal İnşaat (KAKS)</span>
                <span className="text-xs font-bold text-emerald-400">{totalConstructionArea} m²</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">İmar Kat İzni</span>
                <span className="text-xs font-bold text-white">{preset.maxFloors} Kat</span>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ PANEL: Temsili 3D Mimari Proje Görseli & Rapor Kartı */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            {/* Temsili Mimari Görsel ve Katman Seçimi */}
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
              <div className="aspect-video w-full bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 relative flex flex-col items-center justify-center p-6 text-center">
                {/* Temsili Mimari Çizim / Mockup Tasarımı */}
                <div className="w-full max-w-md p-5 rounded-2xl border border-emerald-500/40 bg-slate-900/90 backdrop-blur-md shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-white text-xs">EMBAY YAPI | PRESTİJ PROJESİ</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Zemin + {preset.maxFloors - 1} Kat
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left text-xs">
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Yeni Daire Kapasitesi</span>
                      <span className="text-sm font-black text-emerald-400">{newApartmentCount} Adet Lüks Daire</span>
                      <span className="text-[10px] text-slate-500">Ort. {preset.averageFlatSqm} m² Brüt</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Hak Sahiplerine Verilen</span>
                      <span className="text-sm font-black text-amber-400">{landOwnerApartments} Bağımsız Bölüm</span>
                      <span className="text-[10px] text-slate-500">Kendi Daireleri Büyüyor</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-left space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Statik Standart: C35 Beton + Nervürlü Çelik + Radye Temel</span>
                    </div>
                    <div className="text-slate-400">
                      Teleskopik Manitou ile dar sokakta sıfır gürültü ve hızlı kat lojistiği.
                    </div>
                  </div>
                </div>

                {/* Mimari Stil Değiştirme Sekmeleri */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1 font-semibold">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    Temsili Mimari Konsept
                  </span>
                  <div className="flex gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-medium">
                      Modern Antrasit Cephe
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-medium">
                      Geniş Balkonlu
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Finansal Değerleme Özeti */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Proje Toplam Değeri</span>
                <span className="text-base font-black text-white">
                  {(projectedPropertyValue / 1000000).toFixed(1)} Milyon ₺
                </span>
                <span className="text-[10px] text-emerald-400">Yüksek Prim Potansiyeli</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Hak Sahiplerinin Payı</span>
                <span className="text-base font-black text-amber-400">
                  {(landOwnerValueAdded / 1000000).toFixed(1)} Milyon ₺
                </span>
                <span className="text-[10px] text-slate-400">Daire Başı Değer Artışı</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Teslim Süresi</span>
                <span className="text-base font-black text-blue-400">14 - 16 Ay</span>
                <span className="text-[10px] text-slate-400">Ruhsat Sonrası Garanti</span>
              </div>
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              📍 Bu raporu arsa sahibiyle toplantıdayken WhatsApp'tan tek tıkla paylaşabilirsiniz.
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(proposalWhatsAppText)}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950/40"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp İle Arsa Sahibine Gönder</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
