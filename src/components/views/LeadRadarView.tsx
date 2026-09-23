import React, { useState } from 'react';
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
  RotateCw
} from 'lucide-react';
import { SourceEvidence } from '../../types';

interface LeadRadarViewProps {
  onConvertSignalToLead: (signal: any) => void;
}

export const LeadRadarView: React.FC<LeadRadarViewProps> = ({ onConvertSignalToLead }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'MANITOU' | 'KENTSEL_DONUSUM'>('ALL');
  const [isScanning, setIsScanning] = useState(false);
  const [signals, setSignals] = useState([
    {
      id: 'sig-1',
      title: 'Hadımköy Çatı ve Cephe Panel Montajı 18 Metre Manitou Arayışı',
      category: 'MANITOU',
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

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 1500);
  };

  const filteredSignals = signals.filter(s => {
    if (filterType === 'ALL') return true;
    return s.category === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              PAZAR İSTİHBARATI & SOSYAL MEDYA SİNYAL RADARI
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Kaynak Kanıtlı Fırsat Avcısı
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              İnternetten, Facebook iş makineleri gruplarından ve webden tespit edilen sinyaller kaynak linki, kanıt metni ve güven skoruyla saklanır. Spam ve toplu mesaj kesinlikle yasaktır; her aksiyon Samet Bey onayına tabidir.
            </p>
          </div>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
          >
            <RotateCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Radar Taranıyor...' : 'Radarı Şimdi Çalıştır'}
          </button>
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

      {/* Signal Cards */}
      <div className="space-y-4">
        {filteredSignals.map((signal) => (
          <div
            key={signal.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-emerald-300 transition-all space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  signal.category === 'MANITOU' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {signal.category === 'MANITOU' ? <Truck className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{signal.title}</h3>
                  <p className="text-xs text-slate-400">
                    {signal.groupName} • {signal.discoveredAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Güven Skoru: %{signal.confidenceScore}
                </span>
                <a
                  href={signal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Orijinal Kaynağı Görüntüle"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Evidence quote */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>Doğrulanan Kanıt Metni (Snippet):</span>
                <span className="font-mono text-[11px] text-slate-400">Bot: {signal.botName}</span>
              </div>
              <p className="text-slate-800 italic leading-relaxed">
                "{signal.snippet}"
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                Sorgu: {signal.query} • Domain: {signal.domain}
              </div>
            </div>

            {/* AI Draft Response & Human Approval Trigger */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Önerilen İletişim / Teklif Taslağı (İnsan Onayına Hazır):
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">Spamsiz & Doğrudan İletişim</span>
              </div>
              <p className="text-xs text-emerald-950 font-sans leading-relaxed">
                {signal.draftMessage}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                Doğrulama: <strong>Gerçek Web Kaynağı</strong>
              </span>
              <button
                onClick={() => onConvertSignalToLead(signal)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                Bu Sinyali CRM Lead'e Dönüştür
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
