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
                    <Button variant="primary" loading={busy === `run-${t.id}`} onClick={() => act(`run-${t.id}`, async () => { const r =
