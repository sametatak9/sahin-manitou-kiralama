import assert from 'node:assert/strict';
import { buildOneClickInput, chooseOneClickCandidate } from '../supabase/functions/_shared/pure/bot-autostart.ts';

const links = [{ skill_id: 'content-skill', position: 0 }, { skill_id: 'seo-skill', position: 1 }];
const skills = [
  { id: 'content-skill', skill_key: 'content_scheduler', display_name: 'İçerik taslağı', enabled: true, lifecycle: 'approved', capability_kind: 'tool_backed', capability_test_status: 'handler_verified', sector: null },
  { id: 'seo-skill', skill_key: 'seo_audit', display_name: 'Teknik SEO', enabled: true, lifecycle: 'approved', capability_kind: 'tool_backed', capability_test_status: 'handler_verified', sector: 'insaat' },
];
const toolsBySkill = new Map([
  ['content-skill', [
    { tool_key: 'create_content', handler: 'create_content', active: true, approval_required: false },
    { tool_key: 'save_draft', handler: 'save_draft', active: true, approval_required: false },
    { tool_key: 'submit_approval', handler: 'submit_approval', active: true, approval_required: false },
  ]],
  ['seo-skill', [{ tool_key: 'seo_audit', handler: 'seo_audit', active: true, approval_required: false }]],
]);
const tasks = [
  { id: 't1', bot_id: 'b1', skill_id: 'content-skill', task_type: 'content_scheduler', title: 'Günün içerik taslağı', status: 'scheduled', enabled: true, next_run_at: '2026-10-21T09:00:00Z', input_config: { topic: 'Eski şirket konusu' } },
  { id: 'foreign', bot_id: 'b2', skill_id: 'content-skill', task_type: 'content_scheduler', title: 'Başka şirket görevi', status: 'scheduled', enabled: true, next_run_at: null },
  { id: 'disabled', bot_id: 'b1', skill_id: 'seo-skill', task_type: 'seo_audit', title: 'Kapalı görev', status: 'scheduled', enabled: false, next_run_at: null },
];

const selected = chooseOneClickCandidate({
  botId: 'b1', botSector: 'insaat', links, skills, tasks, toolsBySkill,
  registeredHandlers: ['create_content', 'save_draft', 'submit_approval', 'seo_audit'],
});
assert.equal(selected?.task.id, 't1', 'selects the top-priority active safe company task');
assert.equal(selected?.skill.skill_key, 'content_scheduler');

const rotated = chooseOneClickCandidate({
  botId: 'b1', botSector: 'insaat', links, skills,
  tasks: [tasks[0], { ...tasks[2], id: 'seo-ready', enabled: true, status: 'scheduled' }],
  toolsBySkill, registeredHandlers: ['create_content', 'save_draft', 'submit_approval', 'seo_audit'],
  lastUsedAt: new Map([['content-skill', '2026-10-20T12:00:00Z']]),
});
assert.equal(rotated?.skill.id, 'seo-skill', 'rotates away from the most recently used approved skill');

assert.equal(chooseOneClickCandidate({
  botId: 'b1', botSector: 'restoran', links, skills, tasks,
  toolsBySkill, registeredHandlers: ['create_content', 'save_draft', 'submit_approval', 'seo_audit'],
})?.skill.id, 'content-skill', 'sector-neutral content capability remains eligible');

assert.equal(chooseOneClickCandidate({
  botId: 'b1', botSector: null, links: [links[1]], skills: [skills[1]], tasks: [{ ...tasks[2], id: 'seo-ready', enabled: true, status: 'scheduled' }],
  toolsBySkill, registeredHandlers: ['seo_audit'],
}), null, 'sector-specific skill is not selected when company sector is unknown');

const untested = [{ ...skills[0], capability_test_status: null }];
assert.equal(chooseOneClickCandidate({
  botId: 'b1', botSector: 'insaat', links: [links[0]], skills: untested, tasks, toolsBySkill,
  registeredHandlers: ['create_content', 'save_draft', 'submit_approval'],
}), null, 'unverified skill is never auto-started');

const retired = [{ ...skills[0], lifecycle: 'retired' }];
assert.equal(chooseOneClickCandidate({
  botId: 'b1', botSector: 'insaat', links: [links[0]], skills: retired, tasks, toolsBySkill,
  registeredHandlers: ['create_content', 'save_draft', 'submit_approval'],
}), null, 'retired skill is never auto-started');

const promptOnly = [{ ...skills[0], capability_kind: 'prompt_only', capability_test_status: 'prompt_verified', academy_output_kind: 'action_list' }];
assert.equal(chooseOneClickCandidate({
  botId: 'b1', botSector: 'insaat', links: [links[0]], skills: promptOnly, tasks, toolsBySkill: new Map(), registeredHandlers: [],
})?.skill.id, 'content-skill', 'Academy-verified prompt-only output skills may run without external tools');

const promptFindings = [{ ...promptOnly[0], academy_output_kind: 'findings' }];
assert.equal(chooseOneClickCandidate({
  botId: 'b1', botSector: 'insaat', links: [links[0]], skills: promptFindings, tasks, toolsBySkill: new Map(), registeredHandlers: [],
}), null, 'prompt-only findings are never used to fabricate sourced research');

const unsafeTools = new Map([...toolsBySkill, ['content-skill', [{ tool_key: 'send_email', handler: 'send_email', active: true, approval_required: true }]]]);
assert.equal(chooseOneClickCandidate({
  botId: 'b1', botSector: 'insaat', links: [links[0]], skills, tasks, toolsBySkill: unsafeTools,
  registeredHandlers: ['send_email'],
}), null, 'external messaging skills are not selected for one-click work');

const company = {
  id: 'client-a', name: 'Embay Yapı', sector: 'insaat', region: 'İstanbul',
  services: ['Hafif çelik yapı'], content_pillars: ['Villa projeleri', 'Çelik yapı süreçleri'], audience: 'Ev sahibi adayları',
};
const scoped = buildOneClickInput({ topic: 'Manitou kiralama', objective: 'eski amaç', target_url: 'https://another-company.example' }, 'content_scheduler', company);
assert.equal(scoped.client_id, 'client-a');
assert.match(String(scoped.topic), /Embay Yapı/);
assert.match(String(scoped.topic), /Villa projeleri/);
assert.doesNotMatch(String(scoped.topic), /Manitou/);
assert.equal(scoped.target_url, undefined, 'a stale company URL is not reused in the selected client run');
assert.equal(scoped.audience, 'Ev sahibi adayları');
assert.match(String(scoped.objective), /Yayınlama/);

const seoScoped = buildOneClickInput({ target_url: 'https://wrong-client.example' }, 'seo_audit', { ...company, website: 'https://embayyapi.vercel.app/' });
assert.equal(seoScoped.target_url, 'https://embayyapi.vercel.app/');
assert.doesNotMatch(String(seoScoped.objective), /wrong-client/);

console.log('bot-autostart tests passed');
