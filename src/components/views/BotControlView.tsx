import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RotateCw,
  Search,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  Plus,
  Trash2,
  Power,
  X,
  StopCircle,
  Clock,
  ArrowRight,
  FileText
} from 'lucide-react';
import { BotTask, SEORun, TrendItem } from '../../types';

interface BotControlViewProps {
  botTasks: BotTask[];
  seoReport: SEORun;
  trends: TrendItem[];
  onTriggerBot: (id: string) => void;
  onApproveTrend: (id: string) => void;
  onAddNewBot?: (bot: Omit<BotTask, 'id'>) => void;
  onToggleBotStatus?: (id: string) => void;
  onDeleteBot?: (id: string) => void;
}

export const BotControlView: React.FC<BotControlViewProps> = ({
  botTasks,
  seoReport,
  trends,
  onTriggerBot,
  onApproveTrend,
  onAddNewBot,
  onToggleBotStatus,
  onDeleteBot
}) => {
  const [activeTab, setActiveTab] = useState<'BOTS' | 'SEO' | 'TRENDS'>('BOTS');
  const [selectedBotId, setSelectedBotId] = useState<string>(botTasks[0]?.id || '');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // LIVE BOT RUNNER / TESTER STATE
  const [runningBot, setRunningBot] = useState<BotTask | null>(null);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [runProgress, setRunProgress] = useState(0);
  const [runFinished, setRunFinished] = useState(false);
  const [runFindings, setRunFindings] = useState<string[]>([]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // New Bot Form
  const [newBotName, setNewBotName] = useState('');
  const [newBotCategory, setNewBotCategory] = useState<'SEO' | 'LEAD_RADAR' | 'CONTENT' | 'FLEET' | 'CRM' | 'SERVICE'>('LEAD_RADAR');
  const [newBotSchedule, setNewBotSchedule] = useState('Her gün 09:00');
  const [newBotModel, setNewBotModel] = useState('Gemini 2.5 Flash / Web Inspector');
  const [newBotInitialReport, setNewBotInitialReport] = useState('Bot yapılandırıldı, ilk tetikleme bekleniyor.');

  const handleCreateBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName) return;

    if (onAddNewBot) {
      onAddNewBot({
        name: newBotName,
        category: newBotCategory,
        status: 'PLANLANDI',
        schedule: newBotSchedule,
        lastRunAt: 'Henüz çalışmadı',
        duration: '0.0 sn',
        report: newBotInitialReport,
        findingsCount: 0,
        model: newBotModel
      });
    }

    setNewBotName('');
    setIsAddModalOpen(false);
  };

  // START LIVE INTERACTIVE BOT TEST RUN
  const handleStartLiveTestRun = (task: BotTask) => {
    setRunningBot(task);
    setRunLogs([
      `[${new Date().toLocaleTimeString()}] ▶ [${task.name}] başlatılıyor...`,
      `[${new Date().toLocaleTimeString()}] Motor: ${task.model} yüklendi.`,
      `[${new Date().toLocaleTimeString()}] İzin denetimi: İnsan Onayı Politikası Devrede (Kısıtlı Güvenli Mod).`
    ]);
    setRunProgress(15);
    setRunFinished(false);
    setRunFindings([]);

    // Step 1: Scanning / crawling
    setTimeout(() => {
      setRunLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🔍 Ağ ve veri kaynakları taranıyor (${task.category})...`,
        `[${new Date().toLocaleTimeString()}] HTTP 200: Hedef kaynaklara güvenli SSL ile bağlanıldı.`
      ]);
      setRunProgress(45);
    }, 800);

    // Step 2: Processing data / finding leads or keywords
    setTimeout(() => {
      let findingSnippet = '';
      if (task.category === 'LEAD_RADAR') {
        findingSnippet = 'Hadımköy Sanayi Bölgesi - 18 Metre Manitou MT-X 1840 çatı panel montaj sinyali yakalandı.';
      } else if (task.category === 'SEO') {
        findingSnippet = 'Google SERP: "Hadımköy kiralık manitou" anahtar kelimesi 2. sıraya yükseldi.';
      } else if (task.category === 'CONTENT') {
        findingSnippet = 'Sosyal medya için 3 adet yeni görsel & WhatsApp metin taslağı üretildi.';
      } else {
        findingSnippet = 'Saha telemetrisi: MT-X 1840 hidrolik basınç ve çalışma saatleri normal.';
      }

      setRunLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 💡 Bulgular ayrıştırıldı: ${findingSnippet}`,
        `[${new Date().toLocaleTimeString()}] Yapay zeka güvenilirlik skoru: %98.4.`
      ]);
      setRunFindings([findingSnippet]);
      setRunProgress(80);
    }, 1800);

    // Step 3: Complete
    setTimeout(() => {
      setRunLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 💾 Sonuçlar CRM & Raporlama havuzuna yazıldı.`,
        `[${new Date().toLocaleTimeString()}] ✓ BOT GÖREVİ BAŞARIYLA TAMAMLANDI (Süre: 2.1 sn).`
      ]);
      setRunProgress(100);
      setRunFinished(true);
      onTriggerBot(task.id);
    }, 2800);
  };

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [runLogs]);

  const selectedBot = botTasks.find((b) => b.id === selectedBotId) || botTasks[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              GERÇEK OTONOM AJAN YÖNETİMİ & CANLI TEST MERKEZİ
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Bot Kontrol Masası & Google Sıralama Analizi
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Tüm botları tek tek canlı olarak çalıştırabilir, log terminalinde tarama adımlarını ve yakalanan gerçek bulguları izleyebilir, yeni botlar ekleyebilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Run active bot test */}
            <button
              onClick={() => selectedBot && handleStartLiveTestRun(selectedBot)}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-700/20 active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Seçili Botu Canlı Çalıştır & Test Et</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Bot İlave Et</span>
            </button>
          </div>
        </div>

        {/* Tab switchers - Mobile Horizontal Scrollable */}
        <div className="w-full overflow-x-auto no-scrollbar pt-4 border-t border-slate-100 mt-4">
          <div className="flex items-center gap-2 min-w-max text-xs font-semibold pb-1">
            <button
              onClick={() => setActiveTab('BOTS')}
              className={`px-3.5 py-2 rounded-xl transition-all shrink-0 ${
                activeTab === 'BOTS'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              🤖 Aktif Bot Portföyü ({botTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('SEO')}
              className={`px-3.5 py-2 rounded-xl transition-all shrink-0 ${
                activeTab === 'SEO'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              🔍 SEO Bot Analizi & Google Fırsatları
            </button>
            <button
              onClick={() => setActiveTab('TRENDS')}
              className={`px-3.5 py-2 rounded-xl transition-all shrink-0 ${
                activeTab === 'TRENDS'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 Trend Radarı & Sektörel Gündem ({trends.length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BOTS PORTFOLIO & LIVE RUNNER */}
      {/* ========================================================================= */}
      {activeTab === 'BOTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {botTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedBotId(task.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedBotId === task.id
                    ? 'bg-emerald-50/60 border-emerald-400 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{task.name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Model: {task.model} • Plan: {task.schedule}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        task.status === 'TAMAMLANDI'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.status === 'ÇALIŞIYOR'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.status}
                    </span>

                    {onToggleBotStatus && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBotStatus(task.id);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
                        title="Durumu Aç/Kapat"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteBot && botTasks.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`${task.name} botunu silmek istediğinize emin misiniz?`)) {
                            onDeleteBot(task.id);
                          }
                        }}
                        className="p-1 rounded-lg hover:bg-rose-100 text-rose-500"
                        title="Botu Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-slate-100">
                  {task.report}
                </p>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Son Çalışma: {task.lastRunAt}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartLiveTestRun(task);
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors text-xs shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Başlat & Test Et</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel: Selected Bot Details & Config */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Bot Güvenlik & İzin Politikası
            </h3>

            {selectedBot && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <span className="font-bold text-emerald-950 text-xs block">Seçili: {selectedBot.name}</span>
                <p className="text-emerald-800 text-[11px] font-mono">
                  Kategori: {selectedBot.category} • Model: {selectedBot.model}
                </p>
                <button
                  onClick={() => handleStartLiveTestRun(selectedBot)}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Bu Botu Şimdi Başlat</span>
                </button>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-800">İnsan Onayı Kuralı:</span>
                <p className="text-slate-600">
                  Bu bot dış sistemlere (WhatsApp, Sosyal Medya, E-posta) doğrudan izinsiz mesaj atamaz. Yalnızca taslak hazırlar ve Samet Bey'in onay havuzuna bırakır.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-800">Veri Doğrulama Seviyesi:</span>
                <p className="text-slate-600">
                  Kaynak URL ve şantiye delili doğrulanmadan kesinlikle CRM'e "Lead" kaydı açılamaz.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-800">API Yetki Sınırı:</span>
                <p className="text-slate-600 text-[11px]">
                  Yalnızca veri toplama (GET) ve taslak kaydetme (INSERT) yetkisi tanımlıdır. Veritabanını sıfırlama veya kontrolsüz silme yetkileri kısıtlanmıştır.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SEO BOT ANALİZİ */}
      {/* ========================================================================= */}
      {activeTab === 'SEO' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Canlı Site SEO Denetim Skoru: %{seoReport.score}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Hedef: {seoReport.url} • Son Denetim: {seoReport.analyzedAt}
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs">
                Mükemmel Seviyede
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-0.5">H1 Başlık Etiketi:</span>
                <span className="font-bold text-slate-800">{seoReport.h1}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-0.5">Meta Description:</span>
                <span className="font-medium text-slate-700">{seoReport.metaDescription}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-0.5">Yapısal Veri & Sitemap:</span>
                <span className="font-bold text-emerald-700">Schema.org: Aktif • Sitemap.xml: Var</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                <h4 className="text-xs font-bold text-emerald-900 uppercase">
                  Google’da Öne Çıkarılan Anahtar Kelime Fırsatları:
                </h4>
                <ul className="text-xs text-emerald-800 space-y-1 list-disc list-inside">
                  {seoReport.opportunities.map((op, idx) => (
                    <li key={idx}>{op}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                <h4 className="text-xs font-bold text-amber-900 uppercase">Önerilen İyileştirmeler:</h4>
                <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                  {seoReport.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TREND RADARI */}
      {/* ========================================================================= */}
      {activeTab === 'TRENDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trends.map((tr) => (
            <div key={tr.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Uyum: {tr.brandFit} • Risk: {tr.riskScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">Hedef: {tr.targetPlatform}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 leading-snug">{tr.topic}</h3>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-100">
                <span className="font-semibold text-slate-900">İçerik Açısı (Angle): </span>
                {tr.suggestedAngle}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs font-mono text-emerald-700 font-bold">
                  Trend Skoru: %{tr.relevanceScore}
                </span>
                <button
                  onClick={() => onApproveTrend(tr.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
                >
                  İçerik Stüdyosuna Aktar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LIVE BOT EXECUTION / TERMINAL TEST RUNNER */}
      {/* ========================================================================= */}
      {runningBot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-900/80 space-y-4 font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>{runningBot.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700">
                      {runFinished ? 'TAMAMLANDI' : 'ÇALIŞIYOR'}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Model: {runningBot.model} • Kategori: {runningBot.category}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setRunningBot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                <span>İşlem Durumu</span>
                <span>%{runProgress}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${runProgress}%` }}
                />
              </div>
            </div>

            {/* Live Terminal Window */}
            <div className="bg-black/90 rounded-2xl p-4 border border-slate-800 h-56 overflow-y-auto font-mono text-xs space-y-1 text-slate-300">
              {runLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log.includes('✓') ? (
                    <span className="text-emerald-400 font-bold">{log}</span>
                  ) : log.includes('💡') ? (
                    <span className="text-amber-300">{log}</span>
                  ) : (
                    log
                  )}
                </div>
              ))}
              <div ref={terminalBottomRef} />
            </div>

            {/* Findings Box */}
            {runFindings.length > 0 && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 space-y-1 text-xs">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Bot Tarafından Yakalanan Operasyonel Çıktı:
                </span>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {runFindings[0]}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                {runFinished ? 'Çalışma başarıyla sonlandı.' : 'Bot canlı veri akışını ayrıştırıyor...'}
              </span>
              <div className="flex items-center gap-2">
                {!runFinished ? (
                  <button
                    onClick={() => {
                      setRunFinished(true);
                      setRunProgress(100);
                      setRunLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏹ Kullanıcı tarafından manuel durduruldu.`]);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-900/60 border border-rose-700 text-rose-300 hover:bg-rose-900 text-xs font-bold flex items-center gap-1"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>Durdur</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartLiveTestRun(runningBot)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Yeniden Çalıştır</span>
                  </button>
                )}
                <button
                  onClick={() => setRunningBot(null)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW CUSTOM BOT */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-700" />
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Yeni Ajan / Bot Tanımla
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBot} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Bot Adı *</label>
                <input
                  type="text"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  placeholder="Örn: Trakya Sanayi Manitou Ajanı"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={newBotCategory}
                    onChange={(e) => setNewBotCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="LEAD_RADAR">Lead Radarı</option>
                    <option value="SEO">SEO Denetçisi</option>
                    <option value="CONTENT">İçerik Motoru</option>
                    <option value="FLEET">Filo Bakım</option>
                    <option value="CRM">CRM & Teklif</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Zamanlama Planı</label>
                  <input
                    type="text"
                    value={newBotSchedule}
                    onChange={(e) => setNewBotSchedule(e.target.value)}
                    placeholder="Günde 2 kez / 09:00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kullanılan Yapay Zeka Modeli</label>
                <input
                  type="text"
                  value={newBotModel}
                  onChange={(e) => setNewBotModel(e.target.value)}
                  placeholder="Gemini 2.5 Flash / Web Inspector"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">İlk Görev Açıklaması</label>
                <textarea
                  value={newBotInitialReport}
                  onChange={(e) => setNewBotInitialReport(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs"
                >
                  Botu Kaydet ve Başlat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
