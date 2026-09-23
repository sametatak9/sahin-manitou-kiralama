// Otomatik (zamanlanmış) bot görevleri: ör. İhale alarmı her sabah kendiliğinden çalışır, yalnızca YENİ kayıtları raporlar.
import { useState } from 'react';
import { AlarmClock, Play, Plus, Trash2 } from 'lucide-react';
import { callMissions, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import type { Bot } from '../lib/types';
import { useSession } from '../session';
import { Button, cx, Field, Modal, Notice, Pill, SavedStamp, StateView } from '../ui';
import { MissionDetail } from './Missions';

interface Schedule {
  id: string; bot_id: string | null; title: string; goal: string; search_for: string | null; report_spec: string | null; target_url: string | null;
  model: string | null; duration_minutes: number; run_hour: number; weekdays: number[]; only_new: boolean; enabled: boolean;
  last_run_at: string | null; last_mission_id: string | null; updated_at: string;
}
const DAYS = [[1, 'Pzt'], [2, 'Sal'], [3, 'Çar'], [4, 'Per'], [5, 'Cum'], [6, 'Cmt'], [7, 'Paz']] as const;
const TEMPLATES = [
  { title: 'Müşteri keşfi — günlük', duration_minutes: 20, run_hour: 9, goal: 'İstanbul ve çevresinde yapı işi yaptıracak farklı kurum ve kişileri bul: müteahhit ilanları, prefabrik/hobi bahçesi/bina yapım ilanları, yeni şantiye ve kentsel dönüşüm duyuruları. Yalnızca herkese açık kurumsal bilgiler; her kayıt ayrı bulgu, kaynak linkiyle.', search_for: 'müteahhit, kentsel dönüşüm, şantiye, prefabrik, yapı ilanı', report_spec: 'Müşteri listesi: kurum, talep, konum, tarih, kurumsal iletişim, link' },
  { title: 'Rakip takibi — haftalık', duration_minutes: 10, run_hour: 10, weekdays: [1], goal: 'İstanbul Avrupa Yakası’nda Manitou / teleskopik yükleyici kiralama yapan firmaların yeni kampanya, fiyat duyurusu ve hizmetlerini bul.', search_for: 'manitou kiralama, telehandler kiralama, kampanya', report_spec: 'Rakip değişiklikleri listesi' },
];

function nextRunText(s: Schedule) {
  if (!s.enabled) return 'Kapalı';
  const names = DAYS.filter(([d]) => s.weekdays.includes(d)).map(([, n]) => n).join(', ');
  return `${names || 'hiçbir gün'} · saat ${String(s.run_hour).padStart(2, '0')}:00`;
}

function ScheduleCard({ s, bots, onChanged, onOpen }: { s: Schedule; bots: Bot[]; onChanged: () => void; onOpen: (id: string) => void }) {
  const session = useSession();
  const [f, setF] = useState({ enabled: s.enabled, run_hour: s.run_hour, weekdays: s.weekdays, duration_minutes: s.duration_minutes });
  const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null); const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirty = f.enabled !== s.enabled || f.run_hour !== s.run_hour || f.duration_minutes !== s.duration_minutes || f.weekdays.join() !== s.weekdays.join();
  const save = async (patch = f) => {
    setBusy('save'); setErr(null);
    const { data, error } = await db().from('mission_schedules').update(patch).eq('id', s.id).select('updated_at').single();
    setBusy(null); if (error) setErr(errorText(error)); else { setSavedAt(data.updated_at); onChanged(); }
  };
  const runNow = async () => {
    setBusy('run'); setErr(null);
    try {
      const r = await callMissions<{ mission_id: string }>('mission_start', { bot_id: s.bot_id, title: `${s.title} · elle`, goal: s.goal, target_url: s.target_url ?? '', search_for: s.search_for ?? '', report_spec: s.report_spec ?? '', duration_minutes: s.duration_minutes, model: s.model, schedule_id: s.id });
      onOpen(r.mission_id); onChanged();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  };
  const remove = async () => {
    if (!window.confirm(`“${s.title}” otomatik görevi silinsin mi? Geçmiş raporlar kalır.`)) return;
    setBusy('del'); const { error } = await db().from('mission_schedules').delete().eq('id', s.id); setBusy(null);
    if (error) setErr(errorText(error)); else onChanged();
  };
  return (
    <div className="ops-panel !rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center', f.enabled ? 'bg-brand-green text-white' : 'bg-ink-800 text-ink-400')}><AlarmClock className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink-100">{s.title}</div>
          <div className="text-[11px] text-ink-400">{bots.find((b) => b.id === s.bot_id)?.name ?? 'Genel araştırma'} · {nextRunText(s)} · {s.duration_minutes} dk{s.only_new ? ' · yalnızca yeni kayıtlar' : ''}</div>
          <div className="text-[11px] text-ink-500">Son çalışma: {s.last_run_at ? fmtDateTime(s.last_run_at) : 'henüz yok'}{s.last_mission_id && <> · <button type="button" className="underline text-brand-green" onClick={() => onOpen(s.last_mission_id!)}>son raporu aç</button></>}</div>
        </div>
        <Pill tone={f.enabled ? 'go' : 'idle'}>{f.enabled ? 'AÇIK' : 'KAPALI'}</Pill>
      </div>
      <p className="text-xs text-ink-300 line-clamp-2">{s.goal}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Çalışma saati (İstanbul)"><select className="ops-input" value={f.run_hour} onChange={(e) => setF({ ...f, run_hour: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></Field>
        <Field label="Süre"><select className="ops-input" value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: Number(e.target.value) })}>{[5, 10, 15, 20, 30, 60].map((d) => <option key={d} value={d}>{d} dakika</option>)}</select></Field>
        <Field label="Durum"><button type="button" onClick={() => setF({ ...f, enabled: !f.enabled })} className={cx('w-full rounded-xl py-2 text-xs font-semibold ring-1', f.enabled ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'ring-ink-700 text-ink-300')}>{f.enabled ? 'Açık — kapatmak için dokun' : 'Kapalı — açmak için dokun'}</button></Field>
      </div>
      <div className="flex flex-wrap gap-1.5">{DAYS.map(([d, n]) => {
        const on = f.weekdays.includes(d);
        return <button key={d} type="button" onClick={() => setF({ ...f, weekdays: on ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort() })} className={cx('rounded-lg px-2.5 py-1 text-xs font-semibold ring-1', on ? 'bg-brand-green text-white ring-brand-green' : 'ring-ink-700 text-ink-400')}>{n}</button>;
      })}</div>
      {err && <Notice tone="error">{err}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={!dirty} loading={busy === 'save'} onClick={() => save()}>Kaydet</Button>
        <Button variant="ghost" loading={busy === 'run'} onClick={runNow} icon={<Play className="w-4 h-4" />}>Şimdi çalıştır</Button>
        {session.role === 'admin' && <Button variant="ghost" loading={busy === 'del'} onClick={remove} icon={<Trash2 className="w-4 h-4" />}>Sil</Button>}
        <SavedStamp at={savedAt} />
      </div>
    </div>
  );
}

