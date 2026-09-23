// Canlı rapor penceresi: görev çalışırken de açılır, bulgular geldikçe güncellenir. Kurumsal başlıklı,
// her kayıtta yönlendirme butonları (kaynağa git, ara, WhatsApp, e-posta, portföye arşivle).
import { useMemo, useState } from 'react';
import { Archive, Download, ExternalLink, Globe, Mail, MessageCircle, Phone, Printer, Radio, Search } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime } from '../lib/format';
import type { Mission, MissionFinding } from '../lib/types';
import { Button, cx, Modal, Pill, StateView } from '../ui';

/** Türkiye numarasını wa.me biçimine çevirir (905xxxxxxxxx). Geçersizse null. */
export function waNumber(phone?: string | null) {
  const d = (phone || '').replace(/\D/g, '');
  if (/^90\d{10}$/.test(d)) return d;
  if (/^0\d{10}$/.test(d)) return `9${d}`;
  if (/^\d{10}$/.test(d)) return `90${d}`;
  return null;
}
const WA_TEXT = (f: MissionFinding) => `Merhaba${f.company ? ` ${f.company}` : ''}, "${f.title.slice(0, 80)}" ilanınızı gördük. Embay Yapı & Şahin Manitou olarak operatörlü Manitou / teleskopik yükleyici kiralama ve inşaat hizmetlerimizle destek olabiliriz. Bilgi almak ister misiniz? 0531 436 29 04`;

