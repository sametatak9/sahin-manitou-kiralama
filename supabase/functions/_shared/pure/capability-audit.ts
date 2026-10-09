import { resolveCapabilityKind, type CapabilityKind } from './capability-registry.ts';

export type ConnectorHealthState = 'connected' | 'degraded' | 'no_recent_activity' | 'config_required' | 'not_registered' | 'not_required';

export interface CapabilityToolBinding {
  tool_key: string;
  handler: string | null;
  platform: string | null;
  active: boolean;
}

export interface CapabilityConnectorBinding {
  key: string;
  implemented: boolean;
  status: string;
  health_state: ConnectorHealthState;
  last_ok_at: string | null;
  last_failed_at: string | null;
  failed_24h: number;
}

export interface CapabilityAuditSkillInput {
  id: string;
  skill_key: string;
  display_name: string;
  capability_kind?: string | null;
  handler_key?: string | null;
  connector_key?: string | null;
  capability_test_status?: string | null;
  tools?: CapabilityToolBinding[];
  connector?: CapabilityConnectorBinding | null;
}

export interface CapabilityAuditSkill {
  id: string;
  skill_key: string;
  display_name: string;
  capability_kind: CapabilityKind;
  handler_key: string | null;
  handler_registered: boolean;
  tool_bindings: Array<CapabilityToolBinding & { handler_registered: boolean }>;
  connector_key: string | null;
  connector_registered: boolean;
  connector_implemented: boolean;
  connector_status: string | null;
  connector_health: ConnectorHealthState;
  capability_test_status: string;
  executable: boolean;
  blocking_reasons: string[];
}

export interface CapabilityAuditSummary {
  total_skills: number;
  prompt_only: number;
  tool_backed: number;
  connector_backed: number;
  tool_bindings: number;
  active_tool_bindings: number;
  handlers_registered: number;
  handlers_missing: number;
  connectors_registered: number;
  connectors_implemented: number;
  connectors_not_ready: number;
  handler_verified: number;
  prompt_verified: number;
  unverified: number;
  failed: number;
}

export interface CapabilityAuditReport {
  generated_at: string;
  summary: CapabilityAuditSummary;
  skills: CapabilityAuditSkill[];
  registered_handlers: string[];
  warning: string | null;
}

export function connectorHealthState(input: {
  registered: boolean;
  implemented: boolean;
  status?: string | null;
  last_ok_at?: string | null;
  failed_24h?: number | null;
}): ConnectorHealthState {
  if (!input.registered) return 'not_registered';
  if (!input.implemented || ['config_required', 'api_key_required', 'oauth_required', 'expired', 'error'].includes(String(input.status))) return 'config_required';
  if (Number(input.failed_24h) > 0) return 'degraded';
  if (!input.last_ok_at) return 'no_recent_activity';
  return 'connected';
}

export function auditCapabilitySkill(input: CapabilityAuditSkillInput, knownHandlers: ReadonlySet<string>): CapabilityAuditSkill {
  const kind = resolveCapabilityKind({ capability_kind: input.capability_kind, handler_key: input.handler_key, connector_key: input.connector_key,
    tools: (input.tools ?? []).map((tool) => ({ tool_key: tool.tool_key, handler: tool.handler, platform: tool.platform })) });
  const handlerKey = input.handler_key || input.tools?.find((tool) => tool.handler)?.handler || null;
  const handlerRegistered = Boolean(handlerKey && knownHandlers.has(handlerKey));
  const toolBindings = (input.tools ?? []).map((tool) => ({ ...tool, handler_registered: Boolean(tool.handler && knownHandlers.has(tool.handler)) }));
  const connector = input.connector ?? null;
  const connectorRegistered = Boolean(connector);
  const connectorImplemented = Boolean(connector?.implemented);
  const connectorStatus = connector?.status ?? null;
  const connectorHealth = connector?.health_state ?? (kind === 'connector_backed' ? 'not_registered' : 'not_required');
  const testStatus = input.capability_test_status || 'unverified';
  const blockingReasons: string[] = [];
  if (kind === 'tool_backed' && !handlerRegistered) blockingReasons.push('Kayıtlı handler bulunamadı');
  if (kind === 'connector_backed' && !connectorRegistered) blockingReasons.push('Connector katalogda kayıtlı değil');
  if (kind === 'connector_backed' && connectorRegistered && !connectorImplemented) blockingReasons.push('Connector handlerı henüz uygulanmamış');
  if (kind === 'connector_backed' && ['config_required', 'oauth_required', 'expired', 'error'].includes(String(connectorStatus))) blockingReasons.push(`Connector durumu: ${connectorStatus}`);
  if (testStatus === 'failed') blockingReasons.push('Academy testi başarısız');
  return {
    id: input.id, skill_key: input.skill_key, display_name: input.display_name, capability_kind: kind,
    handler_key: handlerKey, handler_registered: handlerRegistered, tool_bindings: toolBindings,
    connector_key: input.connector_key || null, connector_registered: connectorRegistered, connector_implemented: connectorImplemented,
    connector_status: connectorStatus, connector_health: connectorHealth, capability_test_status: testStatus,
    executable: blockingReasons.length === 0 && (kind === 'prompt_only' || handlerRegistered || connectorImplemented), blocking_reasons: blockingReasons,
  };
}

