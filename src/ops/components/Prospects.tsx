// MÜŞTERİ ADAYLARI: kendi gönderilerimize "fiyat / konum / bilgi" soran kişiler. Kişi bize soruyu kendisi yazdı → yalnızca bu talebe dönüş için
// (KVKK meşru menfaat) DM taslağı hazırlanır; DM'i yönetici kendisi gönderir. Telefon/e-posta yalnızca kişi onay verirse müşteri kaydına geçer.
import { useMemo, useState } from 'react';
import { Copy, ExternalLink, MessageCircle, UserPlus } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { errorText } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { useSession } from '../session';
import { Button, cx, Field, Modal, Notice, StateView } from '../ui';

interface Row { id: string; username: string | null; text: string | null; intent: string; permalink: string | null; commented_at: string | null; follow_stage: string; followed_at: string | null; customer_id: string | null }

const STAGES: Array<{ id: string; label: string; cls: string }> = [
  { id: 'yeni', label: 'Yeni', cls: 'bg-amber-100 text-amber-800' },
  { id: 'dm_yazildi', label: 'DM yazıldı', cls: 'bg-sky-100 text-sky-800' },
  { id: 'cevap_geldi', label: 'Cevap geldi', cls: 'bg-indigo-100 text-indigo-800' },
  { id: 'teklif', label: 'Teklif verildi', cls: 'bg-violet-100 text-violet-800' },
  { id: 'musteri', label: 'Müşteri', cls: 'bg-emerald-100 text-emerald-800' },
  { id: 'ilgisiz', label: 'İlgisiz', cls: 'bg-ink-800 text-ink-400' },
];
const INTENT: Record<string, string> = { price: '💰 Fiyat sordu', location: '📍 Konum sordu', info: 'ℹ️ Bilgi istedi' };

function dmText(r: Row) {
  const hi = 'Merhaba, Embay Yapı’dan yazıyorum 🙏';
  if (r.intent === 'price') return `${hi} Instagram gönderimize fiyat sorusu bırakmışsınız, teşekkür ederiz. Anahtar teslim fiyat projeye göre hesaplanıyor: arsanızın bulunduğu il/ilçe ve düşündüğünüz yaklaşık m²’yi yazarsanız ücretsiz ön teklif hazırlayalım. İsterseniz WhatsApp: 0531 436 29 04`;
  if (r.intent === 'location') return `${hi} Gönderimize konum sorusu bırakmışsınız. Türkiye’nin 81 iline kurulum yapıyoruz; sizin arsanız hangi il/ilçede? Bilgi verirsem sevinirim. WhatsApp: 0531 436 29 04`;
  return `${hi} Gönderimize sorunuz için teşekkürler. Hangi konuda bilgi almak istersiniz? Arsanız ve düşündüğünüz ev hakkında kısaca yazarsanız yardımcı olalım. WhatsApp: 0531 436 29 04`;
}

