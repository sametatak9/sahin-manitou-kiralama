import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Users, 
  FileDown, 
  Send, 
  MessageSquare, 
  Mail, 
  PhoneCall, 
  Tag, 
  Sparkles, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Layers, 
  AlertCircle,
  Eye,
  Heart,
  Share2,
  Bookmark,
  Target,
  FileSpreadsheet,
  Megaphone,
  UserCheck
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

interface PostMetric {
  id: string;
  title: string;
  platform: 'Instagram' | 'Google Business' | 'Facebook' | 'TikTok';
  categoryTag: 'Dar Sokak & Vinç Alternatifi' | 'C35 Beton & Statik Güven' | 'Fiyat & Teklif Şeffaflığı' | 'Şantiye Mizahı / Reels' | 'Çevreci Kimlik & Ağaç Bağışı';
  date: string;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  inquiriesGenerated: number; // Doğrudan gelen DM/Arama sayısı
  adSpend: number; // ₺
  cpl: number; // Müşteri edinme maliyeti (₺)
  status: 'yayında' | 'planlandı' | 'arşiv';
}

interface CompetitorLead {
  id: string;
  source: string; // Örn: Rakip Vinç / İnşaat Firması Yorumları
  clientName: string;
  phoneOrHandle: string;
  inquirySnippet: string; // "Güngören Tozkoparan'da 3. kata palet çıkartma saatliği ne kadar?"
  intentLevel: 'Ateşli (Acil Fiyat İstiyor)' | 'Orta (Teklif Topluyor)' | 'Bilgi İstiyor';
  extractedDate: string;
  outreachStatus: 'hazır' | 'sms_atıldı' | 'whatsapp_yazıldı' | 'arandı';
}

const INITIAL_METRICS: PostMetric[] = [
  {
    id: 'm-1',
    title: 'Vinç Giremez Dediler! Tozkoparan 4. Kat Ytong Sevkiyatı (Reels)',
    platform: 'Instagram',
    categoryTag: 'Dar Sokak & Vinç Alternatifi',
    date: '21 Eylül 2026',
    reach: 18450,
    likes: 1240,
    comments: 86,
    shares: 215,
    inquiriesGenerated: 14,
    adSpend: 450,
    cpl: 32.14,
    status: 'yayında'
  },
  {
    id: 'm-2',
    title: 'Güngören Ada 1240 Parsel C35 Radye Temel Statik Muayenesi',
    platform: 'Instagram',
    categoryTag: 'C35 Beton & Statik Güven',
    date: '19 Eylül 2026',
    reach: 9200,
    likes: 640,
    comments: 34,
    shares: 48,
    inquiriesGenerated: 8,
    adSpend: 300,
    cpl: 37.50,
    status: 'yayında'
  },
  {
    id: 'm-3',
    title: 'Şantiye Gerçekleri: Vinç Sokağı Tıkadı, Manitou 20dk İndirdi (Meme/Caps)',
    platform: 'Instagram',
    categoryTag: 'Şantiye Mizahı / Reels',
    date: '17 Eylül 2026',
    reach: 34200,
    likes: 3100,
    comments: 194,
    shares: 610,
    inquiriesGenerated: 19,
    adSpend: 250,
    cpl: 13.15,
    status: 'yayında'
  },
  {
    id: 'm-4',
    title: 'Manitou Günlük / Saatlik Kiralama Maliyeti Neye Göre Belirlenir?',
    platform: 'Google Business',
    categoryTag: 'Fiyat & Teklif Şeffaflığı',
    date: '15 Eylül 2026',
    reach: 4800,
    likes: 180,
    comments: 42,
    shares: 20,
    inquiriesGenerated: 23,
    adSpend: 500,
    cpl: 21.73,
    status: 'yayında'
  },
  {
    id: 'm-5',
    title: 'Her Daire İçin 10 Fidan Bağışı - Doğa Dostu Kentsel Dönüşüm',
    platform: 'Facebook',
    categoryTag: 'Çevreci Kimlik & Ağaç Bağışı',
    date: '12 Eylül 2026',
    reach: 7600,
    likes: 510,
    comments: 28,
    shares: 88,
    inquiriesGenerated: 5,
    adSpend: 200,
    cpl: 40.00,
    status: 'yayında'
  }
];

