// Teklifler: müşteri kartından kalemli teklif → veritabanına kayıt (numara ve tutarlar sunucuda hesaplanır)
// → logolu PDF (yazdır/kaydet) → WhatsApp ile gönder → durum takibi (gönderildi / kabul / red).
import { useState } from 'react';
import { FileSignature, MessageCircle, Plus, Printer, Trash2 } from 'lucide-react';
import { errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import { Button, cx, Field, Modal, Notice, Pill, SavedStamp, StateView } from '../ui';
import { waNumber } from './LiveReport';

type Module = 'construction' | 'rental';
interface Item { desc: string; qty: number; unit: string; price: number }
interface Quote {
  id: string; quote_no: string; customer_module: Module; customer_id: string; customer_name: string; customer_phone: string | null; customer_email: string | null;
  brand: string; title: string; items: Item[]; vat_rate: number; subtotal: number; vat_amount: number; total: number; currency: string;
  valid_until: string | null; notes: string | null; status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'; created_at: string; updated_at: string;
}
const STATUS: Record<Quote['status'], { label: string; tone: 'idle' | 'info' | 'go' | 'stop' | 'wait' }> = {
  draft: { label: 'TASLAK', tone: 'idle' }, sent: { label: 'GÖNDERİLDİ', tone: 'info' }, accepted: { label: 'KABUL', tone: 'go' }, rejected: { label: 'RED', tone: 'stop' }, expired: { label: 'SÜRESİ DOLDU', tone: 'wait' },
};
const money = (n: number, cur = 'TRY') => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(Number(n) || 0);
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PRESETS: Record<Module, Item[]> = {
  rental: [{ desc: 'Manitou teleskopik yükleyici kiralama (operatörlü)', qty: 1, unit: 'gün', price: 0 }, { desc: 'Nakliye (gidiş-dönüş)', qty: 1, unit: 'sefer', price: 0 }],
  construction: [{ desc: 'Keşif ve proje hazırlığı', qty: 1, unit: 'iş', price: 0 }, { desc: 'Kaba inşaat işçiliği', qty: 1, unit: 'm²', price: 0 }],
};

/** Logolu teklif belgesi (yazdır → PDF olarak kaydet). */
export function quoteHtml(q: Quote) {
  const rows = q.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.desc)}</td><td class="r">${esc(i.qty)} ${esc(i.unit)}</td><td class="r">${money(i.price, q.currency)}</td><td class="r">${money(i.qty * i.price, q.currency)}</td></tr>`).join('');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(q.quote_no)} — ${esc(q.customer_name)}</title>
<style>body{font-family:system-ui,sans-serif;color:#0e1e16;margin:0;padding:28px}main{max-width:800px;margin:0 auto}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #16a34a;padding-bottom:14px}
.hd img{width:54px;height:54px}.brand b{font-size:18px;display:block}.brand small,.muted{color:#5a7266;font-size:12px}h1{font-size:20px;margin:22px 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
th{background:#f0fdf4;text-align:left;padding:8px;border-bottom:1px solid #bbf7d0}td{padding:8px;border-bottom:1px solid #eef7f1}.r{text-align:right}.tot td{border:0;padding:4px 8px}.tot .g{font-size:16px;font-weight:700;color:#15803d}
.box{background:#f8faf9;border-radius:10px;padding:12px;margin-top:16px;font-size:12px;white-space:pre-wrap}@media print{body{padding:0}}</style></head>
<body><main><div class="hd"><div style="display:flex;gap:12px;align-items:center"><img src="${location.origin}/embay-mark.svg" alt=""><div class="brand"><b>${esc(q.brand === 'Embay Yapı' ? 'Embay Yapı' : 'Şahin Manitou Kiralama')}</b><small>0531 436 29 04 · info@sahinmanitou.com</small></div></div>
<div style="text-align:right"><b>${esc(q.quote_no)}</b><div class="muted">${new Date(q.created_at).toLocaleDateString('tr-TR')}</div></div></div>
<h1>${esc(q.title)}</h1><div class="muted">Sayın ${esc(q.customer_name)}</div>
<table><thead><tr><th>#</th><th>Açıklama</th><th class="r">Miktar</th><th class="r">Birim fiyat</th><th class="r">Tutar</th></tr></thead><tbody>${rows}</tbody></table>
<table class="tot"><tr><td class="r">Ara toplam</td><td class="r" style="width:160px">${money(q.subtotal, q.currency)}</td></tr><tr><td class="r">KDV (%${esc(q.vat_rate)})</td><td class="r">${money(q.vat_amount, q.currency)}</td></tr><tr><td class="r g">Genel toplam</td><td class="r g">${money(q.total, q.currency)}</td></tr></table>
${q.valid_until ? `<p class="muted">Bu teklif ${new Date(q.valid_until).toLocaleDateString('tr-TR')} tarihine kadar geçerlidir.</p>` : ''}${q.notes ? `<div class="box">${esc(q.notes)}</div>` : ''}
<p class="muted" style="margin-top:28px">Teklifimizi değerlendirmeniz için teşekkür ederiz. Sorularınız için 0531 436 29 04 numarasından bize ulaşabilirsiniz.</p></main></body></html>`;
}

