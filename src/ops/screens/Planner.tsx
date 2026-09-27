import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Edit3, ExternalLink, Film, Image as ImageIcon, Loader2, Plus, Trash2, Wand2, X } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { approvalLabel, approvalTone, dayKey, fmtDateTime, istanbulHour, istanbulToIso, PUBLISHABLE_PLATFORMS, platformMeta, timeOf } from '../lib/format';
import type { Draft, Publication } from '../lib/types';
import { useRouter } from '../session';
import { Button, cx, ErrorState, Field, Modal, Notice, Panel, Pill, PlatformBadge, StateView, Tabs } from '../ui';
import { DEMO_REALISTIC_DRAFTS, isDemoMode } from '../lib/demoData';

type View = 'month' | 'week' | 'day' | 'kanban' | 'list';
const KANBAN: Array<{ id: string; label: string }> = [
  { id: 'draft', label: 'Taslak' }, { id: 'pending_approval', label: 'Onay bekliyor' }, { id: 'approved', label: 'Onaylandı' },
  { id: 'scheduled', label: 'Zamanlandı' }, { id: 'published', label: 'Yayınlandı' }, { id: 'failed', label: 'Başarısız' },
];
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function addDays(key: string, n: number) { const d = new Date(`${key}T12:00:00+03:00`); d.setUTCDate(d.getUTCDate() + n); return dayKey(d); }
function mondayOf(key: string) { const d = new Date(`${key}T12:00:00+03:00`); const wd = (d.getUTCDay() + 6) % 7; return addDays(key, -wd); }

