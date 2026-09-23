import { useEffect, useMemo, useState } from 'react';
import { Archive, MessageCircle, Phone, Plus, Save, Search, Send } from 'lucide-react';
import { errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { dayKey, fmtDate, fmtDateTime, relTime, timeOf, type Tone } from '../lib/format';
import { QuotesSection } from '../components/Quotes';
import { Button, cx, ErrorState, Field, Modal, Notice, Pill, Stat, StateView, Tabs } from '../ui';

type Module = 'construction' | 'rental';
type FieldType = 'text' | 'select' | 'number' | 'date' | 'datetime' | 'textarea' | 'bool';
interface FieldDef { key: string; label: string; type: FieldType; options?: Array<[string, string]>; span?: boolean; hint?: string }

const SOURCES: Array<[string, string]> = [['manual', 'Manuel'], ['website', 'Web sitesi'], ['google_business', 'Google İşletme'], ['social', 'Sosyal medya'], ['campaign', 'Kampanya'], ['referral', 'Referans'], ['listing', 'İlan platformu'], ['bot_research', 'Onaylı araştırma'], ['phone', 'Telefon'], ['field', 'Saha']];
const PRIORITY: Array<[string, string]> = [['dusuk', 'Düşük'], ['normal', 'Normal'], ['yuksek', 'Yüksek'], ['acil', 'Acil']];

const CONFIG: Record<Module, { table: string; title: string; subtitle: string; nameKeys: [string, string]; statuses: Array<[string, string, Tone]>; fields: FieldDef[]; valueKey: string }> = {
  construction: {
    table: 'construction_customers', title: 'İnşaat Müşterileri', subtitle: 'Kentsel dönüşüm, konut ve ticari proje müşterileri — keşiften sözleşmeye.',
    nameKeys: ['company', 'full_name'], valueKey: 'estimated_value',
    statuses: [['yeni', 'Yeni', 'wait'], ['gorusme', 'Görüşme', 'run'], ['kesif', 'Keşif', 'run'], ['teklif', 'Teklif', 'info'], ['sozlesme', 'Sözleşme', 'info'], ['kazanildi', 'Kazanıldı', 'go'], ['kaybedildi', 'Kaybedildi', 'stop']],
    fields: [
      { key: 'customer_kind', label: 'Müşteri tipi', type: 'select', options: [['bireysel', 'Bireysel'], ['kurumsal', 'Kurumsal'], ['yatirimci', 'Yatırımcı'], ['kat_maliki_grubu', 'Kat malikleri']] },
      { key: 'full_name', label: 'Ad soyad', type: 'text' }, { key: 'company', label: 'Firma', type: 'text' },
      { key: 'phone', label: 'Telefon', type: 'text' }, { key: 'email', label: 'E-posta', type: 'text' },
      { key: 'project_type', label: 'Proje tipi', type: 'select', options: [['kentsel_donusum', 'Kentsel dönüşüm'], ['konut', 'Konut'], ['ticari', 'Ticari'], ['tadilat', 'Tadilat'], ['altyapi', 'Altyapı'], ['diger', 'Diğer']] },
      { key: 'project_stage', label: 'Proje aşaması', type: 'select', options: [['fikir', 'Fikir'], ['kesif', 'Keşif'], ['proje', 'Proje'], ['ruhsat', 'Ruhsat'], ['insaat', 'İnşaat'], ['teslim', 'Teslim']] },
      { key: 'ilce', label: 'İlçe', type: 'text' }, { key: 'mahalle', label: 'Mahalle', type: 'text' },
      { key: 'ada', label: 'Ada', type: 'text' }, { key: 'parsel', label: 'Parsel', type: 'text' },
      { key: 'unit_count', label: 'Bağımsız bölüm', type: 'number' }, { key: 'budget_range', label: 'Bütçe aralığı', type: 'text' },
      { key: 'timeline', label: 'Takvim', type: 'text' }, { key: 'estimated_value', label: 'Tahmini değer (₺)', type: 'number' },
      { key: 'address', label: 'Adres', type: 'text', span: true },
    ],
  },
  rental: {
    table: 'rental_customers', title: 'Makine Kiralama Müşterileri', subtitle: 'Manitou ve iş makinesi kiralayan firmalar — teklif, kiralama ve tekrar iş.',
    nameKeys: ['company', 'contact_name'], valueKey: 'quoted_price',
    statuses: [['yeni', 'Yeni', 'wait'], ['iletisim', 'İletişim', 'run'], ['teklif', 'Teklif', 'info'], ['kiralamada', 'Kiralamada', 'go'], ['tamamlandi', 'Tamamlandı', 'go'], ['tekrar', 'Tekrar iş', 'info'], ['kaybedildi', 'Kaybedildi', 'stop']],
    fields: [
      { key: 'company', label: 'Firma', type: 'text' }, { key: 'contact_name', label: 'Yetkili', type: 'text' },
      { key: 'phone', label: 'Telefon', type: 'text' }, { key: 'email', label: 'E-posta', type: 'text' },
      { key: 'website', label: 'Web sitesi', type: 'text' }, { key: 'sector', label: 'Sektör', type: 'text' },
      { key: 'machine_type', label: 'Makine', type: 'select', options: [['manitou_teleskopik', 'Manitou teleskopik'], ['manitou_rotating', 'Manitou rotating'], ['forklift', 'Forklift'], ['platform', 'Platform'], ['vinc', 'Vinç'], ['diger', 'Diğer']] },
      { key: 'with_operator', label: 'Operatörlü', type: 'bool' },
      { key: 'lift_height_m', label: 'Kaldırma yüksekliği (m)', type: 'number' }, { key: 'capacity_ton', label: 'Kapasite (ton)', type: 'number' },
      { key: 'rental_period', label: 'Kiralama süresi', type: 'select', options: [['', '—'], ['saatlik', 'Saatlik'], ['gunluk', 'Günlük'], ['haftalik', 'Haftalık'], ['aylik', 'Aylık'], ['proje_bazli', 'Proje bazlı']] },
      { key: 'frequency', label: 'Sıklık', type: 'select', options: [['tek_seferlik', 'Tek seferlik'], ['ara_sira', 'Ara sıra'], ['duzenli', 'Düzenli']] },
      { key: 'start_date', label: 'Başlangıç', type: 'date' }, { key: 'end_date', label: 'Bitiş', type: 'date' },
      { key: 'ilce', label: 'İlçe', type: 'text' }, { key: 'quoted_price', label: 'Teklif (₺)', type: 'number' },
      { key: 'site_address', label: 'Şantiye adresi', type: 'text', span: true },
    ],
  },
};
const COMMON: FieldDef[] = [
  { key: 'source', label: 'Kaynak', type: 'select', options: SOURCES }, { key: 'priority', label: 'Öncelik', type: 'select', options: PRIORITY },
  { key: 'next_action_at', label: 'Sonraki takip', type: 'datetime' },
  { key: 'notes', label: 'Notlar', type: 'textarea', span: true },
];

type Row = Record<string, unknown> & { id: string; status: string; created_at: string; next_action_at: string | null; phone: string | null; kvkk_consent: boolean };

export function CustomersScreen({ module }: { module: Module }) {
  const cfg = CONFIG[module];
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const q = useQuery(async () => unwrap(await db().from(cfg.table).select('*').is('archived_at', null).order('created_at', { ascending: false }).limit(1000)) as Row[], [] as Row[], [module], [cfg.table]);
  const label = (r: Row) => String(r[cfg.nameKeys[0]] || r[cfg.nameKeys[1]] || '—');
  const rows = q.data.filter((r) => !search || JSON.stringify([r[cfg.nameKeys[0]], r[cfg.nameKeys[1]], r.phone, r.email, r.ilce]).toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));
  const overdue = q.data.filter((r) => r.next_action_at && new Date(r.next_action_at) < new Date() && !['kazanildi', 'kaybedildi', 'tamamlandi'].includes(r.status)).length;
  const today = q.data.filter((r) => dayKey(r.created_at) === dayKey(new Date())).length;
  const pipelineValue = q.data.filter((r) => !['kaybedildi'].includes(r.status)).reduce((a, r) => a + (Number(r[cfg.valueKey]) || 0), 0);

  const [statusErr, setStatusErr] = useState<string | null>(null);
  const setStatus = async (id: string, status: string) => {
    q.setData((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await db().from(cfg.table).update({ status }).eq('id', id);
    if (error) { setStatusErr(`Durum kaydedilemedi: ${errorText(error)}`); q.reload(); return; }
    setStatusErr(null);
    await db().from('customer_activities').insert({ customer_module: module, customer_id: id, activity_type: 'durum', body: `Durum: ${cfg.statuses.find((s) => s[0] === status)?.[1]}` });
  };

  return (
    <div className="space-y-4">
      {statusErr && <Notice tone="error">{statusErr}</Notice>}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-semibold text-ink-100">{cfg.title}</h2><p className="text-xs text-ink-400">{cfg.subtitle}</p></div>
        <div className="flex flex-wrap gap-2">
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-ink-500" /><input className="ops-input !pl-9 !py-2 w-56" placeholder="Ara: ad, telefon, ilçe" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Tabs value={view} onChange={setView} items={[{ id: 'pipeline', label: 'Pipeline' }, { id: 'list', label: 'Liste' }]} />
          <Button variant="primary" onClick={() => setEditing('new')} icon={<Plus className="w-4 h-4" />}>Müşteri kaydı</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Toplam" value={q.data.length} /><Stat label="Bugün eklenen" value={today} tone={today ? 'go' : undefined} />
        <Stat label="Geciken takip" value={overdue} tone={overdue ? 'stop' : undefined} /><Stat label="Pipeline değeri" value={<span className="text-lg">{pipelineValue ? `₺${pipelineValue.toLocaleString('tr-TR')}` : '—'}</span>} />
      </div>
      {q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : q.loading ? <StateView kind="loading" /> : q.data.length === 0 ? (
        <StateView kind="empty" title="Henüz müşteri yok" message="İlk kaydı ekleyin veya Lead Gelen Kutusu’ndaki web başvurularını dönüştürün." action={<Button variant="primary" onClick={() => setEditing('new')} icon={<Plus className="w-4 h-4" />}>Müşteri kaydı</Button>} />
      ) : view === 'pipeline' ? (
        <div className="grid grid-flow-col auto-cols-[minmax(230px,1fr)] gap-3 overflow-x-auto ops-scroll pb-2">
          {cfg.statuses.map(([id, name, tone]) => {
            const items = rows.filter((r) => r.status === id);
            return (
              <div key={id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const rid = e.dataTransfer.getData('text/plain'); if (rid) setStatus(rid, id); }} className="ops-panel !rounded-xl p-2.5 min-h-[260px]">
                <div className="flex items-center justify-between px-1 pb-2"><Pill tone={tone}>{name.toUpperCase()}</Pill><span className="font-mono text-[11px] text-ink-500">{items.length}</span></div>
                <div className="space-y-1.5">{items.map((r) => (
                  <div key={r.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)} onClick={() => setEditing(r)} className="cursor-grab rounded-lg bg-ink-900 ring-1 ring-ink-700 hover:ring-brand-green/50 p-2.5">
                    <div className="text-[13px] font-semibold text-ink-100 truncate">{label(r)}</div>
                    <div className="text-[10px] text-ink-400 truncate">{String(r.ilce ?? '—')} · {String((module === 'rental' ? r.machine_type : r.project_type) ?? '').replace(/_/g, ' ')}</div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px]">
                      <span className={cx('font-mono', r.next_action_at && new Date(r.next_action_at) < new Date() ? 'text-rose-700' : 'text-ink-500')}>{r.next_action_at ? `⏱ ${fmtDate(r.next_action_at)}` : relTime(r.created_at)}</span>
                      {r.priority === 'acil' || r.priority === 'yuksek' ? <span className="text-amber-700 font-semibold">{String(r.priority).toUpperCase()}</span> : null}
                    </div>
                  </div>))}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ops-panel overflow-x-auto ops-scroll">
          <table className="w-full text-xs min-w-[760px]">
            <thead><tr className="text-left text-[10px] font-mono uppercase tracking-wider text-ink-500 border-b border-ink-800"><th className="p-3">Müşteri</th><th className="p-3">Telefon</th><th className="p-3">İlçe</th><th className="p-3">Durum</th><th className="p-3">Takip</th><th className="p-3">Kaynak</th></tr></thead>
            <tbody>{rows.map((r) => { const st = cfg.statuses.find((s) => s[0] === r.status); return (
              <tr key={r.id} onClick={() => setEditing(r)} className="border-b border-ink-800/60 hover:bg-ink-850 cursor-pointer">
                <td className="p-3 text-ink-100 font-semibold">{label(r)}</td><td className="p-3 font-mono text-ink-300">{String(r.phone ?? '—')}</td><td className="p-3 text-ink-300">{String(r.ilce ?? '—')}</td>
                <td className="p-3">{st && <Pill tone={st[2]}>{st[1].toUpperCase()}</Pill>}</td><td className="p-3 font-mono text-ink-400">{fmtDateTime(r.next_action_at)}</td><td className="p-3 text-ink-400">{SOURCES.find((s) => s[0] === r.source)?.[1] ?? String(r.source)}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      )}
      {editing && <CustomerEditor module={module} row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); q.reload(); }} />}
    </div>
  );
}

function CustomerEditor({ module, row, onClose, onSaved }: { module: Module; row: Row | null; onClose: () => void; onSaved: () => void }) {
  const cfg = CONFIG[module];
  const init = () => {
    const base: Record<string, unknown> = { status: 'yeni', source: 'manual', priority: 'normal', kvkk_consent: false, ticari_ileti_izni: false, ...(module === 'construction' ? { customer_kind: 'bireysel', project_type: 'kentsel_donusum', project_stage: 'fikir' } : { machine_type: 'manitou_teleskopik', with_operator: true, frequency: 'tek_seferlik' }) };
    return { ...base, ...(row || {}) } as Record<string, unknown>;
  };
  const [f, setF] = useState<Record<string, unknown>>(init);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dups, setDups] = useState<Array<{ module: string; id: string; label: string; match_on: string; status: string }>>([]);
  const [tab, setTab] = useState<'info' | 'quotes' | 'activity'>('info');

  // Duplicate kontrolü (telefon / e-posta / web / ad)
  useEffect(() => {
    const t = setTimeout(async () => {
      const name = String(f[cfg.nameKeys[0]] || f[cfg.nameKeys[1]] || '');
      if (!f.phone && !f.email && !f.website && name.length < 3) { setDups([]); return; }
      const { data } = await db().rpc('find_customer_duplicates', { p_phone: f.phone || null, p_email: f.email || null, p_website: f.website || null, p_name: name || null });
      setDups(((data || []) as typeof dups).filter((d) => d.id !== row?.id));
    }, 500);
    return () => clearTimeout(t);
  }, [f.phone, f.email, f.website, f[cfg.nameKeys[0]], f[cfg.nameKeys[1]]]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setBusy('save'); setErr(null);
    try {
      const allowed = new Set([...cfg.fields, ...COMMON].map((d) => d.key).concat(['status', 'kvkk_consent', 'ticari_ileti_izni']));
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(f)) if (allowed.has(k)) payload[k] = v === '' ? null : v;
      if (payload.kvkk_consent && !row?.kvkk_consent) payload.kvkk_consent_at = new Date().toISOString();
      if (payload.ticari_ileti_izni && !row?.ticari_ileti_izni) payload.ticari_ileti_izin_tarihi = new Date().toISOString();
      const res = row ? await db().from(cfg.table).update(payload).eq('id', row.id) : await db().from(cfg.table).insert(payload);
      if (res.error) {
        if (res.error.code === '23505') throw new Error('Aynı telefon veya e-posta ile kayıtlı müşteri var (duplicate).');
        if (res.error.code === '23514') throw new Error('Kayıt kuralı: ad/firma zorunlu; kişisel iletişim verisi için KVKK rızası işaretlenmeli.');
        throw res.error;
      }
      onSaved();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  };
  const archive = async () => {
    if (!row) return; setBusy('archive'); setErr(null);
    const { error } = await db().from(cfg.table).update({ archived_at: new Date().toISOString() }).eq('id', row.id);
    setBusy(null); if (error) setErr(errorText(error)); else onSaved();
  };

  const input = (d: FieldDef) => {
    const v = f[d.key];
    const set = (val: unknown) => setF({ ...f, [d.key]: val });
    switch (d.type) {
      case 'select': return <select className="ops-input" value={String(v ?? '')} onChange={(e) => set(e.target.value)}>{d.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
      case 'textarea': return <textarea className="ops-input min-h-[80px]" value={String(v ?? '')} onChange={(e) => set(e.target.value)} />;
      case 'number': return <input type="number" className="ops-input" value={v === null || v === undefined ? '' : String(v)} onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))} />;
      case 'date': return <input type="date" className="ops-input" value={String(v ?? '')} onChange={(e) => set(e.target.value)} />;
      case 'datetime': return <input type="datetime-local" className="ops-input" value={v ? `${dayKey(String(v))}T${timeOf(String(v))}` : ''} onChange={(e) => set(e.target.value ? new Date(`${e.target.value}:00+03:00`).toISOString() : null)} />;
      case 'bool': return <label className="flex items-center gap-2 text-sm text-ink-200 pt-2"><input type="checkbox" checked={Boolean(v)} onChange={(e) => set(e.target.checked)} /> Evet</label>;
      default: return <input className="ops-input" value={String(v ?? '')} onChange={(e) => set(e.target.value)} />;
    }
  };

  return (
    <Modal open wide onClose={onClose} title={row ? String(f[cfg.nameKeys[0]] || f[cfg.nameKeys[1]] || 'Müşteri') : `Yeni ${module === 'rental' ? 'kiralama' : 'inşaat'} müşterisi`}
      footer={<>{row && <Button variant="danger" loading={busy === 'archive'} onClick={archive} icon={<Archive className="w-4 h-4" />}>Arşivle</Button>}<Button variant="ghost" onClick={onClose}>Kapat</Button><Button variant="primary" loading={busy === 'save'} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button></>}>
      {row && <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ id: 'info', label: 'Bilgiler' }, { id: 'quotes', label: 'Teklifler' }, { id: 'activity', label: 'Aktivite & takip' }]} />}
      {tab === 'info' ? (
        <div className="space-y-4">
          {dups.length > 0 && <Notice tone="warn">Olası tekrar: {dups.map((d) => `${d.label} (${d.module === 'construction' ? 'inşaat' : d.module === 'rental' ? 'kiralama' : d.module}, ${d.match_on})`).join(' · ')}</Notice>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Durum"><select className="ops-input" value={String(f.status)} onChange={(e) => setF({ ...f, status: e.target.value })}>{cfg.statuses.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            {[...cfg.fields, ...COMMON].map((d) => <Field key={d.key} label={d.label} className={d.span ? 'sm:col-span-2 lg:col-span-3' : ''}>{input(d)}</Field>)}
          </div>
          <div className="rounded-xl bg-ink-900 ring-1 ring-ink-700 p-3 space-y-2">
            <div className="text-[11px] font-semibold text-ink-300">KVKK</div>
            <label className="flex items-start gap-2 text-xs text-ink-200"><input type="checkbox" className="mt-0.5" checked={Boolean(f.kvkk_consent)} onChange={(e) => setF({ ...f, kvkk_consent: e.target.checked })} /> Kişi aydınlatıldı ve kişisel verilerinin talebine dönüş için işlenmesine onay verdi.</label>
            <label className="flex items-start gap-2 text-xs text-ink-200"><input type="checkbox" className="mt-0.5" checked={Boolean(f.ticari_ileti_izni)} onChange={(e) => setF({ ...f, ticari_ileti_izni: e.target.checked })} /> Ticari elektronik ileti (SMS/WhatsApp/e-posta) izni verdi (İYS kapsamında ayrı izin).</label>
          </div>
          {err && <Notice tone="error">{err}</Notice>}
        </div>
      ) : row && tab === 'quotes' ? <QuotesSection module={module} customer={{ id: row.id, name: String(row[cfg.nameKeys[0]] || row[cfg.nameKeys[1]] || 'Müşteri'), phone: (row.phone as string) ?? null, email: (row.email as string) ?? null }} /> : row && <Activities module={module} row={row} />}
    </Modal>
  );
}

