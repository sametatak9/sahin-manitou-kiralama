import assert from 'node:assert/strict';
import {
  capabilityAuditText,
  academyOutputEvidence,
  academyTestStatus,
  isAcademyOutputOnlyTest,
  isAcademyTestInfrastructureBlocked,
  resolveCapabilityKind,
  resolveCapabilityRisk,
  resolveCapabilityTestStatus,
  resolveCatalogSource,
} from '../supabase/functions/_shared/pure/capability-registry.ts';

const run = () => {
  assert.equal(resolveCapabilityKind({}), 'prompt_only');
  assert.equal(resolveCapabilityKind({ execution_mode: 'agent', tools: [{ tool_key: 'create_report' }] }), 'tool_backed');
  assert.equal(resolveCapabilityKind({ tools: [{ tool_key: 'publish_post', platform: 'instagram' }] }), 'connector_backed');
  assert.equal(resolveCapabilityKind({ tools: [{ tool_key: 'seo_audit', platform: 'web' }] }), 'tool_backed');
  assert.equal(resolveCapabilityKind({ capability_kind: 'prompt_only', connector_key: 'instagram', tools: [{ tool_key: 'publish_post' }] }), 'prompt_only');
  assert.equal(resolveCapabilityKind({ capability_kind: 'invalid', handler_key: 'seo_audit' }), 'tool_backed');

  assert.equal(resolveCapabilityRisk({ approval_required: false }), 'read_only');
  assert.equal(resolveCapabilityRisk({ approval_required: true }), 'approval_required');
  assert.equal(resolveCapabilityRisk({ risk_level: 'draft', approval_required: true }), 'draft');
  assert.equal(resolveCapabilityRisk({ risk_level: 'invalid', approval_required: false }), 'read_only');

  assert.equal(resolveCatalogSource({}), 'native');
  assert.equal(resolveCatalogSource({ catalog_source: 'imported' }), 'imported');
  assert.equal(resolveCatalogSource({ catalog_source: 'unknown' }), 'native');
  assert.match(capabilityAuditText({ tools: [{ tool_key: 'seo_audit' }], catalog_source: 'curated' }), /KÜRATÖRLÜ.*TOOL handler.*SALT OKUNUR|KÜRATÖRLÜ.*kayıtlı tool handler.*SALT OKUNUR/);

  assert.equal(academyTestStatus({ capability_kind: 'prompt_only', test_score: 60 }), 'prompt_verified');
  assert.equal(academyTestStatus({ capability_kind: 'prompt_only', test_score: 59 }), 'failed');
  assert.equal(academyTestStatus({ capability_kind: 'tool_backed', handler_key: 'create_report', test_score: 100 }), 'unverified');
  assert.equal(academyTestStatus({ capability_kind: 'connector_backed', connector_key: 'instagram', test_score: 100 }), 'unverified');
  assert.equal(isAcademyOutputOnlyTest('action_list'), true);
  assert.equal(isAcademyOutputOnlyTest('structured_output'), true);
  assert.equal(isAcademyOutputOnlyTest('findings'), false);
  assert.equal(isAcademyTestInfrastructureBlocked({ error_kind: 'search_unavailable' }), true);
  assert.equal(isAcademyTestInfrastructureBlocked({ error_kind: 'ai_credit' }), true);
  assert.equal(isAcademyTestInfrastructureBlocked({ finish_reason: 'budget' }), true);
  assert.equal(isAcademyTestInfrastructureBlocked({ finish_reason: 'no_ai' }), true);
  assert.equal(isAcademyTestInfrastructureBlocked({ error_kind: null, finish_reason: 'max_steps' }), false);
  const actionOutput = academyOutputEvidence('action_list', [{ action: 'ai_research', data: { text_tail: '1) İlk aksiyon maddesi\n2) İkinci aksiyon maddesi\n3) Üçüncü aksiyon maddesi\n4) Dördüncü aksiyon maddesi\n\n{"new_findings":[]}' } }]);
  assert.equal(actionOutput.count, 4);
  assert.equal(actionOutput.items.length, 4);
  assert.equal(actionOutput.score, 100);
  assert.equal(actionOutput.passed, true);
  assert.equal(academyOutputEvidence('action_list', [{ action: 'content_output', data: { academy_output_items: ['Birinci çıktı maddesi', 'İkinci çıktı maddesi', 'Üçüncü çıktı maddesi'] } }]).count, 3);
  assert.equal(academyOutputEvidence('action_list', [{ action: 'ai_research', data: { text_tail: '{"new_findings":[]}' } }]).score, 0);
  assert.equal(academyOutputEvidence('findings', [{ action: 'ai_research', data: { text_tail: '1) Bu satır findings puanı değildir' } }]).score, null);
  assert.equal(resolveCapabilityTestStatus({ capability_test_status: 'handler_verified' }), 'handler_verified');
  assert.equal(resolveCapabilityTestStatus({ capability_test_status: 'blocked' }), 'blocked');
  assert.equal(resolveCapabilityTestStatus({ capability_test_status: 'unknown' }), 'unverified');
};

run();
console.log('capability-registry tests: ok');
