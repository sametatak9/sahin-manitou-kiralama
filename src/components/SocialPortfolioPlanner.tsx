import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ExternalLink, Image, Instagram, Link2, Plus, Send, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Draft = {
  id: string;
  title: string;
  body: string;
  networks: string[];
  platform_targets: string[];
  scheduled_at: string | null;
  status: string;
  portfolio_name: string | null;
  content_pillar: string | null;
  design_provider: string | null;
  design_url: string | null;
  special_day_key: string | null;
  archive_status: string;
  tags: string[];
  ad_strategy: string | null;
  kvkk_basis: string | null;
  consent_recorded: boolean;
};

const platforms = ['instagram', 'facebook', 'linkedin', 'gmb', 'youtube', 'tiktok', 'x'];
const pillars = ['Saha / Proje', 'Eğitici', 'Ticari', 'Sempatik / Meme', 'Çevre', 'Sosyal Fayda', 'Özel Gün'];
const specialDays = ['Bayram', '23 Nisan', '19 Mayıs', '30 Ağustos', '29 Ekim', 'Dünya Çevre Günü', 'İş Sağlığı ve Güvenliği'];

export function SocialPortfolioPlanner() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', body: '', portfolio: 'Embay Yapı ve Kiralık İş Makineleri', pillar: 'Saha / Proje', platforms: ['instagram'], scheduledAt: '', provider: '', designUrl: '', specialDay: '', tags: '', adStrategy: '', kvkkBasis: 'Talep/iletişim takibi; ticari ileti ayrı onaya tabidir.' });

  const loadDrafts = async () => {
    if (!supabase) return setError('Supabase bağlantısı yapılandırılmamış.');
    const { data, error: queryError } = await supabase.from('social_drafts').select('id,title,body,networks,platform_targets,scheduled_at,status,portfolio_name,content_pillar,design_provider,design_url,special_day_key,archive_status,tags,ad_strategy,kvkk_basis,consent_recorded').order('scheduled_at', { ascending: true, nullsFirst: false }).limit(100);
    if (queryError) setError('Sosyal taslaklar yüklenemedi. Oturum/RLS yetkisini kontrol edin.');
    else setDrafts((data || []) as Draft[]);
  };

  useEffect(() => { loadDrafts(); }, []);

  const togglePlatform = (platform: string) => setForm(current => ({ ...current, platforms: current.platforms.includes(platform) ? current.platforms.filter(item => item !== platform) : [...current.platforms, platform] }));

  const createDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !form.title.trim() || !form.body.trim() || form.platforms.length === 0) return;
    const { error: insertError } = await supabase.from('social_drafts').insert({
      brand: 'İkisi', title: form.title.trim(), body: form.body.trim(), networks: form.platforms,
      platform_targets: form.platforms, portfolio_name: form.portfolio, content_pillar: form.pillar,
      design_provider: form.provider || null, design_url: form.designUrl || null, special_day_key: form.specialDay || null,
      scheduled_at: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null, status: 'taslak', archive_status: 'active', tags: form.tags.split(',').map(item => item.trim()).filter(Boolean), ad_strategy: form.adStrategy || null, kvkk_basis: form.kvkkBasis, consent_recorded: false,
    });
    if (insertError) return setError('Taslak kaydedilemedi.');
    setShowForm(false); setForm({ title: '', body: '', portfolio: 'Embay Yapı ve Kiralık İş Makineleri', pillar: 'Saha / Proje', platforms: ['instagram'], scheduledAt: '', provider: '', designUrl: '', specialDay: '', tags: '', adStrategy: '', kvkkBasis: 'Talep/iletişim takibi; ticari ileti ayrı onaya tabidir.' }); await loadDrafts();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('social_drafts').update({ status }).eq('id', id);
    if (updateError) setError('Taslak durumu güncellenemedi.'); else setDrafts(items => items.map(item => item.id === id ? { ...item, status } : item));
  };

  const removeDraft = async (id: string) => {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from('social_drafts').delete().eq('id', id);
    if (deleteError) setError('Taslak silinemedi.'); else setDrafts(items => items.filter(item => item.id !== id));
  };

  return <div className="space-y-5">
    <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-pink-950/20 p-5 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="inline-flex items-center gap-2 text-xs text-pink-300 font-bold uppercase tracking-wider"><Instagram className="w-4 h-4" /> Gerçek sosyal medya portföyü</div><h2 className="text-xl sm:text-2xl font-black text-white mt-2">Portföy, Platform ve Aylık Gönderi Planı</h2><p className="text-sm text-slate-300 mt-1 max-w-3xl">Her platform için ayrı metin, yayın zamanı, içerik sütunu ve Figma/Canva tasarım bağlantısı tutun. Özel günler raporlanabilir taslak olarak planlanır.</p></div><button onClick={() => setShowForm(value => !value)} className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Yeni plan</button></div>
    </div>
    {error && <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">{error}</div>}
    {showForm && <form onSubmit={createDraft} className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Gönderi / kampanya başlığı" className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm" /><input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm" /></div><textarea required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Gönderi metni / rapor notu" rows={4} className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm" /><div className="flex flex-wrap gap-2">{platforms.map(platform => <button type="button" key={platform} onClick={() => togglePlatform(platform)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${form.platforms.includes(platform) ? 'bg-pink-600 text-white border-pink-500' : 'bg-slate-950 text-slate-400 border-slate-700'}`}>{platform}</button>)}</div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><select value={form.pillar} onChange={e => setForm({ ...form, pillar: e.target.value })} className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm">{pillars.map(item => <option key={item}>{item}</option>)}</select><select value={form.specialDay} onChange={e => setForm({ ...form, specialDay: e.target.value })} className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"><option value="">Özel gün yok</option>{specialDays.map(item => <option key={item}>{item}</option>)}</select><select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"><option value="">Tasarım aracı seç</option><option>Canva</option><option>Figma</option></select></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="Etiketler: manitou, güngören, teklif" className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm" /><input value={form.adStrategy} onChange={e => setForm({ ...form, adStrategy: e.target.value })} placeholder="Geri dönüş olursa reklam stratejisi" className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm" /><input value={form.kvkkBasis} onChange={e => setForm({ ...form, kvkkBasis: e.target.value })} placeholder="KVKK prosedür notu" className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm" /></div><div className="flex gap-3"><input value={form.designUrl} onChange={e => setForm({ ...form, designUrl: e.target.value })} placeholder="Canva/Figma tasarım bağlantısı" className="flex-1 px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm" /><button type="submit" className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">Taslağı arşivle</button></div></form>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{drafts.length === 0 ? <div className="lg:col-span-2 rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">Henüz gerçek sosyal taslak yok. İlk aylık planı oluşturun.</div> : drafts.map(draft => <div key={draft.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{draft.title}</h3><p className="text-xs text-slate-400 mt-1">{draft.portfolio_name || 'Genel portföy'} · {draft.content_pillar || 'Sınıflandırılmamış'}</p></div><select value={draft.status} onChange={e => updateStatus(draft.id, e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"><option value="taslak">Taslak</option><option value="onay_bekliyor">Onay bekliyor</option><option value="onaylandi">Onaylandı</option><option value="planlandi">Planlandı</option></select></div><p className="text-sm text-slate-300 whitespace-pre-line">{draft.body}</p><div className="flex flex-wrap gap-1.5">{(draft.platform_targets || draft.networks || []).map(platform => <span key={platform} className="px-2 py-1 rounded bg-slate-800 text-[11px] text-pink-300">{platform}</span>)}</div><div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400"><span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {draft.scheduled_at ? new Date(draft.scheduled_at).toLocaleString('tr-TR') : 'Tarih bekliyor'}</span><div className="flex items-center gap-2">{draft.design_url && <a href={draft.design_url} target="_blank" rel="noreferrer" className="text-blue-300 inline-flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> {draft.design_provider || 'Tasarım'}</a>}<button onClick={() => removeDraft(draft.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div></div></div>)}</div>
  </div>;
}