export function Prospects({ compact = false }: { compact?: boolean }) {
  const session = useSession();
  const [filter, setFilter] = useState<'aktif' | 'hepsi'>('aktif');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [convert, setConvert] = useState<Row | null>(null);
  const q = useQuery(async () => unwrap(await db().from('social_inbox').select('id,username,text,intent,permalink,commented_at,follow_stage,followed_at,customer_id')
    .in('intent', ['price', 'location', 'info']).is('archived_at', null).order('commented_at', { ascending: false }).limit(300)) as Row[], [] as Row[], [], ['social_inbox']);
  const rows = useMemo(() => q.data.filter((r) => filter === 'hepsi' || !['musteri', 'ilgisiz'].includes(r.follow_stage)), [q.data, filter]);
  const setStage = async (r: Row, stage: string) => {
    const { error } = await db().from('social_inbox').update({ follow_stage: stage, followed_at: new Date().toISOString() }).eq('id', r.id);
    if (error) setMsg({ tone: 'error', text: errorText(error) }); else q.reload();
  };
  const copyDm = async (r: Row) => {
    await navigator.clipboard?.writeText(dmText(r)).catch(() => undefined);
    if (r.username) window.open(`https://ig.me/m/${encodeURIComponent(r.username)}`, '_blank', 'noopener');
    if (r.follow_stage === 'yeni') await setStage(r, 'dm_yazildi');
    setMsg({ tone: 'ok', text: 'DM metni kopyalandı — açılan Instagram sohbetine yapıştırıp gönderin.' });
  };
  const counts = useMemo(() => ({ yeni: q.data.filter((r) => r.follow_stage === 'yeni').length, toplam: q.data.length }), [q.data]);

  if (q.loading && !q.data.length) return <StateView kind="loading" />;
  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] text-ink-400 flex-1 min-w-[16rem]">Gönderilerimize fiyat, konum veya bilgi soran {counts.toplam} kişi. <b>{counts.yeni}</b> kişiye henüz dönülmedi. “DM yaz” metni kopyalar ve Instagram sohbetini açar; mesajı siz gönderirsiniz.</p>
          {(['aktif', 'hepsi'] as const).map((f) => <button key={f} type="button" onClick={() => setFilter(f)} className={cx('ops-chip', filter === f && '!bg-[#262A6B] !text-white !ring-transparent')}>{f === 'aktif' ? 'Takipte' : 'Hepsi'}</button>)}
        </div>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {convert && <ConvertModal row={convert} userId={session.userId} onClose={() => setConvert(null)} onDone={(t) => { setConvert(null); setMsg({ tone: 'ok', text: t }); q.reload(); }} />}
      {!rows.length ? <StateView kind="empty" compact title="Takipte kişi yok" message="Yeni fiyat sorusu geldiğinde burada ve Telegram’da görünür." /> : (
        <ul className="space-y-1.5">
          {(compact ? rows.slice(0, 5) : rows).map((r) => {
            const st = STAGES.find((s) => s.id === r.follow_stage) ?? STAGES[0];
            return (
              <li key={r.id} className="rounded-xl ring-1 ring-ink-700/60 bg-white p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-semibold text-ink-100 text-[13px]">{r.username ? `@${r.username}` : 'Instagram kullanıcısı'}</span>
                    <span className="text-ink-400">{INTENT[r.intent]}</span>
                    <span className={cx('rounded-full px-2 py-0.5 font-semibold', st.cls)}>{st.label}</span>
                    <span className="text-ink-500 font-mono">{r.commented_at ? fmtDateTime(r.commented_at) : ''}</span>
                  </div>
                  <div className="text-[12px] text-ink-300 line-clamp-2 mt-0.5">“{r.text}”</div>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {r.permalink && <a href={r.permalink} target="_blank" rel="noreferrer" className="ops-chip"><ExternalLink className="w-3.5 h-3.5" />Gönderi</a>}
                  <button type="button" onClick={() => copyDm(r)} className="ops-chip !bg-[#1E3FA0] !text-white !ring-transparent"><MessageCircle className="w-3.5 h-3.5" />DM yaz</button>
                  {!compact && (
                    <select value={r.follow_stage} onChange={(e) => setStage(r, e.target.value)} className="ops-input !py-1 !text-[12px] !w-auto">
                      {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  )}
                  {!compact && !r.customer_id && <button type="button" onClick={() => setConvert(r)} className="ops-chip"><UserPlus className="w-3.5 h-3.5" />Müşteriye çevir</button>}
                  {compact && <button type="button" onClick={() => navigator.clipboard?.writeText(dmText(r)).catch(() => undefined)} title="Metni kopyala" className="ops-chip"><Copy className="w-3.5 h-3.5" /></button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ConvertModal({ row, userId, onClose, onDone }: { row: Row; userId: string | null; onClose: () => void; onDone: (t: string) => void }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [ilce, setIlce] = useState(''); const [note, setNote] = useState(row.text ?? '');
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      if (!name.trim()) throw new Error('Ad soyad girin');
      if (phone.trim() && !consent) throw new Error('Telefon kaydı için kişinin onayı gerekir (KVKK)');
      const now = new Date().toISOString();
      const { data, error } = await db().from('construction_customers').insert({ customer_kind: 'bireysel', full_name: name.trim(), phone: phone.trim() || null, ilce: ilce.trim() || null,
        project_type: 'konut', project_stage: 'fikir', source: 'social', status: 'gorusme', priority: row.intent === 'price' ? 'yuksek' : 'normal',
        notes: `Instagram${row.username ? ` @${row.username}` : ''}: “${note}”${row.permalink ? `\n${row.permalink}` : ''}`,
        kvkk_consent: consent, kvkk_consent_at: consent ? now : null, created_by: userId }).select('id').single();
      if (error) throw error;
      const up = await db().from('social_inbox').update({ follow_stage: 'musteri', customer_id: data.id, followed_at: now }).eq('id', row.id);
      if (up.error) throw up.error;
      onDone(`${name.trim()} İnşaat Müşterileri listesine eklendi.`);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Müşteriye çevir" footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} onClick={save} icon={<UserPlus className="w-4 h-4" />}>Kaydet</Button></>}>
      <div className="space-y-3">
        <Field label="Ad soyad"><input className="ops-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Telefon (isteğe bağlı)"><input className="ops-input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="İlçe / il"><input className="ops-input" value={ilce} onChange={(e) => setIlce(e.target.value)} /></Field>
        <Field label="Not"><textarea className="ops-input min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <label className="flex items-start gap-2 text-[12px] text-ink-300">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          Kişi, iletişim bilgilerinin teklif ve görüşme için kaydedilmesine onay verdi (KVKK). Onay yoksa telefon kaydedilmez.
        </label>
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Modal>
  );
}
