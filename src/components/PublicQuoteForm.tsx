import { useState } from 'react';
import { CheckCircle2, Send, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AYDINLATMA_VERSION = 'web-2026-09';

/** Kurumsal sitedeki KVKK onaylı teklif formu → lead_inbox (anon insert politikası). */
export function PublicQuoteForm({ defaultDemand = 'manitou_kiralama' }: { defaultDemand?: 'manitou_kiralama' | 'kentsel_donusum' | 'konut_insaati' | 'diger' }) {
  const [f, setF] = useState({ full_name: '', phone: '', email: '', ilce: '', demand: defaultDemand, note: '', kvkk: false, ticari: false });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const digits = f.phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) { setError('Lütfen geçerli bir telefon numarası girin.'); return; }
    if (!f.kvkk) { setError('Devam etmek için aydınlatma metnini onaylayın.'); return; }
    setState('sending'); setError('');
    const { error: err } = await supabase.from('lead_inbox').insert({
      full_name: f.full_name.trim().slice(0, 120) || null, phone: f.phone.trim(), email: f.email.trim() || null, ilce: f.ilce.trim().slice(0, 60) || null,
      demand: f.demand, note: f.note.trim().slice(0, 1000) || null, kvkk_aydinlatma_onay: true, aydinlatma_version: AYDINLATMA_VERSION,
      ticari_ileti_izni: f.ticari, izin_kanallari: f.ticari ? ['arama', 'whatsapp'] : [], consent_source: 'web_form',
      page_url: window.location.href.slice(0, 300), user_agent: navigator.userAgent.slice(0, 300),
    });
    if (err) { setState('error'); setError('Talebiniz gönderilemedi. Lütfen telefonla ulaşın: 0531 436 29 04'); return; }
    setState('sent');
  };

  if (state === 'sent') {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h3 className="text-xl font-extrabold text-slate-900 mt-3">Talebiniz alındı</h3>
        <p className="text-sm text-slate-600 mt-1">Ekibimiz en kısa sürede sizi arayacak.</p>
      </div>
    );
  }

  const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm focus:outline-none focus:border-emerald-500';
  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Hızlı teklif</span>
        <h3 className="text-2xl font-extrabold text-slate-900 mt-1">Size dönelim</h3>
        <p className="text-sm text-slate-500 mt-1">Makine kiralama veya inşaat talebinizi bırakın; aynı gün dönüş yapalım.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Ad soyad" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        <input className={input} placeholder="Telefon *" required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className={input} placeholder="E-posta (isteğe bağlı)" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={input} placeholder="İlçe / şantiye konumu" value={f.ilce} onChange={(e) => setF({ ...f, ilce: e.target.value })} />
        <select className={input} value={f.demand} onChange={(e) => setF({ ...f, demand: e.target.value as typeof f.demand })}>
          <option value="manitou_kiralama">Manitou / iş makinesi kiralama</option>
          <option value="kentsel_donusum">Kentsel dönüşüm</option>
          <option value="konut_insaati">Konut inşaatı</option>
          <option value="diger">Diğer</option>
        </select>
        <input className={input} placeholder="Kısa not (yükseklik, süre, tarih…)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </div>
      <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" className="mt-0.5" checked={f.kvkk} onChange={(e) => setF({ ...f, kvkk: e.target.checked })} />
        Kişisel verilerimin talebime dönüş yapılması amacıyla işlenmesine ilişkin aydınlatma metnini okudum. (Veriler 2 yıl saklanır, talep halinde silinir.)</label>
      <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" className="mt-0.5" checked={f.ticari} onChange={(e) => setF({ ...f, ticari: e.target.checked })} />
        Kampanya ve bilgilendirme amaçlı arama / WhatsApp mesajı almak istiyorum (isteğe bağlı ticari ileti izni).</label>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button disabled={state === 'sending'} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-sm disabled:opacity-60">
        <Send className="w-4 h-4" /> {state === 'sending' ? 'Gönderiliyor…' : 'Teklif iste'}
      </button>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="w-3.5 h-3.5" /> KVKK uyumlu · Bilgileriniz üçüncü kişilerle paylaşılmaz.</p>
    </form>
  );
}
