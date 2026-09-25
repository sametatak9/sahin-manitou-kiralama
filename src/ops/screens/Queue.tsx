// Yayın Kuyruğu: telefondan görsel/video yükle → platform + format + tarih/saat seç → bot o saatte resmi API ile paylaşır.
// Başarı yalnızca platform API yanıtıyla (social_publications.external_post_id) gösterilir.
import { useMemo, useRef, useState } from 'react';
import { CalendarClock, ExternalLink, Film, ImagePlus, Loader2, RotateCcw, Send, Share2, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { callOps, errorCode, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { dayKey, fmtDateTime, istanbulToIso, relTime, type Tone } from '../lib/format';
import type { Draft, OpsStatus, Publication } from '../lib/types';
import { TARGETS, uploadMedia } from '../lib/media';
import { shareToPhone } from '../lib/share';
import { useRouter, useSession } from '../session';
import { Button, cx, ErrorState, Field, Notice, Panel, Pill, PlatformBadge, StateView, Tabs } from '../ui';
import { PoolPicker } from '../components/Pools';

const FORMAT_LABEL: Record<string, string> = { post: 'Gönderi', reel: 'Kısa video', story: 'Hikâye', short: 'Shorts', video: 'Video', banner: 'Banner' };
const ALL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'x'] as const;
const P_NAME: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', x: 'X' };

interface QuotaRow { platform: string; enabled: boolean; target: number; drafted: number; videos: number; banners: number; approved: number; published: number }

/** İçerik Fabrikası: günde her platformda 3 içerik zorunluluğu — hazır / onaylı / paylaşılan. */
function QuotaPanel({ onChanged }: { onChanged: () => void }) {
  const session = useSession(); const admin = session.role === 'admin';
  const q = useQuery(async () => unwrap(await db().rpc('content_quota_today')) as QuotaRow[], [] as QuotaRow[], [], ['social_drafts']);
  const [busy, setBusy] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null);
  const run = async () => { setBusy('run'); setMsg(null); try { await callOps('content_factory_run'); setMsg('İçerik Fabrikası çalışıyor: eksik içerikler 1-2 dakika içinde aşağıdaki listeye “ONAY BEKLİYOR” olarak düşer.'); setTimeout(() => { q.reload(); onChanged(); }, 60000); } catch (e) { setMsg(errorText(e)); } finally { setBusy(null); } };
  const approveAll = async () => {
    setBusy('all'); setMsg(null);
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start.getTime() + 86400000);
      const r = await db().from('social_drafts').update({ workflow_status: 'scheduled', status: 'planlandi', approved_by: session.userId, approved_at: new Date().toISOString() })
        .eq('workflow_status', 'pending_approval').gte('scheduled_at', start.toISOString()).lt('scheduled_at', end.toISOString()).select('id');
      setMsg(`${unwrap(r).length} içerik onaylandı ve saatine zamanlandı.`); q.reload(); onChanged();
    } catch (e) { setMsg(errorText(e)); } finally { setBusy(null); }
  };
  const total = q.data.reduce((a, r) => a + (r.enabled ? r.target : 0), 0); const pub = q.data.reduce((a, r) => a + r.published, 0);
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4" />Günlük paylaşım hedefi — her platformda 3 içerik (1 kısa video + 2 banner)</span>}>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {q.data.map((r) => { const pct = r.target ? Math.min(100, Math.round((r.published / r.target) * 100)) : 0; return (
          <div key={r.platform} className="rounded-xl ring-1 ring-ink-700 p-2.5 space-y-1">
            <div className="flex items-center gap-1.5"><PlatformBadge platform={r.platform} /><span className="text-xs font-semibold text-ink-100">{P_NAME[r.platform] ?? r.platform}</span></div>
            <div className="text-[11px] text-ink-300">Hazır {r.drafted}/{r.target} · Onaylı {r.approved} · <b className={r.published >= r.target ? 'text-emerald-700' : 'text-amber-700'}>Paylaşılan {r.published}/{r.target}</b></div>
            <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><div className={cx('h-full', r.published >= r.target ? 'bg-emerald-600' : 'bg-amber-500')} style={{ width: `${pct}%` }} /></div>
          </div>); })}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-xs text-ink-400">Bugün: <b className="text-ink-100">{pub}/{total}</b> paylaşıldı. Taslaklar her sabah 06:30’da otomatik üretilir; 08:00 özet ve 18:30 hatırlatma Telegram’a gelir.</span>
        <span className="flex-1" />
        {admin && <Button variant="subtle" loading={busy === 'run'} onClick={run} icon={<Sparkles className="w-4 h-4" />}>Eksikleri şimdi üret</Button>}
        {admin && <Button variant="primary" loading={busy === 'all'} onClick={approveAll}>Bugünkü taslakları toplu onayla</Button>}
      </div>
      {msg && <div className="mt-2"><Notice tone="info">{msg}</Notice></div>}
    </Panel>
  );
}
const WF: Record<string, { label: string; tone: Tone }> = {
  pending_approval: { label: 'ONAY BEKLİYOR', tone: 'wait' }, scheduled: { label: 'ZAMANLANDI', tone: 'info' }, approved: { label: 'ONAYLI', tone: 'info' },
  processing: { label: 'PAYLAŞILIYOR', tone: 'run' }, published: { label: 'PAYLAŞILDI', tone: 'go' }, failed: { label: 'BAŞARISIZ', tone: 'stop' },
  cancelled: { label: 'İPTAL', tone: 'idle' }, draft: { label: 'TASLAK', tone: 'idle' }, rejected: { label: 'REDDEDİLDİ', tone: 'stop' },
};
const isVideoUrl = (u: string) => /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(u);

