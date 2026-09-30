import { useState } from 'react';
import { Briefcase, CheckCircle2, Heart, ListChecks, Radio, TrendingUp, Users } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import type { Bot } from '../lib/types';
import { MissionList, MissionLauncher } from '../components/Missions';
import { FollowList } from '../components/FollowList';
import { EngagementList } from '../components/EngagementList';
import { OpportunityWall } from '../components/OpportunityWall';
import { useRouter } from '../session';
import { cx, ErrorState, StateView } from '../ui';
import { fmtDateTime } from '../lib/format';

type View = 'opps' | 'growth' | 'engage' | 'all';
const VIEWS: Array<{ id: View; label: string; icon: typeof Heart; hint: string }> = [
  { id: 'opps', label: 'İş fırsatları', icon: Briefcase, hint: 'İnşaat iş bulguları' },
  { id: 'growth', label: 'Takipçi büyüme', icon: TrendingUp, hint: 'Hesap listesi + günlük plan' },
  { id: 'engage', label: 'Etkileşim', icon: Heart, hint: 'Beğen · yorum (elle)' },
  { id: 'all', label: 'Tüm görevler', icon: ListChecks, hint: 'Her bot raporu' },
];

function GrowthPanel() {
  const start = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }) + 'T00:00:00+03:00').toISOString();
  const [launch, setLaunch] = useState(false);
  const growthBot = useQuery(async () => {
    const { data } = await db().from('automation_bots').select('id,name,slug,status').eq('slug', 'sosyal-buyume').maybeSingle();
    return data as { id: string; name: string; slug: string; status: string } | null;
  }, null, [], ['automation_bots']);
  const missions = useQuery(async () => {
    if (!growthBot.data?.id) return [];
    return unwrap(
      await db().from('bot_missions')
        .select('id,title,status,summary,findings,created_at,finished_at,review_status')
        .eq('bot_id', growthBot.data.id)
        .order('created_at', { ascending: false })
        .limit(12),
    ) as Array<{ id: string; title: string; status: string; summary: string | null; findings: unknown[] | null; created_at: string; finished_at: string | null; review_status: string | null }>;
  }, [], [growthBot.data?.id], ['bot_missions']);
  const schedules = useQuery(async () => {
    if (!growthBot.data?.id) return [];
    return unwrap(
      await db().from('mission_schedules')
        .select('id,title,run_hour,weekdays,enabled,last_run_at')
        .eq('bot_id', growthBot.data.id)
        .order('run_hour'),
    ) as Array<{ id: string; title: string; run_hour: number; weekdays: number[]; enabled: boolean; last_run_at: string | null }>;
  }, [], [growthBot.data?.id], ['mission_schedules']);
  const counts = useQuery(async () => {
    const [toFollow, followed, engaged, todayM] = await Promise.all([
      db().from('social_prospects').select('id', { count: 'exact', head: true }).eq('follow_status', 'to_follow'),
      db().from('social_prospects').select('id', { count: 'exact', head: true }).eq('follow_status', 'followed'),
      db().from('social_prospects').select('id', { count: 'exact', head: true }).eq('follow_status', 'engaged'),
      db().from('bot_missions').select('id', { count: 'exact', head: true })
        .eq('bot_id', growthBot.data?.id ?? '00000000-0000-0000-0000-000000000000')
        .gte('created_at', start),
    ]);
    return { toFollow: toFollow.count ?? 0, followed: followed.count ?? 0, engaged: engaged.count ?? 0, todayRuns: todayM.count ?? 0 };
  }, { toFollow: 0, followed: 0, engaged: 0, todayRuns: 0 }, [growthBot.data?.id], ['social_prospects', 'bot_missions']);

  if (growthBot.loading) return <StateView kind="loading" compact />;
  if (!growthBot.data) return <StateView kind="empty" title="Takipçi botu yok" message="sosyal-buyume botu tanımlı değil. Migration çalıştırın." />;

  const activeSchedules = schedules.data.filter((s) => s.enabled);
  const botsForLaunch = [{ id: growthBot.data.id, name: growthBot.data.name, slug: growthBot.data.slug, status: growthBot.data.status } as Bot];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#262A6B] to-[#1E3FA0] text-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#CFE4FA]">{growthBot.data.name}</div>
            <div className="font-display text-lg font-semibold mt-0.5">Takipçi büyüme raporu</div>
            <p className="text-[12px] text-[#CFE4FA] mt-1 max-w-xl">
              Bot her gün 08:00 hesap keşfi · 10:00 etkileşim planı · 16:00 hashtag üretir.
              Takip ve yorum <b>sizin telefonunuzdan</b> yapılır — otomatik yok.
            </p>
            <button type="button" onClick={() => setLaunch(true)}
              className="mt-3 rounded-xl bg-white text-[#1E3FA0] px-3.5 py-2 text-[12px] font-bold hover:bg-emerald-50">
              Şimdi çalıştır (manuel görev)
            </button>
          </div>
          <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
            growthBot.data.status === 'active' ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-300 text-amber-950')}>
            {growthBot.data.status === 'active' ? 'AKTİF' : growthBot.data.status}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {[
            { l: 'Takip edilecek', v: counts.data.toFollow },
            { l: 'Takip edildi', v: counts.data.followed },
            { l: 'Etkileşim kuruldu', v: counts.data.engaged },
            { l: 'Bugün görev', v: counts.data.todayRuns },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-xl font-bold tabular-nums">{x.v}</div>
              <div className="text-[10px] text-[#CFE4FA]">{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-100 mb-2">Günlük program (24s)</h3>
        {schedules.loading ? <StateView kind="loading" compact /> : activeSchedules.length === 0 ? (
          <p className="text-xs text-ink-400">Henüz aktif zamanlama yok. Migration: follower_growth_24h çalıştırın.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {activeSchedules.map((s) => (
              <li key={s.id} className="rounded-xl bg-white ring-1 ring-ink-700/70 px-3 py-2.5 flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl bg-ink-900 grid place-items-center text-brand-green font-mono text-sm font-bold">
                  {String(s.run_hour).padStart(2, '0')}:00
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink-100 truncate">{s.title}</div>
                  <div className="text-[10px] text-ink-400">Her gün · son: {s.last_run_at ? fmtDateTime(s.last_run_at) : 'henüz yok'}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-100 mb-2">Takip listesi</h3>
        <FollowList />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-100 mb-2">Son takipçi görevleri</h3>
        {missions.loading ? <StateView kind="loading" compact /> : missions.data.length === 0 ? (
          <StateView kind="empty" title="Henüz görev yok" message="Yukarıdaki Şimdi çalıştır ile ilk görevi başlatın." />
        ) : (
          <ul className="space-y-2">
            {missions.data.map((m) => {
              const n = Array.isArray(m.findings) ? m.findings.length : 0;
              return (
                <li key={m.id} className="rounded-xl bg-white ring-1 ring-ink-700/70 px-3 py-2.5">
                  <div className="text-[13px] font-semibold text-ink-100 truncate">{m.title}</div>
                  <div className="text-[10px] text-ink-400">{fmtDateTime(m.created_at)} · {m.status} · {n} bulgu</div>
                  {m.summary && <p className="text-[12px] text-ink-300 mt-1 line-clamp-2">{m.summary}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {launch && (
        <MissionLauncher
          bots={botsForLaunch}
          botId={growthBot.data.id}
          onClose={() => setLaunch(false)}
          onStarted={() => { setLaunch(false); missions.reload(); counts.reload(); }}
        />
      )}
    </div>
  );
}

export function ReportsScreen({ forceView }: { forceView?: View } = {}) {
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

  const initial = (forceView || (router.state.params.get('view') as View) || 'opps') as View;
  const [view, setView] = useState<View>(VIEWS.some((v) => v.id === initial) ? initial : 'opps');
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;

  if (forceView === 'growth') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-100">Takipçi Büyüme</h2>
          <p className="text-xs text-ink-400">
            Ayrı çalışma alanı · günlük 24s program · hesap listesi. Takip/yorum otomatik değil — listeden elle yapılır.
          </p>
        </div>
        <GrowthPanel />
      </div>
    );
  }

  const tiles = [
    { label: 'Şu an çalışan', value: stats.data.live, icon: Radio, tone: stats.data.live ? 'text-sky-700' : 'text-ink-300', go: 'all' as View },
    { label: 'Bugünkü bulgu', value: stats.data.todayFindings, icon: Briefcase, tone: 'text-emerald-700', go: 'opps' as View },
    { label: 'Takip edilecek', value: stats.data.toFollow, icon: Users, tone: stats.data.toFollow ? 'text-sky-700' : 'text-ink-300', go: 'growth' as View },
    { label: 'Sonuç onayı', value: stats.data.pending, icon: CheckCircle2, tone: stats.data.pending ? 'text-amber-700' : 'text-ink-300', go: 'all' as View },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-100">Bot Sonuçları</h2>
        <p className="text-xs text-ink-400">
          <b>İş</b> ve <b>Takipçi büyüme</b> ayrı sekmelerde. Takip/yorum otomatik değil — listeden elle yapılır.
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
        : view === 'growth' ? <GrowthPanel />
        : view === 'engage' ? <EngagementList />
        : <MissionList bots={q.data} />}
    </div>
  );
}
