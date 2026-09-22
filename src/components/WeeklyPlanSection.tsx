import { useState } from 'react';
import { Calendar, CheckCircle2, Circle, Copy, Check, Clock, Sparkles } from 'lucide-react';
import { WEEKLY_SCHEDULE } from '../data/marketingData';

export function WeeklyPlanSection() {
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleDay = (dayNum: number) => {
    setCompletedDays((prev) => ({
      ...prev,
      [dayNum]: !prev[dayNum]
    }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / WEEKLY_SCHEDULE.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30 mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Düzenli Haftalık Yayın & Görünürlük Çizelgesi
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Bu Hafta Google + Instagram’da Ne Yayınlanacak?
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Google ve Instagram algoritmaları "ara sıra 10 post atan" değil, "her hafta istikrarlı 2-3 sinyal veren" işletmeleri öne çıkarır.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 min-w-[200px]">
            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
              <span className="text-slate-400">Haftalık Tamamlanma</span>
              <span className="text-emerald-400 font-bold">{completedCount} / {WEEKLY_SCHEDULE.length} Gün</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Day by Day Cards */}
      <div className="grid grid-cols-1 gap-4">
        {WEEKLY_SCHEDULE.map((plan) => {
          const isDone = !!completedDays[plan.dayNumber];
          return (
            <div
              key={plan.dayNumber}
              className={`rounded-xl border transition-all p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isDone
                  ? 'border-emerald-500/40 bg-emerald-950/10 opacity-80'
                  : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleDay(plan.dayNumber)}
                  className="mt-1 text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors shrink-0"
                  title={isDone ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-6 h-6 hover:text-slate-200" />
                  )}
                </button>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white px-2.5 py-0.5 rounded bg-slate-800">
                      {plan.day}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                      plan.platform.includes('Google')
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : plan.platform.includes('Instagram')
                        ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30'
                        : plan.platform.includes('WhatsApp')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    }`}>
                      {plan.platform}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {plan.action}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300">
                    {plan.details}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-amber-300 pt-1">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span><strong>Algoritma Amacı:</strong> {plan.goal}</span>
                  </div>
                </div>
              </div>

              {/* Action Copy Button */}
              <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => handleCopy(`day-${plan.dayNumber}`, plan.copyText)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  {copiedId === `day-${plan.dayNumber}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Metin Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Günün Metnini Kopyala</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
