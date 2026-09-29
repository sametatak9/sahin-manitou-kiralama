import { useState } from 'react';
import { Briefcase, CheckCircle2, Heart, ListChecks, Radio, Users } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import type { Bot } from '../lib/types';
import { MissionList } from '../components/Missions';
import { FollowList } from '../components/FollowList';
import { EngagementList } from '../components/EngagementList';
import { OpportunityWall } from '../components/OpportunityWall';
import { useRouter } from '../session';
import { cx, ErrorState } from '../ui';

/** 4 net sekme — ne bulundu, kime yöneleceğiz, etkileşim, tüm görevler. */
type View = 'opps' | 'follow' | 'engage' | 'all';
const VIEWS: Array<{ id: View; label: string; icon: typeof Heart; hint: string }> = [
  { id: 'opps', label: 'İş fırsatları', icon: Briefcase, hint: 'Botun bulduğu inşaat işleri' },
  { id: 'follow', label: 'Takip listesi', icon: Users, hint: 'Sektör hesapları (IG/FB)' },
  { id: 'engage', label: 'Etkileşim', icon: Heart, hint: 'Beğen · yorum · takip (elle)' },
  { id: 'all', label: 'Tüm görevler', icon: ListChecks, hint: 'Her görev ve raporu' },
];

export function ReportsScreen() {
  const router = useRouter();
  const q = useQuery(async () => unwrap(await db().from('automation_bots').select('*').order('name')) as Bot[], [] as Bot[], []);
  const stats = useQuery(async () => {
    const start = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }) + 'T00:00:00+03:00').toISOString();
    const [live, today, pending, prospects] = await Promise.all([
      db().from('bot_missions').select('id', { count: 'exact', head: true }).in('status', ['running', 'finalizing']),
      db().from('bot_missions').select('findings').gte('created_at', start),
      db().from('bot_missions').select('id', { count: 'exact', head: true }).eq('review_status', 'pending').in('status', ['completed', 'stopped', 'failed']),
      db().from('social_prospects').select('id', { count: 'exact', head: true }).eq('follow_status', 'to_follow'),
    ]);
    const f = ((today.data ?? []) as Array<{ findings: unknown[] | null }>).reduce((a, m) => a + (Array.isArray(m.findings) ? m.findings.length : 0), 0);
    return { live: live.count ?? 0, todayFindings: f, pending: pending.count ?? 0, toFollow: prospects.count ?? 0 };
  }, { live: 0, todayFindings: 0, pending: 0, toFollow: 0 }, [], ['bot_missions', 'social_prospects']);

  const initial = (router.state.params.get('view') as View) || 'opps';
  const [view, setView] = useState<View>(VIEWS.some((v) => v.id === initial) ? initial : 'opps');
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;

  const tiles = [
    { label: 'Şu an çalışan', value: stats.data.live, icon: Radio, tone: stats.data.live ? 'text-sky-700' : 'text-ink-300', go: 'all' as View },
    { label: 'Bugünkü bulgu', value: stats.data.todayFindings, icon: Briefcase, tone: 'text-emerald-700', go: 'opps' as View },
    { label: 'Takip edilecek', value: stats.data.toFollow, icon: Users, tone: stats.data.toFollow ? 'text-sky-700' : 'text-ink-300', go: 'follow' as View },
    { label: 'Sonuç onayı', value: stats.data.pending, icon: CheckCircle2, tone: stats.data.pending ? 'text-amber-700' : 'text-ink-300', go: 'all' as View },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-100">Bot Sonuçları</h2>
        <p className="text-xs text-ink-400">
          Sadece <b>İnşaat</b> odaklı. Üstteki kutuya tıkla → ilgili liste açılır.
          Manitou / makine kiralama aramaları kapalı.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <button key={t.label} type="button" onClick={() => setView(t.go)}
            className={cx('rounded-2xl bg-white ring-1 ring-ink-700/70 p-3 flex items-center gap-3 text-left transition hover:ring-brand-green/40',
              view === t.go && 'ring-brand-green/50 bg-emerald-50/40')}>
            <span className="w-9 h-9 rounded-xl bg-ink-900 grid place-items-center"><t.icon className={cx('w-5 h-5', t.tone)} /></span>
            <div><div className={cx('text-xl font-bold tabular-nums', t.tone)}>{t.value}</div><div className="text-[11px] text-ink-400">{t.label}</div></div>
          </button>
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

      {view === 'opps' ? <OpportunityWall />
        : view === 'follow' ? <FollowList />
        : view === 'engage' ? <EngagementList />
        : <MissionList bots={q.data} />}
    </div>
  );
}
