import { useState } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Plus, 
  Building, 
  Phone, 
  MapPin, 
  Mail, 
  ShieldCheck, 
  Database, 
  Send, 
  Trash2, 
  Edit3, 
  FileDown, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Sparkles, 
  Target, 
  PieChart, 
  Clock, 
  Briefcase 
} from 'lucide-react';
import { usePersistentStorage, InvestorClientProfile } from '../hooks/usePersistentStorage';
import { BUSINESS_INFO } from '../data/marketingData';

export function ClientInvestorCrm() {
  const { 
    investorProfiles, 
    addInvestorProfile, 
    updateInvestorProfile, 
    deleteInvestorProfile, 
    exportAllDataKvkk 
  } = usePersistentStorage();

  const [activeTab, setActiveTab] = useState<'profiles_list' | 'add_modal' | 'strategy_timeline'>('profiles_list');
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [selectedProfile, setSelectedProfile] = useState<InvestorClientProfile | null>(null);

  // Yeni Müşteri & Yatırımcı Form State'leri
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cityDistrict, setCityDistrict] = useState('Güngören / Tozkoparan Mah.');
  const [clientSegment, setClientSegment] = useState<InvestorClientProfile['clientSegment']>('Arsa Sahibi (Kentsel Dönüşüm)');
  const [primaryDemand, setPrimaryDemand] = useState('');
  const [investmentBudget, setInvestmentBudget] = useState<number | ''>(5000000);
  const [investmentHorizon, setInvestmentHorizon] = useState<InvestorClientProfile['investmentHorizon']>('Orta Vade (6-12 Ay)');
  const [companyExecutionPlan, setCompanyExecutionPlan] = useState('');
  const [projectedMinimalProfitRate, setProjectedMinimalProfitRate] = useState<number | ''>(50);
  const [periodicAdStrategy, setPeriodicAdStrategy] = useState<InvestorClientProfile['periodicAdStrategy']>('Aylık İmar Durumu ve Kat Karşılığı Raporu');
  const [kvkkConsentConfirmed, setKvkkConsentConfirmed] = useState(true);
  const [outreachSuccessNotice, setOutreachSuccessNotice] = useState<string | null>(null);

  // Toplam Portföy Sermayesi & Kâr Hesaplamaları
  const totalCapitalInPortfolio = investorProfiles.reduce((sum, p) => sum + (p.investmentBudget || 0), 0);
  const totalProjectedProfit = investorProfiles.reduce((sum, p) => sum + (p.projectedProfitAmount || 0), 0);
  const totalProfilesCount = investorProfiles.length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !primaryDemand.trim()) {
      alert('Lütfen Müşteri Adı, Telefonu ve Ana Talebini eksiksiz girin.');
      return;
    }

    const budgetNum = Number(investmentBudget) || 0;
    const rateNum = Number(projectedMinimalProfitRate) || 0;
    const calculatedProfit = Math.round(budgetNum * (rateNum / 100));

    addInvestorProfile({
      fullName,
      phone,
      email,
      cityDistrict,
      clientSegment,
      primaryDemand,
      investmentBudget: budgetNum,
      investmentHorizon,
      companyExecutionPlan: companyExecutionPlan || 'Embay Yapı & Şahin Manitou saha uygulama protokolü.',
      projectedMinimalProfitRate: rateNum,
      projectedProfitAmount: calculatedProfit,
      periodicAdStrategy,
      lastContactedAt: new Date().toISOString().slice(0, 10),
      nextOutreachDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      kvkkConsentGiven: true
    }, kvkkConsentConfirmed);

    // Formu Sıfırla
    setFullName('');
    setPhone('');
    setEmail('');
    setPrimaryDemand('');
    setCompanyExecutionPlan('');
    setActiveTab('profiles_list');
  };

  const handleSimulateAdOutreach = (profile: InvestorClientProfile) => {
    const text = encodeURIComponent(
      `Sayın ${profile.fullName},\n\nEmbay Yapı & Şahin Manitou olarak yatırım planınız ve talebiniz doğrultusunda periyodik güncellememiz:\n` +
      `📌 Proje / Talep: ${profile.primaryDemand}\n` +
      `🏗️ Şirket Uygulama Taahhüdümüz: ${profile.companyExecutionPlan}\n` +
      `📈 Hedeflenen Asgari Getiri / Tasarruf: %${profile.projectedMinimalProfitRate} (~${profile.projectedProfitAmount.toLocaleString('tr-TR')} ₺)\n` +
      `📞 Detaylı saha toplantısı ve kahvemizi içmek için: ${BUSINESS_INFO.phone} (Samet Bey)`
    );
    window.open(`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
    setOutreachSuccessNotice(`${profile.fullName} için ${profile.periodicAdStrategy} başarıyla oluşturuldu.`);
    setTimeout(() => setOutreachSuccessNotice(null), 3500);
  };

  const filteredProfiles = investorProfiles.filter(p => {
    const matchesSearch = p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.cityDistrict.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.phone.includes(searchQuery);
    const matchesSegment = segmentFilter === 'all' || p.clientSegment === segmentFilter;
    return matchesSearch && matchesSegment;
  });

  return (
    <div className="space-y-6">
      {/* ÜST VİZYON KARTI & SERMAYE PORTFÖYÜ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Yerel Müşteri & Sermaye Defteri (bu tarayıcıda saklanır)</span>
            </div>
            <h2 className="text-2xl font-black text-white">
              Müşteri & Yatırımcı Portföyü, Sermaye Planı & Otomatik Reklam Stratejisi
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Müşterinin sermayesini, arsa büyüklüğünü, yatırım ufkunu ve şirketin bu planı sahada nasıl uygulayacağını kaydedin. Sistem yatırımcının gelecek yıllarda beklenen minimal kârını hesaplar ve belirlenen aralıklarla hedefli reklam/rapor fırlatır.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={exportAllDataKvkk}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition shadow-md"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span>Tüm Portföyü Dışa Aktar (JSON)</span>
            </button>
            <button
              onClick={() => setActiveTab('add_modal')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Müşteri / Yatırımcı Kaydet</span>
            </button>
          </div>
        </div>

        {/* Portföy Sermaye Özeti */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Kayıtlı Portföy Sermayesi</span>
            <div className="text-lg font-black text-white mt-0.5">
              {(totalCapitalInPortfolio / 1000000).toFixed(1)} Milyon ₺
            </div>
            <span className="text-[10px] text-slate-500">Müşteri Yatırım Gücü</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Öngörülen Asgari Kâr</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">
              +{(totalProjectedProfit / 1000000).toFixed(1)} Milyon ₺
            </div>
            <span className="text-[10px] text-emerald-500/80 font-medium">Değer Artışı & Tasarruf</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Kayıtlı Yatırımcı / Müşteri</span>
            <div className="text-lg font-black text-amber-400 mt-0.5">{totalProfilesCount} Profil</div>
            <span className="text-[10px] text-slate-500">Yalnızca bu tarayıcı (LocalStorage)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Veri Güvenliği & KVKK</span>
            <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Açık Rıza Arşivli</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">Tarihli & İmzalı</span>
          </div>
        </div>
      </div>

      {outreachSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{outreachSuccessNotice}</span>
        </div>
      )}

      {/* SEKMELER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('profiles_list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'profiles_list'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kayıtlı Müşteri & Yatırımcı Profilleri ({filteredProfiles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('add_modal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'add_modal'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Müşteri & Sermaye Kartı Ekle</span>
          </button>
        </div>

        {/* Arama ve Segment Filtresi */}
        {activeTab === 'profiles_list' && (
          <div className="flex items-center gap-2 text-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="İsim, ilçe veya tel ara..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={segmentFilter}
              onChange={e => setSegmentFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Tüm Müşteri Tipleri</option>
              <option value="Arsa Sahibi (Kentsel Dönüşüm)">Arsa Sahipleri</option>
              <option value="Müteahhit / Yüklenici (İş Makinesi)">Müteahhit / Kalfalar</option>
              <option value="Bireysel Yatırımcı (Kat Karşılığı/Daire)">Bireysel Yatırımcılar</option>
            </select>
          </div>
        )}
      </div>

      {/* SEKME 1: PROFİLLER LİSTESİ VE REKLAM STRATEJİSİ EYLEMLERİ */}
      {activeTab === 'profiles_list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map(profile => (
            <div 
              key={profile.id} 
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-lg"
            >
              <div className="space-y-3">
                {/* Başlık & Segment */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>{profile.fullName}</span>
                    </h3>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{profile.cityDistrict}</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {profile.clientSegment.split(' ')[0]}
                  </span>
                </div>

                {/* İletişim */}
                <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono font-bold text-white">{profile.phone}</span>
                  </div>
                  {profile.email && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                </div>

                {/* Talep & Şirket Planı */}
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Müşterinin Ana Talebi:</span>
                    <p className="text-slate-200 line-clamp-2 italic text-[11px]">"{profile.primaryDemand}"</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase block">Şirketin Uygulama Taahhüdü:</span>
                    <p className="text-slate-300 line-clamp-2 text-[11px]">{profile.companyExecutionPlan}</p>
                  </div>
                </div>

                {/* Sermaye & Kâr Hesaplaması */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Sermaye / Bütçe</span>
                    <span className="font-bold text-white font-mono">
                      {profile.investmentBudget >= 1000000 
                        ? `${(profile.investmentBudget / 1000000).toFixed(1)} M ₺`
                        : `${profile.investmentBudget.toLocaleString('tr-TR')} ₺`}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-emerald-400 block">Asgari Kâr Oranı</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      +%{profile.projectedMinimalProfitRate} (~{(profile.projectedProfitAmount / 1000).toFixed(0)}k ₺)
                    </span>
                  </div>
                </div>

                {/* Belirlenen Periyodik Reklam Stratejisi */}
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px]">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Atanmış Reklam Stratejisi:</span>
                  <span className="text-amber-400 font-semibold">{profile.periodicAdStrategy}</span>
                </div>
              </div>

              {/* Alt Butonlar: WhatsApp Teklif Fırlat & Sil */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => deleteInvestorProfile(profile.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition cursor-pointer"
                  title="Kaydı Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSimulateAdOutreach(profile)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-950/40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Stratejik Rapor & Teklif Gönder</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SEKME 2: YENİ MÜŞTERİ / YATIRIMCI PROFİL FORMU */}
      {activeTab === 'add_modal' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base">Yeni Müşteri & Yatırımcı Profili Kayıt Formu</h3>
            <p className="text-xs text-slate-400 mt-1">
              Bu klasik araç verileri yalnızca bu tarayıcının yerel hafızasında tutar; kalıcı CRM için Ops Center → İnşaat / Makine Kiralama modüllerini kullanın. Belirlenen reklam stratejisi ile bu müşteriye periyodik tanıtım yapılır.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Müşteri / Yatırımcı Adı Soyadı *</label>
                <input
                  type="text"
                  placeholder="Örn: Hasan Yılmaz"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Telefon Numarası *</label>
                <input
                  type="text"
                  placeholder="Örn: 0532 555 12 34"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">İlçe / Mahalle / Şantiye Yeri</label>
                <input
                  type="text"
                  value={cityDistrict}
                  onChange={e => setCityDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Müşteri Segmenti</label>
                <select
                  value={clientSegment}
                  onChange={e => setClientSegment(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Arsa Sahibi (Kentsel Dönüşüm)">Arsa Sahibi (Kentsel Dönüşüm)</option>
                  <option value="Müteahhit / Yüklenici (İş Makinesi)">Müteahhit / Yüklenici (İş Makinesi)</option>
                  <option value="Bireysel Yatırımcı (Kat Karşılığı/Daire)">Bireysel Yatırımcı (Kat Karşılığı/Daire)</option>
                  <option value="Şantiye Kalfası / Ustabaşı">Şantiye Kalfası / Ustabaşı</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Müşteri Sermayesi / Bütçe (₺)</label>
                <input
                  type="number"
                  placeholder="Örn: 10000000"
                  value={investmentBudget}
                  onChange={e => setInvestmentBudget(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Beklenen Asgari Kâr / Getiri Oranı (%)</label>
                <input
                  type="number"
                  placeholder="Örn: 50"
                  value={projectedMinimalProfitRate}
                  onChange={e => setProjectedMinimalProfitRate(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Müşterinin Ana Talebi & Beklentisi *</label>
                <textarea
                  rows={3}
                  placeholder="Örn: 500 m² arsamız var, müteahhit arıyoruz. En az %55 daire paylaşımı ve 1. sınıf beton kalitesi istiyoruz..."
                  value={primaryDemand}
                  onChange={e => setPrimaryDemand(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Şirketimizin Bu Planı Nasıl Uygulayacağı (Taahhüt)</label>
                <textarea
                  rows={3}
                  placeholder="Örn: C35 yüksek dayanımlı beton, çift hızlı modern asansör, 14 ay teslim garantisi ve Şahin Manitou ile dar sokakta sıfır zayiat..."
                  value={companyExecutionPlan}
                  onChange={e => setCompanyExecutionPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Yatırım Ufku / Zamanlama</label>
                <select
                  value={investmentHorizon}
                  onChange={e => setInvestmentHorizon(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Acil (1-3 Gün)">Acil (1-3 Gün - Manitou Kiralama)</option>
                  <option value="Kısa Vade (1-3 Ay)">Kısa Vade (1-3 Ay - Keşif & Ön Anlaşma)</option>
                  <option value="Orta Vade (6-12 Ay)">Orta Vade (6-12 Ay - Kentsel Dönüşüm Projesi)</option>
                  <option value="Uzun Vade (1-2 Yıl)">Uzun Vade (1-2 Yıl - Büyük Arsa Yatırımı)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Periyodik Uygulanacak Reklam & Teklif Stratejisi</label>
                <select
                  value={periodicAdStrategy}
                  onChange={e => setPeriodicAdStrategy(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Aylık İmar Durumu ve Kat Karşılığı Raporu">Aylık İmar Durumu ve Kat Karşılığı Raporu</option>
                  <option value="Haftalık Manitou İndirim SMS">Haftalık Manitou İndirim SMS</option>
                  <option value="Özel VIP WhatsApp Teklifi">Özel VIP WhatsApp Teklifi</option>
                  <option value="Şantiye Çözüm Bülteni">Şantiye Çözüm Bülteni</option>
                </select>
              </div>
            </div>

            {/* KVKK Onay Kutusu (Zorunlu) */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={kvkkConsentConfirmed}
                  onChange={e => setKvkkConsentConfirmed(e.target.checked)}
                  className="rounded text-emerald-500"
                  required
                />
                <span>Müşteri açık rıza beyanı alınmış olup, KVKK kapsamında veritabanına kaydedilmesini onaylıyorum.</span>
              </label>
              <span className="text-[10px] text-slate-500 block">
                Kayıt Tarihi: {new Date().toLocaleDateString('tr-TR')} · Yalnızca bu tarayıcıda saklanır.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('profiles_list')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition cursor-pointer"
              >
                İptal
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Müşteri & Sermaye Kartını Arşive Kaydet</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
