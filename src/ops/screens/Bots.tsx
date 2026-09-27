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
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
          {bots.map((b) => {
            const st = botStats(q.data, b.id); const meta = BOT_STATUS[b.status] ?? BOT_STATUS.active;
            const skillNames = (b.automation_bot_skills || []).map((l) => q.data.skills.find((s) => s.id === l.skill_id)?.display_name).filter(Boolean);
            const running = st.runs.some((r) => r.status === 'running');
            return (
              <button key={b.id} onClick={() => go('bots', b.id)} className="ops-panel text-left p-4 hover:ring-1 hover:ring-brand-green/40 transition group">
                <div className="flex items-start gap-3">
                  <div className={cx('relative w-11 h-11 rounded-2xl flex items-center justify-center ring-1', running ? 'bg-sky-500/15 ring-sky-400/40 text-sky-700' : 'bg-ink-800 ring-ink-600 text-brand-green')}>
                    <DynIcon name={b.icon} className="w-5 h-5" />{running && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-signal-run ops-pulse" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className="font-display font-semibold text-ink-100 truncate">{b.name}</span><Pill tone={meta.tone}>{meta.label}</Pill></div>
                    <p className="text-[11px] text-ink-400 line-clamp-2 mt-0.5">{b.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">{skillNames.slice(0, 4).map((n) => <span key={n} className="text-[10px] rounded-md bg-ink-800 px-1.5 py-0.5 text-ink-300">{n}</span>)}</div>
                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-ink-800 text-[10px]">
                  <div><div className="font-mono text-ink-500">SON</div><div className="text-ink-200 truncate">{st.last ? relTime(st.last.created_at) : '—'}</div></div>
                  <div><div className="font-mono text-ink-500">SONRAKİ</div><div className="text-ink-200 truncate">{st.next ? fmtDateTime(st.next) : '—'}</div></div>
                  <div><div className="font-mono text-ink-500">BAŞARI</div><div className={cx('font-semibold', st.success === null ? 'text-ink-400' : st.success >= 80 ? 'text-emerald-700' : 'text-amber-700')}>{st.success === null ? '—' : `%${st.success}`}</div></div>
                  <div><div className="font-mono text-ink-500">HATA</div><div className={st.errors ? 'text-rose-700 font-semibold' : 'text-ink-300'}>{st.errors}{st.blocked ? ` · ${st.blocked}⛔` : ''}</div></div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-ink-500"><PlatformBadge platform={b.platform || 'system'} /> {platformMeta(b.platform).name}</div>
              </button>
            );
          })}
        </div>
      )}
      {creating && <BotEditor p={q.data} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); q.reload(); go('bots', id); }} />}
    </div>
  );
}

type Tab = 'missions' | 'overview' | 'tasks' | 'skills' | 'tools' | 'schedule' | 'runs' | 'approvals' | 'logs' | 'results' | 'settings';

