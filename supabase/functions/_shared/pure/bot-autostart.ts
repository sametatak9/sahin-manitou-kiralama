export type OneClickStatus = 'scheduled' | 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'dead_letter';

export interface OneClickSkill {
  id: string;
  skill_key: string;
  display_name: string;
  enabled: boolean;
  lifecycle: string;
  capability_kind?: string | null;
  capability_test_status?: string | null;
  academy_output_kind?: string | null;
  sector?: string | null;
}

export interface OneClickTask {
  id: string;
  bot_id: string | null;
  skill_id: string | null;
  task_type: string;
  schedule_type?: string;
  title: string | null;
  status: OneClickStatus | string;
  enabled: boolean;
  next_run_at: string | null;
  archived_at?: string | null;
  timeout_seconds?: number;
  platform?: string | null;
  input_config?: Record<string, unknown> | null;
}

export interface OneClickSkillLink { skill_id: string; position: number }
export interface OneClickTool { tool_key: string; handler: string; active: boolean; approval_required: boolean }

export interface OneClickCandidate {
  bot_id: string;
  task: OneClickTask;
  skill: OneClickSkill;
  position: number;
}

const SAFE_TOOL_KEYS = new Set([
  'create_content', 'save_draft', 'submit_approval', 'generate_caption', 'generate_hashtags',
  'generate_image_prompt', 'create_report', 'fetch_metrics', 'seo_audit',
]);

function testIsVerified(skill: OneClickSkill): boolean {
  if (skill.capability_kind === 'connector_backed') return false;
  if (skill.capability_kind === 'tool_backed') {
    return skill.capability_test_status === 'handler_verified';
  }
  return skill.capability_test_status === 'prompt_verified' || skill.capability_test_status === 'handler_verified';
}

function toolsAreSafe(tools: OneClickTool[], registeredHandlers: readonly string[]): boolean {
  if (tools.length === 0) return false;
  return tools.every((tool) => tool.active && registeredHandlers.includes(tool.handler) && SAFE_TOOL_KEYS.has(tool.tool_key));
}

/**
 * Selects exactly one configured default task. It never invents a capability,
 * runs an untested/retired skill, or falls back to an arbitrary task.
 */
export function chooseOneClickCandidate(input: {
  botId: string;
  botSector?: string | null;
  links: OneClickSkillLink[];
  skills: OneClickSkill[];
  tasks: OneClickTask[];
  toolsBySkill: ReadonlyMap<string, OneClickTool[]>;
  registeredHandlers: readonly string[];
  lastUsedAt?: ReadonlyMap<string, string>;
}): OneClickCandidate | null {
  const skillById = new Map(input.skills.map((skill) => [skill.id, skill]));
  const tasksBySkill = new Map<string, OneClickTask[]>();
  for (const task of input.tasks) {
    if (task.bot_id !== input.botId || !task.skill_id || task.archived_at || !task.enabled) continue;
    if (!['scheduled', 'queued', 'completed', 'failed'].includes(task.status)) continue;
    const list = tasksBySkill.get(task.skill_id) ?? [];
    list.push(task);
    tasksBySkill.set(task.skill_id, list);
  }

  const links = [...input.links].sort((a, b) => {
    const aLast = input.lastUsedAt?.get(a.skill_id) ? Date.parse(input.lastUsedAt.get(a.skill_id)!) : 0;
    const bLast = input.lastUsedAt?.get(b.skill_id) ? Date.parse(input.lastUsedAt.get(b.skill_id)!) : 0;
    return aLast - bLast || a.position - b.position;
  });
  for (const link of links) {
    const skill = skillById.get(link.skill_id);
    if (!skill || !skill.enabled || skill.lifecycle !== 'approved' || !testIsVerified(skill)) continue;
    if (skill.sector && skill.sector !== input.botSector) continue;
    const tools = input.toolsBySkill.get(skill.id) ?? [];
    const promptOnlyOutput = skill.capability_kind === 'prompt_only'
      && skill.capability_test_status === 'prompt_verified'
      && ['action_list', 'structured_output'].includes(String(skill.academy_output_kind))
      && tools.length === 0;
    const safeToolBacked = skill.capability_kind === 'tool_backed' && toolsAreSafe(tools, input.registeredHandlers);
    if (!promptOnlyOutput && !safeToolBacked) continue;
    const matchingTasks = (tasksBySkill.get(skill.id) ?? [])
      .sort((a, b) => {
        const aMatch = a.task_type === skill.skill_key ? 0 : 1;
        const bMatch = b.task_type === skill.skill_key ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        const aNext = a.next_run_at ? Date.parse(a.next_run_at) : Number.MAX_SAFE_INTEGER;
        const bNext = b.next_run_at ? Date.parse(b.next_run_at) : Number.MAX_SAFE_INTEGER;
        return aNext - bNext || a.id.localeCompare(b.id);
      });
    if (matchingTasks.length) return { bot_id: input.botId, task: matchingTasks[0], skill, position: link.position };
  }
  return null;
}

export interface OneClickCompanyContext {
  id: string;
  name: string;
  sector: string | null;
  region: string | null;
  services: string[] | null;
  content_pillars: string[] | null;
  audience: string | null;
  website?: string | null;
}

/** Produces the company-specific task input without carrying another tenant's content forward. */
export function buildOneClickInput(
  original: Record<string, unknown> | null | undefined,
  skillKey: string,
  company: OneClickCompanyContext,
): Record<string, unknown> {
  const scoped: Record<string, unknown> = {
    ...(original ?? {}),
    company_name: company.name,
    company_sector: company.sector ?? '',
    company_region: company.region ?? '',
    company_services: company.services ?? [],
    company_website: company.website ?? '',
    website: company.website ?? '',
    client_id: company.id,
  };
  delete scoped.target_url;

  if (skillKey === 'seo_audit') {
    return {
      ...scoped,
      target_url: company.website ?? '',
      objective: `${company.name} şirketinin doğrulanmış web sitesinde teknik ve içerik SEO sorunlarını denetle. Görmediğin bulguyu yazma; her bulguya sayfa/kaynak kanıtı ekle. Yalnızca rapor üret, sitede değişiklik yapma.`,
    };
  }
  if (skillKey !== 'content_scheduler') return scoped;

  const pillars = (company.content_pillars ?? []).map((x) => x.trim()).filter(Boolean);
  const services = (company.services ?? []).map((x) => x.trim()).filter(Boolean);
  const topics = pillars.length ? pillars : services;
  const scope = topics.length ? topics.join(' · ') : company.sector || company.name;
  return {
    ...scoped,
    topic: `${company.name} için ${scope} kapsamından bir başlık seç; farklı ve özgün tek bir sosyal medya taslağı hazırla.`,
    audience: company.audience ?? '',
    objective: 'Yalnızca bu işletmenin hizmetleri için tek bir özgün içerik taslağı hazırla. Gerçek dışı proje, müşteri, sonuç veya rakam uydurma. Yayınlama; taslağı insan onayına gönder.',
    tone: 'Marka kitine uygun, kısa, güven veren ve sektöre özgü.',
  };
}