function NewSchedule({ bots, onClose, onSaved }: { bots: Bot[]; onClose: () => void; onSaved: () => void }) {
  const session = useSession();
  const [f, setF] = useState({ title: '', goal: '', search_for: '', report_spec: '', bot_id: '', run_hour: 9, duration_minutes: 10, weekdays: [1, 2, 3, 4, 5] as number[] });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const { error } = await db().from('mission_schedules').insert({ ...f, bot_id: f.bot_id || null, model: 'claude-sonnet-5', created_by: session.userId, last_run_at: new Date().toISOString() });
    setBusy(false); if (error) setErr(errorText(error)); else onSaved();
  };
  return (
    <Modal open wide onClose={onClose} title="Yeni otomatik görev" footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={f.title.trim().length < 2 || f.goal.trim().length < 3} onClick={save}>Kaydet</Button></>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5"><span className="text-[11px] font-semibold text-ink-400 self-center">Hazır:</span>
          {TEMPLATES.map((t) => <button key={t.title} type="button" onClick={() => setF({ ...f, ...t, weekdays: t.weekdays ?? [1, 2, 3, 4, 5] })} className="rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-ink-700 text-ink-200 hover:bg-ink-800">{t.title}</button>)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Başlık *"><input className="ops-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Bot"><select className="ops-input" value={f.bot_id} onChange={(e) => setF({ ...f, bot_id: e.target.value })}><option value="">— Genel araştırma —</option>{bots.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Bot her seferinde ne yapsın? *" className="sm:col-span-2"><textarea className="ops-input min-h-[90px]" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></Field>
          <Field label="Aranacak"><input className="ops-input" value={f.search_for} onChange={(e) => setF({ ...f, search_for: e.target.value })} /></Field>
          <Field label="Raporda ne olsun?"><input className="ops-input" value={f.report_spec} onChange={(e) => setF({ ...f, report_spec: e.target.value })} /></Field>
          <Field label="Saat (İstanbul)"><select className="ops-input" value={f.run_hour} onChange={(e) => setF({ ...f, run_hour: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></Field>
          <Field label="Süre"><select className="ops-input" value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: Number(e.target.value) })}>{[5, 10, 15, 20, 30, 60].map((d) => <option key={d} value={d}>{d} dakika</option>)}</select></Field>
        </div>
        <Notice tone="info">İlk çalışma bir sonraki uygun günde, seçtiğiniz saatte olur. Her çalışmada yalnızca daha önce raporlanmamış kayıtlar gelir; sonuç Bot Raporları’na düşer.</Notice>
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}

export function SchedulesPanel({ bots }: { bots: Bot[] }) {
  const q = useQuery(async () => unwrap(await db().from('mission_schedules').select('*').order('created_at')) as Schedule[], [] as Schedule[], [], ['mission_schedules']);
  const [adding, setAdding] = useState(false); const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-400 max-w-xl">Otomatik görevler seçtiğiniz gün ve saatte kendiliğinden çalışır; ör. İhale alarmı her sabah yeni ihaleleri bulup raporlar. Önceki günlerde bulunanlar tekrar gelmez.</p>
        <Button variant="primary" onClick={() => setAdding(true)} icon={<Plus className="w-4 h-4" />}>Yeni otomatik görev</Button>
      </div>
      {q.error ? <Notice tone="error">{q.error}</Notice> : q.loading ? <StateView kind="loading" compact /> : q.data.length === 0 ? <StateView kind="empty" compact title="Otomatik görev yok" /> :
        q.data.map((s) => <ScheduleCard key={s.id} s={s} bots={bots} onChanged={q.reload} onOpen={setOpen} />)}
      {adding && <NewSchedule bots={bots} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); q.reload(); }} />}
      {open && <MissionDetail id={open} bots={bots} onClose={() => { setOpen(null); q.reload(); }} />}
    </div>
  );
}