function BotDetail({ bot, p, reload }: { bot: Bot; p: Portfolio; reload: () => void }) {
  const { go } = useRouter();
  const session = useSession();
  const [tab, setTab] = useState<Tab>('missions');
  const [launch, setLaunch] = useState(false);
  const st = botStats(p, bot.id);
  const botSkills = (bot.automation_bot_skills || []).map((l) => p.skills.find((s) => s.id === l.skill_id)).filter(Boolean) as Skill[];
  const botTools = useMemo(() => { const ids = new Set(botSkills.flatMap((s) => (s.automation_skill_tools || []).map((t) => t.tool_id))); return p.tools.filter((t) => ids.has(t.id)); }, [botSkills, p.tools]);
  const agent = p.agents.find((a) => a.id === bot.ai_agent_id);
  const meta = BOT_STATUS[bot.status] ?? BOT_STATUS.active;
  const isAdmin = session.role === 'admin';

  return (
    <div className="space-y-4">
      <button onClick={() => go('bots')} className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-100"><ArrowLeft className="w-4 h-4" /> Bot portföyü</button>
      <section className="ops-panel p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-ink-800 ring-1 ring-ink-600 text-brand-green flex items-center justify-center"><DynIcon name={bot.icon} className="w-7 h-7" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-semibold text-ink-100">{bot.name}</h2><Pill tone={meta.tone}>{meta.label}</Pill><span className="text-[10px] font-mono text-ink-500">/{bot.slug}</span></div>
          <p className="text-sm text-ink-300 mt-1">{bot.description}</p>
        </div>
        <Button variant="primary" onClick={() => setLaunch(true)} icon={<Target className="w-4 h-4" />}>Görev ver</Button>
        <div className="grid grid-cols-3 gap-2 md:w-[380px]">
          <Stat label="30G koşu" value={st.total} /><Stat label="Başarı" value={st.success === null ? '—' : `%${st.success}`} tone={st.success === null ? undefined : st.success >= 80 ? 'go' : 'wait'} /><Stat label="Hata" value={st.errors} tone={st.errors ? 'stop' : undefined} />
        </div>
      </section>
      <Tabs value={tab} onChange={setTab} items={[
        { id: 'missions', label: 'Görevler & Raporlar' }, { id: 'overview', label: 'Genel' }, { id: 'tasks', label: 'Zamanlı işler', count: st.tasks.length }, { id: 'skills', label: 'Yetenekler', count: botSkills.length }, { id: 'tools', label: 'Araçlar', count: botTools.length },
        { id: 'schedule', label: 'Takvim' }, { id: 'runs', label: 'Koşular', count: st.runs.length }, { id: 'approvals', label: 'Onaylar' }, { id: 'logs', label: 'Günlük' }, { id: 'results', label: 'Sonuçlar' }, { id: 'settings', label: 'Ayarlar' },
      ]} />

      {tab === 'missions' && <MissionList bots={p.bots} botId={bot.id} />}
      {launch && <MissionLauncher bots={p.bots} botId={bot.id} onClose={() => setLaunch(false)} onStarted={() => { setLaunch(false); setTab('missions'); }} />}

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Çalışma talimatı" kicker="Instructions" className="lg:col-span-2">
            <p className="text-sm text-ink-200 whitespace-pre-line">{bot.instructions || '—'}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              <Stat label="Son koşu" value={<span className="text-sm">{st.last ? fmtDateTime(st.last.created_at) : '—'}</span>} sub={st.last ? RUN_LABELS[st.last.status] : undefined} tone={st.last ? runTone(st.last.status) : undefined} />
              <Stat label="Sonraki" value={<span className="text-sm">{st.next ? fmtDateTime(st.next) : '—'}</span>} />
              <Stat label="Engellenen" value={st.blocked} tone={st.blocked ? 'wait' : undefined} sub="Yapılandırma/izin" />
              <Stat label="Token (30g)" value={<span className="text-sm">{st.runs.reduce((a, r) => a + (r.tokens_in || 0) + (r.tokens_out || 0), 0).toLocaleString('tr-TR')}</span>} />
            </div>
          </Panel>
          <Panel title="Konfigürasyon" kicker="Bot = config + skills + tools + permissions + schedules">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-ink-500">Tip</dt><dd className="text-ink-200">{bot.bot_type}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-500">Platform</dt><dd className="text-ink-200">{platformMeta(bot.platform).name}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-500">Connector</dt><dd className="text-ink-200">{bot.connector_key ?? '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-500">AI agent</dt><dd className="text-ink-200 text-right">{agent ? `${agent.name} · ${agent.model}` : '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-500">Yasaklı tool</dt><dd className="text-ink-200">{bot.permissions?.denied_tools?.join(', ') || 'yok'}</dd></div>
            </dl>
            {bot.status === 'waiting_connection' && <div className="mt-3"><Notice tone="warn">Bu bot yayın için {bot.connector_key} bağlantısı bekliyor. İçerik hazırlama görevleri çalışır; yayın bağlantı kurulana kadar yapılmaz.</Notice></div>}
          </Panel>
        </div>
      )}

      {tab === 'tasks' && <TasksTab bot={bot} p={p} skills={botSkills} reload={reload} />}

      {tab === 'skills' && <SkillsTab bot={bot} p={p} skills={botSkills} reload={reload} isAdmin={isAdmin} />}

      {tab === 'tools' && (
        <Panel title="Kullanabildiği tool’lar" kicker="Skill’lerden türetilir · bot bazında yasaklanabilir">
          {botTools.length === 0 ? <StateView kind="empty" compact /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {botTools.map((t) => {
                const denied = bot.permissions?.denied_tools?.includes(t.tool_key);
                return (
                  <div key={t.id} className="rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-ink-100">{t.name} <span className="font-mono text-[10px] text-ink-500">{t.tool_key}</span></div><div className="text-[11px] text-ink-400">{t.description}</div>
                      <div className="flex gap-1 mt-1.5">{t.approval_required && <Pill tone="wait">ONAY GEREKLİ</Pill>}{t.min_role === 'admin' && <Pill tone="info">ADMIN</Pill>}{!t.active && <Pill tone="idle">PASİF</Pill>}</div></div>
                    {isAdmin && <Button variant={denied ? 'danger' : 'subtle'} onClick={async () => {
                      const list = new Set(bot.permissions?.denied_tools || []); if (denied) list.delete(t.tool_key); else list.add(t.tool_key);
                      await db().from('automation_bots').update({ permissions: { ...(bot.permissions || {}), denied_tools: [...list] } }).eq('id', bot.id); reload();
                    }}>{denied ? 'Yasaklı' : 'İzinli'}</Button>}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {tab === 'schedule' && (
        <Panel title="Zamanlama" kicker="Europe/Istanbul">
          {st.tasks.length === 0 ? <StateView kind="empty" compact title="Zamanlanmış görev yok" /> : (
            <ul className="space-y-2">
              {st.tasks.map((t) => {
                const n1 = computeNextRun(t, new Date()); const n2 = n1 ? computeNextRun(t, n1) : null; const n3 = n2 ? computeNextRun(t, n2) : null;
                return (
                  <li key={t.id} className="rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3 flex flex-col md:flex-row md:items-center gap-2">
                    <div className="flex-1"><div className="text-sm font-semibold text-ink-100">{t.title || t.task_type}</div><div className="text-[11px] text-ink-400">{describeSchedule(t)}</div></div>
                    <div className="text-[11px] font-mono text-ink-300">{[t.next_run_at ? fmtDateTime(t.next_run_at) : null, n2 && fmtDateTime(n2.toISOString()), n3 && fmtDateTime(n3.toISOString())].filter(Boolean).join('  →  ') || 'Manuel'}</div>
                    <Pill tone={t.enabled ? taskTone(t.status) : 'idle'}>{t.enabled ? TASK_LABELS[t.status] : 'KAPALI'}</Pill>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'runs' && <RunsTable runs={st.runs} p={p} />}
      {tab === 'approvals' && <BotApprovals botId={bot.id} />}
      {tab === 'logs' && <BotLogs runs={st.runs.slice(0, 15)} />}
      {tab === 'results' && <BotResults runs={st.runs.filter((r) => ['completed', 'awaiting_approval'].includes(r.status)).slice(0, 10)} />}
      {tab === 'settings' && (isAdmin ? <BotEditor p={p} bot={bot} inline onClose={() => setTab('overview')} onSaved={() => { reload(); setTab('overview'); }} /> : <StateView kind="permission" message="Bot ayarlarını yalnızca yöneticiler değiştirebilir." />)}
    </div>
  );
}

function TasksTab({ bot, p, skills, reload }: { bot: Bot; p: Portfolio; skills: Skill[]; reload: () => void }) {
  const tasks = p.tasks.filter((t) => t.bot_id === bot.id);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null);
  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => { setBusy(key); setMsg(null); try { await fn(); setMsg({ tone: 'ok', text: ok }); reload(); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); } };

  return (
    <Panel title="Görevler" kicker="automation_tasks" action={<Button variant="primary" onClick={() => setEditing('new')} icon={<Plus className="w-4 h-4" />} disabled={!skills.length}>Görev</Button>}>
      {msg && <div className="mb-3"><Notice tone={msg.tone === 'ok' ? 'ok' : msg.tone === 'warn' ? 'warn' : 'error'}>{msg.text}</Notice></div>}
      {tasks.length === 0 ? <StateView kind="empty" compact title="Bu botun görevi yok" message={skills.length ? 'Görev oluşturun: skill + zamanlama.' : 'Önce Skills sekmesinden skill bağlayın.'} /> : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const skill = p.skills.find((s) => s.id === t.skill_id);
            return (
              <li key={t.id} className="rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-ink-100">{t.title || skill?.display_name}</span><Pill tone={t.enabled ? taskTone(t.status) : 'idle'}>{t.enabled ? TASK_LABELS[t.status] ?? t.status : 'KAPALI'}</Pill>{t.approval_state === 'approval_required' && <Pill tone="wait" dot={false}>ONAYLI ÇIKTI</Pill>}</div>
                    <div className="text-[11px] text-ink-400 mt-0.5">{skill?.display_name} · {describeSchedule(t)} · sonraki: {fmtDateTime(t.next_run_at)} · deneme {t.attempt}/{t.max_retries}</div>
                    {t.result_summary && <div className="text-[11px] text-ink-300 mt-1 line-clamp-2">↳ {t.result_summary}</div>}
                    {t.last_error && <div className="text-[11px] text-rose-700 mt-1 line-clamp-2">⚠ {t.last_error}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="primary" loading={busy === `run-${t.id}`} onClick={() => act(`run-${t.id}`, async () => { const r = await callOps<{ status: string; summary: string; error: string | null }>('run_task', { task_id: t.id }); if (r.status === 'blocked' || r.status === 'failed') throw new Error(`${RUN_LABELS[r.status]}: ${r.error}`); }, 'Görev çalıştı; koşu kaydı ve loglar oluştu.')} icon={<Play className="w-3.5 h-3.5" />}>Şimdi çalıştır</Button>
                    <Button variant="subtle" onClick={() => act(`toggle-${t.id}`, async () => { const { error } = await db().from('automation_tasks').update(t.enabled ? { enabled: false, status: 'paused' } : { enabled: true, status: 'scheduled', next_run_at: computeNextRun(t)?.toISOString() ?? t.next_run_at }).eq('id', t.id); if (error) throw error; }, t.enabled ? 'Duraklatıldı.' : 'Devam ediyor.')} icon={t.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}>{t.enabled ? 'Duraklat' : 'Devam'}</Button>
                    {['dead_letter', 'failed', 'completed'].includes(t.status) && <Button variant="warn" onClick={() => act(`rq-${t.id}`, async () => { const { error } = await db().rpc('requeue_task', { p_id: t.id }); if (error) throw error; }, 'Yeniden kuyruğa alındı.')} icon={<RotateCcw className="w-3.5 h-3.5" />}>Kuyruğa al</Button>}
                    <Button variant="subtle" onClick={() => setEditing(t)}>Düzenle</Button>
                    <Button variant="danger" onClick={() => act(`ar-${t.id}`, async () => { const { error } = await db().from('automation_tasks').update({ archived_at: new Date().toISOString(), enabled: false, status: 'cancelled' }).eq('id', t.id); if (error) throw error; }, 'Arşivlendi.')} icon={<Archive className="w-3.5 h-3.5" />} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && <TaskEditor bot={bot} skills={skills} task={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </Panel>
  );
}

function TaskEditor({ bot, skills, task, onClose, onSaved }: { bot: Bot; skills: Skill[]; task: Task | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: task?.title ?? '', skill_id: task?.skill_id ?? skills[0]?.id ?? '', platform: task?.platform ?? bot.platform ?? '', schedule_type: task?.schedule_type ?? 'daily',
    run_time: task?.run_time ?? '09:00', run_at_date: task?.run_at ? dayKey(task.run_at) : dayKey(new Date()), run_at_time: task?.run_at ? timeOf(task.run_at) : '10:00',
    cron_expression: task?.cron_expression ?? '0 9 * * 1-5', weekday: String((task?.input_config?.weekday as number) ?? 1), monthday: String((task?.input_config?.monthday as number) ?? 1),
    topic: String(task?.input_config?.topic ?? ''), max_retries: String(task?.max_retries ?? 3), timeout_seconds: String(task?.timeout_seconds ?? 120),
  });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const spec = { schedule_type: f.schedule_type, run_time: f.run_time, run_at: f.schedule_type === 'once' ? istanbulToIso(f.run_at_date, f.run_at_time) : null, cron_expression: f.cron_expression, timezone: 'Europe/Istanbul', input_config: { weekday: Number(f.weekday), monthday: Number(f.monthday) } };
  const cronOk = f.schedule_type !== 'cron' || isValidCron(f.cron_expression);
  const next = cronOk ? computeNextRun(spec) : null;
  const skill = skills.find((s) => s.id === f.skill_id);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      if (!cronOk) throw new Error('Cron ifadesi geçersiz');
      const row = {
        bot_id: bot.id, skill_id: f.skill_id, task_type: skill?.skill_key ?? 'managed_skill', title: f.title || skill?.display_name, platform: f.platform || null, schedule_type: f.schedule_type,
        run_time: ['daily', 'weekly', 'monthly', 'hourly'].includes(f.schedule_type) ? f.run_time : null, run_at: spec.run_at, cron_expression: f.schedule_type === 'cron' ? f.cron_expression : null,
        timezone: 'Europe/Istanbul', next_run_at: next?.toISOString() ?? null, status: next ? 'scheduled' : 'queued', enabled: true, max_retries: Number(f.max_retries), timeout_seconds: Number(f.timeout_seconds),
        approval_state: skill?.approval_required ? 'approval_required' : 'not_required',
        input_config: { ...(task?.input_config || {}), source: task?.input_config?.source ?? 'panel', topic: f.topic || null, weekday: Number(f.weekday), monthday: Number(f.monthday) },
      };
      const { error } = task ? await db().from('automation_tasks').update(row).eq('id', task.id) : await db().from('automation_tasks').insert(row);
      if (error) throw error;
      onSaved();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={task ? 'Görevi düzenle' : 'Yeni görev'} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Skill" className="sm:col-span-2"><select className="ops-input" value={f.skill_id} onChange={(e) => setF({ ...f, skill_id: e.target.value })}>{skills.map((s) => <option key={s.id} value={s.id}>{s.display_name} · {s.execution_mode === 'pipeline' ? 'pipeline' : 'AI agent'}</option>)}</select></Field>
        <Field label="Görev adı"><input className="ops-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={skill?.display_name} /></Field>
        <Field label="Platform"><input className="ops-input" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} placeholder="instagram / web / —" /></Field>
        <Field label="Konu / girdi" className="sm:col-span-2" hint="Skill’e iletilen sabit girdi. Kullanıcı serbest prompt yazmaz; skill talimatı esastır."><input className="ops-input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
        <Field label="Zamanlama"><select className="ops-input" value={f.schedule_type} onChange={(e) => setF({ ...f, schedule_type: e.target.value })}>
          {[['manual', 'Manuel'], ['once', 'Tek sefer'], ['hourly', 'Saatlik'], ['daily', 'Günlük'], ['weekly', 'Haftalık'], ['monthly', 'Aylık'], ['cron', 'Cron'], ['event', 'Olay tetiklemeli']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        {['daily', 'weekly', 'monthly', 'hourly'].includes(f.schedule_type) && <Field label={f.schedule_type === 'hourly' ? 'Dakika (HH:MM’den)' : 'Saat'}><input type="time" className="ops-input" value={f.run_time} onChange={(e) => setF({ ...f, run_time: e.target.value })} /></Field>}
        {f.schedule_type === 'weekly' && <Field label="Gün"><select className="ops-input" value={f.weekday} onChange={(e) => setF({ ...f, weekday: e.target.value })}>{['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'].map((d, i) => <option key={d} value={i}>{d}</option>)}</select></Field>}
        {f.schedule_type === 'monthly' && <Field label="Ayın günü"><input type="number" min={1} max={28} className="ops-input" value={f.monthday} onChange={(e) => setF({ ...f, monthday: e.target.value })} /></Field>}
        {f.schedule_type === 'once' && <><Field label="Tarih"><input type="date" className="ops-input" value={f.run_at_date} onChange={(e) => setF({ ...f, run_at_date: e.target.value })} /></Field><Field label="Saat"><input type="time" className="ops-input" value={f.run_at_time} onChange={(e) => setF({ ...f, run_at_time: e.target.value })} /></Field></>}
        {f.schedule_type === 'cron' && <Field label="Cron (dk saat gün ay haftagünü)" hint={cronOk ? 'Europe/Istanbul' : 'Geçersiz ifade'}><input className={cx('ops-input font-mono', !cronOk && '!border-rose-500')} value={f.cron_expression} onChange={(e) => setF({ ...f, cron_expression: e.target.value })} /></Field>}
        <Field label="Maks. deneme"><input type="number" min={0} max={10} className="ops-input" value={f.max_retries} onChange={(e) => setF({ ...f, max_retries: e.target.value })} /></Field>
        <Field label="Zaman aşımı (sn)"><input type="number" min={5} max={600} className="ops-input" value={f.timeout_seconds} onChange={(e) => setF({ ...f, timeout_seconds: e.target.value })} /></Field>
      </div>
      <div className="mt-3"><Notice tone="info">{next ? `İlk çalışma: ${fmtDateTime(next.toISOString())} (İstanbul) · ${describeSchedule(spec)}` : f.schedule_type === 'event' ? 'Olay tetiklemeli: sistem olayı veya “Şimdi çalıştır” ile çalışır.' : 'Manuel: yalnızca “Şimdi çalıştır” ile çalışır.'}</Notice></div>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}
    </Modal>
  );
}

function SkillsTab({ bot, p, skills, reload, isAdmin }: { bot: Bot; p: Portfolio; skills: Skill[]; reload: () => void; isAdmin: boolean }) {
  const [add, setAdd] = useState('');
  const [prompting, setPrompting] = useState(false);
  const available = p.skills.filter((s) => !skills.some((b) => b.id === s.id) && !s.archived_at);
  return (
    <>
    {prompting && <SkillPromptModal botId={bot.id} botName={bot.name} onClose={() => setPrompting(false)} onSaved={() => { setPrompting(false); reload(); }} />}
    <Panel title="Bağlı yetenekler" kicker="Bot yetenekleri" action={isAdmin && (
      <div className="flex flex-wrap gap-2"><Button variant="primary" onClick={() => setPrompting(true)} icon={<Wand2 className="w-4 h-4" />}>Prompt ile yetenek ekle</Button><select className="ops-input !py-1.5 text-xs" value={add} onChange={(e) => setAdd(e.target.value)}><option value="">Skill ekle…</option>{available.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}</select>
        <Button variant="primary" disabled={!add} onClick={async () => { const { error } = await db().from('automation_bot_skills').insert({ bot_id: bot.id, skill_id: add, position: skills.length }); if (error) { window.alert(`Yetenek eklenemedi: ${errorText(error)}`); return; } setAdd(''); reload(); }} icon={<Plus className="w-4 h-4" />} /></div>)}>
      {skills.length === 0 ? <StateView kind="empty" compact /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {skills.map((s) => (
            <div key={s.id} className="rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3 flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-ink-800 text-brand-green flex items-center justify-center"><DynIcon name={s.icon} /></span>
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-ink-100">{s.display_name}</div><div className="text-[11px] text-ink-400">{s.description}</div>
                <div className="flex flex-wrap gap-1 mt-1.5"><Pill tone={s.execution_mode === 'pipeline' ? 'go' : 'info'} dot={false}>{s.execution_mode === 'pipeline' ? 'PIPELINE' : 'AI AGENT'}</Pill>{s.approval_required && <Pill tone="wait" dot={false}>ONAY</Pill>}{!s.enabled && <Pill tone="idle">PASİF</Pill>}</div></div>
              {isAdmin && <button title="Kaldır" onClick={async () => { await db().from('automation_bot_skills').delete().eq('bot_id', bot.id).eq('skill_id', s.id); reload(); }} className="p-1.5 rounded-lg text-ink-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
        </div>
      )}
    </Panel>
    </>
  );
}

export function RunsTable({ runs, p }: { runs: Run[]; p?: Portfolio }) {
  if (!runs.length) return <StateView kind="empty" title="Henüz koşu yok" message="Zamanı gelen görevler worker tarafından çalıştırıldığında gerçek koşu kayıtları burada görünür." />;
  return (
    <div className="ops-panel overflow-x-auto ops-scroll">
      <table className="w-full text-xs min-w-[720px]">
        <thead><tr className="text-left text-[10px] font-mono uppercase tracking-wider text-ink-500 border-b border-ink-800"><th className="p-3">Zaman</th><th className="p-3">Skill</th><th className="p-3">Tetik</th><th className="p-3">Durum</th><th className="p-3">Süre</th><th className="p-3">Özet / hata</th></tr></thead>
        <tbody>{runs.map((r) => (
          <tr key={r.id} className="border-b border-ink-800/60">
            <td className="p-3 font-mono text-ink-300 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
            <td className="p-3 text-ink-200">{p?.skills.find((s) => s.id === r.skill_id)?.display_name ?? r.run_scope}</td>
            <td className="p-3 text-ink-400">{r.trigger}{r.attempt > 1 ? ` #${r.attempt}` : ''}</td>
            <td className="p-3"><Pill tone={runTone(r.status)}>{RUN_LABELS[r.status] ?? r.status}</Pill></td>
            <td className="p-3 font-mono text-ink-400">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
            <td className="p-3 text-ink-300 max-w-md truncate">{r.error ? <span className="text-rose-700">{r.error_code}: {r.error}</span> : r.summary}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

function BotApprovals({ botId }: { botId: string }) {
  const { go } = useRouter();
  const q = useQuery(async () => unwrap(await db().from('approval_requests').select('*').eq('bot_id', botId).order('created_at', { ascending: false }).limit(50)) as Approval[], [] as Approval[], [botId]);
  if (q.loading) return <StateView kind="loading" compact />;
  if (!q.data.length) return <StateView kind="empty" title="Bu botun onay isteği yok" />;
  return (
    <div className="space-y-2">{q.data.map((a) => (
      <button key={a.id} onClick={() => go('approvals', a.id)} className="w-full text-left ops-panel !rounded-xl p-3 flex items-center gap-3">
        <PlatformBadge platform={a.platform} /><span className="flex-1 min-w-0"><span className="block text-sm text-ink-100 truncate">{a.title}</span><span className="block text-[10px] font-mono text-ink-500">{a.tool_key ?? a.entity_type} · {fmtDateTime(a.created_at)}</span></span>
        <Pill tone={approvalTone(a.status)}>{approvalLabel(a.status)}</Pill>
      </button>))}</div>
  );
}

function BotLogs({ runs }: { runs: Run[] }) {
  const ids = runs.map((r) => r.id);
  const q = useQuery(async () => (ids.length ? unwrap(await db().from('automation_run_logs').select('*').in('run_id', ids).order('at', { ascending: false }).limit(300)) as RunLog[] : []), [] as RunLog[], [ids.join(',')]);
  if (q.loading) return <StateView kind="loading" compact />;
  if (!q.data.length) return <StateView kind="empty" title="Log yok" />;
  const color: Record<string, string> = { info: 'text-sky-700', warn: 'text-amber-700', error: 'text-rose-700', debug: 'text-ink-500' };
  return (
    <div className="ops-panel p-3 font-mono text-[11px] max-h-[520px] overflow-y-auto ops-scroll space-y-0.5">
      {q.data.map((l) => <div key={l.id} className="grid grid-cols-[120px_52px_1fr] gap-2"><span className="text-ink-500">{fmtDateTime(l.at)}</span><span className={color[l.level] ?? 'text-ink-300'}>{l.level.toUpperCase()}</span><span className="text-ink-200 break-words">{l.message}{l.data ? <span className="text-ink-500"> {JSON.stringify(l.data).slice(0, 200)}</span> : null}</span></div>)}
    </div>
  );
}

function BotResults({ runs }: { runs: Run[] }) {
  if (!runs.length) return <StateView kind="empty" title="Henüz sonuç yok" />;
  return (
    <div className="space-y-3">{runs.map((r) => {
      const tools = r.output?.tools || {};
      const seo = tools.seo_audit as { score?: number; findings?: Array<{ level: string; message: string }>; url?: string } | undefined;
      const report = tools.create_report as { title?: string; body?: string } | undefined;
      return (
        <Panel key={r.id} kicker={fmtDateTime(r.created_at)} title={r.summary || r.run_scope}>
          {seo && <div className="mb-3"><div className="text-xs text-ink-300 mb-2">SEO skoru: <b className="text-ink-100">{seo.score}</b> · {seo.url}</div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">{(seo.findings || []).map((f, i) => <li key={i} className="flex items-center gap-2 text-[11px]"><span className={cx('w-2 h-2 rounded-full', f.level === 'ok' ? 'bg-signal-go' : f.level === 'warn' ? 'bg-signal-wait' : 'bg-signal-stop')} />{f.message}</li>)}</ul></div>}
          {report?.body && <pre className="text-[12px] text-ink-200 whitespace-pre-wrap font-sans bg-ink-950 rounded-xl p-3">{report.body}</pre>}
          {!seo && !report && <pre className="text-[11px] text-ink-400 whitespace-pre-wrap font-mono bg-ink-950 rounded-xl p-3 max-h-60 overflow-auto ops-scroll">{JSON.stringify(tools, null, 2)}</pre>}
        </Panel>
      );
    })}</div>
  );
}

const ICON_CHOICES = ['bot', 'search-check', 'share-2', 'instagram', 'facebook', 'store', 'hammer', 'map-pin', 'radar', 'users', 'pen-line', 'megaphone', 'line-chart', 'telescope', 'briefcase'];

function BotEditor({ p, bot, onClose, onSaved, inline = false }: { p: Portfolio; bot?: Bot; onClose: () => void; onSaved: (id: string) => void; inline?: boolean }) {
  const [f, setF] = useState({
    name: bot?.name ?? '', slug: bot?.slug ?? '', bot_type: bot?.bot_type ?? 'custom', platform: bot?.platform ?? '', icon: bot?.icon ?? 'bot', description: bot?.description ?? '',
    instructions: bot?.instructions ?? '', ai_agent_id: bot?.ai_agent_id ?? p.agents[0]?.id ?? '', connector_key: bot?.connector_key ?? '', status: bot?.status ?? 'active',
    skills: (bot?.automation_bot_skills || []).map((l) => l.skill_id),
  });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const slugify = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const row = { name: f.name, slug: f.slug || slugify(f.name), bot_type: f.bot_type, platform: f.platform || null, icon: f.icon, description: f.description, instructions: f.instructions,
        ai_agent_id: f.ai_agent_id || null, connector_key: f.connector_key || null, status: f.status, archived_at: f.status === 'archived' ? new Date().toISOString() : null };
      let id = bot?.id;
      if (bot) { const { error } = await db().from('automation_bots').update(row).eq('id', bot.id); if (error) throw error; }
      else { const { data, error } = await db().from('automation_bots').insert(row).select('id').single(); if (error) throw error; id = data.id; }
      if (!bot && f.skills.length) { const { error } = await db().from('automation_bot_skills').insert(f.skills.map((s, i) => ({ bot_id: id, skill_id: s, position: i }))); if (error) throw error; }
      const { data: saved } = await db().from('automation_bots').select('updated_at').eq('id', id!).single();
      setSavedAt(saved?.updated_at ?? new Date().toISOString());
      onSaved(id!);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const form = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Bot adı"><input className="ops-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: bot ? f.slug : slugify(e.target.value) })} /></Field>
      <Field label="Slug"><input className="ops-input font-mono" value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} /></Field>
      <Field label="Tip"><input className="ops-input" value={f.bot_type} onChange={(e) => setF({ ...f, bot_type: e.target.value })} placeholder="social / seo / crm …" /></Field>
      <Field label="Platform"><input className="ops-input" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} placeholder="instagram / web / multi" /></Field>
      <Field label="Connector"><input className="ops-input" value={f.connector_key} onChange={(e) => setF({ ...f, connector_key: e.target.value })} placeholder="instagram / facebook / website" /></Field>
      <Field label="AI agent"><select className="ops-input" value={f.ai_agent_id} onChange={(e) => setF({ ...f, ai_agent_id: e.target.value })}>{p.agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.provider}/{a.model}</option>)}</select></Field>
      <Field label="Durum"><select className="ops-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{Object.entries(BOT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
      <Field label="İkon"><div className="flex flex-wrap gap-1">{ICON_CHOICES.map((i) => <button key={i} type="button" onClick={() => setF({ ...f, icon: i })} className={cx('p-1.5 rounded-lg ring-1', f.icon === i ? 'ring-brand-green bg-ink-750 text-brand-green' : 'ring-ink-700 text-ink-400')}><DynIcon name={i} /></button>)}</div></Field>
      <Field label="Açıklama" className="sm:col-span-2"><input className="ops-input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Talimat (instructions)" className="sm:col-span-2"><textarea className="ops-input min-h-[90px]" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></Field>
      {!bot && <Field label="Skill’ler" className="sm:col-span-2"><div className="flex flex-wrap gap-1.5">{p.skills.map((s) => <button key={s.id} type="button" onClick={() => setF({ ...f, skills: f.skills.includes(s.id) ? f.skills.filter((x) => x !== s.id) : [...f.skills, s.id] })} className={cx('rounded-lg px-2 py-1 text-[11px] ring-1', f.skills.includes(s.id) ? 'ring-brand-green bg-ink-750 text-ink-100' : 'ring-ink-700 text-ink-400')}>{s.display_name}</button>)}</div></Field>}
      {err && <div className="sm:col-span-2"><Notice tone="error">{err}</Notice></div>}
    </div>
  );
  if (inline) return <Panel title="Bot ayarları" action={<div className="flex flex-col items-end gap-1"><Button variant="primary" loading={busy} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button><SavedStamp at={savedAt} /></div>}>{form}</Panel>;
  return <Modal open wide onClose={onClose} title={bot ? 'Botu düzenle' : 'Yeni bot'} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={!f.name} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button></>}>{form}</Modal>;
}
