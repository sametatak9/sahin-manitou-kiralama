// Bot görevleri: görev ver → canlı adım günlüğü → rapor (HTML).
import { useEffect, useState } from 'react';
import { Play, Target, Wand2, Sparkles } from 'lucide-react';
import { callMissions, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime, type Tone } from '../lib/format';
import type { Bot, Mission } from '../lib/types';
import { useRouter } from '../session';
import { LiveReport } from './LiveReport';
import { Button, cx, Field, Modal, Notice, Pill, StateView } from '../ui';

export const MISSION_STATUS: Record<Mission['status'], { label: string; tone: Tone }> = {
  running: { label: 'ÇALIŞIYOR', tone: 'run' }, finalizing: { label: 'RAPOR HAZIRLANIYOR', tone: 'run' }, completed: { label: 'TAMAMLANDI', tone: 'go' },
  stopped: { label: 'DURDURULDU', tone: 'wait' }, failed: { label: 'BAŞARISIZ', tone: 'stop' }, blocked: { label: 'ENGELLENDİ', tone: 'stop' },
};
export const FINISH_REASON: Record<string, string> = {
  deadline: 'Süre doldu', stop_condition: 'Bitiş koşulu sağlandı', admin_stop: 'Yönetici durdurdu', max_steps: 'Adım sınırı', error: 'Hata', no_ai: 'AI kullanılamadı (yalnızca sayfa taraması)', budget: 'Harcama sınırı doldu',
};
const DURATIONS = [1, 5, 10, 15, 30, 60, 120];
export const ERROR_KIND: Record<string, string> = {
  ai_credit: 'AI kredisi / bakiyesi bitti', ai_auth: 'AI anahtarı geçersiz veya yetkisiz', search_unavailable: 'Canlı genel web araması kullanılamadı', repeated_error: 'Üst üste 3 adım hata verdi', timeout: 'Zaman aşımı', budget: 'Harcama sınırı doldu',
};
const MODELS = [
  { id: '', label: 'Otomatik (ekonomik: Sonnet 5)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — ekonomik (önerilen)' },
  { id: 'claude-opus-5', label: 'Claude Opus 5 — en güçlü, ~2,5 kat pahalı' },
];
const PRICE: Record<string, [number, number]> = { 'claude-opus-5': [5, 25], 'claude-sonnet-5': [2, 10] };
export function costText(m: Pick<Mission, 'model' | 'tokens_in' | 'tokens_out'> & { cost_usd?: number | null }) {
  if (m.cost_usd && Number(m.cost_usd) > 0) return `≈ $${Number(m.cost_usd).toFixed(2)}`;
  const p = m.model ? PRICE[m.model] : undefined; if (!p || !(m.tokens_in + m.tokens_out)) return null;
  return `≈ $${((m.tokens_in * p[0] + m.tokens_out * p[1]) / 1e6).toFixed(2)}`;
}

export function outcomeOf(m: Mission): { tone: 'ok' | 'warn' | 'error' | 'info'; title: string; text: string } {
  if (m.status === 'failed') return { tone: 'error', title: m.error_kind === 'search_unavailable' ? 'Arama kaynağı kullanılamadı' : 'Hata ile bitti',
    text: m.error_kind === 'search_unavailable' ? (m.error ?? ERROR_KIND.search_unavailable) : ERROR_KIND[m.error_kind ?? ''] ?? m.error ?? 'Bilinmeyen hata' };
  if (m.finish_reason === 'no_ai') return { tone: 'warn', title: 'AI kullanılamadı — sayfa taraması yapıldı', text: `${m.findings.length} bulgu (AI'sız).` };
  if (m.status === 'stopped') return { tone: 'info', title: 'Yönetici durdurdu', text: `${m.findings.length} bulgu ile raporlandı.` };
  if (!m.findings.length) return { tone: 'warn', title: 'Sonuç bulunamadı', text: 'Kaynağı doğrulanabilen bulgu çıkmadı.' };
  return { tone: 'ok', title: 'Başarılı', text: `${m.findings.length} kaynaklı bulgu · ${FINISH_REASON[m.finish_reason ?? ''] ?? ''}` };
}

