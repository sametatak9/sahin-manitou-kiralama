// Onay Merkezi → İçerik taslakları: İçerik Fabrikası / botların hazırladığı ve onay bekleyen paylaşımlar (social_drafts).
// Her taslak kartvizit görünümünde: görsel/video önizleme, platform, saat, başlık, açıklama; Onayla / Reddet / Büyük önizleme.
// Toplu onay: Hepsini onayla / Hepsini reddet (sırayla, slot dağıtımlı).
import { useState } from 'react';
import { CalendarClock, Check, CheckCheck, Eye, Film, Hash, Sparkles, X } from 'lucide-react';
import { MONTAGE_TEMPLATES, renderMontage, type MontageClip } from '../lib/montage';
import { recorderFormat, uploadBlob } from '../lib/media';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime } from '../lib/format';
import type { Draft } from '../lib/types';
import { useSession } from '../session';
import { Button, cx, Modal, Notice, PlatformBadge, StateView } from '../ui';

type Row = Draft & { design_url?: string | null; video_url?: string | null; design_provider?: string | null };
const FORMAT: Record<string, string> = { reel: 'Reels', short: 'Shorts', video: 'Video', story: 'Hikâye', carousel: 'Kaydırmalı', post: 'Gönderi', banner: 'Banner' };
const isVideo = (u?: string | null) => !!u && /\.(mp4|mov|webm)(\?|#|$)/i.test(u);
const PLATFORM_BG: Record<string, string> = { instagram: 'from-fuchsia-600 via-rose-500 to-amber-400', facebook: 'from-[#1877F2] to-[#0B4FB3]', youtube: 'from-red-600 to-red-800', tiktok: 'from-zinc-900 to-zinc-700', x: 'from-zinc-900 to-zinc-700' };

const SLOTS = ['09:30', '13:30', '17:30'];
/** Yayın saati geçmişse bir sonraki boş yayın saatine kaydır (onaylanan içerik güne yayılsın, hepsi aynı anda çıkmasın). */
function nextSlot(after: Date, taken: Set<string>): string {
  for (let day = 0; day < 14; day++) {
    const base = new Date(after.getTime() + day * 86400_000);
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(base);
    for (const hm of SLOTS) {
      const iso = new Date(`${ymd}T${hm}:00+03:00`).toISOString();
      if (new Date(iso).getTime() > after.getTime() + 5 * 60_000 && !taken.has(iso)) return iso;
    }
  }
  return new Date(after.getTime() + 3600_000).toISOString();
}
const isEdited = (d: Row) => d.design_provider === 'embay_montage';
const isReel = (d: Row) => ['reel', 'short', 'video'].includes(d.format ?? '') || Boolean(d.video_url);
function templateFor(d: Row) {
  const t = `${d.headline ?? ''} ${d.title ?? ''} ${d.content_pillar ?? ''} ${d.caption ?? ''}`.toLocaleLowerCase('tr-TR');
  const key = /manitou|teleskopik|yükleyici/.test(t) ? 'manitou' : /tadilat|cephe|çatı|mantolama/.test(t) ? 'tadilat' : /villa|müstakil/.test(t) ? 'villa' : /şantiye|ekip/.test(t) ? 'santiye' : 'asamalar';
  return MONTAGE_TEMPLATES.find((x) => x.key === key) ?? MONTAGE_TEMPLATES[0];
}
/** Ham şantiye videosunu marka montajına çevirir: merak kartı + 4 sahne (adım etiketli) + kapanış kartı; yükler ve taslağa bağlar. */
async function editReel(d: Row, onProgress: (note: string) => void): Promise<string> {
  const src = d.video_url || d.media_urls?.find((u) => isVideo(u));
  if (!src) throw new Error('Taslakta video yok');
  const fmt = recorderFormat();
  if (!fmt) throw new Error('Bu tarayıcı video üretemiyor — Android/bilgisayarda Chrome ile açın');
  const p = d.primary_platform || '';
  if (fmt.ext === 'webm' && ['instagram', 'facebook'].includes(p)) throw new Error('Bu tarayıcı yalnızca WebM üretiyor; Instagram/Facebook MP4 ister. Güncel Chrome ile deneyin.');
  const t = templateFor(d);
  const pool = unwrap(await db().from('media_library').select('url,edit').eq('kind', 'video').is('archived_at', null).neq('source', 'montage').limit(200)) as Array<{ url: string; edit: { codec?: string } | null }>;
  const others = pool.filter((v) => v.edit?.codec !== 'hevc' && v.url !== src).sort(() => Math.random() - 0.5).slice(0, 3);
  const clips: MontageClip[] = [{ url: src, kind: 'video', label: t.labels[0], seconds: 4 }, ...others.map((v, i) => ({ url: v.url, kind: 'video' as const, label: t.labels[i + 1] ?? t.labels[t.labels.length - 1], seconds: 3 }))];
  const hook = (d.headline || t.hook).replace(/\s+/g, ' ').slice(0, 70);
  const out = await renderMontage(clips, { brand: 'Embay Yapı', title: t.title, phone: '0531 436 29 04', website: 'www.embayyapi.com.tr', cta: t.cta, emblem: t.emblem, hook }, (pct, note) => onProgress(`${note} ${pct ? `%${Math.round(pct * 100)}` : ''}`.trim()));
  onProgress('Yükleniyor…');
  const up = await uploadBlob(out.blob, out.ext, out.contentType);
  const cov = await uploadBlob(out.cover, 'jpg', 'image/jpeg').catch(() => null);
  const { error } = await db().from('social_drafts').update({ video_url: up.url, media_urls: [up.url], design_url: cov?.url ?? d.design_url ?? null, design_provider: 'embay_montage' }).eq('id', d.id);
  if (error) throw new Error(error.message);
  return up.url;
}

function mediaOf(d: Row) {
  const v = d.video_url || d.media_urls?.find((u) => isVideo(u)) || null;
  const img = d.design_url || d.media_urls?.find((u) => !isVideo(u)) || null;
  return { video: v, image: img };
}

export function DraftApprovals({ onCount }: { onCount?: (n: number) => void }) {
  const session = useSession();
  const admin = session.role === 'admin';
  const q = useQuery(async () => {
    const rows = unwrap(await db().from('social_drafts').select('*').eq('workflow_status', 'pending_approval').is('archived_at', null).order('scheduled_at', { ascending: true }).limit(120)) as Row[];
    onCount?.(rows.length);
    return rows;
  }, [] as Row[], [], ['social_drafts']);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [open, setOpen] = useState<Row | null>(null);
  const [progress, setProgress] = useState<Record<string, string>>({});

  const edit = async (d: Row) => {
    setBusy(d.id); setMsg(null);
    try { await editReel(d, (n) => setProgress((p) => ({ ...p, [d.id]: n }))); setMsg({ tone: 'ok', text: 'Reels montajı hazır. Önizleyip onaylayabilirsiniz.' }); }
    catch (e) { setMsg({ tone: 'error', text: `Montaj yapılamadı: ${(e as Error).message}` }); }
    finally { setProgress((p) => { const n = { ...p }; delete n[d.id]; return n; }); setBusy(null); q.reload(); }
  };

  const decide = async (d: Row, ok: boolean, takenSlots?: Set<string>) => {
    setBusy(d.id); setMsg(null);
    try {
      // Onaylanan ham Reels önce otomatik montajlanır (marka kartı + adım etiketleri + kapanış)
      if (ok && isReel(d) && !isEdited(d)) await editReel(d, (n) => setProgress((p) => ({ ...p, [d.id]: n })));
      let when = d.scheduled_at;
      if (ok && (!when || new Date(when).getTime() < Date.now() + 5 * 60_000)) {
        const taken = takenSlots ?? new Set<string>();
        if (!takenSlots) {
          const { data: busySlots } = await db().from('social_drafts').select('scheduled_at').eq('primary_platform', d.primary_platform ?? '').in('workflow_status', ['scheduled', 'approved']).gte('scheduled_at', new Date().toISOString());
          (busySlots ?? []).forEach((r: { scheduled_at: string }) => taken.add(new Date(r.scheduled_at).toISOString()));
        }
        when = nextSlot(new Date(), taken);
        taken.add(when);
      }
      const patch = ok
        ? { workflow_status: 'scheduled', status: 'planlandi', approved_by: session.userId, approved_at: new Date().toISOString(), scheduled_at: when }
        : { workflow_status: 'cancelled' };
      const { error } = await db().from('social_drafts').update(patch).eq('id', d.id).eq('workflow_status', 'pending_approval');
      if (error) throw new Error(error.message);
      if (!takenSlots) setMsg({ tone: 'ok', text: ok ? `Onaylandı — ${when ? fmtDateTime(when) : 'ilk uygun saatte'} paylaşılacak.` : 'Reddedildi, paylaşılmayacak.' });
      return when;
    } catch (e) {
      if (!takenSlots) setMsg({ tone: 'error', text: (e as Error).message });
      throw e;
    } finally {
      setProgress((p) => { const n = { ...p }; delete n[d.id]; return n; });
      setBusy(null);
      if (!takenSlots) { setOpen(null); q.reload(); }
    }
  };

  /** Tüm bekleyen taslakları sırayla onayla veya reddet. Reels montajı atlanır (hız için); slotlar dağıtılır. */
  const bulkDecide = async (ok: boolean) => {
    if (!admin || !q.data.length) return;
    const label = ok ? 'onaylamak' : 'reddetmek';
    if (!window.confirm(`${q.data.length} taslağı ${label} istediğinize emin misiniz?${ok ? '\n\nNot: Ham reels için otomatik montaj toplu onayda atlanır; gerekirse tek tek "Editle" kullanın.' : ''}`)) return;
    setBulkBusy(true); setMsg(null);
    let okCount = 0; let failCount = 0;
    const taken = new Set<string>();
    try {
      const { data: busySlots } = await db().from('social_drafts').select('scheduled_at').in('workflow_status', ['scheduled', 'approved']).gte('scheduled_at', new Date().toISOString());
      (busySlots ?? []).forEach((r: { scheduled_at: string }) => taken.add(new Date(r.scheduled_at).toISOString()));
    } catch { /* devam */ }
    for (const d of q.data) {
      try {
        if (ok) {
          let when = d.scheduled_at;
          if (!when || new Date(when).getTime() < Date.now() + 5 * 60_000) {
            when = nextSlot(new Date(), taken);
            taken.add(when);
          }
          const { error } = await db().from('social_drafts').update({
            workflow_status: 'scheduled',
            status: 'planlandi',
            approved_by: session.userId,
            approved_at: new Date().toISOString(),
            scheduled_at: when,
          }).eq('id', d.id).eq('workflow_status', 'pending_approval');
          if (error) throw new Error(error.message);
        } else {
          const { error } = await db().from('social_drafts').update({ workflow_status: 'cancelled' }).eq('id', d.id).eq('workflow_status', 'pending_approval');
          if (error) throw new Error(error.message);
        }
        okCount++;
      } catch {
        failCount++;
      }
    }
    setBulkBusy(false);
    setMsg({
      tone: failCount ? 'error' : 'ok',
      text: ok
        ? `${okCount} taslak onaylandı ve zamanlandı${failCount ? `, ${failCount} başarısız` : ''}.`
        : `${okCount} taslak reddedildi${failCount ? `, ${failCount} başarısız` : ''}.`,
    });
    q.reload();
  };

  if (q.loading && !q.data.length) return <StateView kind="loading" compact />;
  if (q.error) return <StateView kind="error" message={q.error} compact />;
  if (!q.data.length) return <StateView kind="empty" compact title="Onay bekleyen içerik yok" message="İçerik Fabrikası her sabah yeni taslak hazırlar; burada onayınızı bekler." />;

  return (
    <div className="space-y-3">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {admin && q.data.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-ink-850/80 ring-1 ring-ink-700 px-3 py-2.5">
          <span className="text-xs text-ink-300 flex-1">{q.data.length} taslak bekliyor</span>
          <Button variant="primary" loading={bulkBusy} onClick={() => bulkDecide(true)} icon={<CheckCheck className="w-4 h-4" />}>
            Hepsini onayla
          </Button>
          <Button variant="ghost" loading={bulkBusy} onClick={() => bulkDecide(false)} icon={<X className="w-4 h-4" />}>
            Hepsini reddet
          </Button>
        </div>
      )}
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {q.data.map((d) => {
          const m = mediaOf(d); const p = d.primary_platform || d.platform_targets?.[0] || 'instagram';
          return (
            <li key={d.id} className="rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-ink-700/70 flex flex-col">
              <button type="button" onClick={() => setOpen(d)} className="relative block aspect-[4/5] bg-ink-900 overflow-hidden group">
                {m.video ? <video src={`${m.video}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  : m.image ? <img src={m.image} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition" />
                  : <div className={cx('w-full h-full bg-gradient-to-br grid place-items-center p-5 text-center text-white font-display font-semibold text-lg', PLATFORM_BG[p] ?? 'from-[#262A6B] to-[#1E3FA0]')}>{d.headline || d.title}</div>}
                <div className="absolute inset-x-0 top-0 p-2.5 flex items-center gap-1.5 bg-gradient-to-b from-black/55 to-transparent">
                  <PlatformBadge platform={p} />
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-ink-100">{FORMAT[d.format ?? ''] ?? 'Gönderi'}</span>
                  <span className="flex-1" />
                  {m.video && (isEdited(d) ? <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-bold text-emerald-950 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />EDİTLİ</span> : <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-950 inline-flex items-center gap-1"><Film className="w-3 h-3" />HAM VİDEO</span>)}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/70 to-transparent text-white">
                  <div className="text-[11px] font-mono inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{d.scheduled_at ? `${fmtDateTime(d.scheduled_at)} · ${relTime(d.scheduled_at)}` : 'saat belirlenmedi'}</div>
                </div>
                {progress[d.id] && <div className="absolute inset-0 bg-black/60 grid place-items-center text-white text-sm font-semibold p-4 text-center"><span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4 animate-pulse" />{progress[d.id]}</span></div>}
                <span className="absolute right-2.5 bottom-2.5 rounded-full bg-white/90 p-1.5 opacity-0 group-hover:opacity-100 transition"><Eye className="w-4 h-4 text-ink-100" /></span>
              </button>
              <div className="px-3.5 pt-3 pb-2 space-y-1 flex-1">
                {d.headline && <div className="text-[13px] font-bold text-ink-100 leading-snug line-clamp-2">{d.headline}</div>}
                <p className="text-[12px] text-ink-300 line-clamp-3 whitespace-pre-line">{d.caption || d.body}</p>
                {!!d.hashtags?.length && <div className="text-[11px] text-brand-green inline-flex items-center gap-1"><Hash className="w-3 h-3" />{d.hashtags.length} etiket · {d.hashtags.slice(0, 3).join(' ')}</div>}
              </div>
              <div className="border-t border-ink-800 bg-ink-900/40 px-3 py-2.5 flex gap-1.5">
                {admin ? <>
                  {isReel(d) && !isEdited(d) && <Button variant="subtle" loading={busy === d.id} onClick={() => edit(d)} icon={<Sparkles className="w-4 h-4" />}>Editle</Button>}
                  <Button variant="primary" className="flex-1" loading={busy === d.id || bulkBusy} onClick={() => decide(d, true)} icon={<Check className="w-4 h-4" />}>{isReel(d) && !isEdited(d) ? 'Editle + onayla' : 'Onayla'}</Button>
                  <Button variant="ghost" loading={busy === d.id || bulkBusy} onClick={() => decide(d, false)} icon={<X className="w-4 h-4" />}>Reddet</Button>
                </> : <span className="text-[11px] text-ink-400">Onay yöneticide</span>}
                <Button variant="subtle" onClick={() => setOpen(d)} icon={<Eye className="w-4 h-4" />}>Önizle</Button>
              </div>
            </li>
          );
        })}
      </ul>
      {open && (() => {
        const m = mediaOf(open); const p = open.primary_platform || open.platform_targets?.[0] || 'instagram';
        return (
          <Modal open wide onClose={() => setOpen(null)} title={<span className="inline-flex items-center gap-2"><PlatformBadge platform={p} />{open.headline || open.title}</span>}
            footer={admin ? <>
              <Button variant="ghost" loading={busy === open.id} onClick={() => decide(open, false)} icon={<X className="w-4 h-4" />}>Reddet</Button>
              <Button variant="primary" loading={busy === open.id} onClick={() => decide(open, true)} icon={<Check className="w-4 h-4" />}>Onayla ve zamanla</Button>
            </> : <Button onClick={() => setOpen(null)}>Kapat</Button>}>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,340px)_1fr] gap-4">
              <div className="rounded-2xl overflow-hidden bg-ink-900 ring-1 ring-ink-700">
                {m.video ? <video src={m.video} controls playsInline className="w-full max-h-[70vh] object-contain bg-black" />
                  : m.image ? <img src={m.image} alt="" className="w-full object-contain" />
                  : <div className="aspect-[4/5] grid place-items-center text-ink-400 text-sm">Görsel yok</div>}
              </div>
              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap gap-2 text-[11px] text-ink-400">
                  <span className="rounded-full bg-ink-800 px-2 py-0.5">{FORMAT[open.format ?? ''] ?? 'Gönderi'}</span>
                  <span className="rounded-full bg-ink-800 px-2 py-0.5 inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" />{open.scheduled_at ? fmtDateTime(open.scheduled_at) : '—'}</span>
                  {open.content_pillar && <span className="rounded-full bg-ink-800 px-2 py-0.5">{open.content_pillar}</span>}
                </div>
                <div className="rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3 text-[13px] text-ink-200 whitespace-pre-line max-h-[45vh] overflow-y-auto">{open.caption || open.body}</div>
                {!!open.hashtags?.length && <div className="text-[12px] text-brand-green break-words">{open.hashtags.join(' ')}</div>}
                {open.image_brief && <div className="text-[11px] text-amber-700">Not: {open.image_brief}</div>}
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
