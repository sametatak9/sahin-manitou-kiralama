import { useEffect, useMemo, useState } from 'react';
import { Ban, CalendarClock, Check, ExternalLink, Pencil, Play, RotateCcw, Send, X } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { approvalLabel, approvalTone, fmtDateTime, relTime, timeOf, dayKey, istanbulToIso } from '../lib/format';
import type { Approval, Draft } from '../lib/types';
import { useRouter, useSession } from '../session';
import { Button, cx, ErrorState, Field, Modal, Notice, Panel, Pill, PlatformBadge, StateView, Tabs } from '../ui';
import { PostPreview } from '../components/PostPreview';

type Filter = 'pending_approval' | 'scheduled' | 'approved' | 'published' | 'failed' | 'rejected' | 'all';
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'pending_approval', label: 'Onay bekleyen' }, { id: 'scheduled', label: 'Zamanlandı' }, { id: 'approved', label: 'Onaylı' },
  { id: 'published', label: 'Yayınlandı' }, { id: 'failed', label: 'Başarısız' }, { id: 'rejected', label: 'Reddedildi' }, { id: 'all', label: 'Tümü' },
];
const ENTITY_LABEL: Record<string, string> = { content: 'İçerik', publication: 'Yayın', message: 'Mesaj', email: 'E-posta', whatsapp: 'WhatsApp', listing: 'İlan', offer: 'Teklif', seo: 'SEO', ad: 'Reklam', report: 'Rapor', lead: 'Lead dönüşümü', other: 'Diğer' };

