import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, Bot, Briefcase, CalendarClock, CheckCheck, Cpu, FileText, Film, Gauge, PlugZap, Radar, Sparkles, TrendingUp, UsersRound } from 'lucide-react';
import { callOps } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { approvalLabel, approvalTone, connectionLabel, connectionTone, dayKey, fmtDateTime, fmtTime, istanbulHour, platformMeta, relTime, RUN_LABELS, runTone, TONE_DOT, type Tone } from '../lib/format';
import type { Approval, Bot as BotRow, Draft, OpsStatus, Publication, Run, Task } from '../lib/types';
import { useRouter, useSession } from '../session';
import { Button, cx, DynIcon, ErrorState, Panel, Pill, PlatformBadge, Stat, StateView } from '../ui';

interface HomeData {
  bots: BotRow[]; tasks: Task[]; runs: Run[]; approvals: Approval[]; pendingCount: number; drafts: Draft[]; pubs: Publication[];
  counts: { construction: number; rental: number; web: number; constructionToday: number; rentalToday: number; webToday: number };
  failedTasks: Task[]; failedApprovals: number;
}

function dayStartIso() { return new Date(`${dayKey(new Date())}T00:00:00+03:00`).toISOString(); }

async function loadHome(): Promise<HomeData> {
  const s = db();
  const start = dayStartIso();
  const end = new Date(new Date(start).getTime() + 86400_000).toISOString();
  const week = new Date(Date.now() + 7 * 86400_000).toISOString();
  const head = { count: 'exact' as const, head: true };
  const [bots, tasks, runs, approvals, pending, drafts, pubs, cAll, rAll, wAll, cToday, rToday, wToday, failedTasks, failedAp] = await Promise.all([
    s.from('automation_bots').select('*').neq('status', 'archived'),
    s.from('automation_tasks').select('*').eq('enabled', true).is('archived_at', null).gte('next_run_at', start).lt('next_run_at', end).order('next_run_at'),
    s.from('social_bot_runs').select('*').gte('created_at', start).order('created_at', { ascending: false }).limit(60),
    s.from('approval_requests').select('*').eq('status', 'pending_approval').order('created_at', { ascending: false }).limit(6),
    s.from('approval_requests').select('id', head).eq('status', 'pending_approval'),
    s.from('social_drafts').select('*').gte('scheduled_at', new Date().toISOString()).lte('scheduled_at', week).neq('workflow_status', 'cancelled').order('scheduled_at').limit(8),
    s.from('social_publications').select('*').gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString()).order('created_at', { ascending: false }).limit(20),
    s.from('construction_customers').select('id', head).is('archived_at', null),
    s.from('rental_customers').select('id', head).is('archived_at', null),
    s.from('lead_inbox').select('id', head).eq('status', 'yeni'),
    s.from('construction_customers').select('id', head).gte('created_at', start),
    s.from('rental_customers').select('id', head).gte('created_at', start),
    s.from('lead_inbox').select('id', head).gte('created_at', start),
    s.from('automation_tasks').select('*').in('status', ['dead_letter', 'failed']).is('archived_at', null).limit(5),
    s.from('approval_requests').select('id', head).eq('status', 'failed'),
  ]);
  return {
    bots: unwrap(bots), tasks: unwrap(tasks), runs: unwrap(runs), approvals: unwrap(approvals), pendingCount: pending.count ?? 0, drafts: unwrap(drafts), pubs: unwrap(pubs),
    counts: { construction: cAll.count ?? 0, rental: rAll.count ?? 0, web: wAll.count ?? 0, constructionToday: cToday.count ?? 0, rentalToday: rToday.count ?? 0, webToday: wToday.count ?? 0 },
    failedTasks: unwrap(failedTasks), failedApprovals: failedAp.count ?? 0,
  };
}

const EMPTY: HomeData = { bots: [], tasks: [], runs: [], approvals: [], pendingCount: 0, drafts: [], pubs: [], counts: { construction: 0, rental: 0, web: 0, constructionToday: 0, rentalToday: 0, webToday: 0 }, failedTasks: [], failedApprovals: 0 };

interface TimelineItem { key: string; at: string; bot?: BotRow; title: string; detail: string; tone: Tone; label: string; kind: 'planned' | 'run' }

