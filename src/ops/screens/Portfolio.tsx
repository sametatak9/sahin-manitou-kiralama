// Firma & Proje Portföyü: botların bulduğu / elle eklenen kurumlar arşivi, yaşam döngüsü ve periyodik hatırlatma.
import { useState } from 'react';
import { BellRing, Building, ExternalLink, Globe, Mail, MessageCircle, Phone, Plus, Search } from 'lucide-react';
import { errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDate, relTime, type Tone } from '../lib/format';
import { useSession } from '../session';
import { Button, cx, ErrorState, Field, Modal, Notice, Pill, SavedStamp, StateView, Tabs } from '../ui';

interface Company {
  id: string; firm_name: string; sector: string | null; il: string | null; ilce: string | null; website: string | null; public_phone: string | null; public_email: string | null;
  source_url: string | null; source: string; lifecycle_stage: string; priority_score: number | null; ai_notes: string | null; need: string | null; next_action: string | null;
  next_action_at: string | null; follow_up_days: number; last_reminded_at: string | null; opt_out: boolean; first_seen_at: string; source_count: number; created_at: string;
}
interface Project { id: string; name: string; project_type: string; il: string | null; ilce: string | null; stage: string; source_url: string; lifecycle_stage: string; ai_notes: string | null; first_seen_at: string }

const STAGES: Array<{ id: string; label: string; tone: Tone }> = [
  { id: 'DISCOVERED', label: 'Keşfedildi', tone: 'idle' }, { id: 'QUALIFIED', label: 'Uygun', tone: 'info' }, { id: 'CONTACTABLE', label: 'Ulaşılabilir', tone: 'run' },
  { id: 'CONTACTED', label: 'İletişime geçildi', tone: 'run' }, { id: 'RESPONSE', label: 'Yanıt verdi', tone: 'wait' }, { id: 'MEETING', label: 'Görüşme', tone: 'wait' },
  { id: 'OFFER', label: 'Teklif', tone: 'wait' }, { id: 'WON', label: 'Kazanıldı', tone: 'go' }, { id: 'LOST', label: 'Kaybedildi', tone: 'stop' },
];
const stageMeta = (s: string) => STAGES.find((x) => x.id === s) ?? STAGES[0];
const waLink = (phone: string, firm: string) => {
  const d = phone.replace(/\D/g, '').slice(-10);
  const text = `Merhaba ${firm} yetkilisi, Embay Yapı & Şahin Manitou olarak şantiyeleriniz için operatörlü Manitou kiralama ve inşaat hizmetlerimizi paylaşmak isteriz. 0531 436 29 04. Bu tür bilgilendirmeleri almak istemezseniz "RET" yazmanız yeterli.`;
  return `https://wa.me/90${d}?text=${encodeURIComponent(text)}`;
};