function tomorrow() { const d = new Date(Date.now() + 86400_000); return dayKey(d); }
function addDays(key: string, n: number) { const d = new Date(`${key}T12:00:00+03:00`); d.setUTCDate(d.getUTCDate() + n); return dayKey(d); }

interface Picked { file?: File; url?: string; poolId?: string; preview: string; video: boolean }

function Composer({ status, onDone }: { status: OpsStatus | null; onDone: (msg: string) => void }) {
  const session = useSession();
  const admin = session.role === 'admin';
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Picked[]>([]);
  const [targets, setTargets] = useState<string[]>(['ig_post']);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#şahinmanitou #manitou #teleskopikyükleyici #inşaat');
  const [date, setDate] = useState(tomorrow());
  const [time, setTime] = useState('10:00');
  const [daily, setDaily] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picker, setPicker] = useState<'media' | 'text' | null>(null);

  const hasImage = files.some((f) => !f.video);
  const hasVideo = files.some((f) => f.video);
  const conn = (p: string) => status?.connectors.find((c) => c.key === p);
  const chosen = TARGETS.filter((t) => targets.includes(t.key));
  const problems = [
    !files.length && 'En az bir görsel veya video seçin.',
    !chosen.length && 'En az bir paylaşım yeri seçin.',
    !hasVideo && chosen.some((t) => t.needsVideo) && `${chosen.filter((t) => t.needsVideo).map((t) => t.label).join(', ')} yalnızca video kabul eder — video seçin.`,
    !caption.trim() && 'Açıklama (caption) yazın.',
  ].filter(Boolean) as string[];
  const notConnected = [...new Set(chosen.map((t) => t.platform))].filter((p) => conn(p)?.status !== 'connected');
  const slotIso = (i: number) => istanbulToIso(daily ? addDays(date, i) : date, time);
  const inPast = new Date(slotIso(0)).getTime() < Date.now() - 60_000;

  const pick = (list: FileList | null) => {
    if (!list) return;
    const next = [...list].slice(0, 30).map((file) => ({ file, preview: URL.createObjectURL(file), video: file.type.startsWith('video/') }));
    setFiles((cur) => [...cur, ...next].slice(0, 30));
  };

  const aiCaption = async () => {
    setBusy('ai'); setErr(null);
    try {
      const p = chosen[0]?.platform ?? 'instagram';
      const out = await callOps<Record<string, unknown>>('generate_post', { input: { platform: p, topic: title || 'Şahin Manitou operatörlü teleskopik yükleyici kiralama', objective: 'Teklif talebi / bilinirlik', audience: 'İnşaat firmaları, şantiye şefleri', tone: 'Güven veren, net', cta: 'Teklif için 0531 436 29 04' } });
      if (out.caption) setCaption(String(out.caption));
      if (Array.isArray(out.hashtags) && out.hashtags.length) setHashtags((out.hashtags as string[]).join(' '));
      if (!title && out.title) setTitle(String(out.title));
    } catch (e) {
      setErr(errorCode(e) === 'CONFIGURATION_REQUIRED' ? 'AI anahtarı tanımlı değil — açıklamayı elle yazın ya da Ayarlar → AI anahtarı bölümüne anahtar ekleyin.' : errorText(e));
    } finally { setBusy(null); }
  };

  const submit = async () => {
    setErr(null);
    try {
      const tags = hashtags.split(/\s+/).map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`)).slice(0, 30);
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < files.length; i++) {
        setBusy(`Yükleniyor ${i + 1}/${files.length}`);
        const url = files[i].url ?? await uploadMedia(files[i].file!);
        if (files[i].poolId) await db().from('media_library').update({ status: 'queued', queued_at: new Date().toISOString() }).eq('id', files[i].poolId!);
        const when = slotIso(daily ? i : 0);
        for (const t of chosen) {
          if (t.needsVideo && !files[i].video) continue;
          const now = new Date().toISOString();
          rows.push({
            title: (title.trim() || caption.trim().split('\n')[0]).slice(0, 120) + (files.length > 1 ? ` (${i + 1}/${files.length})` : ''),
            body: caption.trim(), caption: caption.trim(), headline: title.trim() || null, hashtags: tags,
            networks: [t.platform], platform_targets: [t.platform], primary_platform: t.platform, format: t.format, post_type: t.format,
            media_urls: [url], video_url: files[i].video ? url : null, scheduled_at: when, content_pillar: 'yayin_kuyrugu',
            workflow_status: admin ? 'scheduled' : 'pending_approval', status: admin ? 'planlandi' : 'onay_bekliyor',
            ...(admin ? { approved_by: session.userId, approved_at: now } : {}),
          });
        }
      }
      setBusy('Kuyruğa ekleniyor');
      unwrap(await db().from('social_drafts').insert(rows).select('id'));
      files.forEach((f) => f.file && URL.revokeObjectURL(f.preview));
      setFiles([]); setCaption(''); setTitle('');
      onDone(admin
        ? `${rows.length} paylaşım kuyruğa eklendi. Hesap bağlıysa bot zamanı geldiğinde paylaşır; sonuç aşağıda API yanıtıyla görünür.`
        : `${rows.length} paylaşım yönetici onayına gönderildi.`);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  };

  return (
    <Panel title="Yeni paylaşım planla" kicker="Görsel/video → platform → zaman">
      <div className="space-y-4">
        <div>
          <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime" multiple className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
          {files.length === 0 ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-ink-700 bg-ink-900/40 hover:bg-ink-800 p-6 flex flex-col items-center gap-2 text-ink-300">
              <Upload className="w-7 h-7 text-brand-green" />
              <span className="font-semibold text-ink-100">Telefondan görsel veya video seç</span>
              <span className="text-xs">Birden fazla seçebilirsiniz (en fazla 30) · video en fazla 50 MB</span>
            </button>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {files.map((f, i) => (
                <div key={f.preview} className="relative shrink-0 w-24 h-32 rounded-xl overflow-hidden ring-1 ring-ink-700 bg-ink-900">
                  {f.video ? <video src={f.file ? f.preview : `${f.preview}#t=0.1`} className="w-full h-full object-cover" muted playsInline preload="metadata" /> : <img src={f.preview} alt="" className="w-full h-full object-cover" />}
                  <span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[10px] font-bold text-slate-800">{f.video ? 'VİDEO' : 'GÖRSEL'}</span>
                  {daily && files.length > 1 && <span className="absolute left-1 bottom-1 rounded bg-brand-green px-1 text-[10px] font-bold text-white">{addDays(date, i).slice(5).split('-').reverse().join('.')}</span>}
                  <button type="button" aria-label="Kaldır" onClick={() => { if (f.file) URL.revokeObjectURL(f.preview); setFiles(files.filter((_, j) => j !== i)); }} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-800"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()} className="shrink-0 w-24 h-32 rounded-xl border-2 border-dashed border-ink-700 flex flex-col items-center justify-center text-ink-400 text-xs gap-1"><ImagePlus className="w-5 h-5" />Ekle</button>
              <button type="button" onClick={() => setPicker('media')} className="shrink-0 w-24 h-32 rounded-xl border-2 border-dashed border-brand-green/60 flex flex-col items-center justify-center text-brand-green text-xs gap-1"><ImagePlus className="w-5 h-5" />Havuzdan</button>
            </div>
          )}
          {files.length === 0 && <button type="button" onClick={() => setPicker('media')} className="mt-2 w-full rounded-xl ring-1 ring-brand-green/50 bg-ink-900/40 hover:bg-ink-800 p-3 text-sm font-semibold text-brand-green">Havuzdan seç (banner · video · fotoğraf)</button>}
        </div>

        <Field label="Nerede paylaşılsın?">
          <div className="flex flex-wrap gap-1.5">
            {TARGETS.map((t) => {
              const on = targets.includes(t.key);
              return (
                <button key={t.key} type="button" onClick={() => setTargets(on ? targets.filter((x) => x !== t.key) : [...targets, t.key])}
                  className={cx('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1', on ? 'bg-brand-green text-white ring-brand-green' : 'ring-ink-700 text-ink-300 hover:bg-ink-800')}>
                  {t.needsVideo && <Film className="w-3.5 h-3.5" />}{t.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Başlık (YouTube başlığı / iç not)"><input className="ops-input" maxLength={100} placeholder="Örn: Manitou MRT 2150 şantiyede" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Hashtag'ler"><input className="ops-input" value={hashtags} onChange={(e) => setHashtags(e.target.value)} /></Field>
          <Field label="Açıklama (caption) *" className="sm:col-span-2">
            <textarea className="ops-input min-h-[90px]" placeholder="Paylaşım metni…" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <div className="mt-1.5 flex flex-wrap gap-1.5"><Button variant="ghost" loading={busy === 'ai'} onClick={aiCaption} icon={<Sparkles className="w-4 h-4" />}>AI ile açıklama yaz</Button>
              <Button variant="ghost" onClick={() => setPicker('text')}>Metin havuzundan seç</Button></div>
          </Field>
          <Field label="Tarih"><input type="date" className="ops-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Saat (İstanbul)"><input type="time" className="ops-input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        {files.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} className="accent-[var(--color-brand-green)]" />
            Her gün bir tane paylaş ({fmtDateTime(slotIso(0))} → {fmtDateTime(slotIso(files.length - 1))})
          </label>
        )}

        {picker && <PoolPicker mode={picker} onClose={() => setPicker(null)}
          onPickMedia={(items) => setFiles((cur) => [...cur, ...items.map((m) => ({ url: m.url, poolId: m.id, preview: m.url, video: m.video }))].slice(0, 30))}
          onPickText={(t) => { setCaption(t.caption); if (t.hashtags.length) setHashtags(t.hashtags.join(' ')); if (!title && t.headline) setTitle(t.headline); }} />}
        {hasImage && hasVideo && chosen.some((t) => t.needsVideo) && <Notice tone="info">Görseller {chosen.filter((t) => t.needsVideo).map((t) => t.label).join(', ')} için atlanır; yalnızca videolar oraya yüklenir.</Notice>}
        {notConnected.length > 0 && <Notice tone="warn">{notConnected.map((p) => conn(p)?.name ?? p).join(', ')} hesabı henüz bağlı değil. Paylaşım kuyrukta bekler; hesap Uygulamalar sekmesinden bağlandığında zamanı gelmiş olanlar hemen paylaşılır.</Notice>}
        {inPast && <Notice tone="info">Seçilen zaman geçmişte — hesap bağlıysa ilk paylaşım bir dakika içinde yapılır.</Notice>}
        {!admin && <Notice tone="info">Yönetici onayından sonra paylaşılır.</Notice>}
        {err && <Notice tone="error">{err}</Notice>}
        {problems.length > 0 && files.length > 0 && <div className="text-xs text-amber-700">{problems.join(' ')}</div>}
        <div className="flex justify-end">
          <Button variant="primary" disabled={problems.length > 0 || Boolean(busy)} loading={Boolean(busy) && busy !== 'ai'} onClick={submit} icon={<CalendarClock className="w-4 h-4" />}>
            {busy && busy !== 'ai' ? busy : admin ? 'Kuyruğa ekle' : 'Onaya gönder'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function QueueScreen() {
  const session = useSession();
  const { go } = useRouter();
  const admin = session.role === 'admin';
  const [tab, setTab] = useState<'upcoming' | 'done'>('upcoming');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const status = useQuery<OpsStatus | null>(() => callOps<OpsStatus>('status'), null, []);
  const q = useQuery(async () => {
    const s = db();
    const [drafts, pubs] = await Promise.all([
      s.from('social_drafts').select('*').in('primary_platform', [...ALL_PLATFORMS]).neq('archive_status', 'archived')
        .not('scheduled_at', 'is', null).order('scheduled_at', { ascending: true }).limit(300),
      s.from('social_publications').select('id,content_id,platform,status,external_url,published_at,error,external_post_id,scheduled_at,created_at').order('created_at', { ascending: false }).limit(300),
    ]);
    return { drafts: unwrap(drafts) as Draft[], pubs: unwrap(pubs) as Publication[] };
  }, { drafts: [] as Draft[], pubs: [] as Publication[] }, [], ['social_drafts', 'social_publications']);

  const pubBy = useMemo(() => { const m = new Map<string, Publication>(); q.data.pubs.forEach((p) => p.content_id && !m.has(p.content_id) && m.set(p.content_id, p)); return m; }, [q.data.pubs]);
  const upcoming = q.data.drafts.filter((d) => ['pending_approval', 'scheduled', 'approved', 'processing'].includes(d.workflow_status));
  const done = q.data.drafts.filter((d) => ['published', 'failed', 'cancelled'].includes(d.workflow_status)).reverse();
  const list = tab === 'upcoming' ? upcoming : done;

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id); setMsg(null);
    try { await fn(); setMsg({ tone: 'ok', text: ok }); q.reload(); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const update = (id: string, patch: Record<string, unknown>, from: string[]) => async () => {
    const r = await db().from('social_drafts').update(patch).eq('id', id).in('workflow_status', from).select('id');
    if (!unwrap(r).length) throw new Error('Durum değişmiş — liste yenilendi');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink-100">Yayın Kuyruğu</h1>
        <p className="text-sm text-ink-400">Instagram, TikTok, YouTube, Facebook ve X içerikleri. Bağlı platformlarda onaydan sonra bot saatinde paylaşır; bağlı olmayanlarda “Telefondan paylaş” ile tek dokunuş.</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {ALL_PLATFORMS.map((p) => {
          const c = status.data?.connectors.find((x) => x.key === p);
          const ok = c?.status === 'connected';
          return (
            <button key={p} type="button" onClick={() => go('connections')} className="rounded-xl ring-1 ring-ink-700 bg-ink-900/60 p-2.5 flex items-center gap-2 text-left hover:bg-ink-800">
              <PlatformBadge platform={p} />
              <div className="min-w-0"><div className="text-xs font-semibold text-ink-100 truncate">{c?.name ?? p}</div>
                <div className={cx('text-[10px] font-bold', ok ? 'text-emerald-700' : 'text-amber-700')}>{status.loading ? '…' : ok ? 'BAĞLI' : 'BAĞLI DEĞİL'}</div></div>
            </button>
          );
        })}
      </div>

      <QuotaPanel onChanged={q.reload} />
      <Composer status={status.data} onDone={(text) => { setMsg({ tone: 'ok', text }); setTab('upcoming'); q.reload(); }} />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Panel>
        <Tabs className="mb-3" value={tab} onChange={setTab} items={[{ id: 'upcoming', label: 'Sıradaki paylaşımlar', count: upcoming.length }, { id: 'done', label: 'Geçmiş', count: done.length }]} />
        {q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : q.loading ? <StateView kind="loading" compact /> : list.length === 0 ? (
          <StateView kind="empty" compact title={tab === 'upcoming' ? 'Sırada paylaşım yok' : 'Henüz paylaşım yapılmadı'} message={tab === 'upcoming' ? 'Yukarıdan görsel/video seçip zaman belirleyin.' : 'Paylaşımlar platform API yanıtıyla burada görünür.'} />
        ) : (
          <ul className="divide-y divide-ink-800">
            {list.map((d) => {
              const pub = pubBy.get(d.id); const media = d.media_urls?.[0];
              const manual = d.workflow_status === 'published' && (d as { performance_notes?: string | null }).performance_notes?.startsWith('Elle paylaşıldı');
              const wf = manual ? { label: 'ELLE PAYLAŞILDI', tone: 'go' as Tone } : WF[d.workflow_status] ?? { label: d.workflow_status, tone: 'idle' as Tone };
              return (
                <li key={d.id} className="py-3 flex gap-3">
                  <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden bg-ink-800 ring-1 ring-ink-700">
                    {media ? (isVideoUrl(media) ? <video src={`${media}#t=0.1`} className="w-full h-full object-cover" muted playsInline preload="metadata" /> : <img src={media} alt="" className="w-full h-full object-cover" loading="lazy" />) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PlatformBadge platform={d.primary_platform} /><span className="text-xs font-semibold text-ink-200">{FORMAT_LABEL[d.format ?? ''] ?? 'Gönderi'}</span>
                      <Pill tone={wf.tone}>{wf.label}</Pill>
                    </div>
                    {d.headline && <div className="text-xs font-bold text-ink-100">{d.headline}</div>}
                    <div className="text-sm text-ink-100 line-clamp-2">{d.caption || d.body}</div>
                    {(d as { image_brief?: string | null }).image_brief && <div className="text-[11px] font-semibold text-amber-700">{(d as { image_brief?: string | null }).image_brief}</div>}
                    {(d as { design_brief?: string | null }).design_brief && <details className="text-[11px] text-ink-400"><summary className="cursor-pointer">Çekim senaryosu</summary>{(d as { design_brief?: string | null }).design_brief}</details>}
                    <div className="text-[11px] text-ink-400 font-mono">{d.scheduled_at ? `${fmtDateTime(d.scheduled_at)} · ${relTime(d.scheduled_at)}` : '—'}</div>
                    {pub?.external_url && <a href={pub.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 underline"><ExternalLink className="w-3.5 h-3.5" />Paylaşımı aç</a>}
                    {(d.error || (pub?.status === 'failed' && pub.error)) && <div className="text-xs text-rose-700">{pub?.error || d.error}</div>}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {admin && d.workflow_status === 'pending_approval' && <Button variant="primary" loading={busy === d.id} onClick={() => act(d.id, update(d.id, { workflow_status: 'scheduled', status: 'planlandi', approved_by: session.userId, approved_at: new Date().toISOString() }, ['pending_approval']), 'Onaylandı ve zamanlandı.')}>Onayla</Button>}
                      {admin && ['scheduled', 'approved', 'failed'].includes(d.workflow_status) && <Button variant="ghost" loading={busy === `now-${d.id}`} icon={<Send className="w-4 h-4" />}
                        onClick={async () => { setBusy(`now-${d.id}`); setMsg(null); try { const r = await callOps<{ external_url?: string }>('publish_content', { content_id: d.id }); setMsg({ tone: 'ok', text: `Paylaşıldı (API doğruladı)${r.external_url ? `: ${r.external_url}` : ''}` }); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); q.reload(); } }}>Şimdi paylaş</Button>}
                      {['scheduled', 'approved', 'failed', 'pending_approval'].includes(d.workflow_status) && <Button variant="primary" loading={busy === `share-${d.id}`} icon={<Share2 className="w-4 h-4" />}
                        onClick={async () => {
                          setBusy(`share-${d.id}`); setMsg(null);
                          try {
                            const r = await shareToPhone(d);
                            if (r === 'cancelled') return;
                            if (window.confirm(r === 'copied' ? 'Açıklama kopyalandı. Uygulamada paylaşımı tamamladıysanız "Tamam"a basın, "paylaşıldı" olarak işaretlensin.' : 'Paylaşımı tamamladınız mı? "Tamam" derseniz "elle paylaşıldı" olarak işaretlenir.')) {
                              await update(d.id, { workflow_status: 'published', status: 'yayinda', error: null, performance_notes: `Elle paylaşıldı (telefon) · ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}` }, ['scheduled', 'approved', 'failed', 'pending_approval']);
                              await db().from('connector_activity').insert({ connector_key: d.primary_platform ?? 'instagram', action: 'manual_share', status: 'ok', bot_id: (d as { bot_id?: string | null }).bot_id ?? null, ref_type: 'social_drafts', ref_id: d.id, summary: `Telefondan elle paylaşıldı: “${(d.title ?? '').slice(0, 80)}”` });
                              setMsg({ tone: 'ok', text: 'Elle paylaşıldı olarak kaydedildi.' });
                            } else setMsg({ tone: 'ok', text: 'Açıklama panoya kopyalandı; uygulamada “yapıştır” diyebilirsiniz.' });
                          } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); q.reload(); }
                        }}>Telefondan paylaş</Button>}
                      {admin && d.workflow_status === 'failed' && <Button variant="ghost" loading={busy === d.id} icon={<RotateCcw className="w-4 h-4" />} onClick={() => act(d.id, update(d.id, { workflow_status: 'scheduled', status: 'planlandi', error: null, scheduled_at: new Date(Date.now() + 60_000).toISOString() }, ['failed']), 'Yeniden denenecek (1 dk içinde).')}>Tekrar dene</Button>}
                      {['pending_approval', 'scheduled', 'approved'].includes(d.workflow_status) && <Button variant="ghost" loading={busy === d.id} icon={<Trash2 className="w-4 h-4" />} onClick={() => act(d.id, update(d.id, { workflow_status: 'cancelled' }, ['pending_approval', 'scheduled', 'approved']), 'Paylaşım iptal edildi.')}>İptal</Button>}
                      {d.workflow_status === 'processing' && <span className="inline-flex items-center gap-1 text-xs text-ink-400"><Loader2 className="w-3.5 h-3.5 animate-spin" />Platforma gönderiliyor</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
