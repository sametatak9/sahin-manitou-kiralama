import assert from 'node:assert/strict';
import {
  capabilityAuditText,
  resolveCapabilityKind,
  resolveCapabilityRisk,
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
};

run();
console.log('capability-registry tests: ok');
