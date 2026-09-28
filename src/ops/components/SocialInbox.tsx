// GELEN SORULAR: kendi Instagram gönderilerimize gelen yorumlar (fiyat / bilgi / konum). Yorum botu yenilerine otomatik,
// kibar bir yanıt verir; eski ve özel sorular burada tek tıkla yanıtlanır. Fiyat uydurulmaz — kişi WhatsApp/DM'e yönlendirilir.
import { useMemo, useState } from 'react';
import { Archive, Bot, ExternalLink, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { callOps } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { cx, Notice, StateView } from '../ui';

interface Row { id: string; username: string | null; text: string | null; intent: string; permalink: string | null; commented_at: string | null; replied: boolean; reply_text: string | null; reply_source: string | null; status: string }
const LABEL: Record<string, [string, string]> = {
  price: ['Fiyat sorusu', 'bg-amber-100 text-amber-800'], info: ['Bilgi sorusu', 'bg-sky-100 text-sky-800'], location: ['Konum / şehir', 'bg-violet-100 text-violet-800'],
  praise: ['Övgü', 'bg-emerald-100 text-emerald-800'], other: ['Diğer', 'bg-ink-900 text-ink-300'],
};
const PHONE = '0531 436 29 04';
const SUGGEST: Record<string, string> = {
  price: `Merhaba 👋 İlginiz için teşekkür ederiz! Fiyat; metrekare, kat sayısı, arsanın konumu ve malzeme tercihine göre değişiyor. Size özel net teklif için DM'den ya da WhatsApp ${PHONE}'ten yazabilirsiniz 🙏`,
  info: `Merhaba, güzel soru 👍 Detaylı bilgi için DM'den ya da WhatsApp ${PHONE}'ten ulaşabilirsiniz; ekibimiz en kısa sürede dönüş yapacak.`,
  location: `Merhaba 👋 Merkezimiz Çatalca / İstanbul; farklı şehirlerdeki projeler için de ön görüşme yapıyoruz. Konum ve proje detayını WhatsApp ${PHONE}'e yazabilirsiniz 🙏`,
  praise: 'Çok teşekkür ederiz 🙏', other: 'Teşekkür ederiz 🙏',
};

export function SocialInbox() {
  const q = useQuery(async () => unwrap(await db().from('social_inbox').select('*').is('archived_at', null).order('commented_at', { ascending: false }).limit(300)) as Row[], [] as Row[], [], ['social_inbox']);
  const [tab, setTab] = useState<'open' | 'all'>('open');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const leads = q.data.filter((r) => ['price', 'info', 'location'].includes(r.intent));
  const open = leads.filter((r) => !r.replied);
  const rows = useMemo(() => (tab === 'open' ? open : q.data), [tab, open, q.data]);
  const bot = q.data.filter((r) => r.reply_source === 'bot').length;

  const reply = async (r: Row) => {
    setBusy(r.id); setMsg(null);
    try { await callOps('inbox_reply', { id: r.id, message: draft[r.id] ?? SUGGEST[r.intent] ?? SUGGEST.other }); setMsg({ tone: 'ok', text: 'Yanıt gönderildi (Instagram’da yayında).' }); await q.reload(); }
    catch (e) { setMsg({ tone: 'error', text: (e as Error).message }); } finally { setBusy(null); }
  };
  const archive = async (r: Row) => { await db().from('social_inbox').update({ archived_at: new Date().toISOString(), status: 'archived' }).eq('id', r.id); await q.reload(); };
  const sync = async () => { setBusy('sync'); try { const x = await callOps<{ found?: number; replied?: number }>('inbox_sync'); setMsg({ tone: 'ok', text: `Tarandı: ${x?.found ?? 0} yeni yorum, ${x?.replied ?? 0} otomatik yanıt.` }); await q.reload(); } catch (e) { setMsg({ tone: 'error', text: (e as Error).message }); } finally { setBusy(null); } };

  if (q.loading && !q.data.length) return <StateView kind="loading" compact />;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#0F1A33] via-[#1B2B55] to-[#0F1A33] text-white p-4">
        <div className="text-[10px] font-mono tracking-widest text-[#E2C98F]">YORUM BOTU · MÜŞTERİ TALEPLERİ</div>
        <div className="font-display text-lg font-semibold mt-0.5">{open.length} yanıt bekleyen soru · {leads.length} toplam talep</div>
        <p className="text-[12px] text-[#C8D1E3] mt-1">Instagram gönderilerimize gelen fiyat, bilgi ve konum soruları. Bot, yenilerine 10 dakika içinde kibar bir yanıt verip kişiyi WhatsApp'a yönlendirir ({bot} otomatik yanıt). Eski sorular için aşağıdan tek tıkla yanıt gönderin.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={sync} disabled={busy === 'sync'} className="ops-chip !bg-[#C9A45C] !text-[#0A1226] !ring-transparent"><RefreshCw className={cx('w-3.5 h-3.5', busy === 'sync' && 'animate-spin')} />Şimdi tara</button>
          <button type="button" onClick={() => setTab('open')} className={cx('ops-chip', tab === 'open' && '!bg-white !text-[#0F1A33]')}>Yanıt bekleyen ({open.length})</button>
          <button type="button" onClick={() => setTab('all')} className={cx('ops-chip', tab === 'all' && '!bg-white !text-[#0F1A33]')}>Tüm yorumlar ({q.data.length})</button>
        </div>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!rows.length ? <StateView kind="empty" title={tab === 'open' ? 'Yanıt bekleyen soru yok 🎉' : 'Henüz yorum yok'} message="Bot her 10 dakikada bir Instagram yorumlarını tarar." /> : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rows.map((r) => {
            const [label, cls] = LABEL[r.intent] ?? LABEL.other;
            return (
              <li key={r.id} className={cx('rounded-2xl bg-white ring-1 p-3.5 shadow-sm', r.replied ? 'ring-emerald-200' : 'ring-ink-700/70')}>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-10 h-10 rounded-xl grid place-items-center text-white bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400"><MessageCircle className="w-5 h-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-ink-100">{r.username ? `@${r.username}` : 'Instagram kullanıcısı'}</span>
                      <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold', cls)}>{label}</span>
                      {r.replied && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white inline-flex items-center gap-1">{r.reply_source === 'bot' && <Bot className="w-3 h-3" />}Yanıtlandı</span>}
                    </div>
                    <p className="text-[13px] text-ink-200 mt-1">“{r.text}”</p>
                    <div className="text-[10px] text-ink-400 mt-0.5">{fmtDateTime(r.commented_at)}</div>
                    {r.reply_text && <p className="mt-1.5 text-[12px] text-emerald-800 bg-emerald-50 rounded-lg px-2 py-1">↳ {r.reply_text}</p>}
                  </div>
                </div>
                {!r.replied && (
                  <div className="mt-2.5 space-y-2">
                    <textarea className="ops-input text-[12px] w-full" rows={3} value={draft[r.id] ?? SUGGEST[r.intent] ?? SUGGEST.other} onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))} />
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" disabled={busy === r.id} onClick={() => reply(r)} className="ops-chip !bg-[#0F1A33] !text-white !ring-transparent"><Send className="w-3.5 h-3.5" />{busy === r.id ? 'Gönderiliyor…' : 'Instagram’da yanıtla'}</button>
                      {r.permalink && <a href={r.permalink} target="_blank" rel="noreferrer" className="ops-chip"><ExternalLink className="w-3.5 h-3.5" />Gönderiyi aç</a>}
                      <button type="button" onClick={() => archive(r)} className="ops-chip"><Archive className="w-3.5 h-3.5" />Arşivle</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
