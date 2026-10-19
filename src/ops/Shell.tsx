import { useEffect, useState, type ReactNode } from 'react';
import { ASSISTANT_NAME, PRODUCT_NAME } from './brand';
import {
  Blocks, Bot, CircleUserRound, Crown, Briefcase, Store, Users, Clapperboard, Building2,
  FileText, Gauge, Inbox, LogOut, Menu, PlugZap, Settings, ShieldCheck, Sparkles, TrendingUp, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useQuery } from './lib/hooks';
import { useRouter, useSession, type Route } from './session';
import { cx } from './ui';
import { PageGuide } from './components/PageGuide';
import { AgencyControlStrip } from './components/AgencyControlStrip';
import { ClientSwitcher, useClient } from './client';

interface NavItem { id: Route; label: string; icon: typeof Bot; hint: string; adminOnly?: boolean }
/** Reklam ajansı menüsü: müşteri bağlamı ve ekran sözleşmeleri korunur. */
const GROUPS: Array<{ title: string; items: NavItem[] }> = [
  { title: 'Ajans', items: [
    { id: 'home', label: 'Ana Sayfa', icon: Gauge, hint: 'Günün özeti ve önemli işler' },
    { id: 'copilot', label: ASSISTANT_NAME, icon: Sparkles, hint: 'Salt-okunur karar desteği' },
    { id: 'queue', label: 'İçerik Merkezi', icon: Clapperboard, hint: 'Takvim, video, üretim ve medya' },
    { id: 'leads', label: 'Müşteri Adayları', icon: Inbox, hint: 'Başvurular ve aday kayıtları' },
    { id: 'growth', label: 'Büyüme', icon: TrendingUp, hint: 'Takipçi ve etkileşim bulguları' },
    { id: 'bots', label: 'Botlar', icon: Bot, hint: 'Bot görevleri ve gerçek durumlar' },
  ] },
  { title: 'Müşteri işleri', items: [
    { id: 'showroom', label: 'Ev Vitrini', icon: Store, hint: 'Modeller ve web yazıları' },
    { id: 'construction', label: 'Müşteriler', icon: Building2, hint: 'Görüşme ve teklif akışı' },
    { id: 'clients', label: 'Ajans Müşterileri', icon: Users, hint: 'İşletmeler ve hesap atamaları' },
  ] },
  { title: 'Otomasyon', items: [
    { id: 'portfolio', label: 'Firma Portföyü', icon: Briefcase, hint: 'İş ortakları ve hatırlatmalar' },
    { id: 'reports', label: 'Bot Sonuçları', icon: FileText, hint: 'Bulgu, görev ve raporlar' },
    { id: 'connections', label: 'Uygulamalar', icon: PlugZap, hint: 'Bağlantılar ve izinler' },
    { id: 'skills', label: 'Yetenekler', icon: Blocks, hint: 'Akademi ve yetenek kütüphanesi' },
  ] },
  { title: 'Yönetim', items: [
    { id: 'system', label: 'Sistem', icon: ShieldCheck, hint: 'Sağlık ve çalışma durumu' },
    { id: 'settings', label: 'Ayarlar', icon: Settings, hint: 'Marka, AI ve ekip ayarları' },
    { id: 'account', label: 'Hesabım', icon: CircleUserRound, hint: 'Profil ve çalışma alanları' },
    { id: 'founder', label: 'Kurucu Paneli', icon: Crown, hint: 'Üyeler, bakiyeler ve müşteriler', adminOnly: true },
  ] },
];
const MOBILE: Route[] = ['home', 'copilot', 'queue', 'leads', 'bots'];
const MOBILE_LABEL: Partial<Record<Route, string>> = {
  home: 'Ana', copilot: 'Copilot', leads: 'Adaylar', growth: 'Büyüme', reels: 'İçerikler', clients: 'Müşteri',
  approvals: 'Onay', bots: 'Botlar', queue: 'İçerik', connections: 'Uygulamalar',
};

