export const NO_FINDING_FINISH_REASONS = new Set(['deadline', 'max_steps', 'stop_condition']);

/**
 * A normal research run with no accepted findings is not a successful result.
 * Keep provider/search errors separate through error_kind; this helper only
 * labels a clean run whose evidence set is genuinely empty.
 */
export function classifyFinishReason(reason: string, findingCount: number, errorKind?: string | null): string {
  if (findingCount === 0 && !errorKind && NO_FINDING_FINISH_REASONS.has(reason)) return 'completed_no_findings';
  return reason;
}

/** Denetim izi korunur; başarı sayısı yalnız verified kümesinden hesaplanır. */
export function findingCounts(findings: ReadonlyArray<{ verdict?: string }> = []) {
  const verified = findings.filter((f) => f.verdict === 'verified').length;
  const rejected = findings.filter((f) => f.verdict === 'rejected').length;
  return { total: findings.length, verified, rejected, pending: findings.length - verified - rejected };
}
export function verifiedFindings<T extends { verdict?: string }>(findings: ReadonlyArray<T>): T[] {
  return findings.filter((f) => f.verdict === 'verified');
}