export function summarizeCapabilityAudit(items: CapabilityAuditSkill[]): CapabilityAuditSummary {
  const summary: CapabilityAuditSummary = {
    total_skills: items.length, prompt_only: 0, tool_backed: 0, connector_backed: 0, tool_bindings: 0, active_tool_bindings: 0,
    handlers_registered: 0, handlers_missing: 0, connectors_registered: 0, connectors_implemented: 0, connectors_not_ready: 0,
    handler_verified: 0, prompt_verified: 0, unverified: 0, failed: 0,
  };
  for (const item of items) {
    summary[item.capability_kind]++;
    summary.tool_bindings += item.tool_bindings.length;
    summary.active_tool_bindings += item.tool_bindings.filter((tool) => tool.active).length;
    if (item.handler_key && item.handler_registered) summary.handlers_registered++;
    if (item.handler_key && !item.handler_registered) summary.handlers_missing++;
    if (item.connector_key && item.connector_registered) summary.connectors_registered++;
    if (item.connector_key && item.connector_implemented) summary.connectors_implemented++;
    if (item.connector_key && item.connector_health !== 'connected') summary.connectors_not_ready++;
    if (item.capability_test_status === 'handler_verified') summary.handler_verified++;
    else if (item.capability_test_status === 'prompt_verified') summary.prompt_verified++;
    else if (item.capability_test_status === 'failed') summary.failed++;
    else summary.unverified++;
  }
  return summary;
}

/**
 * Mission auditine yazılacak küçük ve güvenli görünüm.
 * Tam skill talimatları veya tool payload'ları burada tutulmaz; amaç yalnızca
 * bu koşuda hangi capability'nin kayıtlı/çalıştırılabilir göründüğünü kanıtlamaktır.
 */
export interface MissionCapabilityInput extends CapabilityAuditSkillInput {
  version?: number | null;
}

export interface MissionCapabilitySnapshotSkill {
  id: string;
  name: string;
  version: number;
  capability_kind: CapabilityKind;
  handler_key: string | null;
  handler_registered: boolean;
  connector_key: string | null;
  connector_registered: boolean;
  connector_implemented: boolean;
  connector_status: string | null;
  connector_health: ConnectorHealthState;
  capability_test_status: string;
  executable: boolean;
  blocking_reasons: string[];
}

export interface MissionCapabilitySnapshot {
  summary: CapabilityAuditSummary;
  skills: MissionCapabilitySnapshotSkill[];
}

export function missionCapabilitySnapshot(inputs: MissionCapabilityInput[], knownHandlers: ReadonlySet<string>): MissionCapabilitySnapshot {
  const audited = inputs.map((input) => auditCapabilitySkill(input, knownHandlers));
  return {
    summary: summarizeCapabilityAudit(audited),
    skills: audited.map((item, index) => ({
      id: item.id,
      name: item.display_name.slice(0, 120),
      version: Number(inputs[index]?.version) || 1,
      capability_kind: item.capability_kind,
      handler_key: item.handler_key,
      handler_registered: item.handler_registered,
      connector_key: item.connector_key,
      connector_registered: item.connector_registered,
      connector_implemented: item.connector_implemented,
      connector_status: item.connector_status,
      connector_health: item.connector_health,
      capability_test_status: item.capability_test_status,
      executable: item.executable,
      blocking_reasons: item.blocking_reasons.slice(0, 3),
    })),
  };
}
