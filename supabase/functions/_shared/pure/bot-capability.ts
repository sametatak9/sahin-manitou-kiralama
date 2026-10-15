import type { CapabilityAuditSkill } from './capability-audit.ts';

export interface BotCapabilitySummary {
  assigned: number;
  promptOnly: number;
  toolBacked: number;
  connectorBacked: number;
  handlerReady: number;
  toolBindings: number;
  activeToolBindings: number;
  connectorReady: number;
  untested: number;
  blocked: number;
  missingAudit: number;
  blockers: string[];
}

/**
 * Botun atanmış skill setini capability audit ile birleştirir.
 * Prompt-only talimatları executable handler/connector gibi göstermez.
 */
export function summarizeBotCapabilities(
  assignedSkillIds: readonly string[],
  auditedSkills: readonly CapabilityAuditSkill[],
): BotCapabilitySummary {
  const byId = new Map(auditedSkills.map((skill) => [skill.id, skill]));
  const assigned = assignedSkillIds.map((id) => byId.get(id)).filter((skill): skill is CapabilityAuditSkill => Boolean(skill));
  const blockerSet = new Set<string>();

  for (const skill of assigned) {
    for (const reason of skill.blocking_reasons) blockerSet.add(reason);
  }

  return {
    assigned: assignedSkillIds.length,
    promptOnly: assigned.filter((skill) => skill.capability_kind === 'prompt_only').length,
    toolBacked: assigned.filter((skill) => skill.capability_kind === 'tool_backed').length,
    connectorBacked: assigned.filter((skill) => skill.capability_kind === 'connector_backed').length,
    handlerReady: assigned.filter((skill) => skill.capability_kind === 'tool_backed' && skill.handler_registered).length,
    toolBindings: assigned.reduce((count, skill) => count + skill.tool_bindings.length, 0),
    activeToolBindings: assigned.reduce((count, skill) => count + skill.tool_bindings.filter((tool) => tool.active).length, 0),
    connectorReady: assigned.filter((skill) => skill.capability_kind === 'connector_backed' && skill.connector_implemented && skill.connector_health === 'connected').length,
    untested: assigned.filter((skill) => skill.capability_test_status === 'unverified').length,
    blocked: assigned.filter((skill) => skill.capability_kind !== 'prompt_only' && !skill.executable).length,
    missingAudit: Math.max(0, assignedSkillIds.length - assigned.length),
    blockers: [...blockerSet].slice(0, 8),
  };
}
