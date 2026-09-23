// Bot görevleri: görev ver (amaç, link, aranan, rapor, süre, bitiş koşulu) → canlı adım günlüğü → rapor (HTML).
import { useEffect, useState } from 'react';
import { Archive, Download, ExternalLink, FileText, Loader2, MessageCircle, Play, Printer, Sparkles, Square, Target, Timer, Wand2 } from 'lucide-react';
import { callMissions, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime, type Tone } from '../lib/format';
import type { Bot, Mission, MissionStep } from '../lib/types';
import { useSession } from '../session';
import { Button, cx, Field, Modal, Notice, Pill, StateView } from '../ui';

export const MISSION_STATUS: Record<Mission['status'], { label: string; tone: Tone }> = {
  running: { label: 'ÇALIŞIYOR', tone: 'run' }, finalizing: { label: 'RAPOR HAZIRLANIYOR', tone: 'run' }, completed: { label: 'TAMAMLANDI', tone: 'go' },
  stopped: { label: 'DURDURULDU', tone: 'wait' }, failed: { label: 'BAŞARISIZ', tone: 'stop' }, blocked: { label: 'ENGELLENDİ', tone: 'stop' },
};
export const FINISH_REASON: Record<string, string> = {
  deadline: 'Süre doldu', stop_condition: 'Bitiş koşulu sağlandı', admin_stop: 'Yönetici durdurdu', max_steps: 'Adım sınırı', error: 'Hata', no_ai: 'AI anahtarı yok (yalnızca sayfa taraması)',
};
const DURATIONS = [1, 5, 10, 15, 30, 60, 120];