function TodayRail({ items }: { items: TimelineItem[] }) {
  const nowH = istanbulHour(new Date()) + new Date().getMinutes() / 60;
  return (
    <div className="relative h-16 mt-2 mb-1">
      <div className="absolute inset-x-0 top-7 h-px bg-ink-700" />
      <div className="absolute top-7 h-px bg-gradient-to-r from-brand-green/0 via-brand-green to-brand-green" style={{ left: 0, width: `${(nowH / 24) * 100}%` }} />
      {[0, 6, 12, 18, 24].map((h) => (
        <div key={h} className="absolute top-10 -translate-x-1/2 text-[9px] font-mono text-ink-500" style={{ left: `${(h / 24) * 100}%` }}>{String(h).padStart(2, '0')}:00</div>
      ))}
      <div className="absolute top-1 bottom-4 w-px bg-signal-go/70" style={{ left: `${(nowH / 24) * 100}%` }}>
        <span className="absolute -top-1 -translate-x-1/2 text-[9px] font-mono font-bold text-signal-go bg-ink-900 px-1 rounded">ŞİMDİ</span>
      </div>
      {items.map((it) => {
        const d = new Date(it.at); const h = istanbulHour(d) + d.getMinutes() / 60;
        return <span key={it.key} title={`${fmtTime(it.at)} · ${it.title}`} className={cx('absolute top-[22px] w-3 h-3 -translate-x-1/2 rounded-full ring-2 ring-ink-900', TONE_DOT[it.tone], it.kind === 'planned' && 'opacity-60')} style={{ left: `${(h / 24) * 100}%` }} />;
      })}
    </div>
  );
}

