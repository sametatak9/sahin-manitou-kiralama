export type CapabilityKind = 'prompt_only' | 'tool_backed' | 'connector_backed';
export type CapabilityRisk = 'read_only' | 'draft' | 'approval_required' | 'external_action';
export type CatalogSource = 'native' | 'imported' | 'curated';
export type CapabilityTestStatus = 'unverified' | 'prompt_verified' | 'handler_verified' | 'failed';

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
  tools?: CapabilityToolRef[] | null;
}

const KINDS = new Set<CapabilityKind>(['prompt_only', 'tool_backed', 'connector_backed']);
const RISKS = new Set<CapabilityRisk>(['read_only', 'draft', 'approval_required', 'external_action']);
const SOURCES = new Set<CatalogSource>(['native', 'imported', 'curated']);

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