function Activities({ module, row }: { module: Module; row: Row }) {
  const q = useQuery(async () => unwrap(await db().from('customer_activities').select('*').eq('customer_module', module).eq('customer_id', row.id).order('created_at', { ascending: false })) as Array<{ id: string; activity_type: string; body: string; due_at: string | null; done: boolean; created_at: string }>, [], [row.id]);
  const [type, setType] = useState('not'); const [body, setBody] = useState(''); const [msg, setMsg] = useState<string | null>(null);
  const add = async () => {
    if (!body.trim()) return;
    const { data, error } = await db().from('customer_activities').insert({ customer_module: module, customer_id: row.id, activity_type: type, body }).select('created_at').single();
    if (error) { setMsg(`Kaydedilemedi: ${errorText(error)}`); return; }
    setBody(''); setMsg(`✓ Veritabanına kaydedildi · ${new Date(data.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`); q.reload();
  };
  const phone = String(row.phone ?? '');
  const prepareFollowUp = async () => {
    const text = body.trim() || `Merhaba, Embay Yapı’dan yazıyoruz. ${module === 'rental' ? 'Manitou kiralama talebiniz' : 'Projeniz'} hakkında görüşmek isteriz.`;
    const { error } = await db().from('approval_requests').insert({ entity_type: 'whatsapp', title: `WhatsApp takip mesajı · ${String(row.company || row.full_name || row.contact_name || '')}`, summary: text.slice(0, 200), tool_key: 'prepare_whatsapp_message', platform: 'whatsapp', status: 'pending_approval', payload: { customer_module: module, customer_id: row.id, message: text } });
    setMsg(error ? errorText(error) : 'Mesaj onay kuyruğuna gönderildi. Onaylanınca WhatsApp Cloud API (bağlıysa) veya wa.me bağlantısıyla gönderilir.');
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {phone && <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-xl ring-1 ring-ink-600 px-3 py-2 text-xs text-ink-200 hover:bg-ink-800"><Phone className="w-4 h-4" /> Ara</a>}
        {phone && row.kvkk_consent && <a href={`https://wa.me/90${phone.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl ring-1 ring-ink-600 px-3 py-2 text-xs text-ink-200 hover:bg-ink-800"><MessageCircle className="w-4 h-4" /> WhatsApp aç</a>}
        {phone && row.kvkk_consent && <Button variant="subtle" onClick={prepareFollowUp} icon={<Send className="w-4 h-4" />}>Takip mesajını onaya gönder</Button>}
      </div>
      {!row.kvkk_consent && phone && <Notice tone="warn">KVKK rızası işaretli değil — mesaj hazırlama devre dışı.</Notice>}
      {msg && <Notice tone="info">{msg}</Notice>}
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2">
        <select className="ops-input" value={type} onChange={(e) => setType(e.target.value)}>{[['not', 'Not'], ['arama', 'Arama'], ['ziyaret', 'Ziyaret'], ['teklif', 'Teklif'], ['whatsapp', 'WhatsApp'], ['eposta', 'E-posta'], ['toplanti', 'Toplantı']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input className="ops-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Görüşme notu / teklif detayı" />
        <Button variant="primary" onClick={add} icon={<Plus className="w-4 h-4" />}>Ekle</Button>
      </div>
      {q.data.length === 0 ? <StateView kind="empty" compact title="Aktivite yok" /> : (
        <ol className="relative border-l border-ink-700 ml-2 space-y-3">
          {q.data.map((a) => (
            <li key={a.id} className="ml-4"><span className="absolute -left-1.5 w-3 h-3 rounded-full bg-ink-700 ring-2 ring-ink-900" />
              <div className="text-[10px] font-mono text-ink-500">{fmtDateTime(a.created_at)} · {a.activity_type.toUpperCase()}</div>
              <div className="text-sm text-ink-200">{a.body}</div></li>
          ))}
        </ol>
      )}
    </div>
  );
}