export function PortfolioScreen() {
  const [tab, setTab] = useState<'companies' | 'projects'>('companies');
  const [stage, setStage] = useState('all');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Company | null>(null);
  const q = useQuery(async () => {
    const [c, p] = await Promise.all([
      db().from('companies').select('*').is('archived_at', null).is('merged_into', null).order('created_at', { ascending: false }).limit(500),
      db().from('portfolio_projects').select('*').is('archived_at', null).order('created_at', { ascending: false }).limit(300),
    ]);
    return { companies: unwrap(c) as Company[], projects: unwrap(p) as Project[] };
  }, { companies: [] as Company[], projects: [] as Project[] }, [], ['companies', 'portfolio_projects']);
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  const s = search.toLocaleLowerCase('tr-TR');
  const companies = q.data.companies.filter((c) => (stage === 'all' || c.lifecycle_stage === stage) && (!s || `${c.firm_name} ${c.ilce ?? ''} ${c.sector ?? ''}`.toLocaleLowerCase('tr-TR').includes(s)));
  const due = q.data.companies.filter((c) => !c.opt_out && c.next_action_at && new Date(c.next_action_at) <= new Date() && !['WON', 'LOST'].includes(c.lifecycle_stage)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-100">Firma Portföyü</h2>
          <p className="text-xs text-ink-400">Botların bulduğu ve sizin eklediğiniz kurumlar burada arşivlenir. Her firmanın takip periyodu vardır; zamanı gelince Onay Merkezi’ne hazır hatırlatma mesajı düşer (onaysız gönderilmez).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={tab} onChange={setTab} items={[{ id: 'companies', label: 'Firmalar', count: q.data.companies.length }, { id: 'projects', label: 'Projeler', count: q.data.projects.length }]} />
          <Button variant="primary" onClick={() => setAdding(true)} icon={<Plus className="w-4 h-4" />}>Firma ekle</Button>
        </div>
      </div>
      {due > 0 && <Notice tone="warn"><BellRing className="w-3.5 h-3.5 inline mr-1" />{due} firmanın hatırlatma zamanı geldi. Her sabah 09:00’da Onay Merkezi’ne hatırlatma mesajı düşer.</Notice>}
      <Notice tone="info">Yalnızca kurumların kendi yayınladığı, herkese açık kurumsal iletişim bilgileri tutulur (KVKK). “İletişim istemiyor” işaretli firmaya hatırlatma oluşturulmaz; her mesajda ret seçeneği bulunur.</Notice>

      {tab === 'companies' && <>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-3 text-ink-500" /><input className="ops-input !pl-9" placeholder="Firma, ilçe, sektör ara…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select className="ops-input sm:!w-56" value={stage} onChange={(e) => setStage(e.target.value)}><option value="all">Tüm aşamalar</option>{STAGES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </div>
        {q.loading ? <StateView kind="loading" /> : companies.length === 0 ? (
          <StateView kind="empty" title="Portföy boş" message="Bot raporlarındaki bulgulardan “Firma portföyüne arşivle” ile ya da “Firma ekle” ile kurum ekleyebilirsiniz." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {companies.map((c) => {
              const st = stageMeta(c.lifecycle_stage); const overdue = c.next_action_at && new Date(c.next_action_at) <= new Date();
              return (
                <button key={c.id} onClick={() => setOpen(c)} className="ops-panel text-left p-4 hover:ring-1 hover:ring-brand-green/40">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-ink-800 text-brand-green flex items-center justify-center shrink-0"><Building className="w-5 h-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><span className="font-semibold text-ink-100 truncate">{c.firm_name}</span><Pill tone={st.tone}>{st.label}</Pill></div>
                      <div className="text-[11px] text-ink-400 truncate">{[c.sector, c.ilce, c.il].filter(Boolean).join(' · ') || '—'}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-ink-300">
                    {c.public_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{c.public_phone}</span>}
                    {c.public_email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{c.public_email}</span>}
                    {c.website && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />{c.website.replace(/^https?:\/\//, '').slice(0, 30)}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-mono text-ink-500">
                    <span>{c.opt_out ? '⛔ İLETİŞİM İSTEMİYOR' : `⏰ ${c.follow_up_days} günde bir`}</span>
                    {c.next_action_at && !c.opt_out && <span className={overdue ? 'text-amber-700 font-bold' : ''}>sonraki {fmtDate(c.next_action_at)}</span>}
                    <span>eklendi {relTime(c.first_seen_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </>}

      {tab === 'projects' && (q.data.projects.length === 0 ? <StateView kind="empty" title="Henüz proje yok" message="Proje keşfi botları kaynaklı projeleri buraya ekler." /> : (
        <div className="space-y-2">{q.data.projects.map((p) => (
          <div key={p.id} className="ops-panel p-3.5">
            <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-ink-100 flex-1">{p.name}</span><Pill tone={stageMeta(p.lifecycle_stage).tone}>{stageMeta(p.lifecycle_stage).label}</Pill></div>
            <div className="text-[11px] text-ink-400 mt-1">{p.project_type} · {p.stage} · {[p.ilce, p.il].filter(Boolean).join(', ')}</div>
            <a href={p.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-brand-green mt-1 break-all"><ExternalLink className="w-3 h-3" />{p.source_url}</a>
          </div>))}</div>))}

      {adding && <AddCompany onClose={() => setAdding(false)} onSaved={() => { setAdding(false); q.reload(); }} />}
      {open && <CompanyDetail c={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); q.reload(); }} />}
    </div>
  );
}

function AddCompany({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ firm_name: '', sector: '', ilce: '', il: 'İstanbul', website: '', public_phone: '', public_email: '', source_url: '', need: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const { data, error } = await db().rpc('portfolio_upsert_company', { p: { ...f, source: 'manual' }, p_bot_id: null, p_run_id: null, p_finding_id: null });
    setBusy(false);
    if (error) { setErr(errorText(error)); return; }
    if ((data as { action: string }).action === 'merged') alert('Bu firma zaten portföyde vardı; eksik bilgiler mevcut kayda eklendi.');
    onSaved();
  };
  return (
    <Modal open wide onClose={onClose} title="Firma ekle" footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={f.firm_name.trim().length < 2 || !/^https?:\/\//.test(f.source_url)} onClick={save}>Kaydet</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Firma adı *"><input className="ops-input" value={f.firm_name} onChange={(e) => setF({ ...f, firm_name: e.target.value })} /></Field>
        <Field label="Kaynak linki *" hint="Bilginin alındığı sayfa (KVKK kanıtı)"><input className="ops-input font-mono text-xs" placeholder="https://…" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value.trim() })} /></Field>
        <Field label="Sektör"><input className="ops-input" value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} /></Field>
        <Field label="İlçe"><input className="ops-input" value={f.ilce} onChange={(e) => setF({ ...f, ilce: e.target.value })} /></Field>
        <Field label="Kurumsal telefon"><input className="ops-input" inputMode="tel" value={f.public_phone} onChange={(e) => setF({ ...f, public_phone: e.target.value })} /></Field>
        <Field label="Kurumsal e-posta"><input className="ops-input" value={f.public_email} onChange={(e) => setF({ ...f, public_email: e.target.value })} /></Field>
        <Field label="Web sitesi"><input className="ops-input" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
        <Field label="Muhtemel ihtiyaç"><input className="ops-input" placeholder="Örn: 18 m Manitou, 3 ay" value={f.need} onChange={(e) => setF({ ...f, need: e.target.value })} /></Field>
      </div>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}
    </Modal>
  );
}

function CompanyDetail({ c, onClose, onSaved }: { c: Company; onClose: () => void; onSaved: () => void }) {
  const session = useSession();
  const [days, setDays] = useState(c.follow_up_days);
  const [optOut, setOptOut] = useState(c.opt_out);
  const [to, setTo] = useState(''); const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const events = useQuery(async () => unwrap(await db().from('lifecycle_events').select('from_stage,to_stage,note,source,actor_kind,created_at').eq('entity_type', 'company').eq('entity_id', c.id).order('created_at', { ascending: false }).limit(20)) as Array<{ from_stage: string | null; to_stage: string; note: string | null; source: string; actor_kind: string; created_at: string }>, [], [c.id]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const saveSettings = async () => {
    setBusy(true); setErr(null);
    const { data, error } = await db().from('companies').update({ follow_up_days: days, opt_out: optOut }).eq('id', c.id).select('updated_at').single();
    setBusy(false); if (error) setErr(errorText(error)); else { setSavedAt(data.updated_at); onSaved(); }
  };
  const advance = async () => {
    setBusy(true); setErr(null);
    const { error } = await db().rpc('advance_lifecycle', { p_entity_type: 'company', p_entity_id: c.id, p_to: to, p_note: note || null, p_next_action: null, p_next_action_at: null, p_source: 'manual', p_bot_id: null, p_run_id: null });
    setBusy(false); if (error) setErr(errorText(error)); else onSaved();
  };
  return (
    <Modal open wide onClose={onClose} title={c.firm_name}
      footer={<>{c.public_phone && !optOut && <a href={waLink(c.public_phone, c.firm_name)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white"><MessageCircle className="w-4 h-4" /> WhatsApp’tan yaz</a>}
        <Button variant="ghost" onClick={onClose}>Kapat</Button></>}>
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-ink-800 p-3"><div className="text-[10px] font-mono text-ink-500">AŞAMA</div><Pill tone={stageMeta(c.lifecycle_stage).tone}>{stageMeta(c.lifecycle_stage).label}</Pill></div>
          <div className="rounded-xl bg-ink-800 p-3"><div className="text-[10px] font-mono text-ink-500">KAYNAK</div>{c.source_url ? <a href={c.source_url} target="_blank" rel="noreferrer" className="text-brand-green underline break-all">{c.source_url.slice(0, 60)}</a> : '—'}<div className="text-ink-500">{c.source} · {c.source_count} kaynak</div></div>
        </div>
        {c.ai_notes && <div className="rounded-xl ring-1 ring-ink-700 p-3 whitespace-pre-line text-ink-300">{c.ai_notes}</div>}
        <div className="rounded-xl ring-1 ring-ink-700 p-3 space-y-2">
          <div className="font-semibold text-ink-100 flex items-center gap-2"><BellRing className="w-4 h-4 text-brand-green" /> Periyodik hatırlatma</div>
          <div className="flex flex-wrap items-center gap-2">{[7, 14, 30, 60, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={cx('rounded-lg px-2.5 py-1.5 font-semibold ring-1', days === d ? 'bg-brand-green text-white ring-brand-green' : 'ring-ink-700 text-ink-300')}>{d} gün</button>)}</div>
          <label className="flex items-center gap-2 text-ink-200"><input type="checkbox" checked={optOut} onChange={(e) => setOptOut(e.target.checked)} /> İletişim istemiyor (RET) — hatırlatma oluşturma</label>
          <div className="text-ink-500">Son hatırlatma: {c.last_reminded_at ? fmtDate(c.last_reminded_at) : '—'} · sonraki: {c.next_action_at ? fmtDate(c.next_action_at) : `${c.follow_up_days} gün sonra`}</div>
          <div className="flex items-center gap-3"><Button variant="primary" loading={busy} onClick={saveSettings}>Kaydet</Button><SavedStamp at={savedAt} /></div>
        </div>
        {session && (
          <div className="rounded-xl ring-1 ring-ink-700 p-3 space-y-2">
            <div className="font-semibold text-ink-100">Aşama güncelle</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select className="ops-input sm:!w-52" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Yeni aşama…</option>{STAGES.filter((x) => x.id !== c.lifecycle_stage).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
              <input className="ops-input flex-1" placeholder={to === 'LOST' ? 'Neden (zorunlu)' : 'Not (opsiyonel)'} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button variant="primary" disabled={!to || busy} onClick={advance}>Uygula</Button>
            </div>
            <div className="space-y-1">{events.data.map((e, i) => <div key={i} className="text-[11px] text-ink-400">{fmtDate(e.created_at)} · {e.from_stage ? `${stageMeta(e.from_stage).label} → ` : ''}{stageMeta(e.to_stage).label} · {e.actor_kind}{e.note ? ` · ${e.note}` : ''}</div>)}</div>
          </div>
        )}
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}
