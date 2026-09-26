// Otopilot: tek düğmeyle bütün botları başlat / durdur. Mesai penceresinde (varsayılan 08:00–18:00, Pzt–Cmt)
// zamanlanmış bot görevleri başlar ve onaylı içerikler yayın saatinde paylaşılır. Hiçbir içerik onaysız yayınlanmaz.
import { useState } from 'react';
import { CheckCheck, CirclePause, CirclePlay, Clock, Factory, Send } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { dayKey, fmtTime } from '../lib/format';
import { useRouter, useSession } from '../session';
import { Button, cx, Notice, Pill } from '../ui';

interface State { enabled: boolean; active: boolean; start_hour: number; end_hour: number; weekdays: number[] }
interface PlanRow { key: string; hour: string; who: string; what: string; done: boolean }
interface Data { state: State | null; plan: PlanRow[]; pendingDrafts: number; todayPosts: Array<{ at: string; platform: string; status: string }>; factory: { created: number; finished: boolean } | null }

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

async function load(): Promise<Data> {
  const s = db();
  const today = dayKey(new Date());
  const start = new Date(`${today}T00:00:00+03:00`).toISOString();
  const end = new Date(new Date(start).getTime() + 86400_000).toISOString();
  const [st, sched, bots, missions, pending, posts, fac] = await Promise.all([
    s.rpc('autopilot_state'),
    s.from('mission_schedules').select('id,title,bot_id,run_hour,weekdays,enabled').eq('enabled', true).order('run_hour'),
    s.from('automation_bots').select('id,name'),
    s.from('bot_missions').select('schedule_id').gte('created_at', start).not('schedule_id', 'is', null),
    s.from('social_drafts').select('id', { count: 'exact', head: true }).eq('workflow_status', 'pending_approval').is('archived_at', null),
    s.from('social_drafts').select('scheduled_at,primary_platform,workflow_status').gte('scheduled_at', start).lt('scheduled_at', end).in('workflow_status', ['approved', 'scheduled', 'published', 'pending_approval']).order('scheduled_at'),
    s.from('content_factory_days').select('created,finished_at').eq('day', today).maybeSingle(),
  ]);
  const state = (st.data ?? null) as State | null;
  const botName = new Map((unwrap(bots) as Array<{ id: string; name: string }>).map((b) => [b.id, b.name]));
  const ran = new Set((unwrap(missions) as Array<{ schedule_id: string }>).map((m) => m.schedule_id));
  const isoDow = ((new Date().getDay() + 6) % 7) + 1;
  const plan: PlanRow[] = (unwrap(sched) as Array<{ id: string; title: string; bot_id: string; run_hour: number; weekdays: number[] }>)
    .filter((r) => r.weekdays.includes(isoDow))
    .map((r) => ({ key: r.id, hour: hh(Math.max(r.run_hour, state?.start_hour ?? 8)), who: botName.get(r.bot_id) ?? 'Bot', what: r.title, done: ran.has(r.id) }));
  const f = fac.data as { created: number; finished_at: string | null } | null;
  return {
    state, plan, pendingDrafts: pending.count ?? 0,
    todayPosts: (unwrap(posts) as Array<{ scheduled_at: string; primary_platform: string; workflow_status: string }>).map((p) => ({ at: p.scheduled_at, platform: p.primary_platform, status: p.workflow_status })),
    factory: f ? { created: f.created ?? 0, finished: Boolean(f.finished_at) } : null,
  };
}