const INITIAL_COMPETITOR_LEADS: CompetitorLead[] = [
  {
    id: 'comp-1',
    source: 'Rakip Vinç Instagram Gönderisi',
    clientName: 'Ahmet Kalfa (Güneşli Şantiye)',
    phoneOrHandle: '0533 *** 45 12 / @ahmet_insaat',
    inquirySnippet: 'Güneşli Hürriyet mahallesinde 4. kata 2 tır tuğla verilecek, vinç sokağa girer mi fiyat nedir?',
    intentLevel: 'Ateşli (Acil Fiyat İstiyor)',
    extractedDate: 'Bugün 10:14',
    outreachStatus: 'hazır'
  },
  {
    id: 'comp-2',
    source: 'Tozkoparan Kentsel Dönüşüm Facebook Grubu',
    clientName: 'Serdar Bey (Bina Temsilcisi)',
    phoneOrHandle: '0530 *** 89 20',
    inquirySnippet: 'C35 beton dökecek, demirden çalmayacak Güngören içi dürüst müteahhit arıyoruz teklif verin.',
    intentLevel: 'Ateşli (Acil Fiyat İstiyor)',
    extractedDate: 'Dün 16:45',
    outreachStatus: 'whatsapp_yazıldı'
  },
  {
    id: 'comp-3',
    source: 'Google Haritalar Rakip Manitou Yorumları',
    clientName: 'Mimar Burak Bey',
    phoneOrHandle: '@burak_mimarlik',
    inquirySnippet: 'Diğer firma operatör göndermedi mağdur olduk, yarın sabah acil 18m manitou lazım.',
    intentLevel: 'Ateşli (Acil Fiyat İstiyor)',
    extractedDate: 'Dün 18:30',
    outreachStatus: 'hazır'
  }
];

