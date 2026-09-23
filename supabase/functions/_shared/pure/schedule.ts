// Bağımlılıksız zamanlayıcı mantığı: Deno (edge) ve Vite (panel) tarafından ortak kullanılır.
// Tüm hesaplar görevin saat diliminde (varsayılan Europe/Istanbul) yapılır.

export type ScheduleType = 'manual' | 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron' | 'event';

export interface ScheduleSpec {
  schedule_type: ScheduleType | string;
  run_time?: string | null;       // "HH:MM"
  run_at?: string | null;         // ISO (once)
  cron_expression?: string | null;
  timezone?: string | null;
  input_config?: { weekday?: number; monthday?: number } | null;
}

export const DEFAULT_TIMEZONE = 'Europe/Istanbul';

interface ZonedParts { year: number; month: number; day: number; hour: number; minute: number; weekday: number }

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
    formatterCache.set(tz, f);
  }
  return f;
}
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function zonedParts(date: Date, tz = DEFAULT_TIMEZONE): ZonedParts {
  const parts: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(date)) parts[p.type] = p.value;
  return { year: +parts.year, month: +parts.month, day: +parts.day, hour: +parts.hour % 24, minute: +parts.minute, weekday: WEEKDAYS[parts.weekday] ?? 0 };
}

/** Yerel (tz) duvar saati → UTC Date. DST geçişlerinde iki adımlı düzeltme yapar. */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, tz = DEFAULT_TIMEZONE): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ts = guess;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(ts), tz);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    ts += guess - asUtc;
  }
  return new Date(ts);
}

function addLocalDays(year: number, month: number, day: number, n: number) {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
}

export function parseRunTime(value: string | null | undefined): { hour: number; minute: number } {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  return m ? { hour: +m[1], minute: +m[2] } : { hour: 9, minute: 0 };
}

// ── Cron (5 alan: dakika saat ayın-günü ay haftanın-günü) ────────────────────
interface CronField { values: Set<number>; wildcard: boolean }
export interface ParsedCron { minute: CronField; hour: CronField; dom: CronField; month: CronField; dow: CronField }

function parseField(src: string, min: number, max: number, isDow = false): CronField {
  const values = new Set<number>();
  const wildcard = src === '*' || src === '?';
  for (const part of src.split(',')) {
    const [rangePart, stepPart] = part.split('/');
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) throw new Error(`Geçersiz cron adımı: ${part}`);
    let lo: number; let hi: number;
    if (rangePart === '*' || rangePart === '?') { lo = min; hi = max; }
    else if (rangePart.includes('-')) { const [a, b] = rangePart.split('-').map(Number); lo = a; hi = b; }
    else { lo = Number(rangePart); hi = stepPart === undefined ? lo : max; }
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < min || hi > max || lo > hi) throw new Error(`Geçersiz cron değeri: ${part}`);
    for (let v = lo; v <= hi; v += step) values.add(isDow && v === 7 ? 0 : v);
  }
  return { values, wildcard };
}

export function parseCron(expr: string): ParsedCron {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error('Cron ifadesi 5 alan içermeli (dk saat gün ay haftagünü)');
  return {
    minute: parseField(fields[0], 0, 59),
    hour: parseField(fields[1], 0, 23),
    dom: parseField(fields[2], 1, 31),
    month: parseField(fields[3], 1, 12),
    dow: parseField(fields[4], 0, 7, true),
  };
}

export function isValidCron(expr: string): boolean {
  try { parseCron(expr); return true; } catch { return false; }
}

function cronDayMatches(c: ParsedCron, day: number, weekday: number) {
  if (c.dom.wildcard && c.dow.wildcard) return true;
  if (c.dom.wildcard) return c.dow.values.has(weekday);
  if (c.dow.wildcard) return c.dom.values.has(day);
  return c.dom.values.has(day) || c.dow.values.has(weekday); // POSIX: ikisi de kısıtlıysa VEYA
}

