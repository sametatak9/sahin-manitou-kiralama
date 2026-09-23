import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Search,
  Users,
  Building,
  Truck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  Sliders,
  Layers
} from 'lucide-react';
import { BotTask, Lead, ContentItem } from '../../types';

interface DashboardViewProps {
  botTasks: BotTask[];
  onTriggerBot: (id: string) => void;
  leads: Lead[];
  onApproveLead: (id: string) => void;
  contentItems: ContentItem[];
  onApproveContent: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  botTasks,
  onTriggerBot,
  leads,
  onApproveLead,
  contentItems,
  onApproveContent,
  onNavigateTab
}) => {
  const pendingLeads = leads.filter(l => l.requiresHumanApproval);
  const pendingContent = contentItems.filter(c => c.approvalStatus === 'PENDING_APPROVAL');
  const totalPending = pendingLeads.length + pendingContent.length;

  return (
    <div className="space-y-6">
      {/* Executive Welcome Card (Light Green + White) */}
      <div className="rounded-2xl bg-white border border-emerald-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative gradient pill in light green */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-100/40 via-emerald-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold tracking-widest text-emerald-700 mb-2">
            <span className="flex items-center gap-1.5 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE OPERATIONS • 23 EYLÜL ÇARŞAMBA
            </span>
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
              Sistem Aktif & Hazır
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Günaydın, Samet Bey.
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Bugün <strong className="text-emerald-700 font-bold">6</strong> planlı bot görevi,{' '}
            <strong className="text-emerald-700 font-bold">8</strong> tamamlanan koşu ve{' '}
            <strong className="text-amber-700 font-bold">{totalPending}</strong> onay bekleyen insan kararı var.
          </p>

          {/* 4 Key Metric Cards (Light Green + White SaaS Style) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Tile 1: ÇALIŞAN BOT */}
            <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-4 transition-all hover:bg-emerald-50 hover:border-emerald-300">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ÇALIŞAN BOT
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">0</div>
              <div className="text-xs text-emerald-700/80 mt-1 font-medium">Şu an boşta</div>
            </div>

            {/* Tile 2: ONAY BEKLEYEN */}
            <div 
              onClick={() => {
                const el = document.getElementById('human-approvals');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`cursor-pointer border rounded-xl p-4 transition-all ${
                totalPending > 0 
                  ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-50' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  ONAY BEKLEYEN
                </div>
                {totalPending > 0 && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded">
                    Önemli
                  </span>
                )}
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">{totalPending}</div>
              <div className="text-xs text-amber-800/80 mt-1 font-medium">İnsan kararı</div>
            </div>

            {/* Tile 3: BUGÜNKÜ LEAD */}
            <div 
              onClick={() => onNavigateTab('crm')}
              className="cursor-pointer bg-white border border-emerald-200/90 rounded-xl p-4 transition-all hover:border-emerald-500 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  BUGÜNKÜ LEAD
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold hover:underline">CRM →</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">{leads.length}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                {leads.length} doğrulanmış fırsat
              </div>
            </div>

            {/* Tile 4: BAĞLI PLATFORM */}
            <div 
              onClick={() => onNavigateTab('connections')}
              className="cursor-pointer bg-white border border-slate-200 rounded-xl p-4 transition-all hover:border-emerald-400 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  BAĞLI PLATFORM
                </div>
                <span className="text-[10px] text-slate-500">Ayrıntı →</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">1</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">16 connector</div>
            </div>
          </div>
        </div>
      </div>

      {/* Human Approval Queue: SAMET BEY ONAY MERKEZİ (CRITICAL NO-SPAM / HUMAN-IN-THE-LOOP REQUIREMENT) */}
      {totalPending > 0 && (
        <div id="human-approvals" className="rounded-2xl bg-amber-50/60 border border-amber-300 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Samet Bey Onay Merkezi ({totalPending} Aksiyon Bekliyor)
                </h2>
                <p className="text-xs text-amber-900">
                  Botlar fırsatları ve taslakları hazırladı. Sistem politikanız gereği insan onayı olmadan hiçbir mesaj veya yayın tetiklenmez.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Pending Lead Approvals */}
            {pendingLeads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Lead: {lead.companyName}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{lead.sourceEvidence.discoveredAt}</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{lead.name}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {lead.opportunitySummary}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Tel: {lead.phone} • Kaynak: {lead.sourceEvidence.sourceType}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-800">
                    Önerilen: {lead.approvalAction === 'SEND_WHATSAPP' ? 'WhatsApp Teklif İletimi' : 'Teklif Dosyası Oluştur'}
                  </span>
                  <button
                    onClick={() => onApproveLead(lead.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Onayla & İlet
                  </button>
                </div>
              </div>
            ))}

            {/* Pending Content Approvals */}
            {pendingContent.map((content) => (
              <div key={content.id} className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {content.platform} • {content.account}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{content.plannedAt}</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{content.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {content.caption}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">
                    Bot: {content.bot}
                  </span>
                  <button
                    onClick={() => onApproveContent(content.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Yayını Onayla
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bot Activity Timeline (Matches Screenshot 2 in Light Green + White) */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-emerald-700">TODAY • BOT ACTIVITY</p>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Bugün botlar ne yapıyor?</h2>
          </div>
          <button
            onClick={() => onNavigateTab('calendar')}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>Portföy & Takvim</span>
          </button>
        </div>

        {/* 24-Hour Timeline Bar */}
        <div className="space-y-2 py-2">
          <div className="relative flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>00:00</span>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-emerald-700 tracking-wider">ŞİMDİ</span>
            </div>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>

          <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-emerald-500 rounded-full" />
            <div
              className="absolute top-0 bottom-0 w-3.5 h-3.5 -mt-0.5 bg-amber-500 rounded-full ring-2 ring-white shadow-sm"
              style={{ left: '33%' }}
            />
          </div>
        </div>

        {/* Task list with real status */}
        <div className="space-y-2.5 pt-2">
          {botTasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-start sm:items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-600 w-12 shrink-0">{task.schedule.slice(0, 5)}</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{task.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 font-semibold">
                      {task.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {task.report} • <span className="font-mono text-slate-600">{task.duration}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                    task.status === 'TAMAMLANDI'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : task.status === 'ÇALIŞIYOR'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      task.status === 'TAMAMLANDI' ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}
                  />
                  {task.status}
                </span>

                <button
                  onClick={() => onTriggerBot(task.id)}
                  title="Yeniden Çalıştır"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access to Main Business Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Embay Yapı Summary */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Embay Yapı (Tozkoparan / Güngören)</h3>
            </div>
            <span className="text-xs text-emerald-700 font-semibold">Aktif Proje: 8 Blok</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Deprem yönetmeliğine uygun kentsel dönüşüm, kat karşılığı taahhüt ve sağlam zemin etütleri. Hak sahipleri için şeffaf süreç yönetimi.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span>Zemin C35 / Radye Temel</span>
            <button
              onClick={() => onNavigateTab('crm')}
              className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
            >
              Projelere Git <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Şahin Manitou Summary */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Şahin Manitou (Kiralama Filosu)</h3>
            </div>
            <span className="text-xs text-amber-800 font-semibold">14m & 18m Telehandler</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Hadımköy, Esenyurt ve Trakya sanayi tesisleri, lojistik depolar ve cephe panel montajı için saatlik/günlük operatörlü makine kiralama.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span>MT-X 1840 / 4 Ton Kapasite</span>
            <button
              onClick={() => onNavigateTab('radar')}
              className="text-amber-800 font-bold hover:underline flex items-center gap-1"
            >
              Fırsat Radarına Git <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