export function ApprovalsScreen() {
  const { state, go } = useRouter();
  const [filter, setFilter] = useState<Filter>('pending_approval');
  const q = useQuery(async () => {
    let query = db().from('approval_requests').select('*').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'all') query = query.eq('status', filter);
    return unwrap(await query) as Approval[];
  }, [] as Approval[], [filter], ['approval_requests']);
  const counts = useQuery(async () => {
    const { data } = await db().from('approval_requests').select('status');
    const c: Record<string, number> = {};
    (data || []).forEach((r: { status: string }) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, {} as Record<string, number>, [], ['approval_requests']);
  const selected = state.id ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-100">Approval Stream</h2>
          <p className="text-xs text-ink-400">Sosyal yayın, müşteri mesajı, WhatsApp, e-posta, ilan ve lead dönüşümü insan onayı olmadan yürütülmez. Her karar audit log’a yazılır.</p>
        </div>
        <Tabs value={filter} onChange={setFilter} items={FILTERS.map((f) => ({ ...f, count: f.id === 'all' ? undefined : counts.data[f.id] ?? 0 }))} />
      </div>
      {q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : q.loading ? <StateView kind="loading" /> : q.data.length === 0 ? (
        <StateView kind="empty" title="Bu durumda kayıt yok" message="Botlar onay gerektiren bir işlem ürettiğinde veya Gönderi Stüdyosu’ndan onaya gönderdiğinizde burada görünür." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
          {q.data.map((a) => (
            <button key={a.id} onClick={() => go('approvals', a.id)} className={cx('ops-panel text-left p-4 hover:ring-1 hover:ring-amber-400/30 transition', selected === a.id && 'ring-1 ring-brand-green')}>
              <div className="flex items-start gap-3">
                <PlatformBadge platform={a.platform} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap"><span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">{ENTITY_LABEL[a.entity_type] ?? a.entity_type}</span>{a.tool_key && <span className="text-[10px] font-mono text-ink-500">· {a.tool_key}</span>}</div>
                  <div className="text-sm font-semibold text-ink-100 mt-0.5 line-clamp-2">{a.title}</div>
                  {a.summary && <div className="text-[11px] text-ink-400 mt-1 line-clamp-2">{a.summary}</div>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-800">
                <Pill tone={approvalTone(a.status)}>{approvalLabel(a.status)}</Pill>
                <span className="text-[10px] font-mono text-ink-500">{a.scheduled_for ? `⏱ ${fmtDateTime(a.scheduled_for)}` : relTime(a.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {selected && <ApprovalDetail id={selected} onClose={() => go('approvals')} onChanged={() => { q.reload(); counts.reload(); }} />}
    </div>
  );
}

function ApprovalDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const session = useSession();
  const q = useQuery(async () => {
    const ap = unwrap(await db().from('approval_requests').select('*').eq('id', id).single()) as Approval;
    let draft: Draft | null = null; let exportUrl: string | null = null; let lead: Record<string, unknown> | null = null;
    if ((ap.entity_type === 'content' || ap.entity_type === 'publication') && (ap.entity_id || ap.payload?.content_id)) {
      draft = (await db().from('social_drafts').select('*').eq('id', ap.entity_id || (ap.payload.content_id as string)).maybeSingle()).data as Draft | null;
      if (draft?.design_id) exportUrl = (await db().from('designs').select('export_url').eq('id', draft.design_id).maybeSingle()).data?.export_url ?? null;
    }
    if (ap.entity_type === 'lead' && ap.entity_id) lead = (await db().from('lead_inbox').select('full_name,phone,email,ilce,demand,note,created_at,ticari_ileti_izni').eq('id', ap.entity_id).maybeSingle()).data;
    return { ap, draft, exportUrl, lead };
  }, null as null | { ap: Approval; draft: Draft | null; exportUrl: string | null; lead: Record<string, unknown> | null }, [id], ['approval_requests']);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [note, setNote] = useState('');
  const [when, setWhen] = useState({ date: '', time: '' });
  const [edit, setEdit] = useState(false);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    const ap = q.data?.ap; if (!ap) return;
    const iso = ap.scheduled_for || q.data?.draft?.scheduled_at;
    setWhen(iso ? { date: dayKey(iso), time: timeOf(iso) } : { date: '', time: '' });
    setCaption(q.data?.draft?.caption || q.data?.draft?.body || '');
  }, [q.data]);

  const decide = async (decision: string, extra: { scheduled?: boolean } = {}) => {
    setBusy(decision); setMsg(null);
    try {
      const { error } = await db().rpc('decide_approval', { p_id: id, p_decision: decision, p_note: note || null, p_scheduled_for: extra.scheduled && when.date ? istanbulToIso(when.date, when.time || '10:00') : null, p_payload: null });
      if (error) throw error;
      setMsg({ tone: 'ok', text: 'Karar kaydedildi.' }); onChanged(); q.reload();
    } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const run = async (key: string, fn: () => Promise<unknown>, okText: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ tone: 'ok', text: okText }); onChanged(); q.reload(); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };

  const ap = q.data?.ap;
  const open = ap && ['draft', 'pending_approval', 'rejected'].includes(ap.status);
  const result = ap?.result as Record<string, unknown> | null;
  const draft = q.data?.draft;
  const media = useMemo(() => (q.data?.exportUrl ? [q.data.exportUrl] : draft?.media_urls ?? []), [q.data, draft]);

  return (
    <Modal open onClose={onClose} wide title={ap ? ap.title : 'Onay'}
      footer={ap && (
        <>
          {open && <Button variant="danger" loading={busy === 'reject'} onClick={() => decide('reject')} icon={<X className="w-4 h-4" />}>Reddet</Button>}
          {ap.status !== 'published' && ap.status !== 'processing' && ap.status !== 'cancelled' && <Button variant="ghost" loading={busy === 'cancel'} onClick={() => decide('cancel')} icon={<Ban className="w-4 h-4" />}>İptal</Button>}
          {ap.status === 'rejected' && <Button variant="ghost" loading={busy === 'submit'} onClick={() => decide('submit')} icon={<Send className="w-4 h-4" />}>Yeniden onaya gönder</Button>}
          {ap.status === 'failed' && session.role === 'admin' && <Button variant="warn" loading={busy === 'retry'} onClick={() => run('retry', async () => { const { error } = await db().rpc('retry_approval', { p_id: id }); if (error) throw error; }, 'Yeniden denemeye alındı; worker 1 dk içinde yürütecek.')} icon={<RotateCcw className="w-4 h-4" />}>Yeniden dene</Button>}
          {ap.status === 'approved' && ap.tool_key && !ap.executed_at && session.role === 'admin' && <Button variant="warn" loading={busy === 'exec'} onClick={() => run('exec', () => callOps('execute_approval', { approval_id: id }), 'Yürütüldü — sonucu aşağıda görün.')} icon={<Play className="w-4 h-4" />}>Şimdi yürüt</Button>}
          {ap.entity_type === 'content' && draft && ['approved', 'scheduled'].includes(draft.workflow_status) && session.role === 'admin' && (
            <Button variant="warn" loading={busy === 'publish'} onClick={() => run('publish', () => callOps('publish_content', { content_id: draft.id }), 'Platform API yanıtı kaydedildi.')} icon={<Send className="w-4 h-4" />}>Şimdi yayınla</Button>)}
          {open && <Button variant="ghost" loading={busy === 'schedule'} disabled={!when.date} onClick={() => decide('approve', { scheduled: true })} icon={<CalendarClock className="w-4 h-4" />}>Onayla + zamanla</Button>}
          {open && <Button variant="primary" loading={busy === 'approve'} onClick={() => decide('approve')} icon={<Check className="w-4 h-4" />}>Onayla</Button>}
        </>
      )}>
      {q.loading || !ap ? <StateView kind="loading" compact /> : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={approvalTone(ap.status)}>{approvalLabel(ap.status)}</Pill>
              <span className="text-[11px] font-mono text-ink-400">{ENTITY_LABEL[ap.entity_type]} · {ap.tool_key ?? 'içerik onayı'} · {fmtDateTime(ap.created_at)}</span>
            </div>
            {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Notice>}
            {ap.error && <Notice tone="error">{ap.error}</Notice>}
            {ap.summary && <p className="text-sm text-ink-300">{ap.summary}</p>}

            {draft && (
              <Panel title="İçerik" kicker={draft.primary_platform || draft.platform_targets.join(', ')} action={open && <Button variant="subtle" onClick={() => setEdit((v) => !v)} icon={<Pencil className="w-3.5 h-3.5" />}>{edit ? 'Kapat' : 'Düzenle'}</Button>}>
                {edit ? (
                  <div className="space-y-2">
                    <textarea className="ops-input min-h-[160px]" value={caption} onChange={(e) => setCaption(e.target.value)} />
                    <Button variant="primary" loading={busy === 'save'} onClick={() => run('save', async () => {
                      const { error } = await db().from('social_drafts').update({ caption, body: caption }).eq('id', draft.id); if (error) throw error;
                      await db().rpc('decide_approval', { p_id: id, p_decision: 'edit', p_note: 'Metin düzenlendi', p_scheduled_for: null, p_payload: null });
                    }, 'Metin güncellendi.')}>Kaydet</Button>
                  </div>
                ) : (
                  <>
                    {draft.headline && <div className="font-display text-base font-semibold text-ink-100">{draft.headline}</div>}
                    <p className="text-sm text-ink-200 whitespace-pre-line mt-1">{draft.caption || draft.body}</p>
                    {draft.hashtags?.length > 0 && <p className="text-xs text-sky-300 mt-2">{draft.hashtags.join(' ')}</p>}
                    {draft.image_brief && <p className="text-[11px] text-ink-400 mt-2">Görsel fikri: {draft.image_brief}</p>}
                  </>
                )}
                {!media.length && ['instagram'].includes(draft.primary_platform || '') && <div className="mt-3"><Notice tone="warn">Instagram API görselsiz gönderi kabul etmez. Gönderi Stüdyosu’nda tasarımı PNG olarak dışa aktarın.</Notice></div>}
              </Panel>
            )}

            {q.data?.lead && (
              <Panel title="Web başvurusu" kicker="lead_inbox">
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(q.data.lead).map(([k, v]) => <div key={k}><dt className="text-ink-500">{k}</dt><dd className="text-ink-200">{String(v ?? '—')}</dd></div>)}
                </dl>
                {Array.isArray(ap.payload?.duplicates) && (ap.payload.duplicates as unknown[]).length > 0 && <div className="mt-3"><Notice tone="warn">Olası tekrar kayıt: {(ap.payload.duplicates as Array<{ label: string; module: string }>).map((d) => `${d.label} (${d.module})`).join(', ')}</Notice></div>}
              </Panel>
            )}

            {!draft && !q.data?.lead && Object.keys(ap.payload || {}).length > 0 && (
              <Panel title="İşlem içeriği" kicker={ap.tool_key ?? ''}>
                <pre className="text-[11px] text-ink-300 whitespace-pre-wrap break-words font-mono bg-ink-950 rounded-xl p-3 max-h-72 overflow-auto ops-scroll">{JSON.stringify(ap.payload, null, 2)}</pre>
              </Panel>
            )}

            {result && (
              <Panel title="Yürütme sonucu" kicker={ap.executed_at ? fmtDateTime(ap.executed_at) : ''}>
                {typeof result.wa_link === 'string' && <a href={result.wa_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-300 underline"><ExternalLink className="w-4 h-4" /> WhatsApp’ta manuel gönder</a>}
                {typeof result.external_url === 'string' && <a href={result.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-300 underline"><ExternalLink className="w-4 h-4" /> Yayını aç</a>}
                {result.mode === 'manual' && <p className="text-xs text-amber-200 mt-2">{String(result.note ?? 'Manuel işlem gerekli.')}</p>}
                <pre className="mt-2 text-[11px] text-ink-400 whitespace-pre-wrap break-words font-mono bg-ink-950 rounded-xl p-3 max-h-56 overflow-auto ops-scroll">{JSON.stringify(result, null, 2)}</pre>
              </Panel>
            )}

            {open && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Yayın tarihi"><input type="date" className="ops-input" value={when.date} onChange={(e) => setWhen({ ...when, date: e.target.value })} /></Field>
                <Field label="Saat (İstanbul)"><input type="time" className="ops-input" value={when.time} onChange={(e) => setWhen({ ...when, time: e.target.value })} /></Field>
                <Field label="Karar notu"><input className="ops-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="İsteğe bağlı" /></Field>
              </div>
            )}
          </div>
          {draft && <div><PostPreview platform={draft.primary_platform || draft.platform_targets[0] || 'instagram'} caption={draft.caption || draft.body} hashtags={draft.hashtags} imageUrl={media[0] ?? null} headline={draft.headline} /></div>}
        </div>
      )}
    </Modal>
  );
}
