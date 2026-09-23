import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';
import { BotTask, SEORun, TrendItem } from '../../types';

interface BotControlViewProps {
  botTasks: BotTask[];
  seoReport: SEORun;
  trends: TrendItem[];
  onTriggerBot: (id: string) => void;
  onApproveTrend: (id: string) => void;
}

export const BotControlView: React.FC<BotControlViewProps> = ({
  botTasks,
  seoReport,
  trends,
  onTriggerBot,
  onApproveTrend
}) => {
  const [activeTab, setActiveTab] = useState<'BOTS' | 'SEO' | 'TRENDS'>('BOTS');
  const [selectedBotId, setSelectedBotId] = useState<string>(botTasks[0]?.id || '');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              BOT KONTROL MERKEZİ • SEO & TREND RADARI
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Otonom Ajan Yönetimi & Analitik
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Tüm botların zamanlamaları, modelleri, güvenlik izinleri ve canlı çıktıları tek ekrandan kontrol edilir.
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 pt-6 border-t border-slate-100 mt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('BOTS')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'BOTS' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            🤖 Aktif Bot Portföyü ({botTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('SEO')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'SEO' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            🔍 SEO Bot Analizi & Google Fırsatları
          </button>
          <button
            onClick={() => setActiveTab('TRENDS')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'TRENDS' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            📈 Trend Radarı & Sektörel Gündem ({trends.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BOTS PORTFOLIO */}
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

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'TAMAMLANDI'
                        ? 'bg-emerald-100 text-emerald-800'
                        : task.status === 'ÇALIŞIYOR'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-slate-100">
                  {task.report}
                </p>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Son Çalışma: {task.lastRunAt}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerBot(task.id);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 font-bold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                    Çalıştır
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel: Selected Bot Details & Config */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Bot Güvenlik & İzin Politikası
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-800">İnsan Onayı Kuralı:</span>
                <p className="text-slate-600">
                  Bu bot dış sistemlere (WhatsApp, Sosyal Medya, E-posta) doğrudan mesaj atamaz. Yalnızca taslak hazırlar ve Samet Bey'in onay havuzuna bırakır.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-800">Veri Doğrulama Seviyesi:</span>
                <p className="text-slate-600">
                  Kaynak URL ve snippet doğrulanmadan kesinlikle CRM'e "Lead" kaydı açılamaz.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900">API Yetki Sınırı:</span>
                <p className="text-emerald-800 text-[11px]">
                  Yalnızca okuma (GET) ve taslak kaydetme (INSERT draft) yetkisi tanımlıdır. DROP, DELETE ve RESET yetkileri engellenmiştir.
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
                <h3 className="text-base font-bold text-slate-900">Canlı Site SEO Denetim Skoru: %{seoReport.score}</h3>
                <p className="text-xs text-slate-400 font-mono">Hedef: {seoReport.url} • Son Denetim: {seoReport.analyzedAt}</p>
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
                <h4 className="text-xs font-bold text-emerald-900 uppercase">Tespit Edilen Anahtar Kelime Fırsatları:</h4>
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
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  İçerik Stüdyosuna Aktar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
