import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Wand2 } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { approvalLabel, approvalTone, dayKey, fmtDateTime, istanbulHour, istanbulToIso, PUBLISHABLE_PLATFORMS, platformMeta, timeOf } from '../lib/format';
import type { Draft, Publication } from '../lib/types';
import { useRouter } from '../session';
import { Button, cx, ErrorState, Field, Modal, Notice, Panel, Pill, PlatformBadge, StateView, Tabs } from '../ui';

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
    const [drafts, pubs] = await Promise.all([query, s.from('social_publications').select('id,content_id,platform,status,external_url,published_at,error,external_post_id,scheduled_at,created_at').order('created_at', { ascending: false }).limit(300)]);
    return { drafts: unwrap(drafts) as Draft[], pubs: unwrap(pubs) as Publication[] };
  }, { drafts: [] as Draft[], pubs: [] as Publication[] }, [view, range.start, range.end], ['social_drafts', 'social_publications']);

  const drafts = q.data.drafts.filter((d) => platform === 'all' || (d.primary_platform || d.platform_targets[0]) === platform);
  const pubByContent = useMemo(() => { const m = new Map<string, Publication>(); q.data.pubs.forEach((p) => p.content_id && !m.has(p.content_id) && m.set(p.content_id, p)); return m; }, [q.data.pubs]);
  const byDay = useMemo(() => { const m = new Map<string, Draft[]>(); drafts.forEach((d) => { if (!d.scheduled_at) return; const k = dayKey(d.scheduled_at); m.set(k, [...(m.get(k) || []), d]); }); return m; }, [drafts]);

  const moveToDay = async (id: string, key: string) => {
    const d = q.data.drafts.find((x) => x.id === id); if (!d) return;
    if (['published', 'processing'].includes(d.workflow_status)) { setMsg('Yayınlanmış içerik taşınamaz.'); return; }
    const iso = istanbulToIso(key, d.scheduled_at ? timeOf(d.scheduled_at) : '10:00');
    q.setData((cur) => ({ ...cur, drafts: cur.drafts.map((x) => (x.id === id ? { ...x, scheduled_at: iso } : x)) }));
    const { error } = await db().from('social_drafts').update({ scheduled_at: iso }).eq('id', id);
    if (!error && d.approval_request_id && ['pending_approval', 'scheduled', 'approved'].includes(d.workflow_status)) await db().from('approval_requests').update({ scheduled_for: iso }).eq('id', d.approval_request_id).in('status', ['pending_approval']);
    setMsg(error ? errorText(error) : `Tarih ${key} olarak güncellendi.`); q.reload();
  };
  const moveToHour = async (id: string, hour: number) => {
    const d = q.data.drafts.find((x) => x.id === id); if (!d) return;
    const iso = istanbulToIso(cursor, `${String(hour).padStart(2, '0')}:00`);
    const { error } = await db().from('social_drafts').update({ scheduled_at: iso }).eq('id', id);
    setMsg(error ? errorText(error) : `Saat ${String(hour).padStart(2, '0')}:00 olarak güncellendi.`); q.reload();
  };
  const moveToStatus = async (id: string, status: string) => {
    const d = q.data.drafts.find((x) => x.id === id); if (!d) return;
    if (d.workflow_status === 'draft' && status === 'pending_approval') {
      const { data, error } = await db().from('approval_requests').insert({ entity_type: 'content', entity_id: d.id, title: d.title, summary: `${platformMeta(d.primary_platform).name} · ${fmtDateTime(d.scheduled_at)}`, platform: d.primary_platform, scheduled_for: d.scheduled_at, status: 'pending_approval', payload: { content_id: d.id } }).select('id').single();
      if (!error) await db().from('social_drafts').update({ workflow_status: 'pending_approval', status: 'onay_bekliyor', approval_request_id: data.id }).eq('id', d.id);
      setMsg(error ? errorText(error) : 'Onaya gönderildi.'); q.reload(); return;
    }
    setMsg('Durum değişikliği onay akışı üzerinden yapılır (onayla / reddet / zamanla). Onay Akışı’nı kullanın.');
  };

  const Card = ({ d, compact = false }: { d: Draft; compact?: boolean }) => {
    const pub = pubByContent.get(d.id);
    return (
      <div draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', d.id); setDragging(d.id); }} onDragEnd={() => setDragging(null)}
        onClick={() => (d.approval_request_id && d.workflow_status !== 'draft' ? go('approvals', d.approval_request_id) : go('studio', d.id))}
        className={cx('group cursor-grab active:cursor-grabbing rounded-lg bg-ink-900 ring-1 ring-ink-700 hover:ring-brand-green/50 transition', compact ? 'px-1.5 py-1' : 'p-2.5', dragging === d.id && 'opacity-40')}>
        <div className="flex items-center gap-1.5">
          <PlatformBadge platform={d.primary_platform || d.platform_targets[0]} />
          <span className={cx('min-w-0 flex-1 truncate font-semibold text-ink-100', compact ? 'text-[10px]' : 'text-xs')}>{d.title}</span>
        </div>
        {!compact && <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-[10px] font-mono text-ink-500">{d.scheduled_at ? timeOf(d.scheduled_at) : 'zamansız'}</span>
          <Pill tone={approvalTone(d.workflow_status)}>{approvalLabel(d.workflow_status)}</Pill>
        </div>}
        {!compact && pub && <div className="mt-1.5 text-[10px] text-ink-400 truncate">{pub.status === 'published' ? <a onClick={(e) => e.stopPropagation()} href={pub.external_url ?? '#'} target="_blank" rel="noreferrer" className="text-emerald-700 underline">API: {pub.external_post_id}</a> : pub.error}</div>}
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
          <h2 className="font-display text-xl font-semibold text-ink-100">İçerik Planlama Merkezi</h2>
          <p className="text-xs text-ink-400">Sürükle-bırak ile tarih/saat değiştirin. Kanban’da taslağı “Onay bekliyor” sütununa bırakmak onay isteği açar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setPlanOpen(true)} icon={<Wand2 className="w-4 h-4" />}>30 günlük AI planı</Button>
          <Button variant="primary" onClick={() => go('studio')} icon={<Plus className="w-4 h-4" />}>Yeni gönderi</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <Tabs value={view} onChange={setView} items={[{ id: 'month', label: 'Ay' }, { id: 'week', label: 'Hafta' }, { id: 'day', label: 'Gün / Saat' }, { id: 'kanban', label: 'Kanban' }, { id: 'list', label: 'Liste' }]} />
        <div className="flex items-center gap-2">
          <select className="ops-input !w-auto !py-1.5 text-xs" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="all">Tüm platformlar</option>{PUBLISHABLE_PLATFORMS.map((p) => <option key={p} value={p}>{platformMeta(p).name}</option>)}
          </select>
          {(view === 'month' || view === 'week' || view === 'day') && <>
            <button onClick={() => step(-1)} className="p-2 rounded-lg ring-1 ring-ink-700 text-ink-300 hover:bg-ink-800"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCursor(today)} className="px-3 py-1.5 rounded-lg ring-1 ring-ink-700 text-xs text-ink-200 hover:bg-ink-800">Bugün</button>
            <button onClick={() => step(1)} className="p-2 rounded-lg ring-1 ring-ink-700 text-ink-300 hover:bg-ink-800"><ChevronRight className="w-4 h-4" /></button>
          </>}
        </div>
      </div>
      <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-brand-green" /><span className="font-display text-lg font-semibold text-ink-100 capitalize">{title}</span>{q.loading && <Loader2 className="w-4 h-4 animate-spin text-ink-400" />}</div>
      {msg && <Notice tone="info">{msg}</Notice>}
      {q.error && <ErrorState error={q.error} onRetry={q.reload} />}

      {view === 'month' && (
        <div className="ops-panel p-2 overflow-x-auto ops-scroll">
          <div className="grid grid-cols-7 min-w-[760px]">
            {WEEKDAYS.map((w) => <div key={w} className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-500">{w}</div>)}
            {Array.from({ length: 42 }).map((_, i) => {
              const key = addDays(range.start, i); const inMonth = key.slice(0, 7) === cursor.slice(0, 7); const items = byDay.get(key) || [];
              return (
                <div key={key} {...drop((id) => moveToDay(id, key))} className={cx('min-h-[112px] border border-ink-800/80 p-1.5 space-y-1 transition', inMonth ? 'bg-ink-900/30' : 'bg-ink-950/40 opacity-60', key === today && 'ring-1 ring-inset ring-brand-green/60', dragging && 'hover:bg-ink-800/60')}>
                  <div className="flex items-center justify-between"><button onClick={() => { setCursor(key); setView('day'); }} className={cx('text-[11px] font-mono', key === today ? 'text-brand-green font-bold' : 'text-ink-400 hover:text-ink-100')}>{Number(key.slice(8))}</button>{items.length > 2 && <span className="text-[9px] font-mono text-ink-500">+{items.length - 2}</span>}</div>
                  {items.slice(0, 2).map((d) => <Card key={d.id} d={d} compact />)}
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
              <div key={key} {...drop((id) => moveToDay(id, key))} className={cx('ops-panel !rounded-xl p-2 min-h-[220px] space-y-1.5', key === today && 'ring-1 ring-brand-green/60')}>
                <div className="flex items-baseline justify-between px-1"><span className="text-[10px] font-mono uppercase text-ink-500">{WEEKDAYS[i]}</span><span className="font-display text-sm text-ink-200">{Number(key.slice(8))}</span></div>
                {items.length === 0 ? <div className="text-[10px] text-ink-600 px-1 pt-2">Boş</div> : items.map((d) => <Card key={d.id} d={d} />)}
              </div>
            );
          })}
        </div>
      )}

      {view === 'day' && (
        <Panel pad={false} className="overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => {
            const hour = i + 6; const items = (byDay.get(cursor) || []).filter((d) => d.scheduled_at && istanbulHour(d.scheduled_at) === hour);
            return (
              <div key={hour} {...drop((id) => moveToHour(id, hour))} className="grid grid-cols-[64px_1fr] border-b border-ink-800 min-h-[56px] hover:bg-ink-850/60">
                <div className="px-3 py-2 text-[11px] font-mono text-ink-500 border-r border-ink-800">{String(hour).padStart(2, '0')}:00</div>
                <div className="p-1.5 flex flex-wrap gap-1.5">{items.map((d) => <div key={d.id} className="w-full sm:w-72"><Card d={d} /></div>)}</div>
              </div>
            );
          })}
        </Panel>
      )}

      {view === 'kanban' && (
        <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 overflow-x-auto ops-scroll pb-2">
          {KANBAN.map((col) => {
            const items = drafts.filter((d) => d.workflow_status === col.id || (col.id === 'failed' && ['failed', 'rejected', 'cancelled'].includes(d.workflow_status)) || (col.id === 'scheduled' && d.workflow_status === 'processing'));
            return (
              <div key={col.id} {...drop((id) => moveToStatus(id, col.id))} className="ops-panel !rounded-xl p-2.5 min-h-[300px]">
                <div className="flex items-center justify-between px-1 pb-2"><Pill tone={approvalTone(col.id)}>{col.label.toUpperCase()}</Pill><span className="font-mono text-[11px] text-ink-500">{items.length}</span></div>
                <div className="space-y-1.5">{items.map((d) => <Card key={d.id} d={d} />)}</div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'list' && (
        drafts.length === 0 ? <StateView kind="empty" message="Henüz içerik yok. Gönderi Stüdyosu’ndan başlayın." /> : (
          <div className="ops-panel overflow-x-auto ops-scroll">
            <table className="w-full text-xs min-w-[760px]">
              <thead><tr className="text-left text-[10px] font-mono uppercase tracking-wider text-ink-500 border-b border-ink-800">
                <th className="p-3">Platform</th><th className="p-3">Başlık</th><th className="p-3">Tarih</th><th className="p-3">Durum</th><th className="p-3">Yayın sonucu</th></tr></thead>
              <tbody>{drafts.map((d) => { const p = pubByContent.get(d.id); return (
                <tr key={d.id} onClick={() => go('studio', d.id)} className="border-b border-ink-800/60 hover:bg-ink-850 cursor-pointer">
                  <td className="p-3"><PlatformBadge platform={d.primary_platform || d.platform_targets[0]} /></td>
                  <td className="p-3 text-ink-100 font-semibold max-w-xs truncate">{d.title}</td>
                  <td className="p-3 font-mono text-ink-300">{fmtDateTime(d.scheduled_at)}</td>
                  <td className="p-3"><Pill tone={approvalTone(d.workflow_status)}>{approvalLabel(d.workflow_status)}</Pill></td>
                  <td className="p-3 text-ink-400 max-w-[220px] truncate">{p ? (p.status === 'published' ? `✓ ${p.external_post_id}` : p.error ?? p.status) : '—'}</td>
                </tr>); })}</tbody>
            </table>
          </div>
        )
      )}
      {planOpen && <MonthPlanModal onClose={() => setPlanOpen(false)} onDone={(t) => { setPlanOpen(false); setMsg(t); }} />}
    </div>
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
      onDone(`${month} için 30 günlük plan görevi kuyruğa alındı. Content Bot haftalık parçalar halinde üretir; her içerik onay kuyruğuna düşer. (AI anahtarı yoksa görev ENGELLENDİ olarak raporlanır.)`);
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
        <Notice tone="info">Uzun AI işi istek ömrüne bağlı değildir: görev kuyruğa alınır, worker (pg_cron, dakikada bir) haftalık parçalar halinde işler ve kaldığı yerden devam eder.</Notice>
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}
