import { describe, expect, it } from 'vitest';
import { computeNextRun, describeSchedule, isValidCron, nextCronRun, retryDelaySeconds, zonedToUtc } from '../supabase/functions/_shared/pure/schedule';
import { decideToolUse, legacyDraftStatusToWorkflow, normalizeDomain, normalizeEmail, normalizePhone } from '../supabase/functions/_shared/pure/rules';

const at = (iso: string) => new Date(iso);
// 2026-09-23 08:30 İstanbul (UTC+3)
const FROM = at('2026-09-23T05:30:00Z');

describe('scheduler (Europe/Istanbul)', () => {
  it('daily: bugünün saati geçtiyse yarına atar', () => {
    expect(computeNextRun({ schedule_type: 'daily', run_time: '08:00' }, FROM)?.toISOString()).toBe('2026-09-24T05:00:00.000Z');
    expect(computeNextRun({ schedule_type: 'daily', run_time: '09:00' }, FROM)?.toISOString()).toBe('2026-09-23T06:00:00.000Z');
  });
  it('hourly / weekly / monthly', () => {
    expect(computeNextRun({ schedule_type: 'hourly' }, FROM)?.toISOString()).toBe('2026-09-23T06:00:00.000Z');
    expect(computeNextRun({ schedule_type: 'weekly', run_time: '09:30', input_config: { weekday: 1 } }, FROM)?.toISOString()).toBe('2026-09-28T06:30:00.000Z');
    expect(computeNextRun({ schedule_type: 'monthly', run_time: '10:00', input_config: { monthday: 1 } }, FROM)?.toISOString()).toBe('2026-10-01T07:00:00.000Z');
  });
  it('manual / event / geçmiş once → null', () => {
    expect(computeNextRun({ schedule_type: 'manual' }, FROM)).toBeNull();
    expect(computeNextRun({ schedule_type: 'event' }, FROM)).toBeNull();
    expect(computeNextRun({ schedule_type: 'once', run_at: '2026-09-22T10:00:00Z' }, FROM)).toBeNull();
    expect(computeNextRun({ schedule_type: 'once', run_at: '2026-09-25T10:00:00Z' }, FROM)?.toISOString()).toBe('2026-09-25T10:00:00.000Z');
  });
  it('cron: aralık, adım, liste ve POSIX gün kuralı', () => {
    expect(nextCronRun('30 9 * * 1', FROM)?.toISOString()).toBe('2026-09-28T06:30:00.000Z');
    expect(nextCronRun('*/15 * * * *', FROM)?.toISOString()).toBe('2026-09-23T05:45:00.000Z');
    expect(nextCronRun('0 9 * * 1-5', FROM)?.toISOString()).toBe('2026-09-23T06:00:00.000Z');
    expect(nextCronRun('0 12 1 * 0', FROM)?.toISOString()).toBe('2026-09-27T09:00:00.000Z'); // pazar VEYA ayın 1'i
    expect(isValidCron('61 * * * *')).toBe(false);
    expect(isValidCron('0 9 * *')).toBe(false);
  });
  it('zonedToUtc ve açıklama', () => {
    expect(zonedToUtc(2026, 1, 15, 0, 0).toISOString()).toBe('2026-01-14T21:00:00.000Z');
    expect(describeSchedule({ schedule_type: 'weekly', run_time: '09:30', input_config: { weekday: 1 } })).toBe('Her Pazartesi 09:30');
  });
  it('retry: üstel geri çekilme, üst sınır 1 saat', () => {
    expect([1, 2, 3, 4].map(retryDelaySeconds)).toEqual([30, 60, 120, 240]);
    expect(retryDelaySeconds(20)).toBe(3600);
  });
});

describe('duplicate normalize', () => {
  it('telefon, e-posta, domain', () => {
    expect(normalizePhone('+90 (531) 436 29 04')).toBe('5314362904');
    expect(normalizePhone('0531 436 29 04')).toBe('5314362904');
    expect(normalizePhone('123')).toBeNull();
    expect(normalizeEmail('  Info@Embay.COM ')).toBe('info@embay.com');
    expect(normalizeDomain('https://www.Embay.com/iletisim')).toBe('embay.com');
  });
});

describe('tool izinleri (T8)', () => {
  const publish = { tool_key: 'publish_post', min_role: 'admin', approval_required: true, active: true };
  const email = { tool_key: 'send_email', min_role: 'admin', approval_required: false, active: true };
  it('ekip üyesi olmayan hiçbir tool çalıştıramaz', () => {
    expect(decideToolUse(null, publish)).toEqual({ allowed: false, reason: 'Ekip üyesi değil' });
  });
  it('staff admin tool’unu doğrudan çalıştıramaz; onaylı olanı ancak onaya gönderebilir', () => {
    expect(decideToolUse('staff', email).allowed).toBe(false);
    expect(decideToolUse('staff', publish)).toEqual({ allowed: true, requiresApproval: true });
  });
  it('bot izni, pasif tool ve skill bağı kontrol edilir', () => {
    expect(decideToolUse('admin', { ...publish, active: false }).allowed).toBe(false);
    expect(decideToolUse('admin', publish, { status: 'active', permissions: { denied_tools: ['publish_post'] } }).allowed).toBe(false);
    expect(decideToolUse('admin', publish, { status: 'paused' }).allowed).toBe(false);
    expect(decideToolUse('admin', publish, null, ['save_draft']).allowed).toBe(false);
  });
  it('eski Türkçe durumlar kanonik akışa eşlenir', () => {
    expect(legacyDraftStatusToWorkflow('onay_bekliyor')).toBe('pending_approval');
    expect(legacyDraftStatusToWorkflow('yayinda')).toBe('published');
  });
});
