import { BarChart3, Bot, BriefcaseBusiness, Megaphone, Search, UsersRound } from 'lucide-react';

type Props = { activeTab: string; setActiveTab: (tab: string) => void };
const workspaces = [
  { id: 'social-planner', title: 'Sosyal Medya Yönetimi', description: 'Hesaplar, önizleme, gönderi, Canva/Figma, arşiv ve metrikler', icon: Megaphone, tone: 'from-emerald-500 to-teal-600' },
  { id: 'leads', title: 'CRM & Müşteri Portföyü', description: 'Lead, teklif, müşteri, WhatsApp ve iş takip akışı', icon: UsersRound, tone: 'from-cyan-500 to-blue-600' },
  { id: 'intelligence', title: 'Pazarlama İstihbaratı', description: 'Etiketler, rakipler, bütçe ve pazar sinyalleri', icon: BarChart3, tone: 'from-violet-500 to-indigo-600' },
  { id: 'hunter', title: 'İş Fırsatı Avcısı', description: 'Şantiye, makine ve izinli kaynak fırsat listeleri', icon: BriefcaseBusiness, tone: 'from-amber-500 to-orange-600' },
  { id: 'gbp', title: 'Google & Yerel SEO', description: 'GBP, ilçe sayfaları, NAP ve arama görünürlüğü', icon: Search, tone: 'from-sky-500 to-cyan-600' },
  { id: 'executive', title: 'Komuta & AI Görüşleri', description: 'Günlük bülten, onay kuyruğu ve sonraki bot fazı', icon: Bot, tone: 'from-slate-700 to-slate-900' },
];

export function AdminWorkspacePicker({ activeTab, setActiveTab }: Props) {
  return <section className="rounded-3xl border border-emerald-200 bg-white p-4 sm:p-6 shadow-sm"><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4"><div><span className="text-[11px] font-black tracking-[0.18em] uppercase text-emerald-700">Embay yönetim paneli</span><h2 className="text-2xl font-black text-slate-900 mt-1">Çalışma alanını seç</h2><p className="text-sm text-slate-500 mt-1">Bilgi rehberlerinden ayrı, günlük operasyonu yönettiğin ana uygulama alanı.</p></div><span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">6 aktif çalışma alanı</span></div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{workspaces.map(item => { const Icon = item.icon; const active = activeTab === item.id; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`text-left rounded-2xl border p-4 transition-all ${active ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100' : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-white'}`}><div className="flex items-start gap-3"><span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.tone} text-white flex items-center justify-center shrink-0`}><Icon className="w-5 h-5" /></span><span><strong className="block text-sm text-slate-900">{item.title}</strong><span className="block text-xs text-slate-500 leading-relaxed mt-1">{item.description}</span></span></div><div className={`mt-3 text-[11px] font-bold ${active ? 'text-emerald-700' : 'text-slate-400'}`}>{active ? 'Şu an açık' : 'Aç çalışma alanı →'}</div></button>; })}</div></section>;
}