function FindingCard({ f, i, m }: { f: MissionFinding; i: number; m: Mission }) {
  const [archived, setArchived] = useState<string | null>(null);
  const wa = waNumber(f.phone);
  const archive = async () => {
    const { data, error } = await db().rpc('portfolio_upsert_company', { p: { firm_name: (f.company || f.title).slice(0, 160), source_url: f.url, public_phone: f.phone ?? null, public_email: f.email ?? null, website: f.website ?? null, ilce: f.location ?? null,
      ai_notes: `${f.title} — ${f.detail}`.slice(0, 1500), source: 'bot_mission', need: m.search_for ?? null }, p_bot_id: m.bot_id, p_run_id: null, p_finding_id: null });
    setArchived(error ? `Hata: ${error.message}` : (data as { action: string }).action === 'merged' ? 'Mevcut kayıtla birleşti' : 'Portföye eklendi');
  };
  return (
    <li className="rounded-2xl bg-white ring-1 ring-ink-700 p-3.5 space-y-2">
      <div className="flex items-start gap-2">
        <span className="shrink-0 w-6 h-6 rounded-full bg-brand-green text-white text-[11px] font-bold grid place-items-center">{i + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink-100">{f.title}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-400 mt-0.5">
            {f.company && <span>🏢 {f.company}</span>}{f.location && <span>📍 {f.location}</span>}{f.posted && <span>🗓 {f.posted}</span>}<span>{relTime(f.at)} bulundu</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-ink-300 whitespace-pre-line">{f.detail}</p>
      <div className="flex flex-wrap gap-1.5">
        <a href={f.url} target="_blank" rel="noreferrer" className="ops-chip"><ExternalLink className="w-3.5 h-3.5" />Kaynağa git</a>
        {f.phone && <a href={`tel:${f.phone.replace(/[^\d+]/g, '')}`} className="ops-chip"><Phone className="w-3.5 h-3.5" />{f.phone}</a>}
        {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(WA_TEXT(f))}`} target="_blank" rel="noreferrer" className="ops-chip !bg-emerald-600 !text-white !ring-emerald-600"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</a>}
        {f.email && <a href={`mailto:${f.email}`} className="ops-chip"><Mail className="w-3.5 h-3.5" />E-posta</a>}
        {f.website && <a href={f.website} target="_blank" rel="noreferrer" className="ops-chip"><Globe className="w-3.5 h-3.5" />Web</a>}
        {archived ? <span className="text-[11px] font-semibold text-emerald-700 self-center">{archived}</span>
          : <button type="button" onClick={archive} className="ops-chip"><Archive className="w-3.5 h-3.5" />Portföye arşivle</button>}
      </div>
    </li>
  );
}

export function LiveReport({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery(async () => unwrap(await db().from('bot_missions').select('*').eq('id', id).single()) as Mission, null as Mission | null, [id], ['bot_missions']);
  const [term, setTerm] = useState('');
  const m = q.data;
  const live = m && (m.status === 'running' || m.status === 'finalizing');
  const list = useMemo(() => {
    const t = term.trim().toLocaleLowerCase('tr-TR');
    return (m?.findings ?? []).map((f, i) => ({ f, i })).reverse().filter(({ f }) => !t || `${f.title} ${f.detail} ${f.company ?? ''} ${f.location ?? ''}`.toLocaleLowerCase('tr-TR').includes(t));
  }, [m?.findings, term]);
  const withPhone = (m?.findings ?? []).filter((f) => f.phone).length;

  const openHtml = (print: boolean) => {
    if (!m?.report_html) return;
    if (print) { const w = window.open('', '_blank'); if (w) { w.document.write(m.report_html); w.document.close(); setTimeout(() => w.print(), 300); } return; }
    const url = URL.createObjectURL(new Blob([m.report_html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${m.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60)}-rapor.html`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Modal open wide onClose={onClose} title={<span className="inline-flex items-center gap-2"><img src="/embay-mark.svg" alt="" className="w-6 h-6" />Canlı rapor</span>}
      footer={<>
        {m?.report_html && <><Button variant="ghost" onClick={() => openHtml(true)} icon={<Printer className="w-4 h-4" />}>PDF kaydet</Button><Button variant="ghost" onClick={() => openHtml(false)} icon={<Download className="w-4 h-4" />}>HTML indir</Button></>}
        <Button variant="primary" onClick={onClose}>Kapat</Button></>}>
      {!m ? <StateView kind="loading" compact /> : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4">
            <div className="flex items-center gap-3">
              <img src="/embay-mark.svg" alt="" className="w-11 h-11 rounded-xl ring-2 ring-white/40" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono tracking-widest opacity-80">EMBAY YAPI & ŞAHİN MANİTOU · BOT RAPORU</div>
                <div className="font-display font-semibold text-lg leading-tight truncate">{m.title}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="rounded-xl bg-white/15 py-2"><div className="text-xl font-bold tabular-nums">{m.findings.length}</div><div className="text-[10px] opacity-80">KAYIT</div></div>
              <div className="rounded-xl bg-white/15 py-2"><div className="text-xl font-bold tabular-nums">{withPhone}</div><div className="text-[10px] opacity-80">İLETİŞİMLİ</div></div>
              <div className="rounded-xl bg-white/15 py-2"><div className="text-xl font-bold tabular-nums">{m.sources.length}</div><div className="text-[10px] opacity-80">KAYNAK</div></div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[11px]">
              {live ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-emerald-700 px-2.5 py-0.5 font-bold"><Radio className="w-3.5 h-3.5 animate-pulse" />CANLI · bitiş {fmtDateTime(m.deadline_at)}</span>
                : <Pill tone={m.status === 'failed' ? 'stop' : 'go'}>{m.status === 'failed' ? 'HATA İLE BİTTİ' : 'TAMAMLANDI'}</Pill>}
              <span className="opacity-80">Adım {m.step_count}/{m.max_steps}</span>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input className="ops-input !pl-9" placeholder="Kayıtlarda ara (firma, ilçe, iş…)" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          {list.length === 0 ? <StateView kind={live ? 'loading' : 'empty'} title={live ? 'Bot araştırıyor…' : 'Veri bulunamadı'} message={live ? 'Yeni kayıtlar bulundukça bu pencerede anında görünür.' : undefined} compact />
            : <ul className={cx('space-y-2')}>{list.map(({ f, i }) => <FindingCard key={`${i}-${f.url}`} f={f} i={i} m={m} />)}</ul>}
          <p className="text-[10px] text-ink-500">Kayıtlar yalnızca herkese açık, kurumların kendi yayınladığı bilgilerden oluşur (KVKK). İletişim, onaylı ve ret seçeneği sunan mesajlarla yapılır.</p>
        </div>
      )}
    </Modal>
  );
}
