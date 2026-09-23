import React, { useState, useEffect } from 'react';
import {
  Radar,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Truck,
  Building,
  AlertTriangle,
  MessageSquare,
  Send,
  Eye,
  RotateCw,
  MapPin,
  Clock,
  FileText,
  Filter,
  Check
} from 'lucide-react';
import { SourceEvidence } from '../../types';

interface LeadRadarViewProps {
  onConvertSignalToLead: (signal: any) => void;
}

export const LeadRadarView: React.FC<LeadRadarViewProps> = ({ onConvertSignalToLead }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'MANITOU' | 'KENTSEL_DONUSUM'>('ALL');
  const [isScanning, setIsScanning] = useState(false);
  const [activeHourIndex, setActiveHourIndex] = useState<number>(0);

  // Region Selection for scanning
  const [selectedRegions, setSelectedRegions] = useState<string[]>([
    'Hadımköy Sanayi',
    'Güngören Tozkoparan',
    'İkitelli OSB',
    'Çorlu - Çerkezköy'
  ]);

  const AVAILABLE_REGIONS = [
    'Hadımköy Sanayi & Lojistik',
    'Güngören Tozkoparan (Dönüşüm)',
    'İkitelli OSB & Başakşehir',
    'Esenyurt & Kıraç Sanayi',
    'Çorlu & Çerkezköy Hattı',
    'Tuzla & Gebze Şantiyeleri'
  ];

  // Hourly Reports (1-hour intervals: filled or empty status)
  const [hourlyReports, setHourlyReports] = useState([
    {
      hour: '07:00 - 08:00',
      status: 'FILLED',
      findingsCount: 1,
      region: 'Hadımköy Sanayi',
      summary: '18m bomlu Manitou MT-X 1840 çatı panel montajı sinyali doğrulandı.'
    },
    {
      hour: '08:00 - 09:00',
      status: 'FILLED',
      findingsCount: 1,
      region: 'Güngören Tozkoparan',
      summary: 'Tozkoparan 18 bağımsız bölümlü riskli bina dönüşüm keşif talebi havuza aktarıldı.'
    },
    {
      hour: '09:00 - 10:00',
      status: 'EMPTY',
      findingsCount: 0,
      region: 'İkitelli OSB & Esenyurt',
      summary: 'Yapılan taramada yeni telehandler veya kentsel dönüşüm ilanı tespit edilmedi (Boş Rapor).'
    },
    {
      hour: '10:00 - 11:00',
      status: 'FILLED',
      findingsCount: 1,
      region: 'Kıraç Sanayi Sitesi',
      summary: 'Çelik konstrüksiyon yükleme ve sepetli montaj işi için piyasa istihbaratı yakalandı.'
    }
  ]);

  const [signals, setSignals] = useState([
    {
      id: 'sig-1',
      title: 'Hadımköy Çatı ve Cephe Panel Montajı 18 Metre Manitou Arayışı',
      category: 'MANITOU',
      region: 'Hadımköy Sanayi & Lojistik',
      domain: 'facebook.com',
      sourceType: 'FACEBOOK_GROUP',
      groupName: 'Türkiye İş Makineleri Kiralama & Satış Platformu',
      url: 'https://facebook.com/groups/is.makineleri.turkiye/permalink/918237192',
      discoveredAt: 'Bugün 08:15',
      snippet: 'Hadımköy lojistik depo şantiyemize çatı sandviç panel yerleşimi için 45 gün çalışacak 18 metre bomlu, sepetli ve çatallı Manitou telehandler aranıyor. Mazot ve operatör şartları görüşülür.',
      confidenceScore: 94,
      botName: 'Facebook Group Lead Radar Bot',
      query: '18m manitou kiralık istanbul hadımköy',
      status: 'VERIFIED',
      draftMessage: 'Sayın Şantiye Yetkilisi, Şahin Manitou olarak Hadımköy ve çevresine aynı gün şantiye teslimi yapabileceğimiz bakımlı 18m MT-X 1840 makinelerimiz mevcuttur. Resmi teklif ve operatör detayları için: 0531 436 29 04'
    },
    {
      id: 'sig-2',
      title: 'Tozkoparan Mahallesi 18 Bağımsız Bölümlü Bina Hak Sahipleri Kentsel Dönüşüm Talebi',
      category: 'KENTSEL_DONUSUM',
      region: 'Güngören Tozkoparan (Dönüşüm)',
      domain: 'istanbul.gov.tr',
      sourceType: 'SECTOR_PORTAL',
      groupName: 'Kentsel Dönüşüm Hak Sahipleri İletişim Havuzu',
      url: 'https://sahin-manitou-kiralama.vercel.app/#kesif-formu',
      discoveredAt: 'Bugün 07:15',
      snippet: 'Güngören Tozkoparan bölgesindeki 5 katlı binamız için deprem yönetmeliğine uygun kat karşılığı veya taahhütlü inşaat firmalarıyla görüşmek üzere keşif talep ediyoruz.',
      confidenceScore: 98,
      botName: 'Inbound Webhook Listener',
      query: 'Tozkoparan kentsel dönüşüm müteahhit teklif',
      status: 'VERIFIED',
      draftMessage: 'Merhaba, Embay Yapı olarak Tozkoparan merkezli taahhüt ofisimizden mühendis ekibimizle binanız için ücretsiz statik ve zemin keşfi gerçekleştirebiliriz. İletişim: 0531 436 29 04'
    },
    {
      id: 'sig-3',
      title: 'Esenyurt Kıraç Sanayi Sitesi Çelik Konstrüksiyon Yükleme Operasyonu',
      category: 'MANITOU',
      region: 'Esenyurt & Kıraç Sanayi',
      domain: 'google.com',
      sourceType: 'WEB_NEWS',
      groupName: 'Sanayi Yatırımları Bülteni',
      url: 'https://sanayigazetesi.com.tr/kirac-yeni-tesis-yatirimi-2026',
      discoveredAt: 'Dün 16:30',
      snippet: 'Kıraç bölgesinde 8.000m² fabrika çelik iskelet inşaatına başlandı. Ağır tonaj ve yüksek bomlu telehandler ihtiyacı öngörülmektedir.',
      confidenceScore: 86,
      botName: 'Manitou Market Intelligence',
      query: 'çelik konstrüksiyon iş makinesi telehandler esenyurt',
      status: 'SIGNAL',
      draftMessage: 'Sayın Proje Müdürü, Şahin Manitou olarak sanayi tesislerinizin çelik montajında yüksek tonajlı telehandler ve deneyimli operatör filomuzla çözüm ortağınız olabiliriz. Tel: 0531 436 29 04'
    }
  ]);

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev =>
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      // Add a fresh hourly report dynamically based on selected regions
      const currentHour = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const randomFilled = Math.random() > 0.3;
      const targetRegion = selectedRegions[0] || 'Genel Şantiye Sahası';
      
      const newReport = {
        hour: `${currentHour} Taraması`,
        status: randomFilled ? 'FILLED' : 'EMPTY',
        findingsCount: randomFilled ? 1 : 0,
        region: targetRegion,
        summary: randomFilled
          ? `${targetRegion} bölgesinde yeni 18m Manitou kiralama talebi bulundu ve radar listesine eklendi.`
          : `${targetRegion} bölgesinde bu saat diliminde yeni talep tespit edilmedi (Boş Rapor).`
      };

      setHourlyReports(prev => [newReport, ...prev]);
    }, 1200);
  };

  const filteredSignals = signals.filter(s => {
    if (filterType === 'ALL') return true;
    return s.category === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Regional Controls */}
      <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              BÖLGESEL PAZAR İSTİHBARATI & LEAD RADARI
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Aktif Şantiye Sinyal & Fırsat Avcısı
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Radarı çalıştırmadan önce tarama yapılacak şantiye ve dönüşüm bölgelerini seçin. Sistem 1'er saatlik aralıklarla dolu/boş bilgilendirme raporları çıkarır.
            </p>
          </div>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-700/20 shrink-0"
          >
            <RotateCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Seçili Bölgeler Taranıyor...' : 'Radarı Şimdi Çalıştır'}</span>
          </button>
        </div>

        {/* Region Selector Bar */}
        <div className="pt-5 border-t border-slate-100 mt-4 space-y-2">
          <span className="text-xs font-bold text-slate-700 block">
            📍 Tarama Yapılan Şantiye ve Sanayi Bölgeleri (Tıklayarak Seçin/Kaldırın):
          </span>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_REGIONS.map(reg => {
              const isSelected = selectedRegions.includes(reg);
              return (
                <button
                  key={reg}
                  onClick={() => toggleRegion(reg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                      : 'bg-slate-100 text-slate-500 border border-transparent hover:bg-slate-200'
                  }`}
                >
                  <MapPin className={`w-3 h-3 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{reg}</span>
                  {isSelected && <Check className="w-3 h-3 text-emerald-700" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Badges - Mobile Horizontal Scrollable */}
        <div className="w-full overflow-x-auto no-scrollbar pt-4 border-t border-slate-100 mt-4">
          <div className="flex items-center gap-2 min-w-max text-xs font-semibold pb-1">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                filterType === 'ALL'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Tüm Sinyaller ({signals.length})
            </button>
            <button
              onClick={() => setFilterType('MANITOU')}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                filterType === 'MANITOU'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              🚜 Manitou & Telehandler Arayanlar ({signals.filter(s => s.category === 'MANITOU').length})
            </button>
            <button
              onClick={() => setFilterType('KENTSEL_DONUSUM')}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                filterType === 'KENTSEL_DONUSUM'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              🏢 Kentsel Dönüşüm Keşif Arayanlar ({signals.filter(s => s.category === 'KENTSEL_DONUSUM').length})
            </button>
          </div>
        </div>
      </div>

      {/* 1-Hour Interval Periodic Reports Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700" />
            <h3 className="font-heading font-extrabold text-sm text-slate-900">
              1'er Saatlik Periyodik Bilgilendirme Raporu
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {hourlyReports.length} Rapor Kaydı
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {hourlyReports.map((rep, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border space-y-1.5 text-xs transition-all ${
                rep.status === 'FILLED'
                  ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                <span>{rep.hour}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    rep.status === 'FILLED'
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {rep.status === 'FILLED' ? '✓ DOLU RAPOR' : '○ BOŞ RAPOR'}
                </span>
              </div>
              <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                <span className="truncate">{rep.region}</span>
              </div>
              <p className="text-[11px] leading-snug line-clamp-2">{rep.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Signal Cards */}
      <div className="space-y-4">
        {filteredSignals.map((sig) => (
          <div
            key={sig.id}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 hover:border-emerald-400 transition-colors"
          >
            {/* Header of card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`p-2 rounded-xl text-white ${
                    sig.category === 'MANITOU' ? 'bg-amber-600' : 'bg-emerald-700'
                  }`}
                >
                  {sig.category === 'MANITOU' ? (
                    <Truck className="w-4 h-4" />
                  ) : (
                    <Building className="w-4 h-4" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{sig.groupName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      %{sig.confidenceScore} Güven
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {sig.discoveredAt} • Bölge: {sig.region}
                  </span>
                </div>
              </div>

              <a
                href={sig.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Kaynak Bağlantısını Aç</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Title & Snippet */}
            <div className="space-y-1.5">
              <h3 className="font-heading font-bold text-base text-slate-900">{sig.title}</h3>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-mono">
                "{sig.snippet}"
              </div>
            </div>

            {/* AI Draft Response & Convert Action */}
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                  Hazır Samet Bey Onay Taslağı:
                </span>
                <span className="text-[10px] text-emerald-700">İnsan onayı gerektirir</span>
              </div>
              <p className="text-xs text-slate-700 italic">{sig.draftMessage}</p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => onConvertSignalToLead(sig)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>CRM'e Lead Olarak Aktar</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
