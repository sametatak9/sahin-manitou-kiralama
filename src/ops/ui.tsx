import { useEffect, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Bot, Briefcase, CalendarDays, CircleSlash, Facebook, FileText, Hammer, Instagram, KeyRound, LineChart, Loader2,
  Lock, Map, MapPin, Megaphone, MessageCircle, Palette, PenLine, PhoneForwarded, PlugZap, Radar, SearchCheck, Send, Settings2, Share2, ShieldAlert,
  Sparkles, Store, Telescope, UserPlus, Users, WifiOff, X,
} from 'lucide-react';
import { platformMeta, TONE_CLASSES, TONE_DOT, type Tone } from './lib/format';

const ICONS: Record<string, typeof Bot> = {
  bot: Bot, 'search-check': SearchCheck, 'share-2': Share2, instagram: Instagram, facebook: Facebook, store: Store, hammer: Hammer, 'map-pin': MapPin,
  radar: Radar, users: Users, 'pen-line': PenLine, megaphone: Megaphone, 'line-chart': LineChart, telescope: Telescope, briefcase: Briefcase,
  'calendar-days': CalendarDays, activity: Activity, 'user-plus': UserPlus, 'bar-chart-3': BarChart3, 'message-circle': MessageCircle, 'key-round': KeyRound,
  send: Send, palette: Palette, sparkles: Sparkles, 'phone-forwarded': PhoneForwarded, map: Map, 'file-text': FileText,
};
export function DynIcon({ name, className = 'w-4 h-4' }: { name?: string | null; className?: string }) {
  const I = ICONS[name || 'bot'] ?? Bot;
  return <I className={className} />;
}

export function cx(...c: Array<string | false | null | undefined>) { return c.filter(Boolean).join(' '); }

