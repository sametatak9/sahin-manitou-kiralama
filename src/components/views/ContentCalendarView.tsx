import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Filter,
  ArrowRight,
  Plus,
  Play,
  RotateCw,
  Sliders,
  Send,
  Trash2
} from 'lucide-react';
import { ContentItem, PlatformType } from '../../types';

interface ContentCalendarViewProps {
  contentItems: ContentItem[];
  onApproveContent: (id: string) => void;
  onGenerate30DayPlan: () => void;
}

export const ContentCalendarView: React.FC<ContentCalendarViewProps> = ({
  contentItems,
  onApproveContent,
  onGenerate30DayPlan
}) => {
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST' | 'MONTH'>('KANBAN');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      onGenerate30DayPlan();
      setIsGenerating(false);
    }, 1200);
  };

  const filteredItems = contentItems.filter(item => {
    if (platformFilter === 'ALL') return true;
    return item.platform === platformFilter;
  });

  const pendingItems = filteredItems.filter(i => i.approvalStatus === 'PENDING_APPROVAL');
  const approvedItems = filteredItems.filter(i => i.approvalStatus === 'APPROVED' && i.publishStatus !== 'PUBLISHED');
  const publishedItems = filteredItems.filter(i => i.publishStatus === 'PUBLISHED');

  return (
    <div className="space-y-6">
      {/* Top Banner with 30-Day AI Plan Generator */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              30 GÜNLÜK AI İÇERİK MOTORU & TAKVİM
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Sosyal Medya & İşletme Yayın Planı
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              "30 Günlük AI ile İçerik Planı Başlat" butonu, Instagram, Facebook ve Google İşletme için gerçek takvim kayıtları oluşturur. Onaylanan içerikler zamanı gelince yayına aktarılır.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? '30 Günlük Plan Üretiliyor...' : '30 GÜNLÜK AI İLE İÇERİK PLANI BAŞLAT'}
          </button>
        </div>

        {/* View Switchers & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 mt-4 text-xs font-semibold">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'KANBAN' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Kanban Pano
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'LIST' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Liste Görünümü ({filteredItems.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Platform:</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">Tüm Platformlar</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="GOOGLE_BUSINESS">Google İşletme</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="WHATSAPP_BUSINESS">WhatsApp</option>
            </select>
          </div>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Onay Bekleyenler */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Onay Bekleyenler ({pendingItems.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800">
                      {item.platform}
                    </span>
                    <span className="text-slate-400 font-mono">{item.plannedAt.split(' ')[0]}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.caption}
                  </p>

                  <div className="text-[11px] text-emerald-700 font-medium">
                    {item.cta}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">{item.bot}</span>
                    <button
                      onClick={() => onApproveContent(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Onayla
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Onaylandı / Planlandı */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Planlandı / Hazır ({approvedItems.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {approvedItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-4 border border-blue-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                      {item.platform}
                    </span>
                    <span className="text-blue-700 font-mono font-semibold">{item.plannedAt}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {item.caption}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-medium">✓ Samet Bey Onayladı</span>
                    <span className="text-slate-400 font-mono">Otomatik Yayında</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Yayınlandı */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Yayınlandı ({publishedItems.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {publishedItems.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                  Henüz canlıya aktarılmış geçmiş post yok. Planlanan içerikler saati geldiğinde buraya geçer.
                </div>
              ) : (
                publishedItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs">
                    <span className="text-xs text-emerald-700 font-bold">Yayınlandı: {item.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'LIST' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-4">Tarih / Saat</th>
                <th className="p-4">Platform</th>
                <th className="p-4">Başlık</th>
                <th className="p-4">Kampanya</th>
                <th className="p-4">Onay Durumu</th>
                <th className="p-4 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="p-4 font-mono font-medium text-slate-700">{item.plannedAt}</td>
                  <td className="p-4 font-bold text-emerald-800">{item.platform}</td>
                  <td className="p-4 font-semibold text-slate-900 max-w-xs truncate">{item.title}</td>
                  <td className="p-4 text-slate-500">{item.campaign}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.approvalStatus === 'APPROVED' ? 'Onaylandı' : 'Onay Bekliyor'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {item.approvalStatus === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => onApproveContent(item.id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700"
                      >
                        Onayla
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
