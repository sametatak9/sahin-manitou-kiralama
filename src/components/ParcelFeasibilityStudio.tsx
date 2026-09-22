import { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Sparkles, 
  Send, 
  Maximize2,
  Phone,
  ShieldCheck,
  TrendingUp,
  Image as ImageIcon,
  RotateCw,
  Eye,
  Layers,
  Users,
  Box,
  Truck,
  CheckCircle,
  HelpCircle,
  Flame,
  Info
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

interface DistrictZoningPreset {
  district: string;
  taks: number; // Taban Alanı Katsayısı (örn. 0.40)
  kaks: number; // Emsal (örn. 2.20)
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

  // 3D Toplantı & Çalışma Masası Etkileşim State'leri
  const [activeViewMode, setActiveViewMode] = useState<'3d_isometric' | 'floor_plan' | 'satellite'>('3d_isometric');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(15);
  const [showManitouLogistics, setShowManitouLogistics] = useState<boolean>(true);
  const [showSetbacks, setShowSetbacks] = useState<boolean>(true);
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
✅ Şantiye Lojistiğinde Şahin Manitou ile Dar Sokakta Sıfır Zayiat

📞 3D Proje Toplantısı & Yerinde Keşif:
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
              <Box className="w-3.5 h-3.5 text-emerald-400" />
              Ada/Parsel 3D İnteraktif Şantiye & Toplantı Masası
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Arsa Sahibine 3D Temsili Parsel Çalışma Alanı Üzerinde Proje Sunumu
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Arsa sahibiyle masaya oturduğunuzda sadece sayılarla konuşmayın! Ada/parsel ve m² bilgisini girin; ekranda <strong>parsel sınırları, çekme mesafeleri, kat kat kütle yerleşimi ve Manitou dar sokak lojistiği</strong> 3D izometrik çalışma alanı olarak canlansın.
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Parsel No</label>
                <input
                  type="text"
                  value={parsel}
                  onChange={e => setParsel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500 font-mono font-bold"
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

            {/* Toplantı Modu Kontrolleri */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
              <span className="text-[11px] font-bold text-emerald-300 block">
                🎯 3D Toplantı Görünüm Ayarları:
              </span>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showManitouLogistics}
                    onChange={e => setShowManitouLogistics(e.target.checked)}
                    className="rounded text-emerald-500"
                  />
                  <span>Teleskopik Manitou Yükleme Sahası</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSetbacks}
                    onChange={e => setShowSetbacks(e.target.checked)}
                    className="rounded text-emerald-500"
                  />
                  <span>Çekme Mesafeleri & Yol Payı</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ PANEL: 3D İZOMETRİK PARSEL ÇALIŞMA ALANI & TOPLANTI MASASI */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-3">
            {/* Toplantı Başlığı & Kamera Açı Butonları */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                  Ada: {ada} / Parsel: {parsel}
                </span>
                <span className="text-xs text-slate-400">({landArea} m² Arsa)</span>
              </div>

              {/* Kamera / Açı Döndürme */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setRotationAngle((prev) => (prev === 15 ? 45 : prev === 45 ? -15 : 15))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                  title="Perspektifi Döndür"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Açıyı Çevir ({rotationAngle}°)</span>
                </button>
                <button
                  onClick={() => setSelectedFloor(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Tüm Kütle
                </button>
              </div>
            </div>

            {/* 3D İZOMETRİK VİRTÜEL ŞANTİYE ALANI */}
            <div className="w-full h-80 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 relative overflow-hidden flex items-center justify-center p-4 select-none">
              {/* Izgara Zemin (Grid / Arsa Sınırları) */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
                  backgroundSize: '24px 24px'
                }}
              />

              {/* Çevre Yol ve Sokak Çizgileri */}
              <div className="absolute inset-x-4 top-2 text-[10px] font-mono text-slate-500 flex justify-between border-b border-dashed border-slate-800 pb-1">
                <span>🚧 CEVAT AÇIKALIN CADDESİ (İmar Yolu / Tır Girişi)</span>
                <span>Yol Payı: {preset.roadSetback}m</span>
              </div>

              {/* 3D KÜTLE & PARSEL MODELLEMESİ (CSS Isometric 3D) */}
              <div 
                className="relative transition-transform duration-500 ease-out flex flex-col items-center justify-center"
                style={{
                  transform: `perspective(900px) rotateX(45deg) rotateZ(${rotationAngle}deg)`,
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* 1. Parsel Tabanı (Tapu Alanı m²) */}
                <div 
                  className="w-56 h-56 rounded-xl border-2 border-emerald-500/60 bg-emerald-950/20 relative shadow-2xl flex items-center justify-center"
                  style={{
                    boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  {/* Arsa Köşe Kazıkları */}
                  <span className="absolute top-1 left-1 text-[9px] font-mono text-emerald-400">Köşe A (Ada:{ada})</span>
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono text-emerald-400">Köşe C (Parsel:{parsel})</span>

                  {/* Çekme Mesafesi Kesikli Çizgisi */}
                  {showSetbacks && (
                    <div className="absolute inset-4 rounded-lg border border-dashed border-amber-400/50 flex items-center justify-center">
                      <span className="text-[8px] text-amber-300 font-bold bg-slate-950/80 px-1 rounded">
                        İnşaat İmar Oturumu: {baseFloorArea} m²
                      </span>
                    </div>
                  )}

                  {/* 2. Kat Kat 3D Kütle Yükselişi */}
                  <div className="w-36 h-36 flex flex-col-reverse relative" style={{ transformStyle: 'preserve-3d' }}>
                    {Array.from({ length: preset.maxFloors }).map((_, floorIdx) => {
                      const floorNum = floorIdx + 1;
                      const isSelected = selectedFloor === floorNum;
                      const isRoof = floorNum === preset.maxFloors;
                      const isGround = floorNum === 1;

                      return (
                        <div
                          key={floorIdx}
                          onClick={() => setSelectedFloor(isSelected ? null : floorNum)}
                          className={`w-full h-7 rounded border transition-all duration-300 cursor-pointer flex items-center justify-between px-2 text-[10px] font-bold ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-300 scale-105 shadow-lg'
                              : isRoof
                              ? 'bg-emerald-600/90 text-white border-emerald-400'
                              : isGround
                              ? 'bg-blue-600/90 text-white border-blue-400'
                              : 'bg-slate-800/90 text-slate-200 border-slate-600 hover:bg-slate-700'
                          }`}
                          style={{
                            transform: `translateZ(${floorIdx * 14}px)`,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                          }}
                        >
                          <span>{isGround ? 'Zemin + Dükkan' : isRoof ? `Çatı Katı (${floorNum}. Kat)` : `${floorNum}. Normal Kat`}</span>
                          <span className="text-[9px] font-mono opacity-80">
                            {isGround ? '2 Dükkan' : '2-3 Daire'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3. Manitou Teleskopik Bom Uzanma Simülasyonu */}
                  {showManitouLogistics && (
                    <div 
                      className="absolute -right-12 top-6 flex items-center gap-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg animate-pulse"
                      style={{ transform: 'translateZ(40px)' }}
                    >
                      <Truck className="w-3 h-3" />
                      <span>Şahin Manitou Yük Boşaltma</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Katman Bilgi Kutusu (Floating Overlay) */}
              <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl text-left text-xs max-w-xs shadow-xl">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{selectedFloor ? `${selectedFloor}. Kat Detayı` : 'Toplam Proje Kütlesi'}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedFloor 
                    ? `Bu katta 2 adet lüks bağımsız bölüm planlanmaktadır. Balkonlar geniş, güney cepheli.`
                    : `Toplam ${preset.maxFloors} Kat, ${newApartmentCount} Daire (${landOwnerApartments} Daire Hak Sahibi / ${embayApartments} Daire Embay Yapı)`}
                </p>
              </div>

              <div className="absolute bottom-3 right-3 text-[10px] text-slate-500 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                💡 Katlara tıklayarak arsa sahibine kat bazlı daire sunumu yapabilirsiniz.
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

          {/* Alt Hızlı Aksiyon */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Samet Bey ile yerinde 3D mimari keşif için: <strong>0531 436 29 04</strong></span>
            </div>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(proposalWhatsAppText)}`}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950/40"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp İle Arsa Sahibine Rapor Gönder</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