export function nextCronRun(expr: string, from: Date, tz = DEFAULT_TIMEZONE): Date | null {
  const c = parseCron(expr);
  const hours = [...c.hour.values].sort((a, b) => a - b);
  const minutes = [...c.minute.values].sort((a, b) => a - b);
  const start = zonedParts(from, tz);
  for (let offset = 0; offset <= 400; offset++) {
    const d = addLocalDays(start.year, start.month, start.day, offset);
    if (!c.month.values.has(d.month) || !cronDayMatches(c, d.day, d.weekday)) continue;
    for (const h of hours) {
      for (const m of minutes) {
        const candidate = zonedToUtc(d.year, d.month, d.day, h, m, tz);
        if (candidate.getTime() > from.getTime()) return candidate;
      }
    }
  }
  return null;
}

/** Bir sonraki çalışma zamanı. manual/event → null; once → run_at (gelecekteyse). */
export function computeNextRun(spec: ScheduleSpec, from: Date = new Date()): Date | null {
  const tz = spec.timezone || DEFAULT_TIMEZONE;
  const { hour, minute } = parseRunTime(spec.run_time);
  const now = zonedParts(from, tz);
  const after = (d: Date) => d.getTime() > from.getTime();

  switch (spec.schedule_type) {
    case 'manual':
    case 'event':
      return null;
    case 'once': {
      if (!spec.run_at) return null;
      const d = new Date(spec.run_at);
      return Number.isNaN(d.getTime()) || !after(d) ? null : d;
    }
    case 'hourly': {
      const m = spec.run_time ? minute : 0;
      let d = zonedToUtc(now.year, now.month, now.day, now.hour, m, tz);
      if (!after(d)) d = new Date(d.getTime() + 3600_000);
      return d;
    }
    case 'daily': {
      for (let i = 0; i <= 2; i++) {
        const day = addLocalDays(now.year, now.month, now.day, i);
        const d = zonedToUtc(day.year, day.month, day.day, hour, minute, tz);
        if (after(d)) return d;
      }
      return null;
    }
    case 'weekly': {
      const target = spec.input_config?.weekday ?? 1;
      for (let i = 0; i <= 8; i++) {
        const day = addLocalDays(now.year, now.month, now.day, i);
        if (day.weekday !== target) continue;
        const d = zonedToUtc(day.year, day.month, day.day, hour, minute, tz);
        if (after(d)) return d;
      }
      return null;
    }
    case 'monthly': {
      const monthday = Math.min(Math.max(spec.input_config?.monthday ?? 1, 1), 28);
      for (let i = 0; i <= 2; i++) {
        const y = now.year + Math.floor((now.month - 1 + i) / 12);
        const mo = ((now.month - 1 + i) % 12) + 1;
        const d = zonedToUtc(y, mo, monthday, hour, minute, tz);
        if (after(d)) return d;
      }
      return null;
    }
    case 'cron':
      return spec.cron_expression ? nextCronRun(spec.cron_expression, from, tz) : null;
    default:
      return null;
  }
}

/** Başarısız denemeden sonra üstel geri çekilme (30sn, 60sn, 2dk ... en fazla 1 saat). */
export function retryDelaySeconds(attempt: number): number {
  return Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1));
}

export function describeSchedule(spec: ScheduleSpec): string {
  const t = spec.run_time || '09:00';
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  switch (spec.schedule_type) {
    case 'manual': return 'Manuel tetikleme';
    case 'event': return 'Olay tetiklemeli';
    case 'once': return spec.run_at ? `Tek sefer · ${new Date(spec.run_at).toLocaleString('tr-TR', { timeZone: spec.timezone || DEFAULT_TIMEZONE })}` : 'Tek sefer';
    case 'hourly': return `Her saat${spec.run_time ? ` :${t.slice(3)}` : ''}`;
    case 'daily': return `Her gün ${t}`;
    case 'weekly': return `Her ${days[spec.input_config?.weekday ?? 1]} ${t}`;
    case 'monthly': return `Her ayın ${spec.input_config?.monthday ?? 1}. günü ${t}`;
    case 'cron': return `Cron · ${spec.cron_expression}`;
    default: return String(spec.schedule_type);
  }
}
