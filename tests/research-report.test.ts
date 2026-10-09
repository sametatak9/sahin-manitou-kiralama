import assert from 'node:assert/strict';
import { researchReportSummary } from '../supabase/functions/_shared/pure/research-report.ts';
import { isStaleFinding } from '../supabase/functions/_shared/recency.ts';

const report = researchReportSummary([
  { title: 'Firma A model kataloğu', url: 'https://example.com/katalog', verdict: 'verified', detail: '37 yıllık tecrübe', fit: 'EMBAY için 37 yıllık tecrübe broşürü hazırlansın' },
  { title: 'Okunamayan PDF', url: 'https://example.com/a.pdf', verdict: 'suspicious' },
  { title: 'Elendi', url: 'https://example.com/b', verdict: 'rejected' },
  { title: 'Geçersiz link', url: 'javascript:alert(1)', verdict: 'verified' },
]);
assert.ok(report.includes('1 kaynağı doğrulanmış'));
assert.ok(report.includes('müşteri talebi veya kazanılmış müşteri değildir'));
assert.ok(report.includes('https://example.com/katalog'));
assert.ok(!report.includes('37 yıllık'));
assert.ok(!report.includes('Okunamayan PDF'));
assert.ok(!report.includes('javascript:'));
assert.ok(report.includes('kendi markanızın özelliği olarak kullanılamaz'));
assert.ok(report.includes('İNSAN KONTROLÜ GEREKİR'));
assert.ok(researchReportSummary([]).includes('Doğrulanmış araştırma kaydı yok'));
assert.ok(isStaleFinding({title:'Müşteri talebi',detail:'Firma aranıyor',posted:'2025-04-15'},new Date('2026-10-09T01:00:00+03:00')));
console.log('research report: 10 assertions passed');