export function PlannerScreen() {
  const { go } = useRouter();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(dayKey(new Date()));
  const [platform, setPlatform] = useState<string>('all');
  const [planOpen, setPlanOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft | null>(null);

  const range = useMemo(() => {
    if (view === 'month') { const first = `${cursor.slice(0, 7)}-01`; const start = mondayOf(first); return { start, end: addDays(start, 42) }; }
    if (view === 'week') { const start = mondayOf(cursor); return { start, end: addDays(start, 7) }; }
    if (view === 'day') return { start: cursor, end: addDays(cursor, 1) };
    return { start: addDays(cursor, -30), end: addDays(cursor, 60) };
  }, [view, cursor]);

  const q = useQuery(async () => {
    const s = db();
    let query = s.from('social_drafts').select('*').neq('archive_status', 'archived').order('scheduled_at', { ascending: true, nullsFirst: false }).limit(500);
    if (view !== 'kanban' && view !== 'list') query = query.gte('scheduled_at', istanbulToIso(range.start, '00:00')).lt('scheduled_at', istanbulToIso(range.end, '00:00'));
    const [draftsRes, pubsRes] = await Promise.all([
      query,
      s.from('social_publications').select('id,content_id,platform,status,external_url,published_at,error,external_post_id,scheduled_at,created_at').order('created_at', { ascending: false }).limit(300)
    ]);
    let drafts = unwrap(draftsRes) as Draft[];
    const pubs = unwrap(pubsRes) as Publication[];
    if ((!drafts || drafts.length === 0) && isDemoMode()) {
      drafts = DEMO_REALISTIC_DRAFTS as unknown as Draft[];
    }
    return { drafts, pubs };
  }, { drafts: [] as Draft[], pubs: [] as Publication[] }, [view, range.start, range.end], ['social_drafts', 'social_publications']);

  const drafts = (q.data.drafts.length ? q.data.drafts : isDemoMode() ? (DEMO_REALISTIC_DRAFTS as unknown as Draft[]) : [])
    .filter((d) => platform === 'all' || (d.primary_platform || d.platform_targets?.[0]) === platform);

  const pubByContent = useMemo(() => { const m = new Map<string, Publication>(); q.data.pubs.forEach((p) => p.content_id && !m.has(p.content_id) && m.set(p.content_id, p)); return m; }, [q.data.pubs]);
  const byDay = useMemo(() => { const m = new Map<string, Draft[]>(); drafts.forEach((d) => { if (!d.scheduled_at) return; const k = dayKey(d.scheduled_at); m.set(k, [...(m.get(k) || []), d]); }); return m; }, [drafts]);

  const moveToDay = async (id: string, key: string) => {
    const d = drafts.find((x) => x.id === id); if (!d) return;
    if (['published', 'processing'].includes(d.workflow_status)) { setMsg('Yayınlanmış içerik taşınamaz.'); return; }
    const iso = istanbulToIso(key, d.scheduled_at ? timeOf(d.scheduled_at) : '10:00');
    q.setData((cur) => ({ ...cur, drafts: cur.drafts.map((x) => (x.id === id ? { ...x, scheduled_at: iso } : x)) }));
    const { error } = await db().from('social_drafts').update({ scheduled_at: iso }).eq('id', id);
    if (!error && d.approval_request_id && ['pending_approval', 'scheduled', 'approved'].includes(d.workflow_status)) await db().from('approval_requests').update({ scheduled_for: iso }).eq('id', d.approval_request_id).in('status', ['pending_approval']);
    setMsg(error ? errorText(error) : `Tarih ${key} olarak güncellendi.`); q.reload();
  };

  const moveToHour = async (id: string, hour: number) => {
    const d = drafts.find((x) => x.id === id); if (!d) return;
    const iso = istanbulToIso(cursor, `${String(hour).padStart(2, '0')}:00`);
    const { error } = await db().from('social_drafts').update({ scheduled_at: iso }).eq('id', id);
    setMsg(error ? errorText(error) : `Saat ${String(hour).padStart(2, '0')}:00 olarak güncellendi.`); q.reload();
  };

  const moveToStatus = async (id: string, status: string) => {
    const d = drafts.find((x) => x.id === id); if (!d) return;
    if (d.workflow_status === 'draft' && status === 'pending_approval') {
      const { data, error } = await db().from('approval_requests').insert({ entity_type: 'content', entity_id: d.id, title: d.title, summary: `${platformMeta(d.primary_platform).name} · ${fmtDateTime(d.scheduled_at)}`, platform: d.primary_platform, scheduled_for: d.scheduled_at, status: 'pending_approval', payload: { content_id: d.id } }).select('id').single();
      if (!error) await db().from('social_drafts').update({ workflow_status: 'pending_approval', status: 'onay_bekliyor', approval_request_id: data.id }).eq('id', d.id);
      setMsg(error ? errorText(error) : 'Onaya gönderildi.'); q.reload(); return;
    }
    setMsg('Durum değişikliği onay akışı üzerinden yapılır (onayla / reddet / zamanla).');
  };

  const createForDay = (dayStr: string) => {
    const newDraft: Partial<Draft> = {
      id: `draft-new-${Date.now()}`,
      title: 'Genel İnşaat / Manitou Gönderisi',
      caption: 'İstanbul Avrupa ve Anadolu yakası şantiyeleri için profesyonel inşaat ve operatörlü Manitou kiralama hizmeti.',
      headline: 'EMBAY YAPI & ŞAHİN MANİTOU',
      hashtags: ['#embayyapı', '#şahinmanitou', '#şantiye'],
      cta: '0531 436 29 04',
      primary_platform: 'instagram',
      platform_targets: ['instagram'],
      format: 'instagram_post',
      workflow_status: 'draft',
      status: 'taslak',
      scheduled_at: istanbulToIso(dayStr, '10:00'),
      media_urls: ['/brand/embay-kapak.jpg'],
    };
    setEditDraft(newDraft as Draft);
  };

  const handleSaveDraft = async (updated: Draft) => {
    try {
      if (updated.id.startsWith('draft-new-')) {
        const { error } = await db().from('social_drafts').insert({
          title: updated.title,
          caption: updated.caption,
          body: updated.caption,
          headline: updated.headline,
          cta: updated.cta,
          hashtags: updated.hashtags,
          primary_platform: updated.primary_platform,
          platform_targets: updated.platform_targets || [updated.primary_platform],
          format: updated.format,
          workflow_status: updated.workflow_status || 'draft',
          status: updated.workflow_status === 'pending_approval' ? 'onay_bekliyor' : 'taslak',
          scheduled_at: updated.scheduled_at,
          media_urls: updated.media_urls || [],
          video_url: updated.video_url || null,
        });
        if (error) console.warn('Save draft insert fallback:', error);
      } else {
        const { error } = await db().from('social_drafts').update({
          title: updated.title,
          caption: updated.caption,
          body: updated.caption,
          headline: updated.headline,
          cta: updated.cta,
          hashtags: updated.hashtags,
          primary_platform: updated.primary_platform,
          format: updated.format,
          workflow_status: updated.workflow_status,
          scheduled_at: updated.scheduled_at,
          media_urls: updated.media_urls,
          video_url: updated.video_url,
        }).eq('id', updated.id);
        if (error) console.warn('Save draft update fallback:', error);
      }
      setMsg('Gönderi içeriği ve yayın saati başarıyla güncellendi.');
      setEditDraft(null);
      q.reload();
    } catch (e) {
      setMsg(errorText(e));
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Bu gönderiyi takvimden kaldırmak istediğinize emin misiniz?')) return;
    try {
      await db().from('social_drafts').delete().eq('id', id);
      setMsg('Gönderi takvimden silindi.');
      setEditDraft(null);
      q.reload();
    } catch (e) {
      setMsg(errorText(e));
    }
  };

  const Card = ({ d, compact = false }: { d: Draft; compact?: boolean }) => {
    const pub = pubByContent.get(d.id);
    return (
      <div
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', d.id); setDragging(d.id); }}
        onDragEnd={() => setDragging(null)}
        onClick={() => setEditDraft(d)}
        className={cx(
          'group cursor-pointer rounded-xl bg-white border border-ink-700/80 hover:border-brand-green hover:shadow-md transition relative',
          compact ? 'px-2 py-1.5' : 'p-3',
          dragging === d.id && 'opacity-40'
        )}
      >
        <div className="flex items-center gap-1.5">
          <PlatformBadge platform={d.primary_platform || d.platform_targets?.[0]} />
          <span className={cx('min-w-0 flex-1 truncate font-semibold text-ink-100', compact ? 'text-[11px]' : 'text-xs')}>{d.title}</span>
          <Edit3 className="w-3 h-3 text-ink-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
        </div>
        {!compact && (
          <>
            {d.caption && <p className="text-[11px] text-ink-400 line-clamp-2 mt-1">{d.caption}</p>}
            <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-ink-800">
              <span className="text-[10px] font-mono text-ink-500 font-semibold">{d.scheduled_at ? timeOf(d.scheduled_at) : 'zamansız'}</span>
              <Pill tone={approvalTone(d.workflow_status)}>{approvalLabel(d.workflow_status)}</Pill>
            </div>
          </>
        )}
        {!compact && pub && (
          <div className="mt-1 text-[10px] text-ink-400 truncate">
            {pub.status === 'published' ? <a onClick={(e) => e.stopPropagation()} href={pub.external_url ?? '#'} target="_blank" rel="noreferrer" className="text-emerald-700 underline font-medium">✓ Yayınlandı</a> : pub.error}
          </div>
        )}
      </div>
    );
  };

  const drop = (fn: (id: string) => void) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) fn(id); },
  });

  const title = view === 'month' ? new Date(`${cursor}T12:00:00+03:00`).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    : view === 'week' ? `${range.start} — ${addDays(range.end, -1)}` : view === 'day' ? new Date(`${cursor}T12:00:00+03:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Tüm içerikler';
  const step = (n: number) => setCursor(view === 'month' ? dayKey(new Date(Date.UTC(+cursor.slice(0, 4), +cursor.slice(5, 7) - 1 + n, 15))) : addDays(cursor, view === 'week' ? 7 * n : n));
  const today = dayKey(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand-green" /> İçerik & Yayın Takvimi
          </h2>
          <p className="text-xs text-ink-400">
            Tıklayarak gönderi metnini, görselini veya saatini doğrudan değiştirin. İstediğiniz güne <b>+</b> ile anında yeni içerik ekleyin veya sürükleyip bırakın.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setPlanOpen(true)} icon={<Wand2 className="w-4 h-4" />}>30 günlük AI planı</Button>
          <Button variant="primary" onClick={() => createForDay(today)} icon={<Plus className="w-4 h-4" />}>Hızlı gönderi ekle</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <Tabs value={view} onChange={setView} items={[{ id: 'month', label: 'Ay' }, { id: 'week', label: 'Hafta' }, { id: 'day', label: 'Gün / Saat' }, { id: 'kanban', label: 'Kanban' }, { id: 'list', label: 'Liste' }]} />
        <div className="flex items-center gap-2">
          <select className="ops-input !w-auto !py-1.5 text-xs font-semibold" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="all">Tüm platformlar ({drafts.length})</option>
            {PUBLISHABLE_PLATFORMS.map((p) => <option key={p} value={p}>{platformMeta(p).name}</option>)}
          </select>
          {(view === 'month' || view === 'week' || view === 'day') && <>
            <button onClick={() => step(-1)} className="p-2 rounded-lg border border-ink-700 text-ink-300 hover:bg-ink-800"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCursor(today)} className="px-3 py-1.5 rounded-lg border border-ink-700 text-xs text-ink-200 hover:bg-ink-800 font-semibold">Bugün</button>
            <button onClick={() => step(1)} className="p-2 rounded-lg border border-ink-700 text-ink-300 hover:bg-ink-800"><ChevronRight className="w-4 h-4" /></button>
          </>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-display text-lg font-bold text-ink-100 capitalize">{title}</span>
        {q.loading && <Loader2 className="w-4 h-4 animate-spin text-brand-green" />}
      </div>
      {msg && <Notice tone="info">{msg}</Notice>}
      {q.error && <ErrorState error={q.error} onRetry={q.reload} />}

      {view === 'month' && (
        <div className="ops-panel p-2 overflow-x-auto ops-scroll">
          <div className="grid grid-cols-7 min-w-[760px]">
            {WEEKDAYS.map((w) => <div key={w} className="px-2 py-2 text-center text-[11px] font-mono uppercase tracking-wider font-bold text-ink-400 bg-ink-950/60 rounded-lg m-0.5">{w}</div>)}
            {Array.from({ length: 42 }).map((_, i) => {
              const key = addDays(range.start, i);
              const inMonth = key.slice(0, 7) === cursor.slice(0, 7);
              const items = byDay.get(key) || [];
              const isToday = key === today;
              return (
                <div
                  key={key}
                  {...drop((id) => moveToDay(id, key))}
                  className={cx(
                    'group/day min-h-[120px] border border-ink-800/80 p-1.5 space-y-1.5 transition rounded-xl m-0.5 relative',
                    inMonth ? 'bg-white' : 'bg-ink-950/40 opacity-50',
                    isToday && 'ring-2 ring-brand-green bg-emerald-50/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <button onClick={() => { setCursor(key); setView('day'); }} className={cx('text-xs font-mono font-bold px-1 rounded', isToday ? 'text-brand-green' : 'text-ink-300')}>
                      {Number(key.slice(8))}
                    </button>
                    <button
                      type="button"
                      title={`${key} için gönderi ekle`}
                      onClick={() => createForDay(key)}
                      className="opacity-0 group-hover/day:opacity-100 p-1 rounded hover:bg-emerald-100 text-brand-green transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {items.slice(0, 2).map((d) => <Card key={d.id} d={d} compact />)}
                  {items.length > 2 && (
                    <button onClick={() => { setCursor(key); setView('day'); }} className="w-full text-left text-[10px] font-mono text-brand-green font-semibold hover:underline">
                      +{items.length - 2} gönderi daha
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const key = addDays(range.start, i); const items = byDay.get(key) || [];
            return (
              <div key={key} {...drop((id) => moveToDay(id, key))} className={cx('ops-panel p-2.5 min-h-[260px] space-y-2', key === today && 'ring-2 ring-brand-green bg-emerald-50/20')}>
                <div className="flex items-baseline justify-between px-1 border-b border-ink-800 pb-1.5">
                  <span className="text-[11px] font-mono uppercase font-bold text-ink-400">{WEEKDAYS[i]}</span>
                  <span className="font-display text-sm font-bold text-ink-100">{Number(key.slice(8))}</span>
                  <button type="button" onClick={() => createForDay(key)} className="text-brand-green hover:bg-emerald-100 p-1 rounded"><Plus className="w-3 h-3" /></button>
                </div>
                {items.length === 0 ? <div className="text-[11px] text-ink-500 px-1 pt-4 text-center">Planlı gönderi yok</div> : items.map((d) => <Card key={d.id} d={d} />)}
              </div>
            );
          })}
        </div>
      )}

      {view === 'day' && (
        <Panel pad={false} className="overflow-hidden">
          <div className="p-3 bg-ink-950 border-b border-ink-800 flex items-center justify-between">
            <span className="font-bold text-sm text-ink-100">{cursor} Günü Planı</span>
            <Button variant="primary" onClick={() => createForDay(cursor)} icon={<Plus className="w-4 h-4" />}>Bu güne gönderi ekle</Button>
          </div>
          {Array.from({ length: 18 }).map((_, i) => {
            const hour = i + 6; const items = (byDay.get(cursor) || []).filter((d) => d.scheduled_at && istanbulHour(d.scheduled_at) === hour);
            return (
              <div key={hour} {...drop((id) => moveToHour(id, hour))} className="grid grid-cols-[72px_1fr] border-b border-ink-800 min-h-[64px] hover:bg-emerald-50/30">
                <div className="px-3 py-2 text-xs font-mono font-bold text-ink-400 border-r border-ink-800 flex items-center justify-center">{String(hour).padStart(2, '0')}:00</div>
                <div className="p-2 flex flex-wrap gap-2 items-center">
                  {items.map((d) => <div key={d.id} className="w-full sm:w-80"><Card d={d} /></div>)}
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      {view === 'kanban' && (
        <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto ops-scroll pb-2">
          {KANBAN.map((col) => {
            const items = drafts.filter((d) => d.workflow_status === col.id || (col.id === 'failed' && ['failed', 'rejected', 'cancelled'].includes(d.workflow_status)) || (col.id === 'scheduled' && d.workflow_status === 'processing'));
            return (
              <div key={col.id} {...drop((id) => moveToStatus(id, col.id))} className="ops-panel p-3 min-h-[360px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between px-1 pb-3 border-b border-ink-800">
                    <Pill tone={approvalTone(col.id)}>{col.label.toUpperCase()}</Pill>
                    <span className="font-mono text-xs font-bold text-ink-500">{items.length}</span>
                  </div>
                  <div className="space-y-2 mt-2">{items.map((d) => <Card key={d.id} d={d} />)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'list' && (
        drafts.length === 0 ? <StateView kind="empty" message="Henüz içerik yok. Gönderi Stüdyosu’ndan başlayın." /> : (
          <div className="ops-panel overflow-x-auto ops-scroll">
            <table className="w-full text-xs min-w-[760px]">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-ink-500 border-b border-ink-800 bg-ink-950">
                  <th className="p-3">Platform</th><th className="p-3">Başlık & İçerik</th><th className="p-3">Tarih / Saat</th><th className="p-3">Durum</th><th className="p-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => {
                  const pub = pubByContent.get(d.id);
                  return (
                    <tr key={d.id} onClick={() => setEditDraft(d)} className="border-b border-ink-800/60 hover:bg-emerald-50/40 cursor-pointer">
                      <td className="p-3"><PlatformBadge platform={d.primary_platform || d.platform_targets?.[0]} /></td>
                      <td className="p-3 text-ink-100 font-semibold max-w-sm">
                        <div className="truncate">{d.title}</div>
                        {d.caption && <div className="text-[11px] text-ink-400 truncate">{d.caption}</div>}
                      </td>
                      <td className="p-3 font-mono text-ink-300 font-semibold">{fmtDateTime(d.scheduled_at)}</td>
                      <td className="p-3"><Pill tone={approvalTone(d.workflow_status)}>{approvalLabel(d.workflow_status)}</Pill></td>
                      <td className="p-3 text-right">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditDraft(d); }} className="ops-chip !py-1 !px-2 mr-1">Düzenle</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Doğrudan Gönderi Düzenleme / Değiştirme Modalı */}
      {editDraft && (
        <DraftEditModal
          draft={editDraft}
          onClose={() => setEditDraft(null)}
          onSave={handleSaveDraft}
          onDelete={handleDeleteDraft}
          onOpenStudio={() => { const id = editDraft.id; setEditDraft(null); go('studio', id); }}
        />
      )}

      {planOpen && <MonthPlanModal onClose={() => setPlanOpen(false)} onDone={(t) => { setPlanOpen(false); setMsg(t); }} />}
    </div>
  );
}

interface DraftEditModalProps {
  draft: Draft;
  onClose: () => void;
  onSave: (d: Draft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenStudio: () => void;
}

function DraftEditModal({ draft, onClose, onSave, onDelete, onOpenStudio }: DraftEditModalProps) {
  const [title, setTitle] = useState(draft.title || '');
  const [headline, setHeadline] = useState(draft.headline || '');
  const [caption, setCaption] = useState(draft.caption || draft.body || '');
  const [hashtagsStr, setHashtagsStr] = useState((draft.hashtags || []).join(' '));
  const [cta, setCta] = useState(draft.cta || '');
  const [platform, setPlatform] = useState(draft.primary_platform || 'instagram');
  const [format, setFormat] = useState(draft.format || 'instagram_post');
  const [workflowStatus, setWorkflowStatus] = useState(draft.workflow_status || 'draft');
  const [date, setDate] = useState(draft.scheduled_at ? dayKey(draft.scheduled_at) : dayKey(new Date()));
  const [time, setTime] = useState(draft.scheduled_at ? timeOf(draft.scheduled_at) : '10:00');
  const [mediaUrl, setMediaUrl] = useState(draft.media_urls?.[0] || draft.video_url || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const tags = hashtagsStr.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean).map((t) => (t.startsWith('#') ? t : `#${t}`));
    const iso = date ? istanbulToIso(date, time) : null;
    await onSave({
      ...draft,
      title,
      headline,
      caption,
      body: caption,
      hashtags: tags,
      cta,
      primary_platform: platform,
      platform_targets: [platform],
      format,
      workflow_status: workflowStatus as any,
      scheduled_at: iso,
      media_urls: mediaUrl ? [mediaUrl] : [],
      video_url: format.includes('reel') || format.includes('video') ? mediaUrl : draft.video_url,
    });
    setBusy(false);
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-brand-green" />
          <span>Gönderi Değiştir & Düzenle</span>
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="danger" onClick={() => onDelete(draft.id)} icon={<Trash2 className="w-4 h-4" />}>
            Sil
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onOpenStudio} icon={<ExternalLink className="w-4 h-4" />}>
              Stüdyoda Gelişmiş Aç
            </Button>
            <Button variant="primary" loading={busy} onClick={save}>
              Değişiklikleri Kaydet
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Platform">
            <select className="ops-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PUBLISHABLE_PLATFORMS.map((p) => <option key={p} value={p}>{platformMeta(p).name}</option>)}
            </select>
          </Field>
          <Field label="Format">
            <select className="ops-input" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="instagram_post">Instagram Gönderisi (Kare)</option>
              <option value="instagram_reel">Instagram Reels (Dikey Video)</option>
              <option value="instagram_story">Instagram Hikaye</option>
              <option value="facebook_post">Facebook Gönderisi</option>
              <option value="youtube_short">YouTube Shorts</option>
              <option value="linkedin_post">LinkedIn Gönderisi</option>
            </select>
          </Field>
        </div>

        <Field label="Başlık">
          <input className="ops-input font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label="Görsel Üstü Başlık (Headline)">
          <input className="ops-input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Örn: 150 GÜNDE VİLLA İNŞAATI" />
        </Field>

        <Field label="Gönderi Metni (Caption)">
          <textarea className="ops-input min-h-[110px]" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Hashtag'ler">
            <input className="ops-input" value={hashtagsStr} onChange={(e) => setHashtagsStr(e.target.value)} />
          </Field>
          <Field label="Harekete Geçirici Mesaj (CTA)">
            <input className="ops-input" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="0531 436 29 04" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Yayın Tarihi">
            <input type="date" className="ops-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Saat">
            <input type="time" className="ops-input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Yayın Durumu">
            <select className="ops-input font-semibold" value={workflowStatus} onChange={(e) => setWorkflowStatus(e.target.value)}>
              <option value="draft">Taslak (DRAFT)</option>
              <option value="pending_approval">Onay Bekliyor</option>
              <option value="approved">Onaylandı</option>
              <option value="scheduled">Zamanlandı</option>
              <option value="published">Yayınlandı</option>
            </select>
          </Field>
        </div>

          <Field label="Medya URL (Görsel veya Video)">
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="ops-input flex-1 font-mono text-xs" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="/brand/embay-kapak.jpg veya video url" />
            <select
              className="ops-input !w-auto text-xs"
              onChange={(e) => e.target.value && setMediaUrl(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Havuzdan Seç...</option>
              <option value="/brand/video/embay-150-gunde-villa-kapak.jpg">Villa Kapak Görseli</option>
              <option value="/brand/embay-kapak.jpg">Embay Kurumsal Kapak</option>
              <option value="/brand/video/embay-150-gunde-villa.mp4">Villa Reels Videosu</option>
              <option value="/reels/82d879bd-1f6c-4cb4-844f-8667ac972bfb.jpg">Manitou Kapak</option>
              <option value="/reels/7e80a3ff-ef45-4e4d-925c-c8f8c78222a7.jpg">Kalıp & Demir Görseli</option>
            </select>
            <a
              href="https://www.canva.com/create/instagram-posts/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-semibold shrink-0 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Canva ile Tasarla
            </a>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function MonthPlanModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const next = new Date(); next.setMonth(next.getMonth() + 1);
  const [month, setMonth] = useState(dayKey(next).slice(0, 7));
  const [goal, setGoal] = useState('Avrupa Yakası şantiyelerinden Manitou kiralama talebi ve kentsel dönüşüm ön görüşmesi toplamak');
  const [platforms, setPlatforms] = useState<string[]>(['instagram', 'facebook']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const start = async () => {
    setBusy(true); setErr(null);
    try {
      await callOps('plan_month', { month, goal, platforms });
      onDone(`${month} için 30 günlük plan görevi kuyruğa alındı.`);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="30 günlük AI içerik planı" footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} onClick={start} icon={<Wand2 className="w-4 h-4" />}>Planı başlat</Button></>}>
      <div className="space-y-3">
        <Field label="Ay"><input type="month" className="ops-input" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        <Field label="Aylık hedef"><textarea className="ops-input min-h-[80px]" value={goal} onChange={(e) => setGoal(e.target.value)} /></Field>
        <Field label="Platformlar">
          <div className="flex flex-wrap gap-1.5">{['instagram', 'facebook', 'linkedin', 'google_business', 'x'].map((p) => (
            <button key={p} onClick={() => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))} className={cx('flex items-center gap-1.5 rounded-lg px-2 py-1 ring-1 text-[11px]', platforms.includes(p) ? 'ring-brand-green bg-ink-750 text-ink-100' : 'ring-ink-700 text-ink-400')}><PlatformBadge platform={p} />{platformMeta(p).name}</button>
          ))}</div>
        </Field>
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}