/** Minimal görev formu: bot + ne yapılsın + süre. Hazır görev / Manitou yok. */
export function MissionLauncher({ bots, botId, onClose, onStarted }: { bots: Bot[]; botId?: string; onClose: () => void; onStarted: (id: string) => void }) {
  const [f, setF] = useState({ bot_id: botId ?? '', goal: '', target_url: '', duration_minutes: 10, model: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [search_for, setSearch] = useState('');
  const [report_spec, setReport] = useState('');
  const ai = useQuery(() => callMissions<{ anthropic: boolean; gemini: boolean }>('ai_status'), null as { anthropic: boolean; gemini: boolean } | null, []);
  const noAi = ai.data && !ai.data.anthropic && !ai.data.gemini;
  const start = async () => {
    setBusy(true); setErr(null);
    const goal = f.goal.trim();
    const title = goal.slice(0, 80) || 'Görev';
    try {
      const r = await callMissions<{ mission_id: string }>('mission_start', {
        bot_id: f.bot_id || null, title, goal,
        target_url: f.target_url || null,
        search_for: search_for.trim() || null,
        report_spec: report_spec.trim() || null,
        stop_condition: null,
        duration_minutes: f.duration_minutes,
        model: f.model || null,
      });
      onStarted(r.mission_id);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const valid = f.goal.trim().length >= 3 && (!f.target_url || /^https?:\/\//i.test(f.target_url));
  return (
    <Modal open wide onClose={onClose} title={<span className="inline-flex items-center gap-2"><Target className="w-4 h-4 text-brand-green" /> Bota görev ver</span>}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={!valid} onClick={start} icon={<Play className="w-4 h-4" />}>Görevi başlat</Button></>}>
      <div className="space-y-3">
        <Notice tone="info">Kısaca yazın — bot yetenekleriyle detayı çıkarır.</Notice>
        {noAi && <Notice tone="warn">AI anahtarı yok. <a className="underline font-semibold" href="?ops=settings&tab=ai">Ayarlar → AI</a></Notice>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Bot"><select className="ops-input" value={f.bot_id} onChange={(e) => setF({ ...f, bot_id: e.target.value })}>
            <option value="">— Genel araştırma —</option>
            {bots.filter((b) => b.status !== 'archived').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select></Field>
          <Field label="Süre"><div className="flex flex-wrap gap-1.5">{DURATIONS.map((d) => (
            <button key={d} type="button" onClick={() => setF({ ...f, duration_minutes: d })}
              className={cx('rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1', f.duration_minutes === d ? 'bg-brand-green text-white ring-brand-green' : 'ring-ink-700 text-ink-300 hover:bg-ink-800')}>{d} dk</button>
          ))}</div></Field>
          <Field label="Ne yapılsın? *" className="sm:col-span-2">
            <textarea className="ops-input min-h-[100px]" placeholder="Örn: İstanbul inşaat sektöründen takip edilecek işletme hesapları bul" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} />
          </Field>
          <Field label="Hedef link (opsiyonel)" className="sm:col-span-2">
            <input className="ops-input font-mono text-xs" placeholder="https://…" value={f.target_url} onChange={(e) => setF({ ...f, target_url: e.target.value.trim() })} />
          </Field>
        </div>
        <button type="button" className="text-[11px] font-semibold text-ink-400" onClick={() => setMore(!more)}>{more ? '▾ Gelişmiş gizle' : '▸ Gelişmiş'}</button>
        {more && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-ink-900/40 p-3 ring-1 ring-ink-800">
            <Field label="Aranacak"><input className="ops-input" value={search_for} onChange={(e) => setSearch(e.target.value)} /></Field>
            <Field label="Model"><select className="ops-input" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })}>
              {MODELS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
            <Field label="Rapor" className="sm:col-span-2"><input className="ops-input" value={report_spec} onChange={(e) => setReport(e.target.value)} /></Field>
          </div>
        )}
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

export function MissionList({ bots, botId, compact = false, review }: { bots: Bot[]; botId?: string; compact?: boolean; review?: 'approved' | 'pending' }) {
  const q = useQuery(async () => {
    let r = db().from('bot_missions').select('id,bot_id,title,goal,target_url,search_for,report_spec,stop_condition,duration_minutes,status,finish_reason,started_at,deadline_at,finished_at,step_count,max_steps,provider,model,findings,sources,summary,tokens_in,tokens_out,error,created_at,error_kind,review_status,reviewed_at,review_note').order('created_at', { ascending: false }).limit(compact ? 10 : 100);
    if (botId) r = r.eq('bot_id', botId);
    if (review === 'approved') r = r.eq('review_status', 'approved');
    if (review === 'pending') r = r.or('review_status.eq.pending,review_status.is.null').in('status', ['completed', 'stopped', 'failed']);
    return unwrap(await r) as Mission[];
  }, [] as Mission[], [botId, review], ['bot_missions']);
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(router.state.route === 'reports' ? router.state.id ?? null : null);
  const [launch, setLaunch] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 15_000); return () => clearInterval(i); }, []);
  const botName = (id: string | null) => bots.find((b) => b.id === id)?.name ?? 'Genel araştırma';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><div className="font-display font-semibold text-ink-100">Görevler & raporlar</div><div className="text-[11px] text-ink-400">Karta tıklayın → canlı rapor.</div></div>
        <Button variant="primary" onClick={() => setLaunch(true)} icon={<Target className="w-4 h-4" />}>Görev ver</Button>
      </div>
      {q.error ? <Notice tone="error">{q.error}</Notice> : q.loading ? <StateView kind="loading" compact /> : q.data.length === 0 ? (
        <StateView kind="empty" title="Henüz görev yok" message="Görev ver ile kısaca yazın." compact />
      ) : (
        <div className="space-y-2">
          {q.data.map((m) => {
            const st = MISSION_STATUS[m.status]; const live = m.status === 'running' || m.status === 'finalizing';
            return (
              <button key={m.id} onClick={() => setOpen(m.id)} className={cx('w-full text-left bg-white rounded-2xl p-3.5 ring-1 ring-ink-700/70 shadow-sm hover:ring-brand-green/50 transition border-l-4', live ? 'border-l-sky-400' : m.status === 'failed' ? 'border-l-rose-400' : (m.findings?.length ?? 0) > 0 ? 'border-l-emerald-400' : 'border-l-slate-300')}>
                <div className="flex flex-wrap items-center gap-2">
                  {!botId && <span className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#262A6B] to-[#1E3FA0] text-white grid place-items-center text-[11px] font-bold">{botName(m.bot_id).slice(0, 2).toLocaleUpperCase('tr-TR')}</span>}
                  <span className="font-semibold text-sm text-ink-100 flex-1 min-w-[180px] truncate">{m.title}</span>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </div>
                <div className="text-[11px] text-ink-400 mt-1 line-clamp-1">{m.goal}</div>
                {live && <div className="mt-2 h-1.5 rounded-full bg-ink-800 overflow-hidden"><div className="h-full bg-signal-run" style={{ width: `${progress(m)}%` }} /></div>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-ink-500 font-mono">
                  <span>{m.duration_minutes} dk</span><span>ADIM {m.step_count}</span><span>BULGU {m.findings?.length ?? 0}</span>
                  <span>{live ? `bitiş ${fmtDateTime(m.deadline_at)}` : `bitti ${relTime(m.finished_at)}`}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {launch && <MissionLauncher bots={bots} botId={botId} onClose={() => setLaunch(false)} onStarted={(id) => { setLaunch(false); q.reload(); setOpen(id); }} />}
      {open && <MissionDetail id={open} bots={bots} onClose={() => { setOpen(null); q.reload(); }} />}
    </div>
  );
}

/** Dışarıdan import edilen görev detayı — LiveReport (id + onClose). */
export function MissionDetail({ id, bots: _bots, onClose, canStop: _canStop }: { id: string; bots?: Bot[]; canStop?: boolean; onClose: () => void }) {
  return <LiveReport id={id} onClose={onClose} />;
}

/** Bota yetenek (skill prompt) tanımla. */
export function SkillPromptModal({ botId, botName, onClose, onSaved }: { botId?: string; botName?: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', description: '', prompt: '', category: 'ozel' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const EXAMPLES = [
    { name: 'Instagram profil analizi', prompt: 'Verilen Instagram profilini incele: hesabın ne iş yaptığını, öne çıkan hizmetlerini, paylaşım dilini, biyografideki iletişim kanallarını ve varsa takipçi/gönderi sayılarını raporla. Görmediğin bilgiyi yazma.' },
    { name: 'Şantiye / proje keşfi', prompt: 'İstanbul Avrupa Yakası’nda yeni başlayan konut, kentsel dönüşüm, fabrika ve depo projelerini ara. Her proje için proje adı, ilçe, aşama, yüklenici firma ve kaynak linki ver.' },
    { name: 'Rakip takip', prompt: 'İş makinesi / teleskopik yükleyici kiralama rakiplerinin web sitelerinde yayımladıkları kiralama koşullarını ve hizmet kapsamını karşılaştır.' },
  ];
  const save = async () => {
    setBusy(true); setErr(null);
    try { await callMissions('skill_create', { ...f, bot_id: botId ?? null }); onSaved(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open wide onClose={onClose} title={<span className="inline-flex items-center gap-2"><Wand2 className="w-4 h-4 text-brand-green" /> Yetenek tanımla{botName ? ` · ${botName}` : ''}</span>}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={f.name.trim().length < 2 || f.prompt.trim().length < 10} onClick={save} icon={<Sparkles className="w-4 h-4" />}>Yeteneği kaydet</Button></>}>
      <div className="space-y-3">
        <Notice tone="info">Yetenek, botun görevlerde uyacağı talimattır. Kaydedince bu bota bağlanır.</Notice>
        <div className="flex flex-wrap gap-1.5">{EXAMPLES.map((x) => <button key={x.name} type="button" onClick={() => setF({ ...f, name: x.name, prompt: x.prompt })} className="rounded-full px-3 py-1 text-[11px] ring-1 ring-ink-700 text-ink-300 hover:bg-ink-800">Örnek: {x.name}</button>)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Yetenek adı *"><input className="ops-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Kısa açıklama"><input className="ops-input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Yetenek tanımı (prompt) *" className="sm:col-span-2">
            <textarea className="ops-input min-h-[160px]" value={f.prompt} onChange={(e) => setF({ ...f, prompt: e.target.value })} />
          </Field>
        </div>
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}
