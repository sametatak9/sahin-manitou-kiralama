import { useEffect, useState, type ReactNode } from 'react';
import {
  Blocks, Bot, Briefcase, Building2, CalendarClock, CalendarRange, CheckCheck, FileText, Film, Gauge, Globe, Inbox, LogOut, Mail, Menu, Phone, PlugZap, Radar, Settings, ShieldCheck, Sparkles, Truck, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useQuery } from './lib/hooks';
import { useRouter, useSession, type Route } from './session';
import { cx } from './ui';

interface NavItem { id: Route; label: string; icon: typeof Bot; hint: string }
const GROUPS: Array<{ title: string; items: NavItem[] }> = [
  { title: 'Operasyon', items: [
    { id: 'home', label: 'Genel Bakış', icon: Gauge, hint: 'Bugün ne oluyor' },
    { id: 'bots', label: 'Bot Merkezi', icon: Bot, hint: 'Görev ver · yetenek ekle' },
    { id: 'reports', label: 'Bot Raporları', icon: FileText, hint: 'Araştırma ve analizler' },
    { id: 'approvals', label: 'Onay Merkezi', icon: CheckCheck, hint: 'İnsan onayı' },
  ] },
  { title: 'Sosyal & İçerik', items: [
    { id: 'connections', label: 'Uygulamalar', icon: PlugZap, hint: 'Instagram, Facebook… bağlantı ve botlar' },
    { id: 'queue', label: 'Yayın Kuyruğu', icon: CalendarClock, hint: 'Görsel/video yükle · saatinde paylaş' },
    { id: 'videos', label: 'Video Havuzu', icon: Film, hint: 'Higgsfield AI · hazır reklamlar' },
    { id: 'planner', label: 'İçerik Takvimi', icon: CalendarRange, hint: 'Ay · hafta · gün · kanban' },
    { id: 'studio', label: 'İçerik Stüdyosu', icon: Sparkles, hint: 'AI + tasarım + önizleme' },
  ] },
  { title: 'Müşteri / CRM', items: [
    { id: 'portfolio', label: 'Firma Portföyü', icon: Briefcase, hint: 'Arşiv · hatırlatma · aşama' },
    { id: 'construction', label: 'İnşaat Müşterileri', icon: Building2, hint: 'Kentsel dönüşüm, konut' },
    { id: 'rental', label: 'Makine Kiralama', icon: Truck, hint: 'Manitou müşterileri' },
    { id: 'leads', label: 'Gelen Talepler', icon: Inbox, hint: 'Web formu + bot adayları' },
  ] },
  { title: 'Sistem', items: [
    { id: 'system', label: 'Bağlantı & Sistem', icon: ShieldCheck, hint: 'Giriş bilgileri · sistem kontrolü' },
    { id: 'skills', label: 'Yetenek Kütüphanesi', icon: Blocks, hint: 'Skill & araçlar' },
    { id: 'settings', label: 'Ayarlar', icon: Settings, hint: 'Marka, AI, ekip, kayıtlar' },
  ] },
];
const MOBILE: Route[] = ['home', 'bots', 'queue', 'reports', 'connections'];
const MOBILE_LABEL: Partial<Record<Route, string>> = { home: 'Genel', bots: 'Botlar', queue: 'Yayın', reports: 'Raporlar', connections: 'Uygulamalar' };

function useBadges() {
  return useQuery(async () => {
    if (!supabase) return { approvals: 0, alerts: 0 };
    const [a, t] = await Promise.all([
      supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      supabase.from('automation_tasks').select('id', { count: 'exact', head: true }).in('status', ['dead_letter', 'failed']),
    ]);
    return { approvals: a.count ?? 0, alerts: t.count ?? 0 };
  }, { approvals: 0, alerts: 0 }, [], ['approval_requests', 'automation_tasks']);
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(i); }, []);
  return <span className="font-mono tabular-nums">{now.toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' })}</span>;
}

