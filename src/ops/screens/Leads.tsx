import { useState } from 'react';
import { ArrowRightLeft, Building2, ExternalLink, Globe2, Plus, Truck } from 'lucide-react';
import { errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime } from '../lib/format';
import { useRouter } from '../session';
import { Button, ErrorState, Field, Modal, Notice, Pill, StateView, Tabs } from '../ui';

interface Inbox { id: string; created_at: string; full_name: string | null; phone: string; email: string | null; ilce: string | null; mahalle: string | null; address: string | null; demand: string; budget_range: string | null; timeline: string | null; note: string | null; status: string; offer_match: string | null; ticari_ileti_izni: boolean; kvkk_aydinlatma_onay: boolean }
interface Company { id: string; firm_name: string; sector: string | null; ilce: string | null; public_phone: string | null; public_email: string | null; website: string | null; source_url: string | null; status: string; source: string; need: string | null; project: string | null; created_at: string }
interface Prospect { id: string; platform: string; profile_name: string | null; handle: string | null; profile_url: string | null; outreach_status: string; consent_status: string; relevance_score: number | null; created_at: string }

const DEMAND: Record<string, string> = { manitou_kiralama: 'Manitou kiralama', kentsel_donusum: 'Kentsel dönüşüm', konut_insaati: 'Konut inşaatı', diger: 'Diğer' };

