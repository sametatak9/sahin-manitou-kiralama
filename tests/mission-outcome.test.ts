import assert from 'node:assert/strict';
import { classifyFinishReason } from '../supabase/functions/_shared/pure/outcome.ts';

assert.equal(classifyFinishReason('deadline', 0), 'completed_no_findings');
assert.equal(classifyFinishReason('max_steps', 0), 'completed_no_findings');
assert.equal(classifyFinishReason('stop_condition', 0), 'completed_no_findings');
assert.equal(classifyFinishReason('deadline', 2), 'deadline');
assert.equal(classifyFinishReason('deadline', 0, 'search_unavailable'), 'deadline');
assert.equal(classifyFinishReason('error', 0), 'error');

console.log('mission outcome contract: 6 assertions passed');
