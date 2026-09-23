// Uygulama detay penceresi: bu platformda hangi botlar görevli, ne yapıyorlar, bağlantı durumu, geçmiş bulgular.
import { useState } from 'react';
import { Bot as BotIcon, CalendarClock, ExternalLink, FileText, PlugZap, Smartphone, Target } from 'lucide-react';
import { appUrl, openApp } from '../lib/appLinks';
import { db, unwrap, useQuery } from '../lib/hooks';
import { BOT_STATUS, connectionLabel, connectionTone, fmtDateTime, relTime, RUN_LABELS, runTone } from '../lib/format';
import type { Bot, ConnectorStatus, Draft, Mission, Run, Task } from '../lib/types';
import { useRouter } from '../session';
import { Button, DynIcon, Modal, Pill, PlatformBadge, StateView } from '../ui';
import { FINISH_REASON, MISSION_STATUS, MissionDetail, MissionLauncher } from './Missions';

const DOMAINS: Record<string, string[]> = {
  instagram: ['instagram.com'], facebook: ['facebook.com', 'fb.com'], linkedin: ['linkedin.com'], x: ['x.com', 'twitter.com'], tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'], google_business: ['google.com/maps', 'g.page', 'business.google.com'], sahibinden: ['sahibinden.com'], armut: ['armut.com'],
  whatsapp_cloud: ['wa.me', 'whatsapp.com'], telegram: ['t.me', 'telegram.org'], canva: ['canva.com'], website: [],
};

interface AppData { bots: Bot[]; tasks: Task[]; runs: Run[]; missions: Mission[]; drafts: Draft[]; published: number; failed: number }

