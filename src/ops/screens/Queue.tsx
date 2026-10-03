// Yayın Kuyruğu: telefondan görsel/video yükle → platform + format + tarih/saat seç → bot o saatte resmi API ile paylaşır.
// Başarı yalnızca platform API yanıtıyla (social_publications.external_post_id) gösterilir.
import { useMemo, useRef, useState } from 'react';
import { CalendarClock, ExternalLink, Film, ImagePlus, Loader2, RotateCcw, Send, Share2, Sparkles, Upload, X } from 'lucide-react';
import { callOps, errorCode, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { dayKey, fmtDateTime, istanbulToIso, relTime, type Tone } from '../lib/format';
import type { Draft, OpsStatus, Publication } from '../lib/types';
import { TARGETS, uploadMedia } from '../lib/media';
import { shareToPhone } from '../lib/share';
import { useRouter, useSession } from '../session';
import { Button, cx, ErrorState, Field, Notice, Panel, Pill, PlatformBadge, StateView, Tabs } from '../ui';
import { PoolPicker } from '../components/Pools';
import { DraftActionButtons, DraftEditModal } from '../components/DraftActions';

const FORMAT_LABEL: Record<string, string> = { carousel: 'Kaydırmalı', post: 'Gönderi', reel: 'Kısa video', story: 'Hikâye', short: 'Shorts', video: 'Video', banner: 'Banner' };
const ALL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'x'] as const;
const P_NAME: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', x: 'X' };

interface QuotaRow { platform: string; enabled: boolean; target: number; drafted: number; videos: number; banners: number; approved: number; published: number }

