import assert from 'node:assert/strict';
import { parseFindingDate, requiresRecentEvidence } from '../supabase/functions/_shared/recency.ts';

assert.equal(requiresRecentEvidence({ goal: 'Son 30 gün içinde İstanbul’da müşteri talebi bul' }), true);
assert.equal(requiresRecentEvidence({ title: 'Güncel inşaat fırsatları' }), true);
assert.equal(requiresRecentEvidence({ goal: 'İstanbul’daki mimarlık ofislerini listele' }), false);
assert.ok(parseFindingDate('2026-10-08'));
assert.ok(parseFindingDate('8 Ekim 2026'));
assert.equal(parseFindingDate('2 saat önce'), null);

console.log('recency contract: 6 assertions passed');
