import assert from 'node:assert/strict';
import { auditCapabilitySkill, connectorHealthState, missionCapabilitySnapshot, summarizeCapabilityAudit } from '../supabase/functions/_shared/pure/capability-audit.ts';

const run = () => {
  assert.equal(connectorHealthState({ registered: false, implemented: false }), 'not_registered');
  assert.equal(connectorHealthState({ registered: true, implemented: false, status: 'config_required' }), 'config_required');
  assert.equal(connectorHealthState({ registered: true, implemented: true, status: 'connected', failed_24h: 2, last_ok_at: '2026-10-09T00:00:00Z' }), 'degraded');
  assert.equal(connectorHealthState({ registered: true, implemented: true, status: 'connected', failed_24h: 0, last_ok_at: null }), 'no_recent_activity');
  assert.equal(connectorHealthState({ registered: true, implemented: true, status: 'connected', failed_24h: 0, last_ok_at: '2026-10-09T00:00:00Z' }), 'connected');

  const prompt = auditCapabilitySkill({ id: 'p', skill_key: 'prompt_skill', display_name: 'Prompt', capability_kind: 'prompt_only', capability_test_status: 'prompt_verified' }, new Set());
  assert.equal(prompt.executable, true);
  assert.deepEqual(prompt.blocking_reasons, []);

  const realTool = auditCapabilitySkill({ id: 't', skill_key: 'seo', display_name: 'SEO', capability_kind: 'tool_backed', handler_key: 'seo_audit', capability_test_status: 'unverified', tools: [{ tool_key: 'seo_audit', handler: 'seo_audit', platform: 'web', active: true }] }, new Set(['seo_audit']));
  assert.equal(realTool.handler_registered, true);
  assert.equal(realTool.executable, true);
  assert.deepEqual(realTool.blocking_reasons, []);

  const missingTool = auditCapabilitySkill({ id: 'm', skill_key: 'missing', display_name: 'Missing', capability_kind: 'tool_backed', handler_key: 'not_a_real_handler', tools: [{ tool_key: 'missing_tool', handler: 'not_a_real_handler', platform: null, active: true }] }, new Set(['seo_audit']));
  assert.equal(missingTool.handler_registered, false);
  assert.equal(missingTool.executable, false);
  assert.match(missingTool.blocking_reasons[0] || '', /handler/i);

  const report = summarizeCapabilityAudit([prompt, realTool, missingTool]);
  assert.equal(report.total_skills, 3);
  assert.equal(report.prompt_only, 1);
  assert.equal(report.tool_backed, 2);
  assert.equal(report.handlers_registered, 1);
  assert.equal(report.handler_verified, 0);
  assert.equal(report.handlers_missing, 1);
  assert.equal(report.prompt_verified, 1);
  assert.equal(report.unverified, 2);

  const snapshot = missionCapabilitySnapshot([
    { id: 'p', skill_key: 'prompt_skill', display_name: 'Prompt', version: 3, capability_kind: 'prompt_only', capability_test_status: 'prompt_verified' },
    { id: 't', skill_key: 'seo', display_name: 'SEO', version: 2, capability_kind: 'tool_backed', handler_key: 'seo_audit', capability_test_status: 'unverified', tools: [{ tool_key: 'seo_audit', handler: 'seo_audit', platform: 'web', active: true }] },
    { id: 'c', skill_key: 'meta', display_name: 'Meta', version: 1, capability_kind: 'connector_backed', connector_key: 'instagram', connector: { key: 'instagram', implemented: true, status: 'oauth_required', health_state: 'config_required', last_ok_at: null, last_failed_at: null, failed_24h: 0 } },
  ], new Set(['seo_audit']));
  assert.equal(snapshot.skills[0]?.version, 3);
  assert.equal(snapshot.skills[1]?.handler_registered, true);
  assert.equal(snapshot.skills[2]?.connector_health, 'config_required');
  assert.equal(snapshot.summary.total_skills, 3);
  assert.equal(snapshot.summary.handlers_registered, 1);
  assert.equal(snapshot.summary.connectors_not_ready, 1);
};

run();
console.log('capability-audit tests: ok');