export function Panel({ children, className = '', title, kicker, action, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; kicker?: string; action?: ReactNode; pad?: boolean }) {
  return (
    <section className={cx('ops-panel', pad && 'p-4 sm:p-5', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h3 className="font-display text-base sm:text-lg font-semibold text-ink-100 truncate">{title}</h3>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Pill({ tone = 'idle', children, dot = true, className = '' }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider ring-1 whitespace-nowrap', TONE_CLASSES[tone], className)}>
      {dot && <span className={cx('w-1.5 h-1.5 rounded-full', TONE_DOT[tone], tone === 'run' && 'ops-pulse')} />}
      {children}
    </span>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'subtle' | 'warn';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand-green text-white hover:bg-emerald-700 shadow-sm shadow-emerald-900/10',
  ghost: 'bg-transparent text-ink-200 ring-1 ring-ink-600 hover:bg-ink-800 hover:text-ink-100',
  subtle: 'bg-ink-800 text-ink-200 hover:bg-ink-700',
  danger: 'bg-rose-500/15 text-rose-700 ring-1 ring-rose-400/30 hover:bg-rose-500/25',
  warn: 'bg-amber-500 text-white hover:bg-amber-600',
};
export function Button({ children, variant = 'ghost', className = '', loading = false, icon, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean; icon?: ReactNode }) {
  return (
    <button {...rest} disabled={rest.disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed', BTN[variant], className)}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-[11px] font-semibold text-ink-300 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-ink-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Tabs<T extends string>({ value, onChange, items, className = '' }: { value: T; onChange: (v: T) => void; items: Array<{ id: T; label: string; count?: number }>; className?: string }) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto ops-scroll p-1 rounded-2xl bg-ink-900 ring-1 ring-ink-700 w-full sm:w-fit', className)}>
      {items.map((it) => (
        <button key={it.id} onClick={() => onChange(it.id)}
          className={cx('px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition',
            value === it.id ? 'bg-ink-700 text-ink-100 shadow-inner' : 'text-ink-400 hover:text-ink-200')}>
          {it.label}{typeof it.count === 'number' && <span className="ml-1.5 font-mono text-[10px] text-ink-400">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-2xl bg-ink-900/70 ring-1 ring-ink-700 p-3.5">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-400 flex items-center gap-1.5">
        {tone && <span className={cx('w-1.5 h-1.5 rounded-full', TONE_DOT[tone])} />}{label}
      </div>
      <div className="font-display text-2xl font-semibold text-ink-100 mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-ink-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export type StateKind = 'loading' | 'empty' | 'error' | 'permission' | 'not_connected' | 'config';
const STATE_META: Record<StateKind, { icon: typeof Bot; title: string; tone: string }> = {
  loading: { icon: Loader2, title: 'Yükleniyor', tone: 'text-ink-300' },
  empty: { icon: CircleSlash, title: 'Henüz kayıt yok', tone: 'text-ink-300' },
  error: { icon: AlertTriangle, title: 'Bir hata oluştu', tone: 'text-rose-700' },
  permission: { icon: Lock, title: 'Yetki gerekli', tone: 'text-amber-700' },
  not_connected: { icon: WifiOff, title: 'BAĞLI DEĞİL', tone: 'text-amber-700' },
  config: { icon: PlugZap, title: 'BİLGİ EKSİK', tone: 'text-amber-700' },
};
export function StateView({ kind, title, message, action, compact = false }: { kind: StateKind; title?: string; message?: ReactNode; action?: ReactNode; compact?: boolean }) {
  const m = STATE_META[kind];
  const I = m.icon;
  return (
    <div className={cx('flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-ink-700 bg-ink-900/40', compact ? 'p-5 gap-1.5' : 'p-8 sm:p-10 gap-2')}>
      <I className={cx(compact ? 'w-5 h-5' : 'w-7 h-7', m.tone, kind === 'loading' && 'animate-spin')} />
      <div className={cx('font-display font-semibold', m.tone, compact ? 'text-sm' : 'text-base')}>{title ?? m.title}</div>
      {message && <div className="text-xs text-ink-400 max-w-md leading-relaxed">{message}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Supabase/edge hatasını doğru boş/hata durumuna çevirir. */
export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  const denied = /permission|42501|row-level|yetki/i.test(error);
  return <StateView kind={denied ? 'permission' : 'error'} message={denied ? 'Bu alan ekip üyelerine açıktır. Yöneticinizden yetki isteyin.' : error}
    action={onRetry && <Button variant="ghost" onClick={onRetry}>Tekrar dene</Button>} />;
}

export function Modal({ open, onClose, title, children, wide = false, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={cx('ops-panel ops-fade-in w-full max-h-[92vh] flex flex-col rounded-b-none sm:rounded-[18px] bg-ink-900', wide ? 'sm:max-w-4xl' : 'sm:max-w-xl')}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-ink-700">
          <h3 className="font-display text-base font-semibold text-ink-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-100 hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto ops-scroll">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-ink-700 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  const cls = { info: 'bg-sky-500/10 text-sky-700 ring-sky-400/25', warn: 'bg-amber-500/10 text-amber-700 ring-amber-400/25', error: 'bg-rose-500/10 text-rose-700 ring-rose-400/25', ok: 'bg-emerald-500/10 text-emerald-700 ring-emerald-400/25' }[tone];
  const I = tone === 'error' ? ShieldAlert : tone === 'warn' ? AlertTriangle : tone === 'ok' ? Sparkles : Settings2;
  return <div className={cx('flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ring-1', cls)}><I className="w-4 h-4 shrink-0 mt-0.5" /><div className="leading-relaxed">{children}</div></div>;
}

export function PlatformBadge({ platform, size = 'sm' }: { platform?: string | null; size?: 'sm' | 'md' }) {
  const meta = platformMeta(platform);
  return (
    <span title={meta.name} className={cx('inline-flex items-center justify-center rounded-lg bg-gradient-to-br text-white font-bold shrink-0', meta.color, size === 'md' ? 'w-9 h-9 text-xs' : 'w-6 h-6 text-[9px]')}>
      {meta.short}
    </span>
  );
}

/** Kaydetme garantisi: veritabanının döndürdüğü kayıt zamanını gösterir (yalnızca yazma başarılıysa). */
export function SavedStamp({ at, className = '' }: { at?: string | null; className?: string }) {
  if (!at) return null;
  const t = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(at));
  return <div className={cx('inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700', className)}>✓ Veritabanına kaydedildi · {t}</div>;
}