/** Bir bota görev ver. */
export function MissionLauncher({ bots, botId, onClose, onStarted }: { bots: Bot[]; botId?: string; onClose: () => void; onStarted: (id: string) => void }) {
  const [f, setF] = useState({ bot_id: botId ?? '', title: '', goal: '', target_url: '', search_for: '', report_spec: '', stop_condition: '', duration_minutes: 10 });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const ai = useQuery(() => callMissions<{ anthropic: boolean; gemini: boolean }>('ai_status'), null as { anthropic: boolean; gemini: boolean } | null, []);
  const noAi = ai.data && !ai.data.anthropic && !ai.data.gemini;
  const start = async () => {
    setBusy(true); setErr(null);
    try { const r = await callMissions<{ mission_id: string }>('mission_start', { ...f, bot_id: f.bot_id || null }); onStarted(r.mission_id); }
    catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const valid = f.title.trim().length >= 2 && f.goal.trim().length >= 3 && (!f.target_url || /^https?:\/\//i.test(f.target_url));
  return (
    <Modal open wide onClose={onClose} title={<span className="inline-flex items-center gap-2"><Target className="w-4 h-4 text-brand-green" /> Bota görev ver</span>}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={!valid} onClick={start} icon={<Play className="w-4 h-4" />}>Görevi başlat</Button></>}>
      <div className="space-y-3">
        <Notice tone="info">Bot görevi süre boyunca her dakika bir adım ilerletir. Süre dolduğunda, bitiş koşulu sağlandığında ya da siz durdurduğunuzda rapor hazırlanır. Raporda yalnızca kaynağı gösterilebilen bulgular yer alır; bulunamazsa “Veri bulunamadı” yazar.</Notice>
        {noAi && <Notice tone="warn">AI anahtarı tanımlı değil: bot yalnızca verdiğiniz linki ve aynı sitedeki sayfaları tarar, web araması yapamaz. <a className="underline font-semibold" href="?ops=settings&tab=ai">Ayarlar → AI anahtarı</a> bölümüne anahtarı yapıştırmanız yeterli.</Notice>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Bot"><select className="ops-input" value={f.bot_id} onChange={(e) => setF({ ...f, bot_id: e.target.value })}>
            <option value="">— Genel araştırma botu —</option>{bots.filter((b) => b.status !== 'archived').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Görev başlığı *"><input className="ops-input" placeholder="Örn: Rakip Instagram profil analizi" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Görevin açıklaması / amacı *" className="sm:col-span-2"><textarea className="ops-input min-h-[80px]" placeholder="Bot ne yapsın? Örn: Linkteki kişinin/firmanın profilini incele; ne iş yaptığını, hangi hizmetleri öne çıkardığını ve iletişim kanallarını çıkar." value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></Field>
          <Field label="Hedef link (opsiyonel)" hint="İncelenecek sayfa / profil"><input className="ops-input font-mono text-xs" placeholder="https://…" value={f.target_url} onChange={(e) => setF({ ...f, target_url: e.target.value.trim() })} /></Field>
          <Field label="Aranacak şey" hint="Virgülle ayırın"><input className="ops-input" placeholder="Örn: takipçi sayısı, hizmetler, telefon, şantiye" value={f.search_for} onChange={(e) => setF({ ...f, search_for: e.target.value })} /></Field>
          <Field label="Raporda ne olsun?" className="sm:col-span-2"><input className="ops-input" placeholder="Örn: profilin 5 öne çıkan özelliği, iş birliği fırsatı var mı" value={f.report_spec} onChange={(e) => setF({ ...f, report_spec: e.target.value })} /></Field>
          <Field label="Çalışma süresi" hint="Süre dolmadan görev kendiliğinden bitmez (bitiş koşulu hariç)">
            <div className="flex flex-wrap gap-1.5">{DURATIONS.map((d) => <button key={d} type="button" onClick={() => setF({ ...f, duration_minutes: d })}
              className={cx('rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1', f.duration_minutes === d ? 'bg-brand-green text-white ring-brand-green' : 'ring-ink-700 text-ink-300 hover:bg-ink-800')}>{d} dk</button>)}
              <input type="number" min={1} max={240} className="ops-input !w-20 !py-1.5" value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: Math.min(240, Math.max(1, Number(e.target.value) || 1)) })} /></div>
          </Field>
          <Field label="Bitiş koşulu (opsiyonel)" hint="Bu sağlanırsa süre dolmadan rapor hazırlanır"><input className="ops-input" placeholder="Örn: iletişim numarası bulunduğunda dur" value={f.stop_condition} onChange={(e) => setF({ ...f, stop_condition: e.target.value })} /></Field>
        </div>
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}

function progress(m: Mission) {
  const start = new Date(m.started_at).getTime(); const end = new Date(m.deadline_at).getTime();
  if (m.status !== 'running') return 100;
  return Math.min(100, Math.max(2, Math.round(((Date.now() - start) / Math.max(1, end - start)) * 100)));
}

/** Görev + rapor listesi (canlı). botId verilirse yalnızca o botun görevleri. */
export function MissionList({ bots, botId, compact = false }: { bots: Bot[]; botId?: string; compact?: boolean }) {
  const session = useSession();
  const q = useQuery(async () => {
    let r = db().from('bot_missions').select('id,bot_id,title,goal,target_url,search_for,report_spec,stop_condition,duration_minutes,status,finish_reason,started_at,deadline_at,finished_at,step_count,max_steps,provider,model,findings,sources,summary,tokens_in,tokens_out,error,created_at').order('created_at', { ascending: false }).limit(compact ? 10 : 100);
    if (botId) r = r.eq('bot_id', botId);
    return unwrap(await r) as Mission[];
  }, [] as Mission[], [botId], ['bot_missions']);
  const [open, setOpen] = useState<string | null>(null);
  const [launch, setLaunch] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 15_000); return () => clearInterval(i); }, []);
  const botName = (id: string | null) => bots.find((b) => b.id === id)?.name ?? 'Genel araştırma';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><div className="font-display font-semibold text-ink-100">Görevler & raporlar</div><div className="text-[11px] text-ink-400">Botun yaptığı analiz ve dönüşler burada listelenir. Karta tıklayın → canlı adımlar + rapor.</div></div>
        <Button variant="primary" onClick={() => setLaunch(true)} icon={<Target className="w-4 h-4" />}>Görev ver</Button>
      </div>
      {q.error ? <Notice tone="error">{q.error}</Notice> : q.loading ? <StateView kind="loading" compact /> : q.data.length === 0 ? (
        <StateView kind="empty" title="Henüz görev yok" message="“Görev ver” ile bota amaç, link, aranacak şey ve süre tanımlayın. Sonuç raporu burada listelenecek." compact />
      ) : (
        <div className="space-y-2">
          {q.data.map((m) => {
            const st = MISSION_STATUS[m.status]; const live = m.status === 'running' || m.status === 'finalizing';
            return (
              <button key={m.id} onClick={() => setOpen(m.id)} className="w-full text-left ops-panel !rounded-2xl p-3.5 hover:ring-1 hover:ring-brand-green/40 transition">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm text-ink-100 flex-1 min-w-[180px] truncate">{m.title}</span>
                  <Pill tone={st.tone}>{st.label}</Pill>
                  {m.finish_reason && <span className="text-[10px] text-ink-500">{FINISH_REASON[m.finish_reason] ?? m.finish_reason}</span>}
                </div>
                <div className="text-[11px] text-ink-400 mt-1 line-clamp-1">{m.goal}</div>
                {live && <div className="mt-2 h-1.5 rounded-full bg-ink-800 overflow-hidden"><div className="h-full bg-signal-run transition-all" style={{ width: `${progress(m)}%` }} /></div>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-ink-500 font-mono">
                  {!botId && <span>🤖 {botName(m.bot_id)}</span>}
                  <span>⏱ {m.duration_minutes} dk</span><span>ADIM {m.step_count}</span><span>BULGU {m.findings?.length ?? 0}</span><span>KAYNAK {m.sources?.length ?? 0}</span>
                  <span>{live ? `bitiş ${fmtDateTime(m.deadline_at)}` : `bitti ${relTime(m.finished_at)}`}</span>
                </div>
                {!live && m.summary && <p className="text-xs text-ink-300 mt-2 line-clamp-2 whitespace-pre-line">{m.summary}</p>}
              </button>
            );
          })}
        </div>
      )}
      {open && <MissionDetail id={open} bots={bots} canStop={Boolean(session)} onClose={() => { setOpen(null); q.reload(); }} />}
      {launch && <MissionLauncher bots={bots} botId={botId} onClose={() => setLaunch(false)} onStarted={(id) => { setLaunch(false); q.reload(); setOpen(id); }} />}
    </div>
  );
}

