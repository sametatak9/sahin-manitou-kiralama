// Bot çalışmaları: gerçek çalışma günlüğü → rapor (HTML).
import { useEffect, useState } from 'react';
import { Play, Target, Wand2, Sparkles, Coins } from 'lucide-react';
import { callMissions, callOps, errorCode, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime, type Tone } from '../lib/format';
import type { Bot, Mission } from '../lib/types';
import { useRouter } from '../session';
import { LiveReport } from './LiveReport';
import { Button, cx, Field, Modal, Notice, Pill, StateView } from '../ui';
import { AGENCY_MODEL_FALLBACKS, getPreferredModel, setPreferredModel } from '../lib/agency';
import { findingCounts } from '../../../supabase/functions/_shared/pure/outcome.ts';

export const MISSION_STATUS: Record<Mission['status'], { label: string; tone: Tone }> = {
  running: { label: 'ÇALIŞIYOR', tone: 'run' }, finalizing: { label: 'RAPOR HAZIRLANIYOR', tone: 'run' }, completed: { label: 'TAMAMLANDI', tone: 'go' },
  stopped: { label: 'DURDURULDU', tone: 'wait' }, failed: { label: 'BAŞARISIZ', tone: 'stop' }, blocked: { label: 'ENGELLENDİ', tone: 'stop' },
};
export const FINISH_REASON: Record<string, string> = {
  deadline: 'Süre doldu', stop_condition: 'Bitiş koşulu sağlandı', admin_stop: 'Yönetici durdurdu', max_steps: 'Adım sınırı', completed_no_findings: 'Tamamlandı — gerçek sıfır bulgu', error: 'Hata', no_ai: 'AI kullanılamadı (yalnızca sayfa taraması)', budget: 'Harcama sınırı doldu',
};
const DURATIONS = [1, 5, 10, 15, 30, 60, 120];
export const ERROR_KIND: Record<string, string> = {
  ai_credit: 'AI kredisi / bakiyesi bitti', ai_auth: 'AI anahtarı geçersiz veya yetkisiz', search_unavailable: 'Canlı genel web araması kullanılamadı', repeated_error: 'Üst üste 3 adım hata verdi', timeout: 'Zaman aşımı', budget: 'Harcama sınırı doldu',
};
const MODELS = [
  { id: '', label: 'Otomatik (chat/bot: GPT-5 mini; araştırma: web-capable fallback)' },
  { id: 'gpt-5-nano', label: 'GPT-5 nano — ön eleme ve kısa işler' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini — genel bot ve Copilot (önerilen)' },
  { id: 'gpt-5', label: 'GPT-5 — karmaşık sentez, daha pahalı' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — web araştırması için güçlü fallback' },
  { id: 'claude-opus-5', label: 'Claude Opus 5 — en güçlü, ~2,5 kat pahalı' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — hızlı yardımcı' },
];
const PRICE: Record<string, [number, number]> = {
  'gpt-5-nano': [0.05, 0.4], 'gpt-5-mini': [0.25, 2], 'gpt-5': [1.25, 10],
  'claude-opus-5': [5, 25], 'claude-sonnet-5': [2, 10],
};
export function costText(m: Pick<Mission, 'model' | 'tokens_in' | 'tokens_out'> & { cost_usd?: number | null }) {
  if (m.cost_usd && Number(m.cost_usd) > 0) return `≈ $${Number(m.cost_usd).toFixed(2)}`;
  const p = m.model ? PRICE[m.model] : undefined; if (!p || !(m.tokens_in + m.tokens_out)) return null;
  return `≈ $${((m.tokens_in * p[0] + m.tokens_out * p[1]) / 1e6).toFixed(2)}`;
}

export function outcomeOf(m: Mission): { tone: 'ok' | 'warn' | 'error' | 'info'; title: string; text: string } {
  const counts = findingCounts(m.findings);
  if (m.status === 'failed') return { tone: 'error', title: m.error_kind === 'search_unavailable' ? 'Arama kaynağı kullanılamadı' : 'Hata ile bitti',
    text: m.error_kind === 'search_unavailable' ? (m.error ?? ERROR_KIND.search_unavailable) : ERROR_KIND[m.error_kind ?? ''] ?? m.error ?? 'Bilinmeyen hata' };
  if (m.finish_reason === 'no_ai') return { tone: 'warn', title: 'AI kullanılamadı — sayfa taraması yapıldı', text: `${counts.verified} doğrulandı · ${counts.pending} aday denetim bekliyor.` };
  if (m.status === 'stopped') return { tone: 'info', title: 'Yönetici durdurdu', text: `${counts.verified} doğrulanmış bulgu ile raporlandı.` };
  if (!counts.verified) return { tone: 'warn', title: counts.pending ? 'Doğrulanmış sonuç yok — adaylar inceleme bekliyor' : 'Tamamlandı — gerçek sıfır bulgu', text: `${m.sources?.length ?? 0} kaynak · ${counts.pending} inceleme bekleyen aday · ${counts.rejected} elendi. Başarılı lead çıktısı değildir.` };
  return { tone: 'ok', title: 'Doğrulanmış sonuçlar hazır', text: `${counts.verified} doğrulanmış bulgu · ${counts.pending} inceleme bekleyen aday · ${FINISH_REASON[m.finish_reason ?? ''] ?? ''}` };
}

/** Minimal görev formu: bot + ne yapılsın + süre. Hazır görev / Manitou yok. */
export function MissionLauncher({ bots, botId, onClose, onStarted }: { bots: Bot[]; botId?: string; onClose: () => void; onStarted: (id: string) => void }) {
  const [f, setF] = useState({ bot_id: botId ?? '', goal: '', target_url: '', duration_minutes: 10, model: getPreferredModel() });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [search_for, setSearch] = useState('');
  const [report_spec, setReport] = useState('');
  const ai = useQuery(() => callMissions<Record<string, boolean>>('ai_status'), null as Record<string, boolean> | null, []);
  const noAi = ai.data && !Object.values(ai.data).some(Boolean);
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

interface BotStartQuote {
  ready: boolean; can_start: boolean; blocked_reason: string | null; bot_name: string; company_name: string;
  skill_name: string; skill_id: string; task_id: string; task_title: string; model: string; durations: number[]; estimated_cost_usd: number | null;
  estimate_samples: number; budget: { enabled: boolean; today_usd: number; daily_usd: number; month_usd: number; monthly_usd: number } | null; note: string;
}
interface BotStartResult {
  run_id: string; status: string; summary: string; error: string | null; skill_name: string; company_name: string;
  requested_model: string; model_used: string[]; recorded_cost_estimate_usd: number | null; tokens_in: number | null; tokens_out: number | null;
}
const PROFILE_NOT_READY_MESSAGE = 'Bu bot henüz tek dokunuşla çalışmaya hazır değil. Yöneticinin bu işletmeye uygun bir yeteneği Akademi’de doğrulaması ve güvenli çalışma profili hazırlaması gerekiyor. Hazır olduğunda yalnızca süre ve modeli seçmeniz yeterli.';

/** Müşterinin yalnız süre/model seçtiği, sistemin şirket ve Academy profiline göre görevi belirlediği başlatma akışı. */
export function BotStartModal({ botId, clientId, clientName, onClose, onStarted }: { botId: string; clientId: string | null; clientName: string | null; onClose: () => void; onStarted: (result: BotStartResult) => void }) {
  const modelOptions = AGENCY_MODEL_FALLBACKS;
  const initialModel = getPreferredModel();
  const [model, setModel] = useState(() => modelOptions.some((item) => item.id === initialModel) ? initialModel : 'gpt-5-mini');
  const [duration, setDuration] = useState(5);
  const [quote, setQuote] = useState<BotStartQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [profileNotReady, setProfileNotReady] = useState(false);

  useEffect(() => {
    let live = true;
    setQuoteLoading(true); setErr(null); setQuote(null); setProfileNotReady(false);
    if (!clientId) { setErr('Önce bir işletme seçilmeli.'); setQuoteLoading(false); return () => { live = false; }; }
    callOps<BotStartQuote>('bot_start_quote', { bot_id: botId, client_id: clientId, model })
      .then((result) => { if (live) setQuote(result); })
      .catch((error) => {
        if (!live) return;
        if (errorCode(error) === 'BOT_PROFILE_NOT_READY') { setProfileNotReady(true); setErr(PROFILE_NOT_READY_MESSAGE); }
        else setErr(errorText(error));
      })
      .finally(() => { if (live) setQuoteLoading(false); });
    return () => { live = false; };
  }, [botId, clientId, model]);

  const start = async () => {
    if (!clientId || !quote?.can_start) return;
    setBusy(true); setErr(null);
    try {
      setPreferredModel(model);
      const result = await callOps<BotStartResult>('bot_start', { bot_id: botId, client_id: clientId, task_id: quote.task_id, skill_id: quote.skill_id, duration_minutes: duration, model });
      onStarted(result);
    } catch (error) {
      if (errorCode(error) === 'BOT_PROFILE_NOT_READY') { setProfileNotReady(true); setErr(PROFILE_NOT_READY_MESSAGE); }
      else setErr(errorText(error));
    } finally { setBusy(false); }
  };

  return (
    <Modal open wide onClose={onClose} title={<span className="inline-flex items-center gap-2"><Play className="w-4 h-4 text-brand-green" /> Botu başlat</span>}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={!quote?.can_start || quoteLoading} onClick={start} icon={<Play className="w-4 h-4" />}>Botu başlat</Button></>}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">İşletme bağlamı</div>
          <div className="mt-1 text-base font-semibold text-ink-100">{quote?.company_name ?? clientName ?? 'Seçili işletme'}</div>
          <p className="mt-1 text-xs leading-5 text-ink-500">Uygun Academy profili varsa bot bu işletme için kendisi seçer. Hazır profil yoksa güvenlik için başlamaz; sizden görev metni veya hedef linki istenmez.</p>
          {quote && <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-ink-600"><span className="font-semibold text-ink-900">Hazır profil:</span> {quote.skill_name} · {quote.task_title}</div>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Çalışma süresi · en fazla">
            <div className="flex gap-2">{[1, 5, 10].map((value) => <button key={value} type="button" onClick={() => setDuration(value)} className={cx('min-h-10 flex-1 rounded-xl px-3 text-sm font-semibold ring-1 transition', duration === value ? 'bg-brand-green text-white ring-brand-green' : 'bg-white text-ink-700 ring-ink-700 hover:bg-blue-50')} aria-pressed={duration === value}>{value} dk</button>)}</div>
          </Field>
          <Field label="Çalışma modeli">
            <select className="ops-input" value={model} onChange={(event) => setModel(event.target.value)}>
              {modelOptions.map((option) => <option key={option.id} value={option.id}>{option.label} — {option.note}</option>)}
            </select>
          </Field>
        </div>

        <section className="rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Coins className="h-4 w-4 text-amber-600" /> Harcama görünümü</div>
          {quoteLoading ? <div className="mt-2 text-xs text-ink-500">Güvenli çalışma profili ve bütçe bilgisi kontrol ediliyor…</div> : quote && <>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wide text-ink-500">Ön tahmin</div><div className="mt-1 text-lg font-bold text-ink-900">{quote.estimated_cost_usd === null ? 'Henüz yok' : `≈ $${quote.estimated_cost_usd.toFixed(4)}`}</div><div className="mt-1 text-[10px] text-ink-500">{quote.estimated_cost_usd === null ? 'Bu bot/yetenek için yeterli geçmiş yok.' : `${quote.estimate_samples} başarılı koşunun token hacmi, seçili modele göre fiyatlandı.`}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wide text-ink-500">Günlük AI bütçesi</div><div className="mt-1 text-sm font-semibold text-ink-900">{quote.budget?.enabled && quote.budget.daily_usd > 0 ? `$${quote.budget.today_usd.toFixed(2)} / $${quote.budget.daily_usd.toFixed(2)}` : 'Limit tanımlı değil'}</div><div className="mt-1 text-[10px] text-ink-500">Ajans genelindeki mevcut harcama / limit</div></div>
            </div>
            {quote.budget?.enabled && quote.budget.monthly_usd > 0 && <div className="mt-2 text-[11px] text-ink-500">Aylık kullanım: ${quote.budget.month_usd.toFixed(2)} / ${quote.budget.monthly_usd.toFixed(2)}</div>}
            <p className="mt-2 text-[10px] leading-4 text-ink-500">{quote.note} Gerçek maliyet, koşu tamamlandığında kullanım kayıtlarından gösterilir; mevcut sistemde işlem başına ayrı cüzdan/garantili tavan yoktur.</p>
          </>}
        </section>

        <Notice tone="info">Her koşuda şirket için en uygun tek, Academy onaylı yetenek seçilir; mevcut runtime tüm yetenekleri aynı anda orkestre etmez. İçerik/analiz taslağı üretimi desteklenir; yayınlama, mesaj gönderme ve dış sistem değişikliği ayrı insan onayı olmadan çalışmaz.</Notice>
        {quote?.blocked_reason && <Notice tone="warn">Başlatma koruması: {quote.blocked_reason}</Notice>}
        {profileNotReady && <Notice tone="warn">{err} <a className="ml-1 font-semibold underline" href="?ops=skills">Akademi’yi aç</a></Notice>}
        {err && !profileNotReady && <Notice tone="error">{err}</Notice>}
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
    let r = db().from('bot_missions').select('id,bot_id,title,goal,target_url,search_for,report_spec,stop_condition,duration_minutes,status,finish_reason,started_at,deadline_at,finished_at,step_count,max_steps,provider,model,findings,sources,summary,tokens_in,tokens_out,error,created_at,error_kind,review_status,reviewed_at,review_note,skill_ids').order('created_at', { ascending: false }).limit(compact ? 10 : 100);
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
        <div><div className="font-display font-semibold text-ink-100">Çalışmalar & raporlar</div><div className="text-[11px] text-ink-400">Karta tıklayın → canlı rapor.</div></div>
        {!botId && <Button variant="primary" onClick={() => setLaunch(true)} icon={<Target className="w-4 h-4" />}>Araştırma başlat</Button>}
      </div>
      {q.error ? <Notice tone="error">{q.error}</Notice> : q.loading ? <StateView kind="loading" compact /> : q.data.length === 0 ? (
        <StateView kind="empty" title="Henüz çalışma yok" message={botId ? 'Botu başlat düğmesiyle şirketinize uygun çalışma başlatabilirsiniz.' : 'Araştırma başlat ile yeni bir araştırma oluşturabilirsiniz.'} compact />
      ) : (
        <div className="space-y-2">
          {q.data.map((m) => {
            const st = MISSION_STATUS[m.status]; const live = m.status === 'running' || m.status === 'finalizing';
            const counts = findingCounts(m.findings);
            return (
              <button key={m.id} onClick={() => setOpen(m.id)} className={cx('w-full text-left bg-white rounded-2xl p-3.5 ring-1 ring-ink-700/70 shadow-sm hover:ring-brand-green/50 transition border-l-4', live ? 'border-l-sky-400' : m.status === 'failed' ? 'border-l-rose-400' : counts.verified > 0 ? 'border-l-emerald-400' : 'border-l-slate-300')}>
                <div className="flex flex-wrap items-center gap-2">
                  {!botId && <span className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#262A6B] to-[#1E3FA0] text-white grid place-items-center text-[11px] font-bold">{botName(m.bot_id).slice(0, 2).toLocaleUpperCase('tr-TR')}</span>}
                  <span className="font-semibold text-sm text-ink-100 flex-1 min-w-[180px] truncate">{m.title}</span>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </div>
                <div className="text-[11px] text-ink-400 mt-1 line-clamp-1">{m.goal}</div>
                {live && <div className="mt-2 h-1.5 rounded-full bg-ink-800 overflow-hidden"><div className="h-full bg-signal-run" style={{ width: `${progress(m)}%` }} /></div>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-ink-500 font-mono">
                  <span>{m.duration_minutes} dk</span><span>ADIM {m.step_count}</span><span>YETENEK {m.skill_ids?.length ?? 0}</span><span>DOĞRULANDI {counts.verified}</span><span>ADAY {counts.pending}</span>{counts.rejected > 0 && <span>ELENDİ {counts.rejected}</span>}
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
