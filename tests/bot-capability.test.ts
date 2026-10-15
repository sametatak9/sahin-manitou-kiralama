import { summarizeBotCapabilities } from '../supabase/functions/_shared/pure/bot-capability.ts';
import type { CapabilityAuditSkill } from '../supabase/functions/_shared/pure/capability-audit.ts';

let assertions = 0;
function assert(condition: unknown, message: string) {
  assertions++;
  if (!condition) throw new Error(message);
}

const skills: CapabilityAuditSkill[] = [
  {
    id: 'prompt', skill_key: 'content_strategy', display_name: 'İçerik stratejisi', capability_kind: 'prompt_only',
    handler_key: null, handler_registered: false, tool_bindings: [], connector_key: null, connector_registered: false,
    connector_implemented: false, connector_status: null, connector_health: 'not_required', capability_test_status: 'prompt_verified',
    executable: true, blocking_reasons: [],
  },
  {
    id: 'tool', skill_key: 'seo_audit', display_name: 'SEO denetimi', capability_kind: 'tool_backed',
    handler_key: 'seo_audit', handler_registered: true, tool_bindings: [
      { tool_key: 'seo_audit', handler: 'seo_audit', platform: 'web', active: true, handler_registered: true },
      { tool_key: 'legacy_seo', handler: 'legacy_seo', platform: 'web', active: false, handler_registered: false },
    ], connector_key: null, connector_registered: false,
    connector_implemented: false, connector_status: null, connector_health: 'not_required', capability_test_status: 'handler_verified',
    executable: true, blocking_reasons: [],
  },
  {
    id: 'connector', skill_key: 'google_profile', display_name: 'Google profili', capability_kind: 'connector_backed',
    handler_key: null, handler_registered: false, tool_bindings: [], connector_key: 'google_business', connector_registered: true,
    connector_implemented: false, connector_status: 'config_required', connector_health: 'config_required', capability_test_status: 'unverified',
    executable: false, blocking_reasons: ['Connector handlerı henüz uygulanmamış'],
  },
];

const summary = summarizeBotCapabilities(['prompt', 'tool', 'connector', 'not-audited'], skills);
assert(summary.assigned === 4, 'Atanmış tüm skill sayısı korunmalı');
assert(summary.promptOnly === 1, 'Prompt-only yetenek ayrı sayılmalı');
assert(summary.toolBacked === 1 && summary.handlerReady === 1, 'Kayıtlı tool handler ayrı sayılmalı');
assert(summary.toolBindings === 2 && summary.activeToolBindings === 1, 'Aktif tool binding ayrı sayılmalı');
assert(summary.connectorBacked === 1 && summary.connectorReady === 0, 'Uygulanmamış connector çalışır sayılmamalı');
assert(summary.blocked === 1, 'Engelli connector bloke sayılmalı');
assert(summary.untested === 1, 'Yalnızca gerçekten test kanıtı olmayan skill sayılmalı');
assert(summary.missingAudit === 1, 'Audit’te bulunmayan skill görünür kalmalı');
assert(summary.blockers[0] === 'Connector handlerı henüz uygulanmamış', 'Engel gerekçesi korunmalı');

console.log(`bot capability: ${assertions} assertions passed`);