export function AutopilotCard() {
  const session = useSession();
  const { go } = useRouter();
  const isAdmin = session.role === 'admin';
  const q = useQuery(load, { state: null, plan: [], pendingDrafts: 0, todayPosts: [], factory: null } as Data, [], ['ops_autopilot', 'bot_missions', 'social_drafts', 'content_factory_days']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const st = q.data.state;

  const toggle = async (enabled: boolean, patch: Partial<State> = {}) => {
    setBusy(true); setErr(null);
    const { error } = await db().rpc('set_autopilot', { p_enabled: enabled, p_start_hour: patch.start_hour ?? null, p_end_hour: patch.end_hour ?? null, p_weekdays: patch.weekdays ?? null });
    if (error) setErr(error.message);
    await q.reload(); setBusy(false);
  };

  if (!st) return null;
  const tone = !st.enabled ? 'stop' : st.active ? 'go' : 'wait';
  const label = !st.enabled ? 'Durduruldu' : st.active ? 'Çalışıyor' : `Mesai dışı · ${hh(st.start_hour)}’de başlar`;
  const days = st.weekdays.length === 6 && !st.weekdays.includes(7) ? 'Pzt–Cmt' : st.weekdays.length === 5 && !st.weekdays.includes(6) ? 'Pzt–Cum' : st.weekdays.map((d) => DAYS[d - 1]).join(', ');
  const posts = q.data.todayPosts.filter((p) => p.status !== 'pending_approval');

  return (
    <section className={cx('ops-panel p-5 sm:p-6 ring-2', st.enabled ? 'ring-brand-green/40' : 'ring-rose-400/40')}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-ink-100">Otopilot</h2>
            <Pill tone={tone}>{label}</Pill>
          </div>
          <p className="text-sm text-ink-300 mt-1 max-w-2xl">
            Tek düğme: botlar her gün <b className="text-ink-100">{hh(st.start_hour)}–{hh(st.end_hour)}</b> ({days}) kendiliğinden çalışır — iş/müşteri arar, içerik hazırlar, <b className="text-ink-100">sizin onayladığınız</b> içerikleri yayın saatinde paylaşır.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {st.enabled
              ? <Button variant="danger" loading={busy} onClick={() => toggle(false)} icon={<CirclePause className="w-5 h-5" />}>Botları durdur</Button>
              : <Button variant="primary" loading={busy} onClick={() => toggle(true)} icon={<CirclePlay className="w-5 h-5" />}>Botları başlat</Button>}
            <label className="inline-flex items-center gap-1 text-xs text-ink-400"><Clock className="w-3.5 h-3.5" />
              <select className="ops-input !py-1 !px-2 !w-auto" value={st.start_hour} disabled={busy} onChange={(e) => toggle(st.enabled, { start_hour: Number(e.target.value) })}>
                {Array.from({ length: 12 }, (_, i) => i + 5).filter((h) => h < st.end_hour).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
              </select>–
              <select className="ops-input !py-1 !px-2 !w-auto" value={st.end_hour} disabled={busy} onChange={(e) => toggle(st.enabled, { end_hour: Number(e.target.value) })}>
                {Array.from({ length: 12 }, (_, i) => i + 12).filter((h) => h > st.start_hour).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3">
          <div className="text-xs font-semibold text-ink-300 mb-2">Bugün botların görevleri</div>
          {q.data.plan.length === 0 ? <div className="text-xs text-ink-500">Bugün zamanlanmış görev yok.</div> : (
            <ul className="space-y-1.5">
              {q.data.plan.map((p) => (
                <li key={p.key} className="flex items-start gap-2 text-[12px]">
                  <span className="font-mono text-ink-400 w-11 shrink-0">{p.hour}</span>
                  <span className="min-w-0 flex-1 text-ink-200"><b>{p.who}</b> · <span className="text-ink-400">{p.what}</span></span>
                  <span className={cx('shrink-0 text-[10px] font-semibold', p.done ? 'text-emerald-600' : 'text-ink-500')}>{p.done ? '✓ yapıldı' : 'sırada'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3">
          <div className="text-xs font-semibold text-ink-300 mb-2 inline-flex items-center gap-1"><Factory className="w-3.5 h-3.5" />İçerik Fabrikası</div>
          <div className="text-[12px] text-ink-200">{q.data.factory ? (q.data.factory.finished ? `Bugün ${q.data.factory.created} yeni taslak hazırlandı.` : 'Bugünün taslakları hazırlanıyor…') : 'Sabah 06:30’da günün taslaklarını hazırlar.'}</div>
          <button onClick={() => go('approvals')} className={cx('mt-3 w-full rounded-lg px-3 py-2 text-left text-[12px] font-semibold inline-flex items-center gap-2', q.data.pendingDrafts ? 'bg-amber-400/15 text-amber-700 ring-1 ring-amber-400/40' : 'bg-ink-800 text-ink-300')}>
            <CheckCheck className="w-4 h-4" />{q.data.pendingDrafts ? `${q.data.pendingDrafts} içerik onayınızı bekliyor →` : 'Onay bekleyen içerik yok'}
          </button>
        </div>
        <div className="rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3">
          <div className="text-xs font-semibold text-ink-300 mb-2 inline-flex items-center gap-1"><Send className="w-3.5 h-3.5" />Bugünkü paylaşımlar</div>
          {posts.length === 0 ? <div className="text-xs text-ink-500">Onaylı paylaşım yok. Onayladığınız içerikler yayın saatinde çıkar.</div> : (
            <ul className="space-y-1">
              {posts.slice(0, 8).map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="font-mono text-ink-400 w-11">{fmtTime(p.at)}</span>
                  <span className="flex-1 text-ink-200 capitalize">{p.platform}</span>
                  <span className={cx('text-[10px] font-semibold', p.status === 'published' ? 'text-emerald-600' : 'text-ink-500')}>{p.status === 'published' ? '✓ yayında' : 'sırada'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
