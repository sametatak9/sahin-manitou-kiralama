import { useState } from 'react';
import { ArrowRightLeft, Building2, ExternalLink, Facebook, Globe2, Instagram, Plus, Sparkles, Truck } from 'lucide-react';
import { errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime } from '../lib/format';
import { useRouter } from '../session';
import { Prospects } from '../components/Prospects';
import { Button, ErrorState, Field, Modal, Notice, Pill, PlatformBadge, StateView, Tabs } from '../ui';

interface Inbox { id: string; created_at: string; full_name: string | null; phone: string; email: string | null; ilce: string | null; mahalle: string | null; address: string | null; demand: string; budget_range: string | null; timeline: string | null; note: string | null; status: string; offer_match: string | null; ticari_ileti_izni: boolean; kvkk_aydinlatma_onay: boolean }
interface Company { id: string; firm_name: string; sector: string | null; ilce: string | null; public_phone: string | null; public_email: string | null; website: string | null; source_url: string | null; status: string; source: string; need: string | null; project: string | null; created_at: string }
interface Prospect {
  id: string; platform: string; profile_name: string | null; handle: string | null; profile_url: string | null;
  outreach_status: string; consent_status: string; relevance_score: number | null; created_at: string;
  account_kind: string | null; follow_status: string | null; notes: string | null; source_url: string | null;
  followers: number | null; avg_engagement: number | null; engagement_rate: number | null;
}

const DEMAND: Record<string, string> = { manitou_kiralama: 'Manitou kiralama', kentsel_donusum: 'Kentsel dönüşüm', konut_insaati: 'Konut inşaatı', diger: 'Diğer' };
const KIND_LABEL: Record<string, string> = {
  competitor: 'Rakip', supplier: 'Tedarikçi', industry_media: 'Sektör medyası', local_business: 'Yerel işletme', partner: 'İş ortağı',
};
const OUTREACH_TONE: Record<string, 'idle' | 'wait' | 'go' | 'info' | 'stop'> = {
  not_contacted: 'idle', approval_pending: 'wait', contacted: 'info', converted: 'go', skip: 'stop',
};

function scoreTone(score: number | null): 'go' | 'wait' | 'idle' {
  if (score == null) return 'idle';
  if (score >= 70) return 'go';
  if (score >= 40) return 'wait';
  return 'idle';
}

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-600" />;
  if (p.includes('facebook')) return <Facebook className="w-4 h-4 text-blue-600" />;
  return <Globe2 className="w-4 h-4 text-ink-400" />;
}

