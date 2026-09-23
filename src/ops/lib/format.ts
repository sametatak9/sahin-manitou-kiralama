// Biçimlendirme ve durum sözlükleri (tek kaynak).
import { APPROVAL_LABELS, CONNECTION_LABELS, type ApprovalState } from '../../../supabase/functions/_shared/pure/rules.ts';

export const TZ = 'Europe/Istanbul';

export function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}
export function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', { timeZone: TZ, day: '2-digit', month: 'short' });
}
export function fmtDateTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function relTime(iso?: string | null) {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });
  if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < 3600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86400_000) return rtf.format(Math.round(diff / 3600_000), 'hour');
  return rtf.format(Math.round(diff / 86400_000), 'day');
}
/** İstanbul saatine göre YYYY-MM-DD */
export function dayKey(d: Date | string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
}
export function istanbulHour(d: Date | string) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(d)));
}
/** "YYYY-MM-DD" + "HH:MM" İstanbul → ISO */
export function istanbulToIso(date: string, time: string) {
  return new Date(`${date}T${time || '09:00'}:00+03:00`).toISOString();
}
export function timeOf(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

export type Tone = 'go' | 'wait' | 'run' | 'stop' | 'idle' | 'info';

export const TONE_CLASSES: Record<Tone, string> = {
  go: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/30',
  wait: 'bg-amber-500/12 text-amber-300 ring-amber-400/30',
  run: 'bg-sky-500/12 text-sky-300 ring-sky-400/30',
  stop: 'bg-rose-500/12 text-rose-300 ring-rose-400/30',
  idle: 'bg-slate-500/15 text-slate-300 ring-slate-400/25',
  info: 'bg-violet-500/12 text-violet-300 ring-violet-400/30',
};
export const TONE_DOT: Record<Tone, string> = {
  go: 'bg-signal-go', wait: 'bg-signal-wait', run: 'bg-signal-run', stop: 'bg-signal-stop', idle: 'bg-signal-idle', info: 'bg-violet-400',
};

export function approvalTone(s: string): Tone {
  switch (s) {
    case 'published': case 'approved': return 'go';
    case 'pending_approval': return 'wait';
    case 'scheduled': case 'processing': return 'run';
    case 'failed': case 'rejected': return 'stop';
    default: return 'idle';
  }
}
export function approvalLabel(s: string) {
  return APPROVAL_LABELS[s as ApprovalState] ?? s.toUpperCase();
}

export function runTone(s: string): Tone {
  switch (s) {
    case 'completed': return 'go';
    case 'awaiting_approval': return 'wait';
    case 'running': case 'queued': case 'planned': return 'run';
    case 'failed': case 'timeout': return 'stop';
    case 'blocked': return 'wait';
    default: return 'idle';
  }
}
export const RUN_LABELS: Record<string, string> = {
  completed: 'TAMAMLANDI', awaiting_approval: 'ONAY BEKLİYOR', running: 'ÇALIŞIYOR', queued: 'KUYRUKTA', planned: 'PLANLI',
  failed: 'BAŞARISIZ', timeout: 'ZAMAN AŞIMI', blocked: 'ENGELLENDİ',
};

export function taskTone(s: string): Tone {
  switch (s) {
    case 'running': return 'run';
    case 'scheduled': case 'queued': return 'go';
    case 'paused': case 'cancelled': return 'idle';
    case 'failed': case 'dead_letter': return 'stop';
    case 'completed': return 'info';
    default: return 'idle';
  }
}
export const TASK_LABELS: Record<string, string> = {
  queued: 'KUYRUKTA', scheduled: 'ZAMANLANDI', running: 'ÇALIŞIYOR', paused: 'DURAKLATILDI', completed: 'TAMAMLANDI',
  failed: 'BAŞARISIZ', cancelled: 'İPTAL', dead_letter: 'DEAD LETTER',
};

export function connectionTone(s: string): Tone {
  switch (s) {
    case 'connected': return 'go';
    case 'manual_only': return 'info';
    case 'expired': case 'error': return 'stop';
    case 'oauth_required': case 'config_required': case 'api_key_required': return 'wait';
    default: return 'idle';
  }
}
export function connectionLabel(s: string) {
  return CONNECTION_LABELS[s] ?? s.toUpperCase();
}

export const BOT_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'AKTİF', tone: 'go' },
  paused: { label: 'DURAKLATILDI', tone: 'idle' },
  waiting_connection: { label: 'BAĞLANTI BEKLİYOR', tone: 'wait' },
  archived: { label: 'ARŞİV', tone: 'idle' },
};

export const PLATFORMS: Record<string, { name: string; short: string; color: string }> = {
  instagram: { name: 'Instagram', short: 'IG', color: 'from-fuchsia-600 to-orange-400' },
  facebook: { name: 'Facebook', short: 'f', color: 'from-blue-700 to-blue-400' },
  linkedin: { name: 'LinkedIn', short: 'in', color: 'from-sky-800 to-sky-500' },
  x: { name: 'X', short: 'X', color: 'from-zinc-700 to-zinc-500' },
  tiktok: { name: 'TikTok', short: 'TT', color: 'from-zinc-900 to-pink-600' },
  youtube: { name: 'YouTube', short: '▶', color: 'from-red-700 to-red-500' },
  google_business: { name: 'Google İşletme', short: 'G', color: 'from-emerald-700 to-sky-500' },
  sahibinden: { name: 'Sahibinden', short: 'S', color: 'from-yellow-500 to-yellow-300' },
  armut: { name: 'Armut', short: 'A', color: 'from-orange-600 to-amber-400' },
  whatsapp: { name: 'WhatsApp', short: 'WA', color: 'from-green-700 to-green-400' },
  telegram: { name: 'Telegram', short: 'TG', color: 'from-sky-600 to-cyan-400' },
  email: { name: 'E-posta', short: '@', color: 'from-slate-600 to-slate-400' },
  web: { name: 'Web', short: 'W', color: 'from-emerald-700 to-emerald-400' },
  multi: { name: 'Çoklu', short: '∞', color: 'from-emerald-600 to-cyan-500' },
  system: { name: 'Sistem', short: '⚙', color: 'from-slate-700 to-slate-500' },
};
export function platformMeta(key?: string | null) {
  return PLATFORMS[key || 'system'] ?? { name: key || '—', short: (key || '?').slice(0, 2).toUpperCase(), color: 'from-slate-700 to-slate-500' };
}

export const PUBLISHABLE_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube', 'google_business', 'sahibinden', 'armut'];