export function LeadsScreen() {
  const { go } = useRouter();
  const [tab, setTab] = useState<'inbox' | 'companies' | 'prospects'>('inbox');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const q = useQuery(async () => {
    const s = db();
    const [inbox, companies, prospects, rc, cc] = await Promise.all([
      s.from('lead_inbox').select('*').order('created_at', { ascending: false }).limit(300),
      s.from('companies').select('*').order('created_at', { ascending: false }).limit(300),
      s.from('social_prospects').select('id,platform,profile_name,handle,profile_url,outreach_status,consent_status,relevance_score,created_at').order('created_at', { ascending: false }).limit(300),
      s.from('rental_customers').select('lead_inbox_id,company_id').not('lead_inbox_id', 'is', null),
      s.from('construction_customers').select('lead_inbox_id').not('lead_inbox_id', 'is', null),
    ]);
    const converted = new Set([...(rc.data || []).map((r: { lead_inbox_id: string }) => r.lead_inbox_id), ...(cc.data || []).map((r: { lead_inbox_id: string }) => r.lead_inbox_id)]);
    return { inbox: unwrap(inbox) as Inbox[], companies: unwrap(companies) as Company[], prospects: unwrap(prospects) as Prospect[], converted };
  }, { inbox: [] as Inbox[], companies: [] as Company[], prospects: [] as Prospect[], converted: new Set<string>() }, [], ['lead_inbox']);

  const convertInbox = async (row: Inbox, module: 'rental' | 'construction') => {
    setMsg(null);
    const { data: dups } = await db().rpc('find_customer_duplicates', { p_phone: row.phone, p_email: row.email, p_website: null, p_name: null });
    if (dups?.length) { setMsg({ tone: 'error', text: `Tekrar kayıt: ${dups.map((d: { label: string }) => d.label).join(', ')} — mevcut müşteriyi güncelleyin.` }); return; }
    const common = { phone: row.phone, email: row.email, ilce: row.ilce, notes: row.note, source: 'website', kvkk_consent: row.kvkk_aydinlatma_onay, kvkk_consent_at: row.created_at, ticari_ileti_izni: row.ticari_ileti_izni, ticari_ileti_izin_tarihi: row.ticari_ileti_izni ? row.created_at : null, lead_inbox_id: row.id };
    const res = module === 'rental'
      ? await db().from('rental_customers').insert({ ...common, contact_name: row.full_name || 'Web başvurusu', site_address: row.address })
      : await db().from('construction_customers').insert({ ...common, full_name: row.full_name || 'Web başvurusu', mahalle: row.mahalle, address: row.address, budget_range: row.budget_range, timeline: row.timeline, project_type: row.demand === 'konut_insaati' ? 'konut' : row.demand === 'kentsel_donusum' ? 'kentsel_donusum' : 'diger' });
    if (res.error) { setMsg({ tone: 'error', text: errorText(res.error) }); return; }
    await db().from('lead_inbox').update({ status: 'arandi' }).eq('id', row.id);
    setMsg({ tone: 'ok', text: 'Müşteri modülüne aktarıldı.' }); q.reload();
  };
  const convertCompany = async (c: Company) => {
    const { error } = await db().from('rental_customers').insert({ company: c.firm_name, phone: c.public_phone, email: c.public_email, website: c.website, sector: c.sector, ilce: c.ilce, source: c.source === 'bot_research' ? 'bot_research' : 'manual', notes: [c.need, c.project, c.source_url].filter(Boolean).join(' · '), company_id: c.id });
    if (error) { setMsg({ tone: 'error', text: error.code === '23505' ? 'Bu firma zaten müşteri listesinde.' : errorText(error) }); return; }
    await db().from('companies').update({ status: 'iletisim' }).eq('id', c.id);
    setMsg({ tone: 'ok', text: `${c.firm_name} makine kiralama müşterilerine eklendi.` }); q.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-semibold text-ink-100">Lead Gelen Kutusu</h2><p className="text-xs text-ink-400">Web formu (KVKK onaylı), onaylı araştırma kaynaklı firma adayları ve sosyal aday listeleri. Otomatik ticari mesaj gönderilmez.</p></div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={tab} onChange={setTab} items={[{ id: 'inbox', label: 'Web başvuruları', count: q.data.inbox.filter((i) => !q.data.converted.has(i.id)).length }, { id: 'companies', label: 'Firma adayları', count: q.data.companies.length }, { id: 'prospects', label: 'Sosyal adaylar', count: q.data.prospects.length }]} />
          {tab === 'companies' && <Button variant="primary" onClick={() => setAdding(true)} icon={<Plus className="w-4 h-4" />}>Firma adayı</Button>}
        </div>
      </div>
      {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Notice>}
      {q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : q.loading ? <StateView kind="loading" /> : tab === 'inbox' ? (
        q.data.inbox.length === 0 ? <StateView kind="empty" title="Web başvurusu yok" message="Kurumsal sitedeki teklif formundan gelen KVKK onaylı talepler burada listelenir." /> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {q.data.inbox.map((r) => { const done = q.data.converted.has(r.id); return (
              <div key={r.id} className="ops-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-semibold text-ink-100">{r.full_name || 'İsimsiz başvuru'}</div><div className="text-[11px] text-ink-400">{r.phone}{r.email ? ` · ${r.email}` : ''} · {r.ilce ?? '—'}</div></div>
                  <Pill tone={done ? 'go' : 'wait'}>{done ? 'CRM’DE' : 'YENİ'}</Pill>
                </div>
                <div className="flex flex-wrap gap-1 mt-2"><span className="text-[10px] rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">{DEMAND[r.demand] ?? r.demand}</span>{r.budget_range && <span className="text-[10px] rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">{r.budget_range}</span>}{r.ticari_ileti_izni && <span className="text-[10px] rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700">Ticari ileti izni</span>}</div>
                {r.note && <p className="text-xs text-ink-300 mt-2">{r.note}</p>}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-800">
                  <span className="text-[10px] font-mono text-ink-500">{fmtDateTime(r.created_at)}</span>
                  {!done && <div className="flex gap-1.5"><Button variant="subtle" onClick={() => convertInbox(r, 'rental')} icon={<Truck className="w-3.5 h-3.5" />}>Kiralama</Button><Button variant="subtle" onClick={() => convertInbox(r, 'construction')} icon={<Building2 className="w-3.5 h-3.5" />}>İnşaat</Button></div>}
                </div>
              </div>); })}
          </div>
        )
      ) : tab === 'companies' ? (
        q.data.companies.length === 0 ? <StateView kind="empty" title="Firma adayı yok" message="Lead Discovery Bot yalnızca kaynağı belirtilmiş, kişisel veri içermeyen firma kayıtları ekler. Elle de ekleyebilirsiniz." /> : (
          <div className="ops-panel overflow-x-auto ops-scroll">
            <table className="w-full text-xs min-w-[760px]">
              <thead><tr className="text-left text-[10px] font-mono uppercase tracking-wider text-ink-500 border-b border-ink-800"><th className="p-3">Firma</th><th className="p-3">İlçe</th><th className="p-3">İhtiyaç</th><th className="p-3">Kaynak</th><th className="p-3">Durum</th><th className="p-3" /></tr></thead>
              <tbody>{q.data.companies.map((c) => (
                <tr key={c.id} className="border-b border-ink-800/60">
                  <td className="p-3"><div className="font-semibold text-ink-100">{c.firm_name}</div>{c.website && <a href={c.website} target="_blank" rel="noreferrer" className="text-[10px] text-sky-700 inline-flex items-center gap-1"><Globe2 className="w-3 h-3" />{c.website}</a>}</td>
                  <td className="p-3 text-ink-300">{c.ilce ?? '—'}</td><td className="p-3 text-ink-300 max-w-[200px] truncate">{c.need ?? c.project ?? '—'}</td>
                  <td className="p-3">{c.source_url ? <a href={c.source_url} target="_blank" rel="noreferrer" className="text-sky-700 inline-flex items-center gap-1">{c.source}<ExternalLink className="w-3 h-3" /></a> : c.source}</td>
                  <td className="p-3"><Pill tone={c.status === 'aday' ? 'wait' : 'go'}>{c.status.toUpperCase()}</Pill></td>
                  <td className="p-3 text-right">{c.status === 'aday' && <Button variant="subtle" onClick={() => convertCompany(c)} icon={<ArrowRightLeft className="w-3.5 h-3.5" />}>Müşteriye aktar</Button>}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )
      ) : (
        q.data.prospects.length === 0 ? <StateView kind="empty" title="Sosyal aday yok" message="Botların keşfettiği sosyal medya adayları burada listelenir." /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {q.data.prospects.map((p) => (
              <div key={p.id} className="ops-panel !rounded-xl p-3">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold text-ink-100 truncate">{p.profile_name ?? p.handle}</span><Pill tone={p.outreach_status === 'approval_pending' ? 'wait' : 'idle'}>{p.outreach_status.toUpperCase()}</Pill></div>
                <div className="text-[11px] text-ink-400">{p.platform} · skor {p.relevance_score ?? '—'} · KVKK: {p.consent_status} · {relTime(p.created_at)}</div>
                {p.profile_url && <a href={p.profile_url} target="_blank" rel="noreferrer" className="text-[11px] text-sky-700 underline">Profil</a>}
              </div>))}
          </div>
        )
      )}
      {adding && <CompanyModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); q.reload(); }} />}
    </div>
  );
}

function CompanyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ firm_name: '', website: '', public_phone: '', ilce: '', sector: 'İnşaat', need: '', source_url: '' });
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setErr(null);
    const { data: dups } = await db().rpc('find_customer_duplicates', { p_phone: f.public_phone || null, p_email: null, p_website: f.website || null, p_name: f.firm_name });
    if (dups?.length) { setErr(`Tekrar kayıt: ${dups.map((d: { label: string; module: string }) => `${d.label} (${d.module})`).join(', ')}`); setBusy(false); return; }
    const { error } = await db().from('companies').insert({ ...f, website: f.website || null, public_phone: f.public_phone || null, source: 'manual' });
    setBusy(false); if (error) setErr(error.code === '23505' ? 'Bu web sitesine sahip firma zaten kayıtlı.' : errorText(error)); else onSaved();
  };
  return (
    <Modal open onClose={onClose} title="Firma adayı ekle" footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={!f.firm_name} onClick={save}>Kaydet</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Firma adı"><input className="ops-input" value={f.firm_name} onChange={(e) => setF({ ...f, firm_name: e.target.value })} /></Field>
        <Field label="Web sitesi"><input className="ops-input" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
        <Field label="Kurumsal telefon" hint="Yalnızca firmanın herkese açık numarası"><input className="ops-input" value={f.public_phone} onChange={(e) => setF({ ...f, public_phone: e.target.value })} /></Field>
        <Field label="İlçe"><input className="ops-input" value={f.ilce} onChange={(e) => setF({ ...f, ilce: e.target.value })} /></Field>
        <Field label="Sektör"><input className="ops-input" value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} /></Field>
        <Field label="İhtiyaç / proje"><input className="ops-input" value={f.need} onChange={(e) => setF({ ...f, need: e.target.value })} /></Field>
        <Field label="Kaynak bağlantısı" className="sm:col-span-2"><input className="ops-input" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} placeholder="İlan, haber veya firma sayfası" /></Field>
      </div>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}
    </Modal>
  );
}
