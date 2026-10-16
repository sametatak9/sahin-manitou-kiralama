export type SkillLifecycle = 'draft' | 'testing' | 'approved' | 'retired';
export type SkillVerification = 'unverified' | 'prompt_verified' | 'handler_verified' | 'failed';

export interface SkillTestEvidence {
  lifecycle: SkillLifecycle;
  test_score?: number | string | null;
  capability_test_status?: string | null;
  last_test_mission_id?: string | null;
  capability_test_mission_id?: string | null;
  last_tested_at?: string | null;
  capability_tested_at?: string | null;
}

/**
 * Retired is a catalog lifecycle, not a prohibition on safe Academy testing.
 * A test moves draft/retired skills to testing, never directly to approved.
 */
export function lifecycleAfterSkillTestStart(lifecycle: SkillLifecycle): SkillLifecycle {
  return lifecycle === 'draft' || lifecycle === 'retired' ? 'testing' : lifecycle;
}

/**
 * Approval is allowed only after the latest test has fully written evidence,
 * passed the score threshold, and verified the actual execution mode.
 * Prompt-only Academy tests cannot verify a tool or connector handler.
 */
export function canApproveSkillFromEvidence(input: SkillTestEvidence): boolean {
  if (input.lifecycle === 'approved' || input.lifecycle === 'retired') return false;
  const score = Number(input.test_score);
  const status = input.capability_test_status as SkillVerification | null | undefined;
  const evidenceFresh = Boolean(
    input.last_test_mission_id &&
    input.capability_test_mission_id &&
    input.last_test_mission_id === input.capability_test_mission_id &&
    input.last_tested_at &&
    input.capability_tested_at
  );
  return evidenceFresh && Number.isFinite(score) && score >= 60 && (status === 'prompt_verified' || status === 'handler_verified');
}
