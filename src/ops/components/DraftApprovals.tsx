// Onay Merkezi → İçerik taslakları: İçerik Fabrikası / botların hazırladığı ve onay bekleyen paylaşımlar (social_drafts).
// Her taslak kartvizit görünümünde: görsel/video önizleme, platform, saat, başlık, açıklama; Onayla / Reddet / Büyük önizleme.
import { useState } from 'react';
import { CalendarClock, Check, Eye, Film, Hash, X } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime } from '../lib/format';
import type { Draft } from '../lib/types';
import { useSession } from '../session';
import { Button, cx, Modal, Notice, PlatformBadge, StateView } from '../ui';

type Row = Draft & { design_url?: string | null; video_url?: string | null };
const FORMAT: Record<string, string> = { reel: 'Reels', short: 'Shorts', video: 'Video', story: 'Hikâye', carousel: 'Kaydırmalı', post: 'Gönderi', banner: 'Banner' };
const isVideo = (u?: string | null) => !!u && /\.(mp4|mov|webm)(\?|#|$)/i.test(u);
const PLATFORM_BG: Record<string, string> = { instagram: 'from-fuchsia-600 via-rose-500 to-amber-400', facebook: 'from-[#1877F2] to-[#0B4FB3]', youtube: 'from-red-600 to-red-800', tiktok: 'from-zinc-900 to-zinc-700', x: 'from-zinc-900 to-zinc-700' };

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
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [open, setOpen] = useState<Row | null>(null);

  const decide = async (d: Row, ok: boolean) => {
    setBusy(d.id); setMsg(null);
    const patch = ok
      ? { workflow_status: 'scheduled', status: 'planlandi', approved_by: session.userId, approved_at: new Date().toISOString() }
      : { workflow_status: 'cancelled' };
    const { error } = await db().from('social_drafts').update(patch).eq('id', d.id).eq('workflow_status', 'pending_approval');
    setMsg(error ? { tone: 'error', text: error.message } : { tone: 'ok', text: ok ? `Onaylandı — ${d.scheduled_at ? fmtDateTime(d.scheduled_at) : 'ilk uygun saatte'} paylaşılacak.` : 'Reddedildi, paylaşılmayacak.' });
    setBusy(null); setOpen(null); q.reload();
  };

  if (q.loading && !q.data.length) return <StateView kind="loading" compact />;
  if (q.error) return <StateView kind="error" message={q.error} compact />;
  if (!q.data.length) return <StateView kind="empty" compact title="Onay bekleyen içerik yok" message="İçerik Fabrikası her sabah yeni taslak hazırlar; burada onayınızı bekler." />;

  return (
    <div className="space-y-3">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
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
                  {m.video && <Film className="w-4 h-4 text-white" />}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/70 to-transparent text-white">
                  <div className="text-[11px] font-mono inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{d.scheduled_at ? `${fmtDateTime(d.scheduled_at)} · ${relTime(d.scheduled_at)}` : 'saat belirlenmedi'}</div>
                </div>
                <span className="absolute right-2.5 bottom-2.5 rounded-full bg-white/90 p-1.5 opacity-0 group-hover:opacity-100 transition"><Eye className="w-4 h-4 text-ink-100" /></span>
              </button>
              <div className="px-3.5 pt-3 pb-2 space-y-1 flex-1">
                {d.headline && <div className="text-[13px] font-bold text-ink-100 leading-snug line-clamp-2">{d.headline}</div>}
                <p className="text-[12px] text-ink-300 line-clamp-3 whitespace-pre-line">{d.caption || d.body}</p>
                {!!d.hashtags?.length && <div className="text-[11px] text-brand-green inline-flex items-center gap-1"><Hash className="w-3 h-3" />{d.hashtags.length} etiket · {d.hashtags.slice(0, 3).join(' ')}</div>}
              </div>
              <div className="border-t border-ink-800 bg-ink-900/40 px-3 py-2.5 flex gap-1.5">
                {admin ? <>
                  <Button variant="primary" className="flex-1" loading={busy === d.id} onClick={() => decide(d, true)} icon={<Check className="w-4 h-4" />}>Onayla</Button>
                  <Button variant="ghost" loading={busy === d.id} onClick={() => decide(d, false)} icon={<X className="w-4 h-4" />}>Reddet</Button>
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