/** Detaylı rapor görünümü: canlı adımlar, bulgular, özet, HTML belge (indir / yazdır). */
export function MissionDetail({ id, bots, onClose }: { id: string; bots: Bot[]; canStop?: boolean; onClose: () => void }) {
  const q = useQuery(async () => {
    const [m, s] = await Promise.all([
      db().from('bot_missions').select('*').eq('id', id).single(),
      db().from('bot_mission_steps').select('*').eq('mission_id', id).order('step_no').order('created_at'),
    ]);
    return { mission: unwrap(m) as Mission, steps: unwrap(s) as MissionStep[] };
  }, null as { mission: Mission; steps: MissionStep[] } | null, [id], ['bot_missions', 'bot_mission_steps']);
  const [tab, setTab] = useState<'report' | 'findings' | 'steps'>('steps');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const m = q.data?.mission;
  const live = m && (m.status === 'running' || m.status === 'finalizing');
  useEffect(() => { if (m && !live && m.report_html) setTab('report'); }, [m?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = async () => { setBusy(true); setErr(null); try { await callMissions('mission_stop', { mission_id: id }); await q.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } };
  const download = () => {
    if (!m?.report_html) return;
    const url = URL.createObjectURL(new Blob([m.report_html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${m.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60)}-rapor.html`; a.click(); URL.revokeObjectURL(url);
  };
  const print = () => { if (!m?.report_html) return; const w = window.open('', '_blank'); if (w) { w.document.write(m.report_html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); } };
  // WhatsApp ile dağıt: rapor özeti + liste (kaynak linkleriyle). Gönderim kullanıcının kendi WhatsApp'ından, alıcıyı kendisi seçer.
  const shareWhatsApp = () => {
    if (!m) return;
    const lines = [`*${m.title}* — Embay bot raporu`, fmtDateTime(m.finished_at ?? m.created_at), '', (m.summary ?? '').slice(0, 1200), '',
      ...m.findings.slice(0, 20).map((f, i) => `${i + 1}. ${f.title}\n${f.detail.slice(0, 220)}\n${f.url}`)];
    const text = lines.join('\n').slice(0, 3800);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  const [archived, setArchived] = useState<Record<number, string>>({});
  const archive = async (i: number) => {
    const f = m!.findings[i];
    const { data, error } = await db().rpc('portfolio_upsert_company', { p: { firm_name: f.title.slice(0, 160), source_url: f.url, ai_notes: `${f.detail}${f.evidence ? ` — “${f.evidence}”` : ''}`.slice(0, 1500), source: 'bot_mission', need: m!.search_for ?? null }, p_bot_id: m!.bot_id, p_run_id: null, p_finding_id: null });
    setArchived((a) => ({ ...a, [i]: error ? `Hata: ${error.message}` : (data as { action: string }).action === 'merged' ? 'Mevcut kayıtla birleştirildi' : 'Portföye eklendi' }));
  };

  return (
    <Modal open wide onClose={onClose} title={m ? <span className="inline-flex items-center gap-2"><FileText className="w-4 h-4 text-brand-green" />{m.title}</span> : 'Görev'}
      footer={m && <>
        {live && <Button variant="danger" loading={busy} onClick={stop} icon={<Square className="w-4 h-4" />}>Durdur ve raporla</Button>}
        {m.report_html && <><Button variant="ghost" onClick={shareWhatsApp} icon={<MessageCircle className="w-4 h-4" />}>WhatsApp ile gönder</Button><Button variant="ghost" onClick={print} icon={<Printer className="w-4 h-4" />}>PDF kaydet / yazdır</Button><Button variant="primary" onClick={download} icon={<Download className="w-4 h-4" />}>HTML indir</Button></>}
        <Button variant="ghost" onClick={onClose}>Kapat</Button></>}>
      {!m ? <StateView kind="loading" compact /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded-xl bg-ink-800 p-2.5"><div className="text-[10px] font-mono text-ink-500">DURUM</div><Pill tone={MISSION_STATUS[m.status].tone}>{MISSION_STATUS[m.status].label}</Pill></div>
            <div className="rounded-xl bg-ink-800 p-2.5"><div className="text-[10px] font-mono text-ink-500">BOT</div><div className="text-ink-100 truncate">{bots.find((b) => b.id === m.bot_id)?.name ?? 'Genel'}</div></div>
            <div className="rounded-xl bg-ink-800 p-2.5"><div className="text-[10px] font-mono text-ink-500 flex items-center gap-1"><Timer className="w-3 h-3" />SÜRE</div><div className="text-ink-100">{m.duration_minutes} dk · {live ? `bitiş ${fmtDateTime(m.deadline_at)}` : FINISH_REASON[m.finish_reason ?? ''] ?? '—'}</div></div>
            <div className="rounded-xl bg-ink-800 p-2.5"><div className="text-[10px] font-mono text-ink-500">ADIM · BULGU · KAYNAK</div><div className="text-ink-100">{m.step_count} · {m.findings.length} · {m.sources.length}</div></div>
          </div>
          <div className="rounded-xl ring-1 ring-ink-700 p-3 text-xs space-y-1">
            <div><b className="text-ink-200">Amaç:</b> <span className="text-ink-300">{m.goal}</span></div>
            {m.target_url && <div><b className="text-ink-200">Hedef:</b> <a className="text-brand-green underline break-all" href={m.target_url} target="_blank" rel="noreferrer">{m.target_url}</a></div>}
            {m.search_for && <div><b className="text-ink-200">Aranan:</b> <span className="text-ink-300">{m.search_for}</span></div>}
            {m.report_spec && <div><b className="text-ink-200">Raporda istenen:</b> <span className="text-ink-300">{m.report_spec}</span></div>}
            {m.stop_condition && <div><b className="text-ink-200">Bitiş koşulu:</b> <span className="text-ink-300">{m.stop_condition}</span></div>}
            {m.provider && <div className="text-ink-500">AI: {m.provider} / {m.model} · token {(m.tokens_in + m.tokens_out).toLocaleString('tr-TR')}</div>}
          </div>
          {err && <Notice tone="error">{err}</Notice>}
          <div className="flex gap-1.5">{(['steps', 'findings', 'report'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', tab === t ? 'bg-brand-green text-white' : 'bg-ink-800 text-ink-300')}>
              {t === 'steps' ? `Canlı adımlar (${q.data!.steps.length})` : t === 'findings' ? `Bulgular (${m.findings.length})` : 'Rapor'}</button>))}</div>

          {tab === 'steps' && (q.data!.steps.length === 0 ? <StateView kind="loading" title="İlk adım başlıyor…" message="Bot hedef linki okuyor / araştırıyor. Adımlar oluştukça burada canlı görünür." compact /> : (
            <ol className="space-y-1.5">{q.data!.steps.map((s) => (
              <li key={s.id} className="rounded-lg bg-ink-850 ring-1 ring-ink-800 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-[10px] font-mono text-ink-500"><span>#{s.step_no}</span><span className="uppercase">{s.action}</span><span>{fmtDateTime(s.created_at)}</span>{s.duration_ms != null && <span>{(s.duration_ms / 1000).toFixed(1)} sn</span>}</div>
                <div className={cx('mt-0.5', s.action === 'error' ? 'text-rose-700' : 'text-ink-200')}>{s.message}</div>
                {s.target && <a href={s.target} target="_blank" rel="noreferrer" className="text-[10px] text-brand-green break-all">{s.target}</a>}
              </li>))}
              {live && <li className="flex items-center gap-2 text-[11px] text-ink-400 px-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sonraki adım en geç 1 dakika içinde…</li>}
            </ol>))}

          {tab === 'findings' && (m.findings.length === 0 ? <StateView kind="empty" title={live ? 'Henüz bulgu yok' : 'Veri bulunamadı'} message="Kaynağı gösterilebilen bulgular burada listelenir." compact /> : (
            <div className="space-y-2">{m.findings.map((f, i) => (
              <div key={i} className="rounded-xl ring-1 ring-ink-700 p-3">
                <div className="text-sm font-semibold text-ink-100">{f.title}</div>
                <div className="text-xs text-ink-300 mt-0.5 whitespace-pre-line">{f.detail}</div>
                {f.evidence && <div className="text-[11px] italic text-ink-400 mt-1">“{f.evidence}”</div>}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-brand-green break-all"><ExternalLink className="w-3 h-3" />{f.url}</a>
                  {archived[i] ? <span className="text-[11px] text-emerald-700 font-semibold">{archived[i]}</span>
                    : <button onClick={() => archive(i)} className="inline-flex items-center gap-1 rounded-lg ring-1 ring-ink-700 px-2 py-0.5 text-[11px] text-ink-300 hover:bg-ink-800"><Archive className="w-3 h-3" /> Firma portföyüne arşivle</button>}
                </div>
              </div>))}</div>))}

          {tab === 'report' && (m.report_html
            ? <iframe title="Rapor" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={m.report_html} className="w-full h-[60vh] rounded-xl ring-1 ring-ink-700 bg-white" />
            : <StateView kind={live ? 'loading' : 'empty'} title={live ? 'Rapor görev bitince hazırlanır' : 'Rapor yok'} message={live ? 'Süre dolduğunda, bitiş koşulu sağlandığında veya “Durdur ve raporla” dediğinizde HTML rapor oluşur.' : m.error ?? undefined} compact />)}
        </div>
      )}
    </Modal>
  );
}

/** Bota prompt ile yeni yetenek tanımla (opsiyonel). */
export function SkillPromptModal({ botId, botName, onClose, onSaved }: { botId?: string; botName?: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', description: '', prompt: '', category: 'ozel' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const EXAMPLES = [
    { name: 'Instagram profil analizi', prompt: 'Verilen Instagram profilini incele: hesabın ne iş yaptığını, öne çıkan hizmetlerini, paylaşım dilini, biyografideki iletişim kanallarını ve varsa takipçi/gönderi sayılarını raporla. Görmediğin bilgiyi yazma.' },
    { name: 'Şantiye / proje keşfi', prompt: 'İstanbul Avrupa Yakası’nda yeni başlayan konut, kentsel dönüşüm, fabrika ve depo projelerini ara. Her proje için proje adı, ilçe, aşama, yüklenici firma ve kaynak linki ver; telehandler/Manitou ihtiyacı olabilecekleri işaretle.' },
    { name: 'Rakip fiyat takibi', prompt: 'Manitou / teleskopik yükleyici kiralama rakiplerinin web sitelerinde ve ilanlarında yayımladıkları kiralama koşullarını ve hizmet kapsamını karşılaştır. Fiyat yayımlanmamışsa “fiyat yayımlanmamış” yaz.' },
  ];
  const save = async () => {
    setBusy(true); setErr(null);
    try { await callMissions('skill_create', { ...f, bot_id: botId ?? null }); onSaved(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open wide onClose={onClose} title={<span className="inline-flex items-center gap-2"><Wand2 className="w-4 h-4 text-brand-green" /> Yetenek tanımla{botName ? ` · ${botName}` : ''}</span>}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={f.name.trim().length < 2 || f.prompt.trim().length < 10} onClick={save} icon={<Sparkles className="w-4 h-4" />}>Yeteneği kaydet</Button></>}>
      <div className="space-y-3">
        <Notice tone="info">Yetenek, botun görevlerde uyacağı talimattır (prompt). Kaydedince bu bota bağlanır ve botun sonraki görevlerinde kullanılır. Opsiyoneldir; botlar yeteneksiz de çalışır.</Notice>
        <div className="flex flex-wrap gap-1.5">{EXAMPLES.map((x) => <button key={x.name} type="button" onClick={() => setF({ ...f, name: x.name, prompt: x.prompt })} className="rounded-full px-3 py-1 text-[11px] ring-1 ring-ink-700 text-ink-300 hover:bg-ink-800">Örnek: {x.name}</button>)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Yetenek adı *"><input className="ops-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Kısa açıklama"><input className="ops-input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Yetenek tanımı (prompt) *" hint="Bota ne yapmasını, nasıl rapor etmesini istediğinizi yazın" className="sm:col-span-2">
            <textarea className="ops-input min-h-[160px]" value={f.prompt} onChange={(e) => setF({ ...f, prompt: e.target.value })} placeholder="Örn: Bu yetenekle bot, verilen firmanın web sitesinden hizmetlerini ve iletişim kanallarını çıkarır…" />
          </Field>
        </div>
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}
