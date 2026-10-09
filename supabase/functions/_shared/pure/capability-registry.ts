export type CapabilityKind = 'prompt_only' | 'tool_backed' | 'connector_backed';
export type CapabilityRisk = 'read_only' | 'draft' | 'approval_required' | 'external_action';
export type CatalogSource = 'native' | 'imported' | 'curated';
export type CapabilityTestStatus = 'unverified' | 'prompt_verified' | 'handler_verified' | 'failed';
export type AcademyOutputKind = 'findings' | 'action_list' | 'structured_output';

export interface CapabilityToolRef {
  tool_key?: string | null;
  handler?: string | null;
  platform?: string | null;
}

export interface CapabilityInput {
  capability_kind?: string | null;
  risk_level?: string | null;
  catalog_source?: string | null;
  handler_key?: string | null;
  connector_key?: string | null;
  approval_required?: boolean | null;
  execution_mode?: string | null;
  capability_test_status?: string | null;
  test_score?: number | string | null;
  academy_output_kind?: string | null;
  test_output_count?: number | string | null;
  tools?: CapabilityToolRef[] | null;
}

export interface AcademyStepEvidence {
  action?: string | null;
  message?: string | null;
  data?: unknown;
}

const KINDS = new Set<CapabilityKind>(['prompt_only', 'tool_backed', 'connector_backed']);
const RISKS = new Set<CapabilityRisk>(['read_only', 'draft', 'approval_required', 'external_action']);
const SOURCES = new Set<CatalogSource>(['native', 'imported', 'curated']);
const OUTPUT_KINDS = new Set<AcademyOutputKind>(['findings', 'action_list', 'structured_output']);

const valid = <T extends string>(value: string | null | undefined, allowed: Set<T>): T | null => {
  const normalized = value?.trim() as T | undefined;
  return normalized && allowed.has(normalized) ? normalized : null;
};

/**
 * DB metadata is authoritative when present. The fallback is intentionally
 * conservative: a skill with no registered tool is never called executable.
 */
export function resolveCapabilityKind(input: CapabilityInput): CapabilityKind {
  const stored = valid(input.capability_kind, KINDS);
  if (stored) return stored;
  if (input.connector_key || (input.tools ?? []).some((tool) => Boolean(tool.platform && tool.platform !== 'web'))) return 'connector_backed';
  if (input.handler_key || (input.tools ?? []).length > 0) return 'tool_backed';
  return 'prompt_only';
}

export function resolveCapabilityRisk(input: CapabilityInput): CapabilityRisk {
  const stored = valid(input.risk_level, RISKS);
  if (stored) return stored;
  return input.approval_required ? 'approval_required' : 'read_only';
}

export function resolveCatalogSource(input: CapabilityInput): CatalogSource {
  return valid(input.catalog_source, SOURCES) ?? 'native';
}

export function resolveAcademyOutputKind(input: CapabilityInput): AcademyOutputKind {
  return valid(input.academy_output_kind, OUTPUT_KINDS) ?? 'findings';
}

export const CAPABILITY_KIND_LABEL: Record<CapabilityKind, string> = {
  prompt_only: 'PROMPT-ONLY',
  tool_backed: 'TOOL-BACKED',
  connector_backed: 'CONNECTOR-BACKED',
};

export const CAPABILITY_RISK_LABEL: Record<CapabilityRisk, string> = {
  read_only: 'SALT OKUNUR',
  draft: 'TASLAK ÜRETİR',
  approval_required: 'ONAY GEREKLİ',
  external_action: 'HARİCİ EYLEM',
};

export const CATALOG_SOURCE_LABEL: Record<CatalogSource, string> = {
  native: 'YEREL KATALOG',
  imported: 'İÇE AKTARILDI',
  curated: 'KÜRATÖRLÜ',
};

export const CAPABILITY_TEST_STATUS_LABEL: Record<CapabilityTestStatus, string> = {
  unverified: 'HANDLER DOĞRULANMADI',
  prompt_verified: 'PROMPT TESTİ GEÇTİ',
  handler_verified: 'HANDLER DOĞRULANDI',
  failed: 'TEST BAŞARISIZ',
};

export function resolveCapabilityTestStatus(input: CapabilityInput): CapabilityTestStatus {
  return valid(input.capability_test_status, new Set<CapabilityTestStatus>(['unverified', 'prompt_verified', 'handler_verified', 'failed'])) ?? 'unverified';
}

/**
 * Academy skill_test yalnızca görev/prompt kalitesini ölçer; tool veya connector
 * çağırmadığı için tool-backed skill'i handler_verified yapmaz.
 */
export function academyTestStatus(input: CapabilityInput): CapabilityTestStatus {
  const score = Number(input.test_score);
  if (!Number.isFinite(score) || score < 60) return 'failed';
  return resolveCapabilityKind(input) === 'prompt_only' ? 'prompt_verified' : 'unverified';
}

function stepText(step: AcademyStepEvidence): string {
  const parts: string[] = [];
  if (typeof step.message === 'string') parts.push(step.message);
  if (step.data && typeof step.data === 'object') {
    const data = step.data as Record<string, unknown>;
    for (const key of ['text_tail', 'text', 'output', 'content']) if (typeof data[key] === 'string') parts.push(data[key] as string);
  }
  return parts.join('\n');
}

/**
 * Findings are scored by the source audit. Output-only skills need a separate
 * contract: an empty findings array is expected, not evidence of failure.
 */
export function academyOutputEvidence(kindInput: string | null | undefined, steps: AcademyStepEvidence[]) {
  const kind = resolveAcademyOutputKind({ academy_output_kind: kindInput });
  if (kind === 'findings') return { kind, count: 0, score: null as number | null, passed: false, reason: 'Kaynak bulguları audit ile puanlanır' };
  const text = steps.filter((step) => step.action === 'ai_research' || step.action === 'ai_report' || step.action === 'content_output').map(stepText).join('\n');
  const items = [...text.matchAll(/^\s*(?:\d+\s*[.)]|[-*•])\s+\S.{4,}/gmu)].map((match) => match[0].trim());
  const count = new Set(items).size;
  const minimum = kind === 'action_list' ? 3 : 1;
  const passed = count >= minimum;
  return { kind, count, score: passed ? 100 : 0, passed, reason: passed ? `${count} yapılandırılmış çıktı maddesi bulundu` : `En az ${minimum} yapılandırılmış çıktı maddesi bekleniyordu` };
}

export function capabilityVerificationText(input: CapabilityInput): string {
  return CAPABILITY_TEST_STATUS_LABEL[resolveCapabilityTestStatus(input)];
}

export function capabilityAuditText(input: CapabilityInput): string {
  const kind = resolveCapabilityKind(input);
  const risk = resolveCapabilityRisk(input);
  const source = resolveCatalogSource(input);
  if (kind === 'prompt_only') return `${CATALOG_SOURCE_LABEL[source]} · yalnızca talimat bağlamı · ${CAPABILITY_RISK_LABEL[risk]}`;
  if (kind === 'connector_backed') return `${CATALOG_SOURCE_LABEL[source]} · kayıtlı connector/handler · ${CAPABILITY_RISK_LABEL[risk]}`;
  return `${CATALOG_SOURCE_LABEL[source]} · kayıtlı tool handler · ${CAPABILITY_RISK_LABEL[risk]}`;
}