export function OpsShell({ children, onLogout }: { children: ReactNode; onLogout: () => void }) {
  const { state, go } = useRouter();
  const session = useSession();
  const [drawer, setDrawer] = useState(false);
  const badges = useBadges();
  const all = GROUPS.flatMap((g) => g.items);
  const current = all.find((i) => i.id === state.route) ?? all[0];

  const NavLink = ({ item, compact = false }: { item: NavItem; compact?: boolean }) => {
    const active = state.route === item.id;
    const Icon = item.icon;
    const badge = item.id === 'approvals' ? badges.data.approvals : item.id === 'bots' ? badges.data.alerts : 0;
    return (
      <button onClick={() => { go(item.id); setDrawer(false); }}
        className={cx('group relative w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition',
          active ? 'bg-ink-750 text-ink-100 ring-1 ring-ink-600' : 'text-ink-300 hover:text-ink-100 hover:bg-ink-850')}>
        {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-brand-green" />}
        <Icon className={cx('w-4 h-4 shrink-0', active ? 'text-brand-green' : 'text-ink-400 group-hover:text-ink-200')} />
        {!compact && <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold truncate">{item.label}</span><span className="block text-[10px] text-ink-500 truncate">{item.hint}</span></span>}
        {badge > 0 && <span className={cx('font-mono text-[10px] font-bold rounded-full px-1.5 py-0.5', item.id === 'approvals' ? 'bg-amber-400 text-white' : 'bg-rose-500 text-white')}>{badge}</span>}
      </button>
    );
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-4">
        <div className="relative w-10 h-10 rounded-2xl bg-ink-800 ring-1 ring-ink-600 flex items-center justify-center overflow-hidden">
          <Radar className="w-5 h-5 text-brand-green relative z-10" />
          <span className="absolute inset-0 ops-sweep" style={{ background: 'conic-gradient(from 0deg, rgba(61,170,92,.35), transparent 25%)' }} />
        </div>
        <div>
          <div className="font-display text-sm font-bold tracking-wide text-ink-100">EMBAY OPS</div>
          <div className="text-[10px] font-mono tracking-[0.2em] text-ink-400">AI OPERATIONS CENTER</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto ops-scroll px-2 space-y-4 pb-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-500">{g.title}</div>
            <div className="space-y-0.5">{g.items.map((i) => <NavLink key={i.id} item={i} />)}</div>
          </div>
        ))}
      </nav>
      <div className="m-2 rounded-2xl bg-ink-850 ring-1 ring-ink-700 p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-green/20 text-brand-green font-display font-bold flex items-center justify-center">{session.displayName.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-ink-100 truncate">{session.displayName}</div>
          <div className="text-[10px] font-mono text-ink-400 uppercase">{session.role === 'admin' ? 'Yönetici' : 'Ekip'}</div>
        </div>
        <button onClick={onLogout} title="Çıkış" className="p-2 rounded-lg text-ink-400 hover:text-rose-700 hover:bg-ink-800"><LogOut className="w-4 h-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="ops-root min-h-screen flex">
      <aside className="hidden lg:block w-64 shrink-0 border-r border-ink-800 sticky top-0 h-screen bg-ink-950/60 backdrop-blur">{sidebar}</aside>
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-ink-950/80 backdrop-blur-sm flex flex-col justify-end p-3 sm:p-4" onClick={() => setDrawer(false)}>
          <div className="w-full max-h-[85vh] overflow-y-auto ops-scroll bg-ink-900 border border-ink-700/80 rounded-3xl p-5 shadow-2xl ops-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-3 border-b border-ink-800">
              <div>
                <h3 className="font-display text-lg font-bold text-ink-100 flex items-center gap-2">
                  <Radar className="w-5 h-5 text-brand-green" /> Tüm Operasyon Menüsü
                </h3>
                <p className="text-xs text-ink-400 mt-0.5">Embay Yapı & Şahin Manitou Yönetim Portalı</p>
              </div>
              <button onClick={() => setDrawer(false)} className="p-2 rounded-xl bg-ink-800 text-ink-400 hover:text-ink-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-4">
              {GROUPS.map((g) => (
              <div key={g.title}>
              <div className="text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1.5">{g.title}</div>
              <div className="grid grid-cols-2 gap-2.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = state.route === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { go(item.id); setDrawer(false); }}
                    className={cx(
                      'flex items-start gap-2.5 p-3 rounded-2xl text-left transition border',
                      active
                        ? 'bg-brand-green/15 border-brand-green/40 text-brand-green'
                        : 'bg-ink-850/80 border-ink-800 text-ink-200 hover:bg-ink-800'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0 mt-0.5 text-brand-green" />{item.id === 'approvals' && badges.data.approvals > 0 && <span className="sr-only">{badges.data.approvals} onay</span>}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate leading-tight">{item.label}</div>
                      <div className="text-[10px] text-ink-400 truncate mt-0.5">{item.hint}</div>
                    </div>
                  </button>
                );
              })}
              </div>
              </div>
              ))}
            </div>

            <div className="pt-3 border-t border-ink-800 flex items-center justify-between text-xs text-ink-400">
              <span>Resmi Destek Hattı:</span>
              <a href="tel:05314362904" className="font-mono text-brand-green font-semibold hover:underline">
                0531 436 29 04
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
            <button className="lg:hidden p-2 -ml-2 rounded-lg text-ink-300 hover:bg-ink-800" onClick={() => setDrawer(true)}><Menu className="w-5 h-5" /></button>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-500">{GROUPS.find((g) => g.items.includes(current))?.title}</div>
              <h1 className="font-display text-base font-semibold text-ink-100 truncate -mt-0.5">{current.label}</h1>
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs text-ink-300">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ink-850 ring-1 ring-ink-700 px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-go ops-pulse" /> İstanbul <Clock />
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 py-5 pb-28 lg:pb-8 ops-grid-bg">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-ink-700 bg-ink-900/95 backdrop-blur px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-6">
          {MOBILE.map((id) => {
            const item = all.find((i) => i.id === id)!;
            const Icon = item.icon; const active = state.route === id;
            return (
              <button key={id} onClick={() => go(id)} className={cx('relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold', active ? 'text-brand-green' : 'text-ink-400')}>
                <Icon className="w-5 h-5" />{MOBILE_LABEL[id] ?? item.label.split(' ')[0]}
                {id === 'approvals' && badges.data.approvals > 0 && <span className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-amber-400" />}
              </button>
            );
          })}
          <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-ink-400"><X className="w-5 h-5 rotate-45" />Daha</button>
        </div>
      </nav>
    </div>
  );
}
