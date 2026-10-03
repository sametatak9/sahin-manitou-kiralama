// Planlı gönderi işlemleri: düzenle (metin, hashtag, tarih/saat), iptal, yeniden planla, sil (arşiv — veri silinmez).
// Yayınlanmış gönderide "Sil" yalnızca panel listesinden kaldırır; Instagram/Facebook'taki gönderiye dokunmaz.
import { useState } from 'react';
import { CalendarClock, Pencil, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { db } from '../lib/hooks';
import { dayKey, istanbulToIso, timeOf } from '../lib/format';
import { errorText } from '../lib/api';
import { Button, Field, Modal, Notice } from '../ui';

export interface EditableDraft {
  id: string; workflow_status: string; scheduled_at: string | null; caption?: string | null; body?: string | null;
  headline?: string | null; title?: string | null; hashtags?: string[] | null; primary_platform?: string | null;
}

const LOCKED = ['published', 'processing'];
export const canEdit = (d: EditableDraft) => !LOCKED.includes(d.workflow_status);
export const canCancel = (d: EditableDraft) => ['scheduled', 'approved', 'pending_approval', 'draft'].includes(d.workflow_status);
export const canRestore = (d: EditableDraft) => ['cancelled', 'failed', 'rejected'].includes(d.workflow_status);

export async function cancelDraft(id: string) {
  const { error } = await db().from('social_drafts').update({ workflow_status: 'cancelled', status: 'iptal' }).eq('id', id).not('workflow_status', 'in', '(published,processing)');
  if (error) throw error;
}

export async function archiveDraft(id: string) {
  const { error } = await db().from('social_drafts').update({ archive_status: 'archived', archived_at: new Date().toISOString() }).eq('id', id).neq('workflow_status', 'processing');
  if (error) throw error;
}

export async function restoreDraft(d: EditableDraft) {
  // Saati geçmişse 1 saat sonrasına alınır (bot geçmiş saatli gönderiyi hemen paylaşmasın)
  const at = d.scheduled_at && new Date(d.scheduled_at).getTime() > Date.now() + 5 * 60_000 ? d.scheduled_at : new Date(Date.now() + 3600_000).toISOString();
  const { error } = await db().from('social_drafts').update({ workflow_status: 'scheduled', status: 'planlandi', error: null, scheduled_at: at }).eq('id', d.id).in('workflow_status', ['cancelled', 'failed', 'rejected']);
  if (error) throw error;
}

export function DraftEditModal({ draft, onClose, onSaved }: { draft: EditableDraft | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const d = draft;
  const [headline, setHeadline] = useState(d?.headline ?? d?.title ?? '');
  const [caption, setCaption] = useState(d?.caption ?? d?.body ?? '');
  const [tags, setTags] = useState((d?.hashtags ?? []).join(' '));
  const [date, setDate] = useState(d?.scheduled_at ? dayKey(d.scheduled_at) : dayKey(new Date(Date.now() + 86400_000)));
  const [time, setTime] = useState(d?.scheduled_at ? timeOf(d.scheduled_at) : '20:00');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!d) return null;
  const at = istanbulToIso(date, time);
  const past = new Date(at).getTime() < Date.now() + 2 * 60_000;
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const hashtags = tags.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean).map((t) => (t.startsWith('#') ? t : `#${t}`));
      const patch: Record<string, unknown> = { headline: headline.trim() || null, caption, body: caption, hashtags, scheduled_at: at, error: null };
      if (canRestore(d)) { patch.workflow_status = 'scheduled'; patch.status = 'planlandi'; }
      const { error } = await db().from('social_drafts').update(patch).eq('id', d.id).not('workflow_status', 'in', '(published,processing)');
      if (error) throw error;
      onSaved(canRestore(d) ? 'Kaydedildi ve yeniden planlandı.' : 'Değişiklikler kaydedildi.');
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={<span className="inline-flex items-center gap-2"><Pencil className="w-4 h-4" />Gönderiyi düzenle</span>}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
        <Button variant="primary" loading={busy} disabled={past} onClick={save} icon={<CalendarClock className="w-4 h-4" />}>{canRestore(d) ? 'Kaydet ve planla' : 'Kaydet'}</Button>
      </>}>
      <div className="space-y-3">
        <Field label="Başlık"><input className="ops-input" maxLength={120} value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
        <Field label="Açıklama" hint={`${caption.length} / 2200`}>
          <textarea className="ops-input min-h-[160px]" maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </Field>
        <Field label="Hashtag" hint={`${tags.split(/[\s,]+/).filter(Boolean).length} / 30 (boşlukla ayırın)`}>
          <textarea className="ops-input min-h-[70px]" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarih"><input type="date" className="ops-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Saat (İstanbul)"><input type="time" className="ops-input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        {past && <Notice tone="warn">Seçilen saat geçmişte. İleri bir saat seçin; hemen paylaşmak için listedeki “Şimdi” düğmesini kullanın.</Notice>}
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}

/** Liste satırı için düğme grubu: Düzenle · İptal / Yeniden planla · Sil */
export function DraftActionButtons({ draft, onEdit, onDone, compact = false }: { draft: EditableDraft; onEdit: () => void; onDone: (msg: { tone: 'ok' | 'error'; text: string }) => void; compact?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (k: string, fn: () => Promise<void>, ok: string) => {
    setBusy(k);
    try { await fn(); onDone({ tone: 'ok', text: ok }); } catch (e) { onDone({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const published = draft.workflow_status === 'published';
  const sz = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <>
      {canEdit(draft) && <Button variant="ghost" onClick={onEdit} icon={<Pencil className={sz} />}>Düzenle</Button>}
      {canCancel(draft) && (
        <Button variant="ghost" loading={busy === 'c'} icon={<XCircle className={sz} />}
          onClick={() => window.confirm('Bu paylaşım iptal edilsin mi? (Sonra “Yeniden planla” ile geri alabilirsiniz)') && run('c', () => cancelDraft(draft.id), 'İptal edildi — bot bu gönderiyi paylaşmayacak.')}>İptal</Button>
      )}
      {canRestore(draft) && (
        <Button variant="ghost" loading={busy === 'r'} icon={<RotateCcw className={sz} />}
          onClick={() => run('r', () => restoreDraft(draft), 'Yeniden planlandı.')}>Yeniden planla</Button>
      )}
      {draft.workflow_status !== 'processing' && (
        <Button variant="ghost" loading={busy === 'd'} icon={<Trash2 className={sz} />}
          onClick={() => window.confirm(published
            ? 'Bu kayıt panel listesinden kaldırılsın mı?\n\nNot: Instagram/Facebook’taki yayınlanmış gönderi SİLİNMEZ; onu uygulamadan silmeniz gerekir.'
            : 'Bu gönderi silinsin mi? Bot paylaşmaz ve listeden kalkar (kayıt arşivde saklanır).')
            && run('d', async () => { if (canCancel(draft)) await cancelDraft(draft.id); await archiveDraft(draft.id); }, published ? 'Listeden kaldırıldı (platformdaki gönderi duruyor).' : 'Silindi — bot paylaşmayacak.')}>Sil</Button>
      )}
    </>
  );
}