export function SocialIntelligenceCockpit() {
  const [metrics, setMetrics] = useState<PostMetric[]>(INITIAL_METRICS);
  const [competitorLeads, setCompetitorLeads] = useState<CompetitorLead[]>(INITIAL_COMPETITOR_LEADS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'analytics' | 'budget_planner' | 'competitor_intel' | 'outreach_engine'>('analytics');

  // Kampanya ve Teklif Metni Oluşturucu State'leri
  const [campaignTarget, setCampaignTarget] = useState<'manitou_dar_sokak' | 'kentsel_donusum_c35' | 'acil_tir_indirme'>('manitou_dar_sokak');
  const [outreachMedium, setOutreachMedium] = useState<'sms' | 'whatsapp' | 'email'>('whatsapp');
  const [outreachRecipient, setOutreachRecipient] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [generatedPdfNotice, setGeneratedPdfNotice] = useState(false);

  // İstatistiksel Özetler
  const totalSpend = metrics.reduce((sum, m) => sum + m.adSpend, 0);
  const totalInquiries = metrics.reduce((sum, m) => sum + m.inquiriesGenerated, 0);
  const avgCpl = Math.round(totalSpend / (totalInquiries || 1));
  const totalReach = metrics.reduce((sum, m) => sum + m.reach, 0);

  // En Çok Talep Alan Kategori Hesabı
  const categoryStats = metrics.reduce((acc, curr) => {
    if (!acc[curr.categoryTag]) {
      acc[curr.categoryTag] = { inquiries: 0, reach: 0, count: 0 };
    }
    acc[curr.categoryTag].inquiries += curr.inquiriesGenerated;
    acc[curr.categoryTag].reach += curr.reach;
    acc[curr.categoryTag].count += 1;
    return acc;
  }, {} as Record<string, { inquiries: number; reach: number; count: number }>);

  const topCategory = Object.entries(categoryStats).sort((a, b) => b[1].inquiries - a[1].inquiries)[0];

  // Hedefli Kişisel Teklif & Reklam Şablonları
  const generateOutreachContent = () => {
    if (campaignTarget === 'manitou_dar_sokak') {
      return `Selamlar Sayın Şantiye Sorumlusu,\n\nGüngören, Bağcılar ve Bakırköy'ün dar sokaklarında vinç kurulamayan veya tırın yolu kapattığı şantiyelerde teleskopik Şahin Manitou ile katlara doğrudan palet transferi yapıyoruz.\n\n🚜 18 Metre Bom, 4 Tona Kadar Yük Kapasitesi\n👷 Sertifikalı G Sınıfı Operatör & Yakıt Dahil\n⚡ Sokak Kapanmaz, Ceza Riski Yok, Sıfır Malzeme Zayiatı\n\n📌 Şantiyenize özel anlık teklif için: ${BUSINESS_INFO.phone} (Samet Bey)\nEmbay Yapı & Şahin Manitou Kiralama | Tozkoparan`;
    }
    if (campaignTarget === 'kentsel_donusum_c35') {
      return `Değerli Bina Temsilcimiz,\n\nTozkoparan ve çevre mahallelerde riskli yapı yenilemelerinde C35 yüksek dayanımlı beton, nervürlü çelik ve çift hızlı modern asansörlü projeler inşa ediyoruz.\n\n🏛️ İmar Ada/Parsel Ön Fizibilite Raporunuz 30 Saniyede Hazır\n🤝 Şeffaf Kat Karşılığı Paylaşımı & 14 Ayda Anahtar Teslim Taahhüdü\n🌳 Her Yeni Daire İçin 10 Adet TEMA Fidan Bağışı\n\nÜcretsiz ada/parsel analizi ve yerinde keşif için arayın: ${BUSINESS_INFO.phone}\nEmbay Yapı İnşaat Taahhüt`;
    }
    return `Sayın Müteahhidimiz / Ustabaşımız,\n\nTırınız geldi ama şantiyede vinç mi bulamadınız? Şahin Manitou Tozkoparan merkez garajından 20 dakikada şantiyenizde.\n\n📦 Ytong, Tuğla, Briket, Harç, Alçıpan katlara milimetrik teslim edilir.\n📞 Acil Çağrı & Sevkiyat Hattı: ${BUSINESS_INFO.phone}\n(7/24 Aktif Şantiye Destek Hattı)`;
  };

  const handleCopyOutreach = () => {
    navigator.clipboard.writeText(generateOutreachContent());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleExportPdfReport = () => {
    setGeneratedPdfNotice(true);
    setTimeout(() => {
      window.print();
      setGeneratedPdfNotice(false);
    }, 400);
  };

  const filteredMetrics = selectedCategory === 'all' 
    ? metrics 
    : metrics.filter(m => m.categoryTag === selectedCategory);

  return (
    <div className="space-y-6">
      {/* 1. ÜST VİZYON PANELİ & METRİK ÖZETİ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-2">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Sosyal Medya İstihbaratı, Bütçe Planlama & Doğrudan Müşteri Avcısı</span>
            </div>
            <h2 className="text-2xl font-black text-white">
              Pazarlama Kokpiti & Müşteri Veri Dönüştürücü
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hangi gönderi en çok sıcak arama getirdi? Reklam bütçeniz nereye harcandı? Rakiplerin yorumlarından fiyat soran müşterileri tespit edin, gün sonu PDF raporuna dökün ve tek tıkla hedefli teklif SMS/WhatsApp mesajı fırlatın.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportPdfReport}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition shadow-md"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span>{generatedPdfNotice ? 'Yazdırılıyor / PDF...' : 'Gün Sonu PDF Raporu'}</span>
            </button>
            <button
              onClick={() => setActiveTab('outreach_engine')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition"
            >
              <Target className="w-4 h-4" />
              <span>Doğrudan Teklif Fırlat</span>
            </button>
          </div>
        </div>

        {/* 4'lü Finans & Etkileşim Skorbordu */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Toplam Reklam Bütçesi</span>
            <div className="text-lg font-black text-white mt-0.5">{totalSpend.toLocaleString('tr-TR')} ₺</div>
            <span className="text-[10px] text-slate-500">Instagram & Google Ads</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Gelen Sıcak Arama / DM</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{totalInquiries} Şantiye Talebi</div>
            <span className="text-[10px] text-emerald-500/80 font-medium">Doğrudan Teklif İstendi</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Müşteri Başı Maliyet (CPL)</span>
            <div className="text-lg font-black text-amber-400 mt-0.5">{avgCpl} ₺ / Lead</div>
            <span className="text-[10px] text-slate-500">Sektör ortalaması 95 ₺</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">En Çok Kazandıran İçerik</span>
            <div className="text-xs font-black text-white truncate mt-1">
              {topCategory ? topCategory[0] : 'Dar Sokak'}
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">
              {topCategory ? `${topCategory[1].inquiries} Müşteri Getirdi` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 2. KONTROL SEKMELERİ */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>1. Gönderi & Etiket İstatistikleri</span>
        </button>

        <button
          onClick={() => setActiveTab('budget_planner')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'budget_planner'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>2. İçerik Planlama & Reklam Maliyeti</span>
        </button>

        <button
          onClick={() => setActiveTab('competitor_intel')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'competitor_intel'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>3. Rakip Yorum Analizi & Sıcak Müşteri Havuzu</span>
        </button>

        <button
          onClick={() => setActiveTab('outreach_engine')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'outreach_engine'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>4. Bireysel Teklif & Toplu Bildirim Motoru</span>
        </button>
      </div>

      {/* 3. İÇERİK ALANLARI */}

      {/* SEKME 1: GÖNDERİ ANALİTİĞİ & ETİKET SIRALAMASI */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Kategori Filtresi */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>İçerik Etiketine Göre Filtrele:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'Dar Sokak & Vinç Alternatifi', 'C35 Beton & Statik Güven', 'Fiyat & Teklif Şeffaflığı', 'Şantiye Mizahı / Reels', 'Çevreci Kimlik & Ağaç Bağışı'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat === 'all' ? 'Tüm İçerikler' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Gönderi Tablosu */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">İçerik Başlığı & Platform</th>
                    <th className="p-3.5">Etiket / Kategori</th>
                    <th className="p-3.5 text-right">Erişim</th>
                    <th className="p-3.5 text-right">Etkileşim</th>
                    <th className="p-3.5 text-right text-emerald-400">Sıcak Müşteri (Lead)</th>
                    <th className="p-3.5 text-right">Maliyet (₺)</th>
                    <th className="p-3.5 text-right">CPL (Müşteri Başı)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredMetrics.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-medium text-white max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {item.platform}
                          </span>
                          <span className="truncate">{item.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{item.date}</span>
                      </td>
                      <td className="p-3.5 text-slate-300 font-medium">
                        <span className="text-[11px] text-emerald-400 font-semibold">{item.categoryTag}</span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-200">{item.reach.toLocaleString()}</td>
                      <td className="p-3.5 text-right font-mono text-slate-400">
                        {item.likes + item.comments + item.shares}
                      </td>
                      <td className="p-3.5 text-right font-bold font-mono text-emerald-400 text-sm">
                        {item.inquiriesGenerated} Arama
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-300">{item.adSpend} ₺</td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                        {item.cpl.toFixed(1)} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 2: İÇERİK PLANLAMA & SOSYAL MEDYA PAZARLAMA MALİYETİ */}
      {activeTab === 'budget_planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Haftalık & Aylık Pazarlama Bütçe Projeksiyonu</h3>
              <p className="text-xs text-slate-400 mt-0.5">Güngören, Tozkoparan ve Bağcılar bölgesinde hedeflenen şantiye cirosu ve reklam giderleri.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Günlük Sabah Gönderisi & Canlı Şantiye Çekimi</span>
                  <span className="text-slate-400 text-[11px]">Instagram Reels + Google Haritalar Güncellemesi</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 block font-mono">0 ₺ (Organik)</span>
                  <span className="text-[10px] text-slate-500">Operatör / Saha</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Google Ads "Kiralık Manitou Güngören" Aramaları</span>
                  <span className="text-slate-400 text-[11px]">Doğrudan telefon arama kampanyası</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white block font-mono">1.250 ₺ / Hafta</span>
                  <span className="text-[10px] text-amber-400">~18-22 Sıcak Çağrı</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Meta Instagram Reels Sponsorlu Öne Çıkarma</span>
                  <span className="text-slate-400 text-[11px]">"Vinç Giremez Dediler" Dar Sokak Videosu Reklamı</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white block font-mono">750 ₺ / Hafta</span>
                  <span className="text-[10px] text-emerald-400">~14-16 DM Talebi</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-300 block text-sm">Tahmini Aylık Toplam Pazarlama Gideri</span>
                  <span className="text-slate-300 text-[11px]">Google Ads + Instagram Reels Boost</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-white font-mono">8.000 ₺ / Ay</span>
                  <span className="text-[11px] text-emerald-400 block font-semibold">Beklenen İş: 60-80 Günlük Kiralama</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Her Sabah Güncel Gönderi Akış Rutini</h3>
              <p className="text-xs text-slate-400 mt-0.5">Müşteri datasını taze tutmak için sabah 08:30 - 09:15 şantiye ritmi.</p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">08:30 - Saha Durumu Paylaşımı</strong>
                  <span className="text-slate-400 text-[11px]">"Şahin Manitou Tozkoparan'da palet indirmeye hazır. Hayırlı işler!" (Güngören konum etiketiyle).</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">09:00 - Google Business Profiline 1 Fotoğraf</strong>
                  <span className="text-slate-400 text-[11px]">Google'ın yerel haritalarda profilimizi diri tutmasını sağlar.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">17:30 - Gün Sonu Yorum & Müşteri Datası Toplama</strong>
                  <span className="text-slate-400 text-[11px]">İş biten kalfa/müteahhitten 5 yıldızlı yorum alıp CRM'e müşteri kaydetme.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 3: RAKİP YORUM ANALİZİ & SICAK MÜŞTERİ HAVUZU */}
      {activeTab === 'competitor_intel' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-sm">Rakiplerin Gönderilerinde Fiyat ve Şart Soran Sıcak Müşteriler</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rakip vinç ve inşaat firmalarının sayfalarına yorum atan veya kentsel dönüşüm gruplarında teklif isteyenler otomatik ayrıştırılır.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30">
                {competitorLeads.length} Müşteri İletişim Bekliyor
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {competitorLeads.map(lead => (
                <div key={lead.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white">{lead.clientName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {lead.intentLevel}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block font-mono">{lead.source} · {lead.extractedDate}</span>
                    <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 italic">
                      "{lead.inquirySnippet}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">{lead.phoneOrHandle}</span>
                    <button
                      onClick={() => {
                        setOutreachRecipient(lead.phoneOrHandle);
                        setActiveTab('outreach_engine');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Teklif Yaz</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEKME 4: DOĞRUDAN BİREYSEL REKLAM & TEKLİF FIRLATICI */}
      {activeTab === 'outreach_engine' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Hedef Odaklı Teklif Kampanyası Seçimi</h3>
              <p className="text-xs text-slate-400 mt-0.5">Müşterinin tam ihtiyacına göre özelleştirilmiş tanıtım formatı.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Kampanya Teması</label>
                <select
                  value={campaignTarget}
                  onChange={e => setCampaignTarget(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="manitou_dar_sokak">🚜 Manitou: Dar Sokakta Vinç Alternatifi & Sıfır Ceza</option>
                  <option value="kentsel_donusum_c35">🏗️ Embay Yapı: C35 Beton, Statik Garanti & Ağaç Bağışı</option>
                  <option value="acil_tir_indirme">⚡ Acil Servis: 20 Dakikada Şantiyede Tır Boşaltma</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Gönderim Kanalı</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setOutreachMedium('whatsapp')}
                    className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      outreachMedium === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() => setOutreachMedium('sms')}
                    className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      outreachMedium === 'sms' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Toplu SMS</span>
                  </button>
                  <button
                    onClick={() => setOutreachMedium('email')}
                    className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      outreachMedium === 'email' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>E-Posta</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Alıcı / Müşteri Bilgisi (İsteğe Bağlı)</label>
                <input
                  type="text"
                  placeholder="Örn: 0532 555 12 34 veya Hedef Şantiye"
                  value={outreachRecipient}
                  onChange={e => setOutreachRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-emerald-400 block">💡 Dönüşüm İpucu:</span>
                <p>Dar sokakta vinç bekleyen müteahhide genel inşaat reklamı değil, doğrudan "20 dakikada tırı boşaltıp yolu açıyoruz" mesajı atmak %78 daha yüksek geri dönüş sağlar.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Otomatik Üretilen Doğrudan Teklif & Reklam Metni
                </span>
                <span className="text-[10px] text-slate-400">Kişiselleştirilmiş</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans font-medium min-h-60">
                {generateOutreachContent()}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Tek tıkla kopyalayıp WhatsApp veya SMS paneline yapıştırabilirsiniz.
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyOutreach}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  <Send className="w-4 h-4" />
                  <span>{copiedText ? 'Metin Kopyalandı!' : 'Metni Kopyala & Gönder'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
