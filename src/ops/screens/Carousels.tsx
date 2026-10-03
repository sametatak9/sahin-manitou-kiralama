// KAYDIRMALI GÖNDERİLER: tüm slaytlar yan yana; büyütüp kaydırarak bak, paylaşım saatini gör, düzenle / iptal / sil.
import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Copy, Pencil, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { errorText } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { Modal, Notice, PlatformBadge, StateView } from '../ui';
import { archiveDraft, cancelDraft, canCancel, canEdit, canRestore, DraftEditModal, restoreDraft } from '../components/DraftActions';

interface Cd { id: string; headline: string | null; title: string | null; caption: string | null; hashtags: string[] | null; media_urls: string[]; primary_platform: string | null; scheduled_at: string | null; workflow_status: string; error: string | null }

export function CarouselsPanel() {
  const q = useQuery(async () => unwrap(await db().from('social_drafts').select('id,headline,title,caption,hashtags,media_urls,primary_platform,scheduled_at,workflow_status,error')
    .eq('format', 'carousel').is('archived_at', null).order('scheduled_at', { ascending: true }).limit(100)) as Cd[], [] as Cd[], [], ['social_drafts']);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<Cd | null>(null);
  const [view, setView] = useState<{ urls: string[]; i: number; title: string } | null>(null);
  // Aynı kaydırmalının Instagram + Facebook kayıtları tek kartta
  const groups = useMemo(() => {
    const m = new Map<string, Cd[]>();
    for (const d of q.data) { const k = d.media_urls?.[0] ?? d.id; m.set(k, [...(m.get(k) ?? []), d]); }
    return [...m.values()];
  }, [q.data]);
  const act = async (fn: () => Promise<void>, ok: string, ask?: string) => {
    if (ask && !window.confirm(ask)) return;
    try { await fn(); setMsg({ tone: 'ok', text: ok }); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); }
    await q.reload();
  };

  if (q.loading && !q.data.length) return <StateView kind="loading" />;
  if (!groups.length) return <StateView kind="empty" title="Henüz kaydırmalı gönderi yok" message="Drive fotoğraflarından üretilen kaydırmalı gönderiler burada görünür." />;
  return (
    <div className="space-y-3">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {editing && <DraftEditModal key={editing.id} draft={editing} onClose={() => setEditing(null)} onSaved={(t) => { setEditing(null); setMsg({ tone: 'ok', text: t }); q.reload(); }} />}
      {view && (
        <Modal open onClose={() => setView(null)} title={`${view.title} · ${view.i + 1}/${view.urls.length}`} wide>
          <div className="relative flex items-center justify-center bg-black rounded-xl">
            <img src={view.urls[view.i]} alt="" className="max-h-[70vh] w-auto object-contain" />
            {view.i > 0 && <button type="button" onClick={() => setView({ ...view, i: view.i - 1 })} className="absolute left-2 p-2 rounded-full bg-white/85 text-ink-100"><ChevronLeft className="w-5 h-5" /></button>}
            {view.i < view.urls.length - 1 && <button type="button" onClick={() => setView({ ...view, i: view.i + 1 })} className="absolute right-2 p-2 rounded-full bg-white/85 text-ink-100"><ChevronRight className="w-5 h-5" /></button>}
          </div>
        </Modal>
      )}
      {groups.map((ds) => {
        const d0 = ds[0]; const urls = d0.media_urls ?? []; const title = d0.headline || d0.title || 'Kaydırmalı';
        return (
          <section key={d0.id} className="ops-panel p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
              <span className="rounded-full bg-[#262A6B] text-white text-[10px] font-bold px-2 py-0.5">{urls.length} slayt</span>
              {d0.caption && <button type="button" onClick={() => navigator.clipboard?.writeText(`${d0.caption}\n\n${(d0.hashtags ?? []).join(' ')}`).catch(() => undefined)} className="ops-chip ml-auto"><Copy className="w-3.5 h-3.5" />Açıklama</button>}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 ops-scroll">
              {urls.map((u, i) => (
                <button key={u} type="button" onClick={() => setView({ urls, i, title })} className="shrink-0 w-28 sm:w-32 aspect-[4/5] rounded-lg overflow-hidden ring-1 ring-ink-700 hover:ring-[#1E3FA0]">
                  <img src={u} alt={`${i + 1}. slayt`} loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <ul className="space-y-1">
              {ds.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-300">
                  <PlatformBadge platform={d.primary_platform} />
                  {d.workflow_status === 'published' ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />yayınlandı</span>
                    : <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{d.scheduled_at ? fmtDateTime(d.scheduled_at) : 'zamanlanmadı'}</span>}
                  {d.workflow_status === 'cancelled' && <span className="text-ink-500">· iptal</span>}
                  {d.workflow_status === 'draft' && <span className="text-ink-500">· havuzda</span>}
                  {d.error && <span className="text-rose-600 truncate max-w-[40ch]" title={d.error}>· hata: {d.error}</span>}
                  <span className="ml-auto inline-flex items-center gap-1">
                    {canEdit(d) && <button type="button" onClick={() => setEditing(d)} className="ops-chip"><Pencil className="w-3 h-3" />Düzenle</button>}
                    {canCancel(d) && <button type="button" onClick={() => act(() => cancelDraft(d.id), 'İptal edildi — bot bu paylaşımı yapmayacak.', 'Bu paylaşım iptal edilsin mi?')} className="ops-chip"><XCircle className="w-3 h-3" />İptal</button>}
                    {canRestore(d) && <button type="button" onClick={() => act(() => restoreDraft(d), 'Planlandı.')} className="ops-chip"><RotateCcw className="w-3 h-3" />{d.workflow_status === 'draft' ? 'Planla' : 'Yeniden planla'}</button>}
                    {d.workflow_status !== 'processing' && <button type="button" onClick={() => act(async () => { if (canCancel(d)) await cancelDraft(d.id); await archiveDraft(d.id); },
                      d.workflow_status === 'published' ? 'Listeden kaldırıldı (platformdaki gönderi duruyor).' : 'Silindi — bot paylaşmayacak.',
                      d.workflow_status === 'published' ? 'Panel listesinden kaldırılsın mı? (Instagram/Facebook’taki gönderi silinmez)' : 'Bu paylaşım silinsin mi?')} className="ops-chip"><Trash2 className="w-3 h-3" />Sil</button>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
