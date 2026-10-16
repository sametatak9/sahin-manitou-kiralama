import assert from 'node:assert/strict';
import { canApproveSkillFromEvidence, lifecycleAfterSkillTestStart } from '../supabase/functions/_shared/pure/skill-lifecycle.ts';

assert.equal(lifecycleAfterSkillTestStart('retired'), 'testing');
assert.equal(lifecycleAfterSkillTestStart('draft'), 'testing');
assert.equal(lifecycleAfterSkillTestStart('testing'), 'testing');
assert.equal(lifecycleAfterSkillTestStart('approved'), 'approved');

const currentPassingPromptTest = {
  lifecycle: 'testing' as const,
  test_score: 100,
  capability_test_status: 'prompt_verified',
  last_test_mission_id: 'mission-current',
  capability_test_mission_id: 'mission-current',
  last_tested_at: '2026-10-16T08:00:00Z',
  capability_tested_at: '2026-10-16T08:00:00Z',
};
assert.equal(canApproveSkillFromEvidence(currentPassingPromptTest), true);
assert.equal(canApproveSkillFromEvidence({ ...currentPassingPromptTest, lifecycle: 'retired' }), false);
assert.equal(canApproveSkillFromEvidence({ ...currentPassingPromptTest, lifecycle: 'approved' }), false);
assert.equal(canApproveSkillFromEvidence({ ...currentPassingPromptTest, capability_test_status: 'unverified' }), false);
assert.equal(canApproveSkillFromEvidence({ ...currentPassingPromptTest, capability_test_status: 'failed' }), false);
assert.equal(canApproveSkillFromEvidence({ ...currentPassingPromptTest, capability_test_status: 'prompt_verified', test_score: 59 }), false);
assert.equal(canApproveSkillFromEvidence({ ...currentPassingPromptTest, last_test_mission_id: 'mission-new' }), false);
assert.equal(canApproveSkillFromEvidence({ ...currentPassingPromptTest, last_tested_at: null }), false);

// A prompt-only Academy score cannot assert that a tool/connector actually ran.
assert.equal(canApproveSkillFromEvidence({ ...currentPassingPromptTest, capability_test_status: 'unverified' }), false);
console.log('skill-lifecycle tests: ok');