export function AppDetail({ c, allBots, onClose, onConnect, canConnect, busy }: { c: ConnectorStatus; allBots: Bot[]; onClose: () => void; onConnect?: () => void; canConnect: boolean; busy: boolean }) {
  const { go } = useRouter();
  const [mission, setMission] = useState<string | null>(null);
  const [launch, setLaunch] = useState(false);
  const bots = allBots.filter((b) => b.platform === c.key || b.connector_key === c.key || (c.key === 'google_business' && b.platform === 'gmb'));
  const q = useQuery<AppData>(async () => {
    const s = db(); const ids = bots.map((b) => b.id);
    const domains = DOMAINS[c.key] ?? [];
    const [tasks, runs, missionsByBot, missionsByUrl, drafts, pub, fail] = await Promise.all([
      ids.length ? s.from('automation_tasks').select('*').in('bot_id', ids).is('archived_at', null) : Promise.resolve({ data: [], error: null }),
      ids.length ? s.from('social_bot_runs').select('id,bot_id,status,summary,error,created_at,trigger').in('bot_id', ids).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [], error: null }),
      ids.length ? s.from('bot_missions').select('id,bot_id,title,goal,status,finish_reason,summary,findings,sources,step_count,duration_minutes,started_at,deadline_at,finished_at,created_at,target_url').in('bot_id', ids).order('created_at', { ascending: false }).limit(15) : Promise.resolve({ data: [], error: null }),
      domains.length ? s.from('bot_missions').select('id,bot_id,title,goal,status,finish_reason,summary,findings,sources,step_count,duration_minutes,started_at,deadline_at,finished_at,created_at,target_url').or(domains.map((d) => `target_url.ilike.%${d}%`).join(',')).order('created_at', { ascending: false }).limit(15) : Promise.resolve({ data: [], error: null }),
      s.from('social_drafts').select('id,title,workflow_status,scheduled_at,primary_platform,created_at').or(`primary_platform.eq.${c.key},platform_targets.cs.{${c.key}}`).neq('archive_status', 'archived').order('scheduled_at', { ascending: true, nullsFirst: false }).limit(8),
      s.from('social_publications').select('id', { count: 'exact', head: true }).eq('platform', c.key).eq('status', 'published'),
      s.from('social_publications').select('id', { count: 'exact', head: true }).eq('platform', c.key).eq('status', 'failed'),
    ]);
    const mm = new Map<string, Mission>();
    for (const m of [...(unwrap(missionsByBot) as Mission[]), ...(unwrap(missionsByUrl) as Mission[])]) mm.set(m.id, m);
    return { bots, tasks: unwrap(tasks) as Task[], runs: unwrap(runs) as Run[], missions: [...mm.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      drafts: unwrap(drafts) as Draft[], published: pub.count ?? 0, failed: fail.count ?? 0 };
  }, { bots: [], tasks: [], runs: [], missions: [], drafts: [], published: 0, failed: 0 }, [c.key, bots.length], ['bot_missions', 'social_bot_runs']);
  const connected = c.accounts.filter((a) => a.connection_status === 'connected');

  return (
    <Modal open wide onClose={onClose} title={<span className="inline-flex items-center gap-2"><PlatformBadge platform={c.key} /> {c.name}</span>}
      footer={<>
        {canConnect && onConnect && <Button variant={c.status === 'connected' ? 'subtle' : 'primary'} loading={busy} disabled={c.missing_env.length > 0} onClick={onConnect} icon={<PlugZap className="w-4 h-4" />}>{c.status === 'connected' ? 'Yeniden bağla' : `${c.name} hesabıyla giriş yap`}</Button>}
        {appUrl(c.key) && <Button variant="ghost" onClick={() => openApp(c.key)} icon={<Smartphone className="w-4 h-4" />}>Uygulamayı aç</Button>}
        <Button variant="primary" onClick={() => setLaunch(true)} icon={<Target className="w-4 h-4" />}>Bu uygulama için görev ver</Button>
        <Button variant="ghost" onClick={onClose}>Kapat</Button></>}>
      <div className="space-y-4">
        {/* Durum */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="rounded-xl bg-ink-800 p-3"><div className="text-[10px] font-mono text-ink-500">BAĞLANTI</div><Pill tone={connectionTone(c.status)}>{connectionLabel(c.status)}</Pill></div>
          <div className="rounded-xl bg-ink-800 p-3"><div className="text-[10px] font-mono text-ink-500">HESAP</div><div className="text-ink-100 truncate">{connected[0]?.external_account_name ?? '—'}</div><div className="text-[10px] text-ink-500">{connected[0] ? `doğrulandı ${relTime(connected[0].last_verified_at)}` : 'bağlı hesap yok'}</div></div>
          <div className="rounded-xl bg-ink-800 p-3"><div className="text-[10px] font-mono text-ink-500">GÖREVLİ BOT</div><div className="text-lg font-display font-semibold text-ink-100">{bots.length}</div></div>
          <div className="rounded-xl bg-ink-800 p-3"><div className="text-[10px] font-mono text-ink-500">PAYLAŞIMLAR</div><div className="text-ink-100"><b>{q.data.published}</b> başarılı · <span className={q.data.failed ? 'text-rose-700' : ''}>{q.data.failed} hatalı</span></div></div>
        </div>
        {c.status !== 'connected' && <div className="rounded-xl bg-amber-500/10 ring-1 ring-amber-400/30 p-3 text-xs text-amber-800">
          {c.missing_env.length ? <>Bağlanmak için önce <button className="underline font-semibold" onClick={() => { onClose(); go('system', null, { tab: 'credentials' }); }}>Bağlantı & Sistem → Giriş bilgileri</button> bölümüne {c.name} uygulama bilgileri girilmeli. Sonra “{c.name} hesabıyla giriş yap” butonu {c.name}’un kendi giriş ekranını açar; bir kez giriş yaparsınız, şifreniz programda tutulmaz.</>
            : c.implemented ? <>Hesap bağlı değil. “{c.name} hesabıyla giriş yap” ile {c.name}’un giriş ekranı açılır; bir kez izin verdiğinizde botlar bu hesabı programın içinden kullanır.</>
            : <>{c.name} için otomatik bağlantı henüz yok{c.officialApi ? '' : ' (bu site otomatik paylaşıma izin vermiyor)'}. Botlar içerik hazırlar; paylaşımı “Uygulamayı aç” ile siz yaparsınız.</>}
        </div>}

        {/* Görevli botlar */}
        <section>
          <h4 className="font-display font-semibold text-ink-100 mb-2 flex items-center gap-2"><BotIcon className="w-4 h-4 text-brand-green" /> {c.name}’da görevli botlar</h4>
          {bots.length === 0 ? <StateView kind="empty" compact title="Bu uygulamaya atanmış bot yok" message="Bot Merkezi’nde bir botun platformunu bu uygulama yaparak görevlendirebilirsiniz." /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{bots.map((b) => {
              const tasks = q.data.tasks.filter((t) => t.bot_id === b.id); const last = q.data.runs.find((r) => r.bot_id === b.id); const meta = BOT_STATUS[b.status] ?? BOT_STATUS.active;
              const next = tasks.filter((t) => t.enabled && t.next_run_at).map((t) => t.next_run_at!).sort()[0];
              return (
                <button key={b.id} onClick={() => { onClose(); go('bots', b.id); }} className="text-left rounded-xl ring-1 ring-ink-700 p-3 hover:bg-ink-850">
                  <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-ink-800 text-brand-green flex items-center justify-center"><DynIcon name={b.icon} /></span>
                    <span className="font-semibold text-sm text-ink-100 flex-1 truncate">{b.name}</span><Pill tone={meta.tone}>{meta.label}</Pill></div>
                  <p className="text-[11px] text-ink-400 mt-1.5 line-clamp-2">{b.description}</p>
                  <div className="text-[10px] text-ink-500 mt-1.5 space-y-0.5">
                    {tasks.map((t) => <div key={t.id} className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{t.title ?? t.task_type}{t.next_run_at && ` · sonraki ${fmtDateTime(t.next_run_at)}`}</div>)}
                    {last && <div>Son koşu: <Pill tone={runTone(last.status)} dot={false}>{RUN_LABELS[last.status] ?? last.status}</Pill> {relTime(last.created_at)}</div>}
                    {!tasks.length && !last && <div>Henüz zamanlı iş veya koşu yok.</div>}
                    {next && <div className="text-ink-400">Aktif: sonraki çalışma {fmtDateTime(next)}</div>}
                  </div>
                </button>);
            })}</div>)}
        </section>

        {/* Geçmiş bulgular */}
        <section>
          <h4 className="font-display font-semibold text-ink-100 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-brand-green" /> Botların {c.name} hakkında bulduğu bilgiler</h4>
          {q.loading ? <StateView kind="loading" compact /> : q.data.missions.length === 0 ? <StateView kind="empty" compact title="Henüz rapor yok" message={`“Bu uygulama için görev ver” ile örneğin bir ${c.name} profil linki verip analiz ettirebilirsiniz.`} /> : (
            <div className="space-y-2">{q.data.missions.map((m) => (
              <button key={m.id} onClick={() => setMission(m.id)} className="w-full text-left rounded-xl ring-1 ring-ink-700 p-3 hover:bg-ink-850">
                <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-ink-100 flex-1 truncate">{m.title}</span><Pill tone={MISSION_STATUS[m.status].tone}>{MISSION_STATUS[m.status].label}</Pill></div>
                <div className="text-[10px] text-ink-500 font-mono mt-1">{fmtDateTime(m.created_at)} · {m.findings?.length ?? 0} bulgu{m.finish_reason ? ` · ${FINISH_REASON[m.finish_reason] ?? m.finish_reason}` : ''}</div>
                {m.summary && <p className="text-xs text-ink-300 mt-1 line-clamp-2 whitespace-pre-line">{m.summary}</p>}
                {m.target_url && <span className="inline-flex items-center gap-1 text-[10px] text-brand-green mt-1 break-all"><ExternalLink className="w-3 h-3" />{m.target_url}</span>}
              </button>))}</div>)}
        </section>

        {/* Planlanan içerik */}
        <section>
          <h4 className="font-display font-semibold text-ink-100 mb-2 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-brand-green" /> {c.name} için planlanan içerikler</h4>
          {q.data.drafts.length === 0 ? <StateView kind="empty" compact title="Planlanan içerik yok" /> : (
            <div className="space-y-1.5">{q.data.drafts.map((d) => <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-850 px-3 py-2 text-xs">
              <span className="text-ink-200 truncate">{d.title}</span><span className="text-[10px] text-ink-500 shrink-0">{d.scheduled_at ? fmtDateTime(d.scheduled_at) : 'tarih yok'} · {d.workflow_status}</span></div>)}</div>)}
        </section>
      </div>
      {mission && <MissionDetail id={mission} bots={allBots} onClose={() => setMission(null)} />}
      {launch && <MissionLauncher bots={allBots} botId={bots[0]?.id} onClose={() => setLaunch(false)} onStarted={(id) => { setLaunch(false); setMission(id); q.reload(); }} />}
    </Modal>
  );
}
