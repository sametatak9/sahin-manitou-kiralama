import { useMemo, useState } from 'react';
import { Archive, ArrowLeft, Pause, Play, Plus, RotateCcw, Save, Target, Trash2, Wand2 } from 'lucide-react';
import { MissionLauncher, MissionList, SkillPromptModal } from '../components/Missions';
import { callOps, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { approvalLabel, approvalTone, BOT_STATUS, dayKey, fmtDateTime, istanbulToIso, platformMeta, relTime, RUN_LABELS, runTone, TASK_LABELS, taskTone, timeOf } from '../lib/format';
import { computeNextRun, describeSchedule, isValidCron } from '../../../supabase/functions/_shared/pure/schedule.ts';
import type { Approval, Bot, Run, RunLog, Skill, Task, Tool } from '../lib/types';
import { useRouter, useSession } from '../session';
import { Button, cx, DynIcon, ErrorState, Field, Modal, Notice, Panel, Pill, PlatformBadge, SavedStamp, Stat, StateView, Tabs } from '../ui';

interface Portfolio { bots: Bot[]; skills: Skill[]; tools: Tool[]; tasks: Task[]; runs: Run[]; agents: Array<{ id: string; name: string; model: string; provider: string }> }
const EMPTY: Portfolio = { bots: [], skills: [], tools: [], tasks: [], runs: [], agents: [] };

async function loadPortfolio(): Promise<Portfolio> {
  const s = db();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [bots, skills, tools, tasks, runs, agents] = await Promise.all([
    s.from('automation_bots').select('*, automation_bot_skills(skill_id,position)').order('name'),
    s.from('automation_skills').select('*, automation_skill_tools(tool_id)').order('display_name'),
    s.from('automation_tools').select('*').order('tool_key'),
    s.from('automation_tasks').select('*').is('archived_at', null).order('next_run_at', { ascending: true, nullsFirst: false }),
    s.from('social_bot_runs').select('id,bot_id,task_id,skill_id,status,created_at,duration_ms,tokens_in,tokens_out,summary,error,error_code,trigger,attempt,platform,run_scope,started_at,completed_at,output').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
    s.from('ai_agents').select('id,name,model,provider').eq('active', true),
  ]);
  return { bots: unwrap(bots), skills: unwrap(skills), tools: unwrap(tools), tasks: unwrap(tasks), runs: unwrap(runs), agents: unwrap(agents) };
}

function botStats(p: Portfolio, botId: string) {
  const runs = p.runs.filter((r) => r.bot_id === botId);
  const finished = runs.filter((r) => ['completed', 'awaiting_approval', 'failed', 'timeout', 'blocked'].includes(r.status));
  const ok = finished.filter((r) => ['completed', 'awaiting_approval'].includes(r.status)).length;
  const tasks = p.tasks.filter((t) => t.bot_id === botId);
  const next = tasks.filter((t) => t.enabled && t.next_run_at).map((t) => t.next_run_at!).sort()[0] ?? null;
  return { runs, total: finished.length, success: finished.length ? Math.round((ok / finished.length) * 100) : null, errors: finished.filter((r) => ['failed', 'timeout'].includes(r.status)).length,
    blocked: finished.filter((r) => r.status === 'blocked').length, last: runs[0] ?? null, next, tasks };
}

export function BotsScreen() {
  const { state, go } = useRouter();
  const session = useSession();
  const q = useQuery(loadPortfolio, EMPTY, [], ['automation_tasks', 'social_bot_runs']);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'waiting_connection' | 'paused' | 'archived'>('all');

  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (state.id) {
    const bot = q.data.bots.find((b) => b.id === state.id);
    if (q.loading) return <StateView kind="loading" />;
    if (!bot) return <StateView kind="empty" title="Bot bulunamadı" action={<Button onClick={() => go('bots')}>Portföye dön</Button>} />;
    return <BotDetail bot={bot} p={q.data} reload={q.reload} />;
  }
  const bots = q.data.bots.filter((b) => (filter === 'all' ? b.status !== 'archived' : b.status === filter));

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-100">Bot Merkezi</h2>
          <p className="text-xs text-ink-400">Bota tıklayın → “Görev ver”: amaç, link, aranacak şey ve süre verin; bot çalışır ve raporu altta listeler.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={filter} onChange={setFilter} items={[{ id: 'all', label: 'Tümü' }, { id: 'active', label: 'Aktif' }, { id: 'waiting_connection', label: 'Bağlantı bekliyor' }, { id: 'paused', label: 'Duraklatılan' }, { id: 'archived', label: 'Arşiv' }]} />
          {session.role === 'admin' && <Button variant="primary" onClick={() => setCreating(true)} icon={<Plus className="w-4 h-4" />}>Yeni bot</Button>}
        </div>
      </div>
      {q.loading ? <StateView kind="loading" /> : bots.length === 0 ? <StateView kind="empty" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {bots.map((b) => {
            const st = botStats(q.data, b.id); const meta = BOT_STATUS[b.status] ?? BOT_STATUS.active;
            const skillNames = (b.automation_bot_skills || []).map((l) => q.data.skills.find((s) => s.id === l.skill_id)?.display_name).filter(Boolean) as string[];
            const running = st.runs.some((r) => r.status === 'running');
            const isActive = b.status === 'active';
            const isPassive = b.status === 'paused' || b.status === 'archived';
            const isWaiting = b.status === 'waiting_connection';
            const accent = running
              ? 'from-sky-500 via-cyan-400 to-emerald-400'
              : isActive
                ? 'from-emerald-600 via-brand-green to-teal-500'
                : isWaiting
                  ? 'from-amber-500 via-orange-400 to-amber-600'
                  : 'from-ink-600 via-ink-500 to-ink-700';
            return (
              <button
                key={b.id}
                onClick={() => go('bots', b.id)}
                className={cx(
                  'ops-panel text-left p-0 overflow-hidden rounded-2xl ring-1 transition group',
                  running ? 'ring-sky-400/50 shadow-lg shadow-sky-900/20' : 'ring-ink-800 hover:ring-brand-green/40 hover:shadow-lg hover:shadow-emerald-900/10',
                  isPassive && 'opacity-80',
                )}
              >
                <div className={cx('h-1.5 w-full bg-gradient-to-r', accent)} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={cx(
                      'relative w-14 h-14 rounded-2xl flex items-center justify-center ring-1 shrink-0',
                      running ? 'bg-sky-500/20 ring-sky-400/50 text-sky-700' :
                      isActive ? 'bg-gradient-to-br from-emerald-600/20 to-ink-900 ring-emerald-500/30 text-brand-green' :
                      isWaiting ? 'bg-amber-500/15 ring-amber-400/40 text-amber-700' :
                      'bg-ink-800 ring-ink-600 text-ink-400',
                    )}>
                      <DynIcon name={b.icon} className="w-7 h-7" />
                      {running && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-signal-run ops-pulse ring-2 ring-ink-900" />}
                      {isActive && !running && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-ink-900" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-base font-semibold text-ink-100 leading-tight">{b.name}</span>
                        <Pill tone={meta.tone} className="shrink-0">{meta.label}</Pill>
                      </div>
                      <p className="text-[11px] text-ink-400 line-clamp-2 mt-1 leading-relaxed">{b.description}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <PlatformBadge platform={b.platform || 'system'} />
                        <span className="text-[10px] text-ink-500">{platformMeta(b.platform).name}</span>
                        <span className="text-[10px] font-mono text-ink-600">/{b.slug}</span>
                      </div>
                    </div>
                  </div>
                  {skillNames.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skillNames.slice(0, 3).map((n) => (
                        <span key={n} className="text-[10px] rounded-lg bg-ink-900/90 ring-1 ring-ink-700 px-2 py-0.5 text-ink-300">{n}</span>
                      ))}
                      {skillNames.length > 3 && (
                        <span className="text-[10px] rounded-lg bg-ink-800 px-2 py-0.5 text-ink-500">+{skillNames.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-ink-800/80">
                    <div className="rounded-xl bg-ink-900/70 ring-1 ring-ink-800 px-2 py-1.5 text-center">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-ink-500">Son</div>
                      <div className="text-[11px] font-semibold text-ink-200 truncate mt-0.5">{st.last ? relTime(st.last.created_at) : '—'}</div>
                    </div>
                    <div className="rounded-xl bg-ink-900/70 ring-1 ring-ink-800 px-2 py-1.5 text-center">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-ink-500">Sonraki</div>
                      <div className="text-[11px] font-semibold text-ink-200 truncate mt-0.5">{st.next ? relTime(st.next) : '—'}</div>
                    </div>
                    <div className="rounded-xl bg-ink-900/70 ring-1 ring-ink-800 px-2 py-1.5 text-center">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-ink-500">Başarı</div>
                      <div className={cx('text-[11px] font-bold mt-0.5', st.success === null ? 'text-ink-400' : st.success >= 80 ? 'text-emerald-600' : 'text-amber-600')}>
                        {st.success === null ? '—' : `%${st.success}`}
                      </div>
                    </div>
                    <div className="rounded-xl bg-ink-900/70 ring-1 ring-ink-800 px-2 py-1.5 text-center">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-ink-500">Hata</div>
                      <div className={cx('text-[11px] font-bold mt-0.5', st.errors ? 'text-rose-600' : 'text-ink-300')}>
                        {st.errors}{st.blocked ? `·${st.blocked}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {creating && <BotEditor p={q.data} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); q.reload(); go('bots', id); }} />}
    </div>
  );
}
