import { useState } from 'react';
import { BookOpenCheck, Briefcase, CalendarClock, CheckCircle2, Heart, ListChecks, MessageCircle, Radio, Users } from 'lucide-react';
import { SocialInbox } from '../components/SocialInbox';
import { db, unwrap, useQuery } from '../lib/hooks';
import type { Bot } from '../lib/types';
import { MissionList } from '../components/Missions';
import { SchedulesPanel } from '../components/Schedules';
import { FollowList } from '../components/FollowList';
import { LearningLog } from '../components/LearningLog';
import { EngagementList } from '../components/EngagementList';
import { OpportunityWall } from '../components/OpportunityWall';
import { useRouter } from '../session';
import { cx, ErrorState } from '../ui';

type View = 'inbox' | 'engage' | 'opps' | 'all' | 'pending' | 'approved' | 'auto' | 'follow' | 'learn';
const VIEWS: Array<{ id: View; label: string; icon: typeof Heart; hint: string }> = [
  { id: 'inbox', label: 'Gelen sorular', icon: MessageCircle, hint: 'Fiyat · bilgi talepleri (yorum botu)' },
  { id: 'engage', label: 'Etkileşim listesi', icon: Heart, hint: 'Beğen · yorum · takip (elle)' },
  { id: 'opps', label: 'İş fırsatları', icon: Briefcase, hint: 'Botların bulduğu müşteriler' },
  { id: 'all', label: 'Tüm görevler', icon: ListChecks, hint: 'Her görev ve raporu' },
  { id: 'pending', label: 'Onay bekleyen', icon: CheckCircle2, hint: 'Sonuç onayı' },
  { id: 'approved', label: 'Onaylı sonuçlar', icon: BookOpenCheck, hint: 'Kalıcı liste' },
  { id: 'auto', label: 'Otomatik görevler', icon: CalendarClock, hint: 'Zamanlama' },
  { id: 'follow', label: 'Takip listesi', icon: Users, hint: 'Sektör hesapları' },
  { id: 'learn', label: 'Öğrenme günlüğü', icon: BookOpenCheck, hint: 'Botların öğrendikleri' },
];

/** Bot raporları: üstte bugünün özeti, altta amaca göre bölümler (etkileşim listesi, iş fırsatları, görevler…). */
export function ReportsScreen() {
  const router = useRouter();
  const q = useQuery(async () => unwrap(await db().from('automation_bots').select('*').order('name')) as Bot[], [] as Bot[], []);
  const stats = useQuery(async () => {
    const start = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }) + 'T00:00:00+03:00').toISOString();
    const [live, today, pending] = await Promise.all([
      db().from('bot_missions').select('id', { count: 'exact', head: true }).in('status', ['running', 'finalizing']),
      db().from('bot_missions').select('findings').gte('created_at', start),
      db().from('bot_missions').select('id', { count: 'exact', head: true }).eq('review_status', 'pending').in('status', ['completed', 'stopped', 'failed']),
    ]);
    const f = ((today.data ?? []) as Array<{ findings: unknown[] | null }>).reduce((a, m) => a + (Array.isArray(m.findings) ? m.findings.length : 0), 0);
    return { live: live.count ?? 0, todayMissions: today.data?.length ?? 0, todayFindings: f, pending: pending.count ?? 0 };
  }, { live: 0, todayMissions: 0, todayFindings: 0, pending: 0 }, [], ['bot_missions']);
  const initial = (router.state.params.get('view') as View) || (router.state.id ? 'all' : 'inbox');
  const [view, setView] = useState<View>(VIEWS.some((v) => v.id === initial) ? initial : 'inbox');
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  const tiles = [
    { label: 'Şu an çalışan', value: stats.data.live, icon: Radio, tone: stats.data.live ? 'text-sky-700' : 'text-ink-300' },
    { label: 'Bugünkü görev', value: stats.data.todayMissions, icon: ListChecks, tone: 'text-ink-100' },
    { label: 'Bugünkü bulgu', value: stats.data.todayFindings, icon: Briefcase, tone: 'text-emerald-700' },
    { label: 'Onay bekleyen sonuç', value: stats.data.pending, icon: CheckCircle2, tone: stats.data.pending ? 'text-amber-700' : 'text-ink-300' },
  ];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-100">Bot Raporları</h2>
        <p className="text-xs text-ink-400">Botların bugün ne yaptığı, bulduğu fırsatlar ve sizin yapacağınız etkileşimler — hepsi burada, bölüm bölüm.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white ring-1 ring-ink-700/70 p-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-ink-900 grid place-items-center"><t.icon className={cx('w-5 h-5', t.tone)} /></span>
            <div><div className={cx('text-xl font-bold tabular-nums', t.tone)}>{t.value}</div><div className="text-[11px] text-ink-400">{t.label}</div></div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto ops-scroll pb-1 -mx-1 px-1">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" onClick={() => setView(v.id)}
            className={cx('shrink-0 rounded-2xl px-3.5 py-2 text-left ring-1 transition', view === v.id ? 'bg-gradient-to-br from-[#262A6B] to-[#1E3FA0] text-white ring-transparent shadow' : 'bg-white ring-ink-700 text-ink-200 hover:ring-brand-green/40')}>
            <div className="text-[13px] font-semibold inline-flex items-center gap-1.5"><v.icon className="w-4 h-4" />{v.label}</div>
            <div className={cx('text-[10px]', view === v.id ? 'text-[#CFE4FA]' : 'text-ink-400')}>{v.hint}</div>
          </button>
        ))}
      </div>
      {view === 'inbox' ? <SocialInbox />
        : view === 'engage' ? <EngagementList />
        : view === 'opps' ? <OpportunityWall />
        : view === 'learn' ? <LearningLog bots={q.data} />
        : view === 'follow' ? <FollowList />
        : view === 'auto' ? <SchedulesPanel bots={q.data} />
        : <MissionList bots={q.data} review={view === 'all' ? undefined : view} />}
    </div>
  );
}
