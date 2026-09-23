import { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Calendar, 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Share2, 
  Send, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  ExternalLink, 
  Award, 
  Users, 
  Zap, 
  Play, 
  Pause,
  AlertCircle,
  Building,
  Truck
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

interface DailyBulletin {
  date: string;
  issueNumber: number;
  ironPriceChange: string;
  cementIndex: string;
  manitouHourlyAverage: string;
  hotHeadline: string;
  editorialComment: string;
  hotProjectsSummary: string;
  safetyTip: string;
}

interface TeamTask {
  id: string;
  title: string;
  assignee: 'Operatör (Manitou)' | 'Şantiye Kalfası' | 'Yönetici / Samet' | 'Sosyal Medya Sorumlusu';
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface BotSchedule {
  id: string;
  time: string;
  platform: 'Instagram' | 'Google Haritalar (GBP)' | 'WhatsApp Şantiye Bülteni';
  concept: string;
  status: 'active' | 'paused';
  samplePrompt: string;
}

export function ExecutiveCommandCenter() {
  const [activeSubTab, setActiveSubTab] = useState<'bulletin' | 'weekly_recap' | 'auto_bots' | 'team_tasks'>('bulletin');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Günlük Canlı Bülten Verisi
  const [bulletin, setBulletin] = useState<DailyBulletin>({
    date: 'Bugün (Canlı Şantiye Raporu)',
    issueNumber: 42,
    ironPriceChange: '27.400 ₺ / Ton (%0.8 artış)',
    cementIndex: '2.150 ₺ / Ton (Stabil)',
    manitouHourlyAverage: 'İstanbul Avrupa Yakası: İşe özel net teklif',
    hotHeadline: 'Güngören & Bağcılar Kentsel Dönüşümünde 3. Etap Ruhsatları Dağıtılmaya Başlandı',
    editorialComment: 'Tozkoparan ve Merter aksında dar sokak lojistiği kritik seviyede. Tırlar gün içinde sokaklara giremediği için yükleme ve boşaltma saatleri gece 22:00 - sabah 08:00 arasına kayıyor. Teleskopik yükleyiciler bu dar boğazın tek kurtarıcısı.',
    hotProjectsSummary: 'Avrupa Yakasında bugün 18 aktif kaba inşaatta kat tabliyesi betonu döküldü, 14 şantiyeye tuğla/ytong sevkiyatı yapıldı.',
    safetyTip: 'Dar sokaklarda Manitou ayak basma pabuçlarının altına çelik/ahşap takoz koymadan bom açmayınız.'
  });

  // 2. Haftanın Enleri & Biten İşler Bülteni
  const weeklyRecap = {
    weekTitle: 'Haftanın Şantiye Karnesi & Biten İşler',
    totalPalletsLifted: '142 Palet Malzeme',
    tonsHandled: '~180 Ton Yük',
    districtsWorked: ['Güngören', 'Tozkoparan', 'Bağcılar', 'Merter', 'Bakırköy'],
    heroProject: 'Tozkoparan 5 Katlı Kentsel Dönüşüm Binası — 4 tır dolusu tuğla 3. ve 4. kat balkonlarına 4 saatte sıfır zayiatla teslim edildi.',
    embayConstructionMilestone: 'Güngören projemizde temel demir bağlama aşaması tamamlandı, C35 beton dökümüne başlanıyor.',
    clientQuote: '"Vinç sokağa girememişti, Şahin Manitou gelip 2 saatte tırı boşalttı, ustalar işi bırakmak zorunda kalmadı." — Şantiye Şefi Mehmet Bey',
    instagramPostTemplate: `🏆 HAFTANIN ŞANTİYE KARNESİ | Embay Yapı & Şahin Manitou

Bu hafta İstanbul Avrupa Yakası sokaklarındaydık! 🚜🏗️
Geçtiğimiz 7 günde ekibimiz ve iş makinelerimizle:
✅ 142 Palet inşaat malzemesini katlara sıfır zayiatla ulaştırdık.
✅ 180+ Ton yükü dar sokaklarda trafiği tıkamadan sevk ettik.
✅ Embay Yapı Güngören kentsel dönüşüm projemizde temel demirlerini tamamlayıp C35 beton aşamasına geçtik!

Şantiyenizde işlerin aksamaması ve zaman kazanmak için biz buradayız.
📞 7/24 Şantiye Sevkiyatı: 0531 436 29 04
📍 Güngören / İstanbul
📸 Projelerimiz: @embayyapi`
  };

  // 3. AI Bot Otomatik Paylaşım Çizelgesi (Bot Kuralları)
  const [botSchedules, setBotSchedules] = useState<BotSchedule[]>([
    {
      id: 'bot-1',
      time: '08:30 (Sabah Şantiye Başlangıcı)',
      platform: 'Google Haritalar (GBP)',
      concept: 'Güne Başlangıç: "Makine Sahada Nöbette"',
      status: 'active',
      samplePrompt: 'Şahin Manitou’nun hazır ve bakımlı Tozkoparan’da şantiyeye sevk edildiğini belirten acil vinç alternatifi gönderisi oluştur.'
    },
    {
      id: 'bot-2',
      time: '12:30 (Öğle Molası)',
      platform: 'Instagram',
      concept: 'Şantiyeden Canlı Kesit (Reels / Story)',
      status: 'active',
      samplePrompt: 'Tırdan balkona tuğla uzatan Manitou’nun 15 saniyelik videosu için dikkat çekici kanca ve @embayyapi çağrısı hazırla.'
    },
    {
      id: 'bot-3',
      time: '18:30 (Paydos / Gün Sonu Bülteni)',
      platform: 'WhatsApp Şantiye Bülteni',
      concept: 'Günlük Şantiye & Malzeme Fiyat Bülteni',
      status: 'active',
      samplePrompt: 'Müteahhit ve taşeronlara WhatsApp üzerinden gönderilecek demir fiyatları ve yarınki kiralık makine boşluk durumu metni.'
    },
    {
      id: 'bot-4',
      time: 'Cuma 17:00 (Hafta Sonu Kapanışı)',
      platform: 'Instagram',
      concept: 'Haftanın Enleri & Biten İşler Carousel Postu',
      status: 'active',
      samplePrompt: 'Hafta boyunca taşınan palet sayısını ve biten Embay Yapı kentsel dönüşüm aşamalarını özetleyen kurumsal post.'
    }
  ]);

  // 4. Ekip Görev Yönetimi (Kanban / Görev Paylaştırma)
  const [tasks, setTasks] = useState<TeamTask[]>([
    {
      id: 'task-1',
      title: 'Tozkoparan şantiyesine 2 tır Ytong paleti indirme operasyonu (Saat 14:00)',
      assignee: 'Operatör (Manitou)',
      deadline: 'Bugün 14:00',
      status: 'in_progress',
      priority: 'high'
    },
    {
      id: 'task-2',
      title: 'Güngören projesinde C35 beton mikserlerinin geliş saatini teyit et',
      assignee: 'Şantiye Kalfası',
      deadline: 'Yarın 09:30',
      status: 'pending',
      priority: 'high'
    },
    {
      id: 'task-3',
      title: 'Haftalık bülten ve Reels videosunu @embayyapi hesabında saat 12:30’da yayına al',
      assignee: 'Sosyal Medya Sorumlusu',
      deadline: 'Bugün 12:30',
      status: 'completed',
      priority: 'medium'
    },
    {
      id: 'task-4',
      title: 'Bağcılar kentsel dönüşüm ada sakinleriyle kat karşılığı teklif toplantısı',
      assignee: 'Yönetici / Samet',
      deadline: 'Perşembe 15:00',
      status: 'pending',
      priority: 'high'
    }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<TeamTask['assignee']>('Operatör (Manitou)');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: TeamTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      assignee: newTaskAssignee,
      deadline: newTaskDeadline || 'Bugün',
      status: 'pending',
      priority: 'medium'
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskDeadline('');
  };

  const toggleTaskStatus = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'pending' ? 'in_progress' : t.status === 'in_progress' ? 'completed' : 'pending';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const toggleBotStatus = (id: string) => {
    setBotSchedules(botSchedules.map(b => {
      if (b.id === id) {
        return { ...b, status: b.status === 'active' ? 'paused' : 'active' };
      }
      return b;
    }));
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ÜST YÖNETİCİ PANEL BANNERI */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-2">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              Yönetici Komuta Merkezi • Günlük Bülten, Ekip Yönetimi & AI Botlar
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Embay Yapı & Şahin Manitou Akıllı Yönetim & Yayın Masası
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              İnşaat piyasa bülteni üretin, sosyal medyada haftanın enlerini paylaşın, AI bot kurallarıyla belirli saatlerde otomatik paylaşım planlayın ve saha ekibinize görev dağıtın.
            </p>
          </div>

          {/* Hızlı İstatistikler */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Örnek Bot Planı (statik)</span>
              <span className="text-lg font-black text-emerald-400">
                {botSchedules.filter(b => b.status === 'active').length} / {botSchedules.length}
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Açık Görevler</span>
              <span className="text-lg font-black text-amber-400">
                {tasks.filter(t => t.status !== 'completed').length}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Alt Sekme Navigasyonu */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('bulletin')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'bulletin'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>1. Günlük İnşaat & Şantiye Bülteni</span>
          </button>

          <button
            onClick={() => setActiveSubTab('weekly_recap')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'weekly_recap'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>2. Haftanın Enleri & Biten İşler</span>
          </button>

          <button
            onClick={() => setActiveSubTab('auto_bots')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'auto_bots'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>3. Saatlik AI Bot Paylaşım Çizelgesi</span>
          </button>

          <button
            onClick={() => setActiveSubTab('team_tasks')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'team_tasks'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>4. Ekip Görev Paylaştırma Masası</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. GÜNLÜK İNŞAAT & ŞANTİYE BÜLTENİ                       */}
      {/* ======================================================== */}
      {activeSubTab === 'bulletin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol Kolon: Piyasa ve Fiyat Endeksi */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Piyasa Endeksi (Bugün)</span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Sayı #{bulletin.issueNumber}</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">İnşaat Demiri (Ton / İstanbul Fabrika)</span>
                  <span className="text-base font-bold text-white">{bulletin.ironPriceChange}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Hazır Beton & Çimento Eğilimi</span>
                  <span className="text-base font-bold text-white">{bulletin.cementIndex}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30">
                  <span className="text-[11px] text-emerald-400 block font-semibold">Teleskopik Yükleyici (Manitou) Kiralama</span>
                  <span className="text-xs font-bold text-white mt-1 block">Saatlik & Günlük Esnek Tarife</span>
                  <span className="text-[11px] text-slate-400">Sabit liste yok, işe özel net teklif: 0531 436 29 04</span>
                </div>
              </div>
            </div>

            {/* İSG / Güvenlik Hatırlatması */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Günün Saha & İSG Hatırlatması
              </span>
              <p className="text-xs text-amber-200/90 leading-relaxed">{bulletin.safetyTip}</p>
            </div>
          </div>

          {/* Sağ Kolon: Günlük Dijital Gazete / Bülten Formatı */}
          <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">İstanbul Şantiye & Dönüşüm Gazetesi</span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1">{bulletin.hotHeadline}</h3>
              </div>
              <button
                onClick={() => {
                  const bultenMetni = `📰 GÜNLÜK ŞANTİYE & İNŞAAT BÜLTENİ (Sayı #${bulletin.issueNumber})\nEmbay Yapı & Şahin Manitou\n\n📌 Gündem: ${bulletin.hotHeadline}\n\n📊 Piyasa Durumu:\n- İnşaat Demiri: ${bulletin.ironPriceChange}\n- Çimento Endeksi: ${bulletin.cementIndex}\n\n🚜 Saha Raporu:\n${bulletin.editorialComment}\n\n⚠️ İSG Notu: ${bulletin.safetyTip}\n\n📞 Şantiye Sevkiyatı & Kiralık Manitou: 0531 436 29 04\n🌐 https://sahin-manitou-kiralama.vercel.app/`;
                  copyText(bultenMetni, 'bulletin');
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition"
              >
                {copiedKey === 'bulletin' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copiedKey === 'bulletin' ? 'Kopyalandı!' : 'Bülteni WhatsApp İle Paylaş'}
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs uppercase tracking-wider block text-indigo-300">
                  🎙️ Günün Saha Değerlendirmesi
                </span>
                <p>{bulletin.editorialComment}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs uppercase tracking-wider block text-amber-300">
                  🏗️ İstanbul Avrupa Yakası Şantiye Nabzı
                </span>
                <p>{bulletin.hotProjectsSummary}</p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-800">
              <span>📍 Güngören / Tozkoparan / Merter / Bağcılar / Bakırköy</span>
              <span className="text-emerald-400 font-semibold">Tüm hak sahipleri ve şantiye şefleri için ücretsiz yayınlanır.</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. HAFTANIN ENLERİ & BİTEN İŞLER BÜLTENİ                */}
      {/* ======================================================== */}
      {activeSubTab === 'weekly_recap' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
                <Award className="w-4 h-4" />
                Sosyal Medya & Müşteri Güven Postu
              </div>
              <h3 className="text-xl font-black text-white">{weeklyRecap.weekTitle}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Her Cuma günü Instagram @embayyapi hesabında paylaşılmak üzere derlenmiş haftalık başarı tablosu.</p>
            </div>

            <button
              onClick={() => copyText(weeklyRecap.instagramPostTemplate, 'weekly_post')}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-lg shadow-amber-950/40"
            >
              {copiedKey === 'weekly_post' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedKey === 'weekly_post' ? 'Kopyalandı!' : 'Instagram Gönderi Metnini Kopyala'}
            </button>
          </div>

          {/* 3 Büyük Sayısal Başarı Kartı */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-center space-y-1">
              <span className="text-xs text-slate-400 font-medium">Katlara Taşınan Malzeme</span>
              <span className="text-2xl font-black text-amber-400 block">{weeklyRecap.totalPalletsLifted}</span>
              <span className="text-[11px] text-slate-500">Tuğla, ytong, seramik, harç</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-center space-y-1">
              <span className="text-xs text-slate-400 font-medium">Toplam Kaldırılan Yük</span>
              <span className="text-2xl font-black text-emerald-400 block">{weeklyRecap.tonsHandled}</span>
              <span className="text-[11px] text-slate-500">Sıfır malzeme kırığı ve zayiat</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30 text-center space-y-1">
              <span className="text-xs text-slate-400 font-medium">Hizmet Verilen İlçeler</span>
              <span className="text-sm font-bold text-white block mt-1">5 İlçe / 12 Farklı Mahalle</span>
              <span className="text-[11px] text-slate-500">{weeklyRecap.districtsWorked.join(', ')}</span>
            </div>
          </div>

          {/* Öne Çıkan Proje & Müşteri Yorumu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                Haftanın Manitou Başarı Hikayesi
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{weeklyRecap.heroProject}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Building className="w-4 h-4" />
                Embay Yapı İnşaat İlerlemesi
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{weeklyRecap.embayConstructionMilestone}</p>
            </div>
          </div>

          {/* Hazır Instagram Post Kutusu */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300">Hazır Instagram / LinkedIn Post Taslağı:</span>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {weeklyRecap.instagramPostTemplate}
            </pre>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SAATLİK AI BOT PAYLAŞIM ÇİZELGESİ                    */}
      {/* ======================================================== */}
      {activeSubTab === 'auto_bots' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-1">
              <Bot className="w-4 h-4" />
              Sürekli Aktiflik & Otomasyon Mimarisi
            </div>
            <h3 className="text-xl font-black text-white">Zaman Ayarlı AI Bot Paylaşım Kuralları</h3>
            <p className="text-xs text-slate-400 mt-1">
              Belirlediğiniz saatlerde botlar belirli şantiye konseptleri altında içerik üretir ve sosyal medya/Google hesaplarınıza sürekli etkileşim sağlar.
            </p>
          </div>

          <div className="space-y-3">
            {botSchedules.map(bot => (
              <div 
                key={bot.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      ⏰ {bot.time}
                    </span>
                    <span className="text-xs font-bold text-white">{bot.platform}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      bot.status === 'active' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {bot.status === 'active' ? 'Aktif Çizelge' : 'Duraklatıldı'}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm">{bot.concept}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    <span className="text-slate-500">Bot Görevi:</span> {bot.samplePrompt}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleBotStatus(bot.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      bot.status === 'active'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                  >
                    {bot.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{bot.status === 'active' ? 'Duraklat' : 'Aktif Et'}</span>
                  </button>
                  <button
                    onClick={() => copyText(bot.samplePrompt, bot.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                    title="Bot Promptunu Kopyala"
                  >
                    {copiedKey === bot.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-200/90 leading-relaxed">
            💡 <strong>Nasıl Çalışır?</strong> Bu bot kuralları belirlenen saatlerde operatör veya sosyal medya yöneticinizin telefonuna hazır bildirim ve şantiye metni düşürür. Tek tıkla onaylayıp Instagram ve Google paneline basabilirsiniz.
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. EKİP GÖREV PAYLAŞTIRMA MASASI                        */}
      {/* ======================================================== */}
      {activeSubTab === 'team_tasks' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-blue-400 text-xs font-bold mb-1">
                <Users className="w-4 h-4" />
                Saha & Yönetici İş Takibi
              </div>
              <h3 className="text-xl font-black text-white">Ekip İçi Günlük & Aylık Görev Paylaşımı</h3>
              <p className="text-xs text-slate-400 mt-1">Operatörlere, kalfalara ve sosyal medya ekibine buradan anlık görev atayın, durumlarını takip edin.</p>
            </div>
          </div>

          {/* Yeni Görev Ekleme Formu */}
          <form onSubmit={addTask} className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Görev Tanımı / Şantiye İşi</label>
              <input
                type="text"
                placeholder="Örn: Merter şantiyesine tuğla palet indirme..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Kime Atandı?</label>
              <select
                value={newTaskAssignee}
                onChange={e => setNewTaskAssignee(e.target.value as TeamTask['assignee'])}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
              >
                <option value="Operatör (Manitou)">Operatör (Manitou)</option>
                <option value="Şantiye Kalfası">Şantiye Kalfası</option>
                <option value="Yönetici / Samet">Yönetici / Samet</option>
                <option value="Sosyal Medya Sorumlusu">Sosyal Medya Sorumlusu</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Termin / Zaman</label>
              <input
                type="text"
                placeholder="Bugün 16:00"
                value={newTaskDeadline}
                onChange={e => setNewTaskDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-1 flex items-end">
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ekle</span>
              </button>
            </div>
          </form>

          {/* Görev Listesi */}
          <div className="space-y-2.5">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                  task.status === 'completed'
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : task.status === 'in_progress'
                    ? 'bg-slate-950 border-amber-500/40'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTaskStatus(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                      task.status === 'completed'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : task.status === 'in_progress'
                        ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                        : 'border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {task.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                    {task.status === 'in_progress' && <Clock className="w-3.5 h-3.5" />}
                  </button>

                  <div>
                    <span className={`text-xs font-bold block ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-indigo-300">👤 {task.assignee}</span>
                      <span>•</span>
                      <span>⏳ {task.deadline}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : task.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.status === 'completed' ? 'Tamamlandı' : task.status === 'in_progress' ? 'Devam Ediyor' : 'Beklemede'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const msg = `🔔 ŞANTİYE GÖREVİ (${task.deadline}):\nSayın ${task.assignee},\n\nİş: ${task.title}\nDurum: ${task.status === 'completed' ? 'Tamamlandı' : 'Lütfen takip ediniz'}\n\nEmbay Yapı & Şahin Manitou Yönetim`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1"
                    title="Görevi WhatsApp İle İlgili Kişiye At"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700"
                    title="Görevi Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