function useBadges() {
  return useQuery(async () => {
    if (!supabase) return { approvals: 0, alerts: 0 };
    const [a, t, d] = await Promise.all([
      supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      supabase.from('automation_tasks').select('id', { count: 'exact', head: true }).in('status', ['dead_letter', 'failed']),
      supabase.from('social_drafts').select('id', { count: 'exact', head: true }).eq('workflow_status', 'pending_approval').is('archived_at', null),
    ]);
    return { approvals: (a.count ?? 0) + (d.count ?? 0), alerts: t.count ?? 0 };
  }, { approvals: 0, alerts: 0 }, [], ['approval_requests', 'automation_tasks', 'social_drafts']);
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
  const { client } = useClient();
  const all = GROUPS.flatMap((g) => g.items);
  const current = all.find((i) => i.id === state.route) ?? all[0];
  const currentGroup = GROUPS.find((g) => g.items.some((i) => i.id === current.id))?.title ?? 'Ajans';

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = state.route === item.id;
    const Icon = item.icon;
    const badge = item.id === 'queue' ? badges.data.approvals : item.id === 'bots' ? badges.data.alerts : 0;
    return (
      <button type="button" onClick={() => { go(item.id); setDrawer(false); }} aria-current={active ? 'page' : undefined}
        className={cx('agency-nav-link group relative w-full flex items-center gap-3 px-3 py-2.5 text-left',
          active ? 'bg-brand-lightbg text-ink-100 ring-1 ring-[#D5E0F2]' : 'text-ink-300 hover:text-ink-100 hover:bg-ink-850')}>
        {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-brand-green" />}
        <Icon className={cx('w-[18px] h-[18px] shrink-0', active ? 'text-brand-green' : 'text-ink-400 group-hover:text-brand-darkgreen')} />
        <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold truncate">{item.label}</span><span className="block text-[10px] text-ink-500 truncate mt-0.5">{item.hint}</span></span>
        {badge > 0 && <span className={cx('font-mono text-[10px] font-bold rounded-full px-1.5 py-0.5', item.id === 'queue' ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200' : 'bg-rose-100 text-rose-800 ring-1 ring-rose-200')}>{badge}</span>}
      </button>
    );
  };

  const sidebar = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <div className="agency-brand-mark"><img src="/reels/kit/embay_logo_beyaz.png" alt="EMBAY" className="w-full h-full object-contain" /></div>
        <div className="min-w-0">
          <div className="font-display text-[13px] font-bold tracking-[0.12em] text-ink-100 truncate">{PRODUCT_NAME}</div>
          <div className="text-[9px] tracking-[0.16em] text-ink-500 mt-0.5">AJANS ÇALIŞMA ALANI</div>
        </div>
      </div>
      <div className="px-3 pb-4"><ClientSwitcher /></div>
      <nav aria-label="Ana gezinme" className="flex-1 min-h-0 overflow-y-auto ops-scroll px-3 space-y-4 pb-4">
        {GROUPS.map((g) => {
          const visible = g.items.filter((i) => !i.adminOnly || session.role === 'admin');
          return <section key={g.title} className="agency-nav-group">
            <div className="agency-nav-label">{g.title}</div>
            <div className="space-y-1">{visible.map((item) => <NavLink key={item.id} item={item} />)}</div>
          </section>;
        })}
      </nav>
      <div className="agency-user-card m-3 rounded-2xl p-2.5 flex items-center gap-2.5">
        <button type="button" onClick={() => go('account')} aria-label="Hesabım" className="agency-avatar w-10 h-10 shrink-0">{session.displayName.slice(0, 1).toLocaleUpperCase('tr-TR')}</button>
        <button type="button" onClick={() => go('account')} className="min-w-0 flex-1 text-left">
          <span className="block text-xs font-semibold text-ink-100 truncate">{session.displayName}</span>
          <span className="block text-[10px] text-ink-500 mt-0.5">{session.role === 'admin' ? 'Kurucu yönetici' : 'Ekip üyesi'} · Profil</span>
        </button>
        <button type="button" onClick={onLogout} title="Çıkış yap" aria-label="Çıkış yap" className="p-2 rounded-xl text-ink-400 hover:text-rose-700 hover:bg-rose-50 transition"><LogOut className="w-4 h-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="ops-root min-h-screen flex">
      <aside className="agency-sidebar hidden lg:flex w-[272px] shrink-0 sticky top-0 h-screen border-r">{sidebar}</aside>
      {drawer && (
        <div className="agency-drawer-backdrop lg:hidden fixed inset-0 z-[60] flex flex-col justify-end p-3 sm:p-4" onClick={() => setDrawer(false)}>
          <div role="dialog" aria-modal="true" aria-label="Gezinme menüsü" className="agency-drawer w-full max-h-[90vh] overflow-y-auto ops-scroll rounded-[26px] p-4 sm:p-5 ops-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-ink-800">
              <div className="flex items-center gap-3">
                <div className="agency-brand-mark w-10 h-10"><img src="/reels/kit/embay_logo_beyaz.png" alt="EMBAY" className="w-full h-full object-contain" /></div>
                <div><h3 className="font-display text-base font-bold text-ink-100">Menü</h3><p className="text-[11px] text-ink-500 mt-0.5">{client?.name ?? 'Ajans'} çalışma alanı</p></div>
              </div>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Menüyü kapat" className="p-2 rounded-xl bg-ink-850 text-ink-400 hover:text-ink-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="my-4 space-y-4">
              {GROUPS.map((g) => {
                const visible = g.items.filter((i) => !i.adminOnly || session.role === 'admin');
                return <section key={g.title}>
                  <div className="agency-nav-label mb-2">{g.title}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visible.map((item) => {
                      const Icon = item.icon; const active = state.route === item.id;
                      const badge = item.id === 'queue' ? badges.data.approvals : item.id === 'bots' ? badges.data.alerts : 0;
                      return <button key={item.id} type="button" onClick={() => { go(item.id); setDrawer(false); }} aria-current={active ? 'page' : undefined}
                        className={cx('agency-drawer-card flex items-start gap-3 p-3 rounded-2xl text-left relative', active && 'bg-brand-lightbg border-[#AFC7EB] ring-1 ring-[#C9DAF5]')}>
                        <Icon className={cx('w-[18px] h-[18px] shrink-0 mt-0.5', active ? 'text-brand-green' : 'text-ink-400')} />
                        <span className="min-w-0 flex-1"><span className="text-xs font-semibold text-ink-100 flex items-center gap-1.5">{item.label}{badge > 0 && <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[9px]">{badge}</span>}</span><span className="block text-[10px] text-ink-500 truncate mt-0.5">{item.hint}</span></span>
                      </button>;
                    })}
                  </div>
                </section>;
              })}
            </div>
            <button type="button" onClick={() => { setDrawer(false); onLogout(); }} className="w-full mb-3 inline-flex items-center justify-center gap-2 rounded-2xl ring-1 ring-rose-200 bg-rose-50 text-rose-700 py-2.5 text-sm font-semibold"><LogOut className="w-4 h-4" />Çıkış yap</button>
            <div className="pt-3 border-t border-ink-800 flex items-center justify-between text-xs text-ink-500"><span>Destek</span><a href="tel:05314362904" className="font-mono text-brand-darkgreen font-semibold hover:underline">0531 436 29 04</a></div>
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="agency-topbar sticky top-0 z-40 border-b">
          <div className="flex items-center gap-3 px-4 sm:px-6 min-h-[66px]">
            <button type="button" aria-label="Menüyü aç" className="lg:hidden p-2 -ml-2 rounded-xl text-ink-400 hover:bg-ink-850" onClick={() => setDrawer(true)}><Menu className="w-5 h-5" /></button>
            <div className="min-w-0">
              <div className="hidden sm:block text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-500">{currentGroup} · {client?.name ?? 'Ajans'}</div>
              <h1 className="font-display text-base sm:text-[17px] font-bold text-ink-100 truncate mt-0.5">{current.label}</h1>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3 text-xs text-ink-400">
              <span className="lg:hidden"><ClientSwitcher compact /></span>
              <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-ink-700 px-3 py-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-green" />{client?.region || 'Türkiye'}<span className="text-ink-700">·</span><Clock /></span>
            </div>
          </div>
        </header>
        <main className="agency-main flex-1 px-4 sm:px-6 py-4 sm:py-5 pb-28 lg:pb-8">
          <div className="agency-page-wrap"><AgencyControlStrip /><div className="mt-4 sm:mt-5"><PageGuide route={current.id} /><div className="agency-page-content">{children}</div></div></div>
        </main>
      </div>
      <nav aria-label="Hızlı gezinme" className="agency-mobile-nav lg:hidden fixed bottom-0 inset-x-0 z-50 border-t px-1 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-6">
          {MOBILE.map((id) => {
            const item = all.find((i) => i.id === id)!;
            const Icon = item.icon; const active = state.route === id;
            return <button key={id} type="button" onClick={() => go(id)} aria-current={active ? 'page' : undefined} className={cx('relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition', active ? 'text-brand-darkgreen' : 'text-ink-400')}>
              <Icon className="w-5 h-5" />{MOBILE_LABEL[id] ?? item.label.split(' ')[0]}
              {id === 'queue' && badges.data.approvals > 0 && <span className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white" />}
            </button>;
          })}
          <button type="button" onClick={() => setDrawer(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-ink-400"><Menu className="w-5 h-5" />Menü</button>
        </div>
      </nav>
    </div>
  );
}