export function HomeScreen() {
  const { go } = useRouter();
  const session = useSession();
  const q = useQuery(loadHome, EMPTY, [], ['social_bot_runs', 'automation_tasks', 'approval_requests', 'construction_customers', 'rental_customers', 'lead_inbox', 'social_drafts']);
  const status = useQuery<OpsStatus | null>(() => callOps<OpsStatus>('status'), null, []);
  const d = q.data;
  const botById = useMemo(() => new Map(d.bots.map((b) => [b.id, b])), [d.bots]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const planned = d.tasks.filter((t) => t.next_run_at && new Date(t.next_run_at).getTime() > Date.now() - 60_000).map((t) => ({
      key: `t-${t.id}`, at: t.next_run_at!, bot: botById.get(t.bot_id || ''), title: t.title || t.task_type, detail: 'Planlandı', tone: 'idle' as Tone, label: 'PLANLI', kind: 'planned' as const,
    }));
    const runs = d.runs.map((r) => ({
      key: `r-${r.id}`, at: r.started_at || r.created_at, bot: botById.get(r.bot_id || ''), title: r.summary || r.run_scope, detail: r.error_code ? `${r.error_code}` : r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)} sn` : '',
      tone: runTone(r.status), label: RUN_LABELS[r.status] ?? r.status.toUpperCase(), kind: 'run' as const,
    }));
    return [...runs, ...planned].sort((a, b) => a.at.localeCompare(b.at));
  }, [d.tasks, d.runs, botById]);

  const running = d.runs.filter((r) => r.status === 'running');
  const connected = status.data?.connectors.filter((c) => c.status === 'connected').length ?? 0;
  const aiReady = status.data ? Object.values(status.data.ai).some(Boolean) : false;
  const alerts: Array<{ tone: Tone; text: string; action?: () => void }> = [];
  if (status.data && !aiReady) alerts.push({ tone: 'wait', text: 'AI sağlayıcı anahtarı tanımlı değil — AI içerik görevleri ENGELLENDİ durumunda. (Ayarlar → AI)', action: () => go('settings') });
  d.failedTasks.forEach((t) => alerts.push({ tone: 'stop', text: `${t.title || t.task_type}: ${t.status === 'dead_letter' ? 'DEAD LETTER' : 'BAŞARISIZ'} — ${t.last_error ?? ''}`, action: () => go('bots', t.bot_id) }));
  if (d.failedApprovals) alerts.push({ tone: 'stop', text: `${d.failedApprovals} onaylı işlem yürütülürken başarısız oldu`, action: () => go('approvals') });
  d.runs.filter((r) => r.status === 'blocked').slice(0, 3).forEach((r) => alerts.push({ tone: 'wait', text: `${botById.get(r.bot_id || '')?.name ?? 'Bot'} engellendi: ${r.error}` }));
  status.data?.connectors.filter((c) => c.status === 'expired').forEach((c) => alerts.push({ tone: 'stop', text: `${c.name} token süresi doldu — yeniden bağlanın`, action: () => go('connections') }));

  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  const h = istanbulHour(new Date());
  const hello = h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';

  return (
    <div className="space-y-4">
      {/* Hızlı Erişim Şeridi */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 ops-scroll -mx-1 px-1">
        <button onClick={() => go('home')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-green text-white text-xs font-semibold shrink-0 shadow-sm">
          <Gauge className="w-3.5 h-3.5" /> Özet
        </button>
        <button onClick={() => go('connections')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-900 border border-ink-750 text-ink-200 hover:text-ink-100 text-xs font-medium shrink-0">
          <PlugZap className="w-3.5 h-3.5 text-brand-green" /> Eklentiler (9)
        </button>
        <button onClick={() => go('videos')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-900 border border-ink-750 text-ink-200 hover:text-ink-100 text-xs font-medium shrink-0">
          <Film className="w-3.5 h-3.5 text-amber-500" /> Video Havuzu (3)
        </button>
        <button onClick={() => go('portfolio')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-900 border border-ink-750 text-ink-200 hover:text-ink-100 text-xs font-medium shrink-0">
          <Briefcase className="w-3.5 h-3.5 text-blue-500" /> CRM & Portföy (2)
        </button>
        <button onClick={() => go('queue')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-900 border border-ink-750 text-ink-200 hover:text-ink-100 text-xs font-medium shrink-0">
          <CalendarClock className="w-3.5 h-3.5 text-rose-500" /> Yayın Kuyruğu
        </button>
        <button onClick={() => go('bots')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-900 border border-ink-750 text-ink-200 hover:text-ink-100 text-xs font-medium shrink-0">
          <Bot className="w-3.5 h-3.5 text-emerald-500" /> Botlar
        </button>
        <button onClick={() => go('reports')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-900 border border-ink-750 text-ink-200 hover:text-ink-100 text-xs font-medium shrink-0">
          <FileText className="w-3.5 h-3.5 text-indigo-500" /> Raporlar
        </button>
      </div>

      {/* Başlık şeridi */}
      <section className="ops-panel p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-ink-700/60" />
        <div className="absolute -right-4 -top-4 w-40 h-40 rounded-full border border-ink-700/60" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-brand-green">Live Operations · {new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 mt-1">{hello}, {session.displayName}.</h2>
            <p className="text-sm text-ink-300 mt-1 max-w-2xl">
              Bugün <b className="text-ink-100">{d.tasks.length}</b> planlı bot görevi, <b className="text-ink-100">{d.runs.length}</b> tamamlanan/çalışan koşu ve <b className="text-amber-700">{d.pendingCount}</b> onay bekleyen iş var.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0 lg:min-w-[520px]">
            <Stat label="Çalışan bot" value={running.length} tone={running.length ? 'run' : 'idle'} sub={running.length ? running.map((r) => botById.get(r.bot_id || '')?.name).join(', ') : 'Şu an boşta'} />
            <Stat label="Onay bekleyen" value={d.pendingCount} tone={d.pendingCount ? 'wait' : 'go'} sub="İnsan kararı" />
            <Stat label="Bugünkü lead" value={d.counts.constructionToday + d.counts.rentalToday + d.counts.webToday} tone="go" sub={`${d.counts.webToday} web başvurusu`} />
            <Stat label="Bağlı platform" value={status.data ? connected : '…'} tone={connected ? 'go' : 'wait'} sub={status.data ? `${status.data.connectors.length} connector` : 'kontrol ediliyor'} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-5">
        {/* BUGÜN BOTLAR NE YAPIYOR */}
        <Panel kicker="Today · Bot Activity" title="Bugün botlar ne yapıyor?" action={<Button variant="ghost" onClick={() => go('bots')} icon={<Bot className="w-4 h-4" />}>Portföy</Button>}>
          {q.loading ? <StateView kind="loading" compact /> : (
            <>
              <TodayRail items={timeline} />
              {timeline.length === 0 ? (
                <StateView kind="empty" compact title="Bugün için görev yok" message="Bot Portföyü’nden zamanlanmış görev oluşturduğunuzda burada saat saat görünür." />
              ) : (
                <ol className="mt-3 space-y-1.5 max-h-[420px] overflow-y-auto ops-scroll pr-1">
                  {timeline.map((it) => (
                    <li key={it.key} className={cx('grid grid-cols-[52px_28px_1fr_auto] items-center gap-3 rounded-xl px-2.5 py-2', it.kind === 'planned' ? 'bg-transparent' : 'bg-ink-900/60 ring-1 ring-ink-800')}>
                      <span className="font-mono text-xs tabular-nums text-ink-300">{fmtTime(it.at)}</span>
                      <span className={cx('w-7 h-7 rounded-lg flex items-center justify-center bg-ink-800 text-ink-200', it.kind === 'planned' && 'opacity-60')}><DynIcon name={it.bot?.icon} className="w-3.5 h-3.5" /></span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-ink-100 line-clamp-2 sm:truncate">{it.bot?.name ?? 'Görev'} <span className="text-ink-500">→</span> <span className="font-normal text-ink-300">{it.title}</span></span>
                        {it.detail && <span className="block text-[10px] font-mono text-ink-500 truncate">{it.detail}</span>}
                      </span>
                      <Pill tone={it.tone}>{it.label}</Pill>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </Panel>

        {/* ONAY AKIŞI */}
        <Panel kicker="Approval Stream" title="Neyin onayı bekliyor?" action={<Button variant="ghost" onClick={() => go('approvals')} icon={<CheckCheck className="w-4 h-4" />}>Tümü</Button>}>
          {q.loading ? <StateView kind="loading" compact /> : d.approvals.length === 0 ? (
            <StateView kind="empty" compact title="Onay kuyruğu temiz" message="Botların ürettiği içerik, mesaj ve ilanlar yayından önce burada görünür." />
          ) : (
            <ul className="space-y-2">
              {d.approvals.map((a) => (
                <li key={a.id}>
                  <button onClick={() => go('approvals', a.id)} className="w-full text-left rounded-xl bg-ink-900/60 ring-1 ring-ink-800 hover:ring-amber-400/40 px-3 py-2.5 flex items-start gap-3 transition">
                    <PlatformBadge platform={a.platform} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink-100 truncate">{a.title}</span>
                      <span className="block text-[11px] text-ink-400 truncate">{a.summary || a.entity_type}</span>
                    </span>
                    <span className="text-[10px] font-mono text-ink-500 shrink-0">{relTime(a.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEADS */}
        <Panel kicker="Leads Pulse" title="Müşteri nabzı" action={<UsersRound className="w-5 h-5 text-ink-500" />}>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => go('construction')} className="text-left"><Stat label="İnşaat" value={d.counts.construction} sub={`+${d.counts.constructionToday} bugün`} /></button>
            <button onClick={() => go('rental')} className="text-left"><Stat label="Kiralama" value={d.counts.rental} sub={`+${d.counts.rentalToday} bugün`} /></button>
            <button onClick={() => go('leads')} className="text-left"><Stat label="Web yeni" value={d.counts.web} tone={d.counts.web ? 'wait' : undefined} sub="işlenmedi" /></button>
          </div>
          <p className="text-[11px] text-ink-500 mt-3">Kaynak: Supabase canlı kayıtları. Lead Discovery Bot her gün 12:00’de web başvurularını tarar ve dönüştürme onayı açar.</p>
        </Panel>

        {/* PLATFORM WALL */}
        <Panel kicker="Platform Wall" title="Bağlantı durumu" action={<Button variant="ghost" onClick={() => go('connections')} icon={<PlugZap className="w-4 h-4" />}>Yönet</Button>}>
          {status.loading ? <StateView kind="loading" compact /> : status.error ? <StateView kind="error" compact message={status.error} /> : (
            <div className="grid grid-cols-2 gap-1.5">
              {status.data?.connectors.filter((c) => c.category === 'social' || c.category === 'listing' || c.key === 'google_business' || c.key === 'canva').map((c) => (
                <div key={c.key} className="flex items-center gap-2 rounded-lg bg-ink-900/60 px-2 py-1.5">
                  <PlatformBadge platform={c.key} />
                  <span className="min-w-0 flex-1 text-[11px] font-semibold text-ink-200 truncate">{c.name}</span>
                  <span className={cx('w-2 h-2 rounded-full', TONE_DOT[connectionTone(c.status)])} title={connectionLabel(c.status)} />
                </div>
              ))}
            </div>
          )}
          {status.data && <div className="mt-3 flex flex-wrap gap-1.5">
            <Pill tone={aiReady ? 'go' : 'wait'}><Cpu className="w-3 h-3" /> AI {aiReady ? 'HAZIR' : 'YAPILANDIRMA GEREKLİ'}</Pill>
            <Pill tone="go"><Radar className="w-3 h-3" /> SCHEDULER · pg_cron 1 dk</Pill>
          </div>}
        </Panel>

        {/* ALERTS */}
        <Panel kicker="Alerts" title="Dikkat gerektirenler" action={<AlertTriangle className="w-5 h-5 text-ink-500" />}>
          {alerts.length === 0 ? <StateView kind="empty" compact title="Kritik uyarı yok" message="Başarısız görev, süresi dolan token veya engellenen bot yok." /> : (
            <ul className="space-y-1.5">
              {alerts.slice(0, 6).map((a, i) => (
                <li key={i}><button onClick={a.action} className="w-full text-left flex items-start gap-2 rounded-lg bg-ink-900/60 px-2.5 py-2 text-[12px] text-ink-200 hover:bg-ink-800">
                  <span className={cx('mt-1 w-2 h-2 rounded-full shrink-0', TONE_DOT[a.tone])} />{a.text}</button></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* İÇERİK */}
        <Panel kicker="Content Timeline" title="Ne yayınlanacak? (7 gün)" action={<Button variant="primary" onClick={() => go('studio')} icon={<Sparkles className="w-4 h-4" />}>Yeni gönderi</Button>}>
          {d.drafts.length === 0 ? <StateView kind="empty" compact title="Planlı içerik yok" message="Gönderi Stüdyosu’nda içerik üretin veya İçerik Takvimi’nden aylık plan başlatın."
            action={<Button variant="ghost" onClick={() => go('planner')} icon={<CalendarClock className="w-4 h-4" />}>Takvime git</Button>} /> : (
            <ul className="space-y-1.5">
              {d.drafts.map((dr) => (
                <li key={dr.id} className="flex items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-2">
                  <PlatformBadge platform={dr.primary_platform || dr.platform_targets[0]} />
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-ink-100 truncate">{dr.title}</span><span className="block text-[10px] font-mono text-ink-500">{fmtDateTime(dr.scheduled_at)}</span></span>
                  <Pill tone={approvalTone(dr.workflow_status)}>{approvalLabel(dr.workflow_status)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* PERFORMANS */}
        <Panel kicker="Performance Pulse" title="Ne sonuç verdi? (7 gün)" action={<TrendingUp className="w-5 h-5 text-ink-500" />}>
          {d.pubs.length === 0 ? <StateView kind="not_connected" compact title="Henüz gerçek yayın yok" message="Metrikler yalnızca platform API’sinden gelen gerçek yayınlar için gösterilir. Sahte veri üretilmez." action={<Button variant="ghost" onClick={() => go('connections')}>Platform bağla</Button>} /> : (
            <ul className="space-y-1.5">
              {d.pubs.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-2">
                  <PlatformBadge platform={p.platform} />
                  <span className="min-w-0 flex-1 text-[12px] text-ink-200 truncate">{p.external_url ? <a className="underline decoration-ink-600 hover:text-brand-green" href={p.external_url} target="_blank" rel="noreferrer">{p.external_post_id}</a> : (p.error || platformMeta(p.platform).name)}</span>
                  <Pill tone={approvalTone(p.status)}>{approvalLabel(p.status)}</Pill>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => go('planner')} className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-400 hover:text-brand-green">Tüm yayın geçmişi <ArrowRight className="w-3 h-3" /></button>
        </Panel>
      </div>
    </div>
  );
}