function printQuote(q: Quote) {
  const w = window.open('', '_blank'); if (!w) return;
  w.document.write(quoteHtml(q)); w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
}
function waText(q: Quote) {
  const lines = q.items.map((i) => `• ${i.desc}: ${i.qty} ${i.unit} × ${money(i.price, q.currency)}`);
  return [`Merhaba ${q.customer_name},`, `${q.quote_no} numaralı teklifimiz: *${q.title}*`, ...lines, `Ara toplam: ${money(q.subtotal, q.currency)}`, `KDV %${q.vat_rate}: ${money(q.vat_amount, q.currency)}`, `*Genel toplam: ${money(q.total, q.currency)}*`,
    q.valid_until ? `Geçerlilik: ${new Date(q.valid_until).toLocaleDateString('tr-TR')}` : '', 'Detaylı PDF teklifi ayrıca iletebiliriz. Şahin Manitou · 0531 436 29 04'].filter(Boolean).join('\n');
}

function QuoteEditor({ module, customer, onClose, onSaved }: { module: Module; customer: { id: string; name: string; phone: string | null; email: string | null }; onClose: () => void; onSaved: () => void }) {
  const in14 = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const [f, setF] = useState({ title: module === 'rental' ? 'Manitou kiralama teklifi' : 'İnşaat işleri teklifi', brand: module === 'rental' ? 'Şahin Manitou' : 'Embay Yapı', vat_rate: 20, valid_until: in14, notes: '', items: PRESETS[module] });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const sub = f.items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const setItem = (n: number, patch: Partial<Item>) => setF({ ...f, items: f.items.map((i, k) => (k === n ? { ...i, ...patch } : i)) });
  const valid = f.title.trim().length >= 2 && f.items.length > 0 && f.items.every((i) => i.desc.trim() && i.qty > 0 && i.price >= 0) && sub > 0;
  const save = async () => {
    setBusy(true); setErr(null);
    const { error } = await db().from('quotes').insert({ customer_module: module, customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone, customer_email: customer.email,
      title: f.title.trim(), brand: f.brand, vat_rate: f.vat_rate, valid_until: f.valid_until || null, notes: f.notes.trim() || null, items: f.items.map((i) => ({ ...i, desc: i.desc.trim() })) });
    setBusy(false); if (error) setErr(errorText(error)); else onSaved();
  };
  return (
    <Modal open wide onClose={onClose} title={<span className="inline-flex items-center gap-2"><FileSignature className="w-4 h-4 text-brand-green" />Yeni teklif · {customer.name}</span>}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} disabled={!valid} onClick={save}>Teklifi kaydet</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Teklif başlığı" className="sm:col-span-2"><input className="ops-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Firma"><select className="ops-input" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}><option>Şahin Manitou</option><option>Embay Yapı</option></select></Field>
        </div>
        <div className="space-y-2">
          {f.items.map((i, n) => (
            <div key={n} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_70px_80px_110px_auto] gap-2 items-end rounded-xl ring-1 ring-ink-800 p-2">
              <Field label={`Kalem ${n + 1}`} className="col-span-2 sm:col-span-1"><input className="ops-input" value={i.desc} onChange={(e) => setItem(n, { desc: e.target.value })} /></Field>
              <Field label="Miktar"><input type="number" min={0} step="0.5" inputMode="decimal" className="ops-input" value={i.qty} onChange={(e) => setItem(n, { qty: Number(e.target.value) })} /></Field>
              <Field label="Birim"><input className="ops-input" value={i.unit} onChange={(e) => setItem(n, { unit: e.target.value })} /></Field>
              <Field label="Birim fiyat ₺"><input type="number" min={0} inputMode="decimal" className="ops-input" value={i.price} onChange={(e) => setItem(n, { price: Number(e.target.value) })} /></Field>
              <Button variant="ghost" aria-label="Kalemi sil" disabled={f.items.length === 1} onClick={() => setF({ ...f, items: f.items.filter((_, k) => k !== n) })} icon={<Trash2 className="w-4 h-4" />} />
            </div>
          ))}
          <Button variant="ghost" onClick={() => setF({ ...f, items: [...f.items, { desc: '', qty: 1, unit: 'adet', price: 0 }] })} icon={<Plus className="w-4 h-4" />}>Kalem ekle</Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="KDV %"><select className="ops-input" value={f.vat_rate} onChange={(e) => setF({ ...f, vat_rate: Number(e.target.value) })}>{[0, 1, 10, 20].map((v) => <option key={v} value={v}>%{v}</option>)}</select></Field>
          <Field label="Geçerlilik tarihi"><input type="date" className="ops-input" value={f.valid_until} onChange={(e) => setF({ ...f, valid_until: e.target.value })} /></Field>
          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-2.5 text-xs col-span-2 sm:col-span-1">
            <div>Ara toplam: <b>{money(sub)}</b></div><div>KDV: <b>{money(sub * f.vat_rate / 100)}</b></div><div className="text-emerald-800 font-bold">Toplam: {money(sub * (1 + f.vat_rate / 100))}</div>
          </div>
        </div>
        <Field label="Notlar (ödeme, teslim, şartlar)"><textarea className="ops-input min-h-[70px]" placeholder="Örn: Fiyatlara operatör ve yakıt dahildir. Ödeme: iş bitiminde." value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        {!valid && <div className="text-[11px] text-amber-700">Her kalemde açıklama, miktar ve fiyat olmalı; toplam 0’dan büyük olmalı.</div>}
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}