function initials(name: string | null | undefined) {
  const s = (name || '?').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export function LeadsScreen() {
  const { go } = useRouter();
  const [tab, setTab] = useState<'askers' | 'inbox' | 'companies' | 'prospects'>('askers');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Prospect | null>(null);
  const q = useQuery(async () => {
    const s = db();
    const [inbox, companies, prospects, rc, cc] = await Promise.all([
      s.from('lead_inbox').select('*').order('created_at', { ascending: false }).limit(300),
      s.from('companies').select('*').order('created_at', { ascending: false }).limit(300),
      s.from('social_prospects').select('id,platform,profile_name,handle,profile_url,outreach_status,consent_status,relevance_score,created_at,account_kind,follow_status,notes,source_url,followers,avg_engagement,engagement_rate').order('created_at', { ascending: false }).limit(300),
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
        <div><h2 className="font-display text-xl font-semibold text-ink-100">Müşteri Adayları</h2><p className="text-xs text-ink-400">Web formu (KVKK onaylı), onaylı araştırma kaynaklı firma adayları ve sosyal aday listeleri. Otomatik ticari mesaj gönderilmez.</p></div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={tab} onChange={setTab} items={[{ id: 'askers', label: 'Fiyat soranlar' }, { id: 'inbox', label: 'Web başvuruları', count: q.data.inbox.filter((i) => !q.data.converted.has(i.id)).length }, { id: 'companies', label: 'Firma adayları', count: q.data.companies.length }, { id: 'prospects', label: 'Sosyal adaylar', count: q.data.prospects.length }]} />
          {tab === 'companies' && <Button variant="primary" onClick={() => setAdding(true)} icon={<Plus className="w-4 h-4" />}>Firma adayı</Button>}
        </div>
      </div>
      {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Notice>}
      {tab === 'askers' ? <Prospects /> : q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : q.loading ? <StateView kind="loading" /> : tab === 'inbox' ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {q.data.prospects.map((p) => {
              const title = p.profile_name || p.handle || 'İsimsiz hesap';
              const kind = KIND_LABEL[p.account_kind ?? ''] || null;
              const score = p.relevance_score;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className="ops-panel !rounded-2xl p-0 text-left overflow-hidden ring-1 ring-ink-800 hover:ring-brand-green/40 hover:shadow-lg hover:shadow-emerald-900/10 transition group"
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-sky-500 to-violet-500 opacity-80 group-hover:opacity-100" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ink-700 to-ink-900 ring-1 ring-ink-600 flex items-center justify-center shrink-0">
                        <span className="font-display text-sm font-bold text-ink-100">{initials(title)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon platform={p.platform} />
                          <span className="font-semibold text-ink-100 truncate">{title}</span>
                        </div>
                        {p.handle && <div className="text-[11px] font-mono text-ink-500 truncate">@{p.handle.replace(/^@/, '')}</div>}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <Pill tone={OUTREACH_TONE[p.outreach_status] || 'idle'} className="!text-[9px]">{(p.outreach_status || '—').replace(/_/g, ' ').toUpperCase()}</Pill>
                          {kind && <span className="text-[10px] rounded-full bg-ink-800 px-2 py-0.5 text-ink-300 ring-1 ring-ink-700">{kind}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-display font-bold tabular-nums ${score != null && score >= 70 ? 'text-emerald-600' : score != null && score >= 40 ? 'text-amber-600' : 'text-ink-400'}`}>
                          {score ?? '—'}
                        </div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-ink-500">skor</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-ink-900/80 ring-1 ring-ink-800 py-1.5">
                        <div className="text-[10px] text-ink-500">Takipçi</div>
                        <div className="text-xs font-semibold text-ink-200 tabular-nums">{p.followers != null ? p.followers.toLocaleString('tr-TR') : '—'}</div>
                      </div>
                      <div className="rounded-xl bg-ink-900/80 ring-1 ring-ink-800 py-1.5">
                        <div className="text-[10px] text-ink-500">Ort. etk.</div>
                        <div className="text-xs font-semibold text-ink-200 tabular-nums">{p.avg_engagement != null ? p.avg_engagement.toLocaleString('tr-TR') : '—'}</div>
                      </div>
                      <div className="rounded-xl bg-ink-900/80 ring-1 ring-ink-800 py-1.5">
                        <div className="text-[10px] text-ink-500">Oran</div>
                        <div className="text-xs font-semibold text-ink-200 tabular-nums">{p.engagement_rate != null ? `%${p.engagement_rate}` : '—'}</div>
                      </div>
                    </div>
                    {p.notes && <p className="text-[11px] text-ink-400 line-clamp-2 leading-relaxed">{p.notes}</p>}
                    <div className="flex items-center justify-between pt-1 border-t border-ink-800/80">
                      <span className="text-[10px] font-mono text-ink-500">{relTime(p.created_at)}</span>
                      <span className="text-[11px] font-semibold text-brand-green inline-flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <Sparkles className="w-3 h-3" /> Detay
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}
      {adding && <CompanyModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); q.reload(); }} />}
      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title={selected.profile_name || selected.handle || 'Sosyal aday'}
          footer={
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>Kapat</Button>
              {selected.profile_url && (
                <Button variant="primary" icon={<ExternalLink className="w-4 h-4" />} onClick={() => window.open(selected.profile_url!, '_blank', 'noopener,noreferrer')}>
                  Profili aç
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-700 to-sky-700 flex items-center justify-center shrink-0 shadow-lg">
                <span className="font-display text-xl font-bold text-white">{initials(selected.profile_name || selected.handle)}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <PlatformBadge platform={selected.platform} size="md" />
                  <span className="font-display text-lg font-semibold text-ink-100">{selected.profile_name || selected.handle}</span>
                </div>
                {selected.handle && <div className="text-sm font-mono text-ink-400 mt-0.5">@{selected.handle.replace(/^@/, '')}</div>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Pill tone={OUTREACH_TONE[selected.outreach_status] || 'idle'}>{(selected.outreach_status || '—').replace(/_/g, ' ').toUpperCase()}</Pill>
                  {KIND_LABEL[selected.account_kind ?? ''] && <span className="text-[11px] rounded-full bg-ink-800 px-2.5 py-0.5 text-ink-300 ring-1 ring-ink-700">{KIND_LABEL[selected.account_kind!]}</span>}
                  <Pill tone={scoreTone(selected.relevance_score)}>Skor {selected.relevance_score ?? '—'}</Pill>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Platform', value: selected.platform },
                { label: 'Takipçi', value: selected.followers != null ? selected.followers.toLocaleString('tr-TR') : '—' },
                { label: 'Ort. etkileşim', value: selected.avg_engagement != null ? selected.avg_engagement.toLocaleString('tr-TR') : '—' },
                { label: 'Etkileşim oranı', value: selected.engagement_rate != null ? `%${selected.engagement_rate}` : '—' },
              ].map((x) => (
                <div key={x.label} className="rounded-xl bg-ink-900 ring-1 ring-ink-800 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">{x.label}</div>
                  <div className="text-sm font-semibold text-ink-100 mt-1 tabular-nums">{x.value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3 space-y-2 text-xs">
              <div className="flex justify-between gap-2"><span className="text-ink-500">KVKK / onay</span><span className="text-ink-200 font-mono">{selected.consent_status || '—'}</span></div>
              <div className="flex justify-between gap-2"><span className="text-ink-500">Takip durumu</span><span className="text-ink-200">{selected.follow_status || '—'}</span></div>
              <div className="flex justify-between gap-2"><span className="text-ink-500">Keşif</span><span className="text-ink-200 font-mono">{fmtDateTime(selected.created_at)}</span></div>
            </div>

            {selected.notes && (
              <div>
                <div className="text-[11px] font-semibold text-ink-300 mb-1">Not / neden uygun</div>
                <p className="text-sm text-ink-200 leading-relaxed whitespace-pre-wrap">{selected.notes}</p>
              </div>
            )}

            <Notice tone="info">Otomatik ticari mesaj gönderilmez. Profili inceleyip manuel iletişim veya takip listesine taşıyın.</Notice>
          </div>
        </Modal>
      )}
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