function QuotaPanel({ onChanged }: { onChanged: () => void }) {
  const session = useSession(); const admin = session.role === 'admin';
  const q = useQuery(async () => unwrap(await db().rpc('content_quota_today')) as QuotaRow[], [] as QuotaRow[], [], ['social_drafts']);
  const [busy, setBusy] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null);
  const run = async () => { setBusy('run'); setMsg(null); try { await callOps('content_factory_run'); setMsg('İçerik Fabrikası çalışıyor: eksik içerikler 1-2 dakika içinde listeye düşer.'); setTimeout(() => { q.reload(); onChanged(); }, 60000); } catch (e) { setMsg(errorText(e)); } finally { setBusy(null); } };
  const approveAll = async () => {
    setBusy('all'); setMsg(null);
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start.getTime() + 86400000);
      const r = await db().from('social_drafts').update({ workflow_status: 'scheduled', status: 'planlandi', approved_by: session.userId, approved_at: new Date().toISOString() })
        .eq('workflow_status', 'pending_approval').gte('scheduled_at', start.toISOString()).lt('scheduled_at', end.toISOString()).select('id');
      setMsg(`${unwrap(r).length} içerik onaylandı.`); q.reload(); onChanged();
    } catch (e) { setMsg(errorText(e)); } finally { setBusy(null); }
  };
  const total = q.data.reduce((a, r) => a + (r.enabled ? r.target : 0), 0); const pub = q.data.reduce((a, r) => a + r.published, 0);
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4" />Günlük paylaşım — Embay inşaat (platform başı 3 içerik)</span>}>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {q.data.map((r) => { const pct = r.target ? Math.min(100, Math.round((r.published / r.target) * 100)) : 0; return (
          <div key={r.platform} className="rounded-xl ring-1 ring-ink-700 p-2.5 space-y-1">
            <div className="flex items-center gap-1.5"><PlatformBadge platform={r.platform} /><span className="text-xs font-semibold text-ink-100">{P_NAME[r.platform] ?? r.platform}</span></div>
            <div className="text-[11px] text-ink-300">Hazır {r.drafted}/{r.target} · Onaylı {r.approved} · <b className={r.published >= r.target ? 'text-emerald-700' : 'text-amber-700'}>Paylaşılan {r.published}/{r.target}</b></div>
            <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><div className={cx('h-full', r.published >= r.target ? 'bg-emerald-600' : 'bg-amber-500')} style={{ width: `${pct}%` }} /></div>
          </div>); })}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-xs text-ink-400">Bugün: <b className="text-ink-100">{pub}/{total}</b></span>
        <span className="flex-1" />
        {admin && <Button variant="subtle" loading={busy === 'run'} onClick={run} icon={<Sparkles className="w-4 h-4" />}>Eksikleri üret</Button>}
        {admin && <Button variant="primary" loading={busy === 'all'} onClick={approveAll}>Bugünküleri onayla</Button>}
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
  const [hashtags, setHashtags] = useState('#embayyapı #inşaat #villa #tadilat #çatalca #istanbul');
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
    !hasVideo && chosen.some((t) => t.needsVideo) && `${chosen.filter((t) => t.needsVideo).map((t) => t.label).join(', ')} yalnızca video kabul eder.`,
    !caption.trim() && 'Açıklama yazın.',
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
      const out = await callOps<Record<string, unknown>>('generate_post', { input: { platform: p, topic: title || 'Embay Yapı villa tadilat kentsel dönüşüm Çatalca İstanbul', objective: 'Teklif talebi / bilinirlik', audience: 'Arsa sahipleri, müteahhitler, şantiye şefleri', tone: 'Güven veren, net', cta: 'Teklif için 0531 436 29 04' } });
      if (out.caption) setCaption(String(out.caption));
      if (Array.isArray(out.hashtags) && out.hashtags.length) setHashtags((out.hashtags as string[]).join(' '));
      if (!title && out.title) setTitle(String(out.title));
    } catch (e) {
      setErr(errorCode(e) === 'CONFIGURATION_REQUIRED' ? 'AI anahtarı yok — metni elle yazın.' : errorText(e));
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
      onDone(admin ? `${rows.length} paylaşım kuyruğa eklendi.` : `${rows.length} paylaşım onaya gönderildi.`);
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
              <span className="text-xs">En fazla 30 dosya · video max 50 MB</span>
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
          {files.length === 0 && <button type="button" onClick={() => setPicker('media')} className="mt-2 w-full rounded-xl ring-1 ring-brand-green/50 bg-ink-900/40 hover:bg-ink-800 p-3 text-sm font-semibold text-brand-green">Havuzdan seç</button>}
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
          <Field label="Başlık"><input className="ops-input" maxLength={100} placeholder="Örn: Çatalca villa şantiyesi" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Hashtag"><input className="ops-input" value={hashtags} onChange={(e) => setHashtags(e.target.value)} /></Field>
          <Field label="Açıklama *" className="sm:col-span-2">
            <textarea className="ops-input min-h-[90px]" placeholder="Paylaşım metni…" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <div className="mt-1.5 flex flex-wrap gap-1.5"><Button variant="ghost" loading={busy === 'ai'} onClick={aiCaption} icon={<Sparkles className="w-4 h-4" />}>AI ile yaz</Button>
              <Button variant="ghost" onClick={() => setPicker('text')}>Metin havuzundan</Button></div>
          </Field>
          <Field label="Tarih"><input type="date" className="ops-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Saat"><input type="time" className="ops-input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        {files.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} className="accent-[var(--color-brand-green)]" />
            Her gün bir tane ({fmtDateTime(slotIso(0))} → {fmtDateTime(slotIso(files.length - 1))})
          </label>
        )}
        {picker && <PoolPicker mode={picker} onClose={() => setPicker(null)}
          onPickMedia={(items) => setFiles((cur) => [...cur, ...items.map((m) => ({ url: m.url, poolId: m.id, preview: m.url, video: m.video }))].slice(0, 30))}
          onPickText={(t) => { setCaption(t.caption); if (t.hashtags.length) setHashtags(t.hashtags.join(' ')); if (!title && t.headline) setTitle(t.headline); }} />}
        {notConnected.length > 0 && <Notice tone="warn">{notConnected.map((p) => conn(p)?.name ?? p).join(', ')} henüz bağlı değil — kuyrukta bekler.</Notice>}
        {inPast && <Notice tone="info">Zaman geçmişte — bağlıysa hemen paylaşılır.</Notice>}
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
      s.from('social_publications').select('id,content_id,platform,status,external_url,published_at,error,external_post_id,scheduled_at,created_at').order('created_at', { ascending: false }).limit(200),
    ]);
    return { drafts: unwrap(drafts) as Draft[], pubs: unwrap(pubs) as Publication[] };
  }, { drafts: [] as Draft[], pubs: [] as Publication[] }, [], ['social_drafts', 'social_publications']);
  const pubBy = useMemo(() => { const m = new Map<string, Publication>(); q.data.pubs.forEach((p) => p.content_id && !m.has(p.content_id) && m.set(p.content_id, p)); return m; }, [q.data.pubs]);
  const now = Date.now();
  const rows = q.data.drafts.filter((d) => {
    const done = ['published', 'failed', 'cancelled', 'rejected'].includes(d.workflow_status);
    return tab === 'done' ? done : !done;
  });
  const [editing, setEditing] = useState<Draft | null>(null);
  const publishNow = async (id: string) => {
    setBusy(id);
    try {
      await callOps('publish_content', { content_id: id });
      setMsg({ tone: 'ok', text: 'Yayın isteği gönderildi.' }); q.reload();
    } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-100">Yayın Kuyruğu</h2>
        <p className="text-xs text-ink-400">Embay Yapı inşaat paylaşımları — görsel yükle, saat seç; bot zamanında paylaşır. Manitou içeriği yok.</p>
      </div>
      {admin && <QuotaPanel onChanged={() => q.reload()} />}
      <Composer status={status.data} onDone={(t) => { setMsg({ tone: 'ok', text: t }); q.reload(); }} />
      {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : msg.tone === 'warn' ? 'warn' : 'error'}>{msg.text}</Notice>}
      {editing && <DraftEditModal key={editing.id} draft={editing} onClose={() => setEditing(null)} onSaved={(t) => { setEditing(null); setMsg({ tone: 'ok', text: t }); q.reload(); }} />}
      <Tabs value={tab} onChange={setTab} items={[{ id: 'upcoming', label: 'Sıradakiler' }, { id: 'done', label: 'Tamamlanan' }]} />
      {q.loading && !q.data.drafts.length ? <StateView kind="loading" /> : q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : rows.length === 0 ? (
        <StateView kind="empty" title={tab === 'upcoming' ? 'Sırada paylaşım yok' : 'Henüz tamamlanan yok'} message="Yukarıdan görsel yükleyip planlayın veya Onay Merkezi’nden onaylayın." />
      ) : (
        <ul className="space-y-2">
          {rows.map((d) => {
            const pub = pubBy.get(d.id);
            const wf = WF[d.workflow_status] ?? WF.draft;
            const media = d.media_urls?.[0] || d.video_url || d.design_url;
            const past = d.scheduled_at && new Date(d.scheduled_at).getTime() < now;
            return (
              <li key={d.id} className="ops-panel p-3 flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-20 h-20 rounded-xl overflow-hidden bg-ink-900 shrink-0">
                  {(d.media_urls?.length ?? 0) > 1 && <span className="absolute top-1 right-1 z-10 rounded-full bg-[#262A6B] text-white text-[10px] font-bold px-1.5 py-0.5">+{d.media_urls.length - 1}</span>}
                  {media ? (isVideoUrl(media) ? <video src={`${media}#t=0.1`} className="w-full h-full object-cover" muted playsInline preload="metadata" /> : <img src={media} alt="" className="w-full h-full object-cover" />) : <div className="w-full h-full grid place-items-center text-[10px] text-ink-500">görsel yok</div>}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PlatformBadge platform={d.primary_platform || d.platform_targets?.[0]} />
                    <Pill tone={wf.tone}>{wf.label}</Pill>
                    <span className="text-[11px] font-mono text-ink-400">{FORMAT_LABEL[d.format ?? ''] ?? d.format}</span>
                    {past && tab === 'upcoming' && <span className="text-[10px] text-amber-700">saat geçti</span>}
                  </div>
                  <div className="text-sm font-semibold text-ink-100 line-clamp-1">{d.title || d.headline}</div>
                  <div className="text-[11px] text-ink-400 line-clamp-2">{d.caption || d.body}</div>
                  <div className="text-[11px] font-mono text-ink-500">{d.scheduled_at ? fmtDateTime(d.scheduled_at) : '—'}{pub?.external_post_id ? ` · API: ${pub.external_post_id}` : ''}{pub?.error ? ` · ${pub.error}` : ''}</div>
                </div>
                <div className="flex sm:flex-col gap-1.5 shrink-0">
                  {admin && tab === 'upcoming' && ['scheduled', 'approved'].includes(d.workflow_status) && (
                    <Button variant="subtle" loading={busy === d.id} onClick={() => publishNow(d.id)} icon={<Send className="w-3.5 h-3.5" />}>Şimdi</Button>
                  )}
                  <DraftActionButtons draft={d} onEdit={() => setEditing(d)} onDone={(m) => { setMsg(m); q.reload(); }} />
                  {pub?.external_url && <a href={pub.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-green"><ExternalLink className="w-3.5 h-3.5" />Aç</a>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