export function QuotesSection({ module, customer }: { module: Module; customer: { id: string; name: string; phone: string | null; email: string | null } }) {
  const q = useQuery(async () => unwrap(await db().from('quotes').select('*').eq('customer_module', module).eq('customer_id', customer.id).order('created_at', { ascending: false })) as Quote[], [] as Quote[], [customer.id], ['quotes']);
  const [adding, setAdding] = useState(false); const [err, setErr] = useState<string | null>(null); const [stamp, setStamp] = useState<{ id: string; at: string } | null>(null);
  const setStatus = async (qt: Quote, status: Quote['status']) => {
    setErr(null);
    const { data, error } = await db().from('quotes').update({ status }).eq('id', qt.id).select('updated_at').single();
    if (error) setErr(errorText(error)); else { setStamp({ id: qt.id, at: data.updated_at }); q.reload(); }
  };
  const sendWa = (qt: Quote) => {
    const n = waNumber(qt.customer_phone);
    window.open(`https://wa.me/${n ?? ''}?text=${encodeURIComponent(waText(qt))}`, '_blank', 'noopener');
    if (qt.status === 'draft') setStatus(qt, 'sent');
  };
  return (
    <div className="rounded-xl ring-1 ring-ink-700 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-ink-100 flex items-center gap-2 text-sm"><FileSignature className="w-4 h-4 text-brand-green" />Teklifler</div>
        <Button variant="primary" onClick={() => setAdding(true)} icon={<Plus className="w-4 h-4" />}>Teklif hazırla</Button>
      </div>
      {err && <Notice tone="error">{err}</Notice>}
      {q.loading ? <StateView kind="loading" compact /> : q.data.length === 0 ? <div className="text-xs text-ink-400">Bu müşteriye henüz teklif hazırlanmadı.</div> : (
        <ul className="space-y-2">{q.data.map((qt) => (
          <li key={qt.id} className="rounded-lg bg-ink-900/60 ring-1 ring-ink-800 p-2.5 text-xs space-y-1.5">
            <div className="flex flex-wrap items-center gap-2"><b className="text-ink-100">{qt.quote_no}</b><span className="text-ink-300 flex-1 min-w-[120px] truncate">{qt.title}</span><Pill tone={STATUS[qt.status].tone}>{STATUS[qt.status].label}</Pill></div>
            <div className="text-ink-400">{money(qt.total, qt.currency)} (KDV dahil) · {fmtDateTime(qt.created_at)}{qt.valid_until ? ` · geçerlilik ${new Date(qt.valid_until).toLocaleDateString('tr-TR')}` : ''}</div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => printQuote(qt)} className="ops-chip"><Printer className="w-3.5 h-3.5" />PDF</button>
              <button type="button" onClick={() => sendWa(qt)} className={cx('ops-chip', '!bg-emerald-600 !text-white !ring-emerald-600')}><MessageCircle className="w-3.5 h-3.5" />WhatsApp ile gönder</button>
              {qt.status !== 'accepted' && <button type="button" onClick={() => setStatus(qt, 'accepted')} className="ops-chip">Kabul edildi</button>}
              {qt.status !== 'rejected' && <button type="button" onClick={() => setStatus(qt, 'rejected')} className="ops-chip">Reddedildi</button>}
            </div>
            {stamp?.id === qt.id && <SavedStamp at={stamp.at} />}
          </li>))}</ul>
      )}
      {adding && <QuoteEditor module={module} customer={customer} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); q.reload(); }} />}
    </div>
  );
}
