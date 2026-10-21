import { estimateCost, budgetBlock, spendStatus } from './ai/budget.ts';
import { istanbulDayRange, type Db, type TaskRow } from './context.ts';
import { HttpError } from './http.ts';
import { buildOneClickInput, chooseOneClickCandidate, type OneClickCompanyContext, type OneClickSkill, type OneClickTask, type OneClickTool } from './pure/bot-autostart.ts';
import { routeForModel } from './pure/model-routing.ts';
import { executeTask } from './engine.ts';
import { registeredHandlerKeys } from './tools/registry.ts';

const ALLOWED_MODELS = ['gpt-5-mini', 'gpt-5-nano', 'gpt-5', 'claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5', 'gemini-flash-latest', 'llama-3.3-70b-versatile'] as const;
const ALLOWED_DURATIONS = [1, 5, 10] as const;

interface Profile {
  bot: { id: string; name: string; status: string; client_id: string; platform: string | null; permissions: { max_runs_per_day?: number } | null };
  client: OneClickCompanyContext & { status: string; archived_at: string | null; brand_kit_id: string | null };
  task: OneClickTask;
  skill: OneClickSkill;
}

function allowedModel(model: unknown): string {
  const value = String(model || 'gpt-5-mini');
  if (!(ALLOWED_MODELS as readonly string[]).includes(value) || !routeForModel(value)) {
    throw new HttpError(400, 'Bu model Botu Başlat akışında desteklenmiyor', 'MODEL_NOT_ALLOWED');
  }
  return value;
}

function allowedDuration(value: unknown): number {
  const minutes = Number(value ?? 5);
  if (!(ALLOWED_DURATIONS as readonly number[]).includes(minutes)) {
    throw new HttpError(400, 'Süre 1, 5 veya 10 dakika olmalı', 'INVALID_DURATION');
  }
  return minutes;
}

async function profileFor(db: Db, botId: unknown, clientId: unknown, pin?: { taskId: unknown; skillId: unknown }): Promise<Profile> {
  const id = String(botId || '');
  const companyId = String(clientId || '');
  if (!id || !companyId) throw new HttpError(400, 'Bot ve seçili işletme gereklidir', 'INVALID_SCOPE');

  const [{ data: bot, error: botError }, { data: client, error: clientError }] = await Promise.all([
    db.from('automation_bots').select('id,name,status,client_id,platform,permissions').eq('id', id).maybeSingle(),
    db.from('agency_clients').select('id,name,sector,region,services,content_pillars,audience,status,archived_at,brand_kit_id').eq('id', companyId).maybeSingle(),
  ]);
  if (botError) throw botError;
  if (clientError) throw clientError;
  if (!bot) throw new HttpError(404, 'Bot bulunamadı', 'BOT_NOT_FOUND');
  if (!client || client.archived_at || client.status === 'archived') throw new HttpError(404, 'İşletme bulunamadı veya arşivlenmiş', 'CLIENT_NOT_FOUND');
  if (bot.client_id !== companyId) throw new HttpError(403, 'Bot seçili işletmeye ait değil', 'CLIENT_SCOPE_MISMATCH');
  if (bot.status === 'paused' || bot.status === 'archived') throw new HttpError(409, 'Bot duraklatılmış veya arşivlenmiş; önce yönetici etkinleştirmeli', 'BOT_INACTIVE');
  if (client.status !== 'active') throw new HttpError(409, 'İşletme aktif değil; Bot başlatılamadı', 'CLIENT_INACTIVE');

  let website: string | null = null;
  if (client.brand_kit_id) {
    const { data: brandKit, error: brandError } = await db.from('brand_kits').select('website').eq('id', client.brand_kit_id).maybeSingle();
    if (brandError) throw brandError;
    const raw = String(brandKit?.website ?? '').trim();
    if (raw) {
      try {
        const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const parsed = new URL(normalized);
        if (['http:', 'https:'].includes(parsed.protocol)) website = parsed.toString();
      } catch { website = null; }
    }
  }

  const { data: links, error: linksError } = await db.from('automation_bot_skills').select('skill_id,position').eq('bot_id', id).order('position');
  if (linksError) throw linksError;
  const skillIds = [...new Set((links ?? []).map((row: { skill_id: string }) => row.skill_id))];
  if (!skillIds.length) throw new HttpError(409, 'Bu botta atanmış yetenek yok', 'NO_ASSIGNED_SKILLS');

  const [{ data: skills, error: skillsError }, { data: tasks, error: tasksError }, { data: bindings, error: bindingError }, { data: recentRuns, error: runsError }] = await Promise.all([
    db.from('automation_skills').select('id,skill_key,display_name,enabled,lifecycle,capability_kind,capability_test_status,academy_output_kind,sector').in('id', skillIds),
    db.from('automation_tasks').select('id,bot_id,skill_id,task_type,schedule_type,title,status,enabled,next_run_at,archived_at,timeout_seconds,platform,input_config').eq('bot_id', id).eq('enabled', true).is('archived_at', null).in('status', ['scheduled', 'queued', 'completed', 'failed']).order('next_run_at', { ascending: true, nullsFirst: false }),
    db.from('automation_skill_tools').select('skill_id,tool_id').in('skill_id', skillIds),
    db.from('social_bot_runs').select('skill_id,created_at').eq('bot_id', id).order('created_at', { ascending: false }).limit(200),
  ]);
  if (skillsError) throw skillsError;
  if (tasksError) throw tasksError;
  if (bindingError) throw bindingError;
  if (runsError) throw runsError;

  const toolIds = [...new Set((bindings ?? []).map((row: { tool_id: string }) => row.tool_id))];
  const { data: tools, error: toolsError } = toolIds.length
    ? await db.from('automation_tools').select('id,tool_key,handler,active,approval_required').in('id', toolIds)
    : { data: [], error: null };
  if (toolsError) throw toolsError;

  const toolsBySkill = new Map<string, OneClickTool[]>();
  const toolById = new Map((tools ?? []).map((tool: { id: string; tool_key: string; handler: string; active: boolean; approval_required: boolean }) => [tool.id, tool]));
  for (const binding of (bindings ?? []) as Array<{ skill_id: string; tool_id: string }>) {
    const tool = toolById.get(binding.tool_id);
    if (!tool) continue;
    const list = toolsBySkill.get(binding.skill_id) ?? [];
    list.push(tool);
    toolsBySkill.set(binding.skill_id, list);
  }
  const lastUsedAt = new Map<string, string>();
  for (const run of (recentRuns ?? []) as Array<{ skill_id: string | null; created_at: string }>) {
    if (run.skill_id && !lastUsedAt.has(run.skill_id)) lastUsedAt.set(run.skill_id, run.created_at);
  }

  const pinnedTaskId = pin ? String(pin.taskId || '') : '';
  const pinnedSkillId = pin ? String(pin.skillId || '') : '';
  if (pin && (!pinnedTaskId || !pinnedSkillId)) throw new HttpError(400, 'Başlatma profili eksik', 'INVALID_PROFILE_PIN');
  const candidate = chooseOneClickCandidate({
    botId: id,
    botSector: client.sector,
    links: ((links ?? []) as Array<{ skill_id: string; position: number }>).filter((link) => !pin || link.skill_id === pinnedSkillId),
    skills: ((skills ?? []) as OneClickSkill[]).filter((skill) => skill.skill_key !== 'seo_audit' || Boolean(website)),
    tasks: ((tasks ?? []) as OneClickTask[]).filter((task) => !pin || (task.id === pinnedTaskId && task.skill_id === pinnedSkillId)),
    toolsBySkill,
    registeredHandlers: registeredHandlerKeys(),
    lastUsedAt,
  });
  if (!candidate) throw new HttpError(409, 'Bu bot için çalıştırılabilir hazır profil yok. Aktif görev, şirketle uyumlu Academy onaylı/test edilmiş yetenek ve güvenli araçlar birlikte bulunmalı.', 'BOT_PROFILE_NOT_READY');

  return {
    bot: { ...bot, client_id: companyId },
    client: { ...client, website } as OneClickCompanyContext & { status: string; archived_at: string | null; brand_kit_id: string | null },
    task: candidate.task,
    skill: candidate.skill,
  };
}

async function budgetForStart(db: Db) {
  const spend = await spendStatus(db);
  if (!spend || !spend.enabled || (!(Number(spend.daily_usd) > 0) && !(Number(spend.monthly_usd) > 0))) {
    throw new HttpError(409, 'Bot başlatılmadı: günlük/aylık yapay zekâ harcama freni açık ve limitli olmalı.', 'BUDGET_GUARD_DISABLED');
  }
  const blocked = await budgetBlock(db);
  if (blocked) throw new HttpError(409, blocked, 'BUDGET_LIMIT');
  return spend;
}

function freeProvider(provider: string, model: string) {
  return ['github', 'cerebras', 'mistral'].includes(provider) || (provider === 'openrouter' && /:free$/.test(model));
}

async function runTelemetry(db: Db, runIds: string[]) {
  if (!runIds.length) return new Map<string, { tokensIn: number; tokensOut: number; costUsd: number; models: string[] }>();
  const [{ data: usage, error: usageError }, { data: generations, error: generationError }] = await Promise.all([
    db.from('ai_usage').select('ref_id,provider,model,tokens_in,tokens_out,cost_usd').eq('source', 'agent').in('ref_id', runIds),
    db.from('ai_generations').select('run_id,provider,model,tokens_in,tokens_out,status').in('run_id', runIds).eq('status', 'succeeded'),
  ]);
  if (usageError) throw usageError;
  if (generationError) throw generationError;
  const result = new Map<string, { tokensIn: number; tokensOut: number; costUsd: number; models: string[] }>();
  const add = (runId: string | null, row: { provider: string; model: string; tokens_in: number; tokens_out: number; cost_usd?: number | null }) => {
    if (!runId) return;
    const current = result.get(runId) ?? { tokensIn: 0, tokensOut: 0, costUsd: 0, models: [] };
    const tokensIn = Number(row.tokens_in) || 0;
    const tokensOut = Number(row.tokens_out) || 0;
    current.tokensIn += tokensIn;
    current.tokensOut += tokensOut;
    current.costUsd += row.cost_usd == null
      ? (freeProvider(row.provider, row.model) ? 0 : estimateCost(row.model, tokensIn, tokensOut))
      : Number(row.cost_usd) || 0;
    const modelName = `${row.provider}/${row.model}`;
    if (!current.models.includes(modelName)) current.models.push(modelName);
    result.set(runId, current);
  };
  for (const row of (usage ?? []) as Array<{ ref_id: string | null; provider: string; model: string; tokens_in: number; tokens_out: number; cost_usd: number | null }>) add(row.ref_id, row);
  for (const row of (generations ?? []) as Array<{ run_id: string | null; provider: string; model: string; tokens_in: number; tokens_out: number }>) add(row.run_id, row);
  return result;
}

export async function quoteBotStart(db: Db, input: { bot_id?: unknown; client_id?: unknown; model?: unknown }) {
  const profile = await profileFor(db, input.bot_id, input.client_id);
  const spend = await spendStatus(db);
  const model = allowedModel(input.model);
  let blockedReason: string | null = null;
  if (!spend || !spend.enabled || (!(Number(spend.daily_usd) > 0) && !(Number(spend.monthly_usd) > 0))) {
    blockedReason = 'Günlük veya aylık AI harcama freni ve limiti etkin değil.';
  } else {
    blockedReason = await budgetBlock(db);
  }
  const maxRuns = Number(profile.bot.permissions?.max_runs_per_day) || 10;
  const { start: dayStart } = istanbulDayRange();
  const { count: todayRuns, error: countError } = await db.from('social_bot_runs').select('id', { count: 'exact', head: true }).eq('bot_id', profile.bot.id).gte('created_at', dayStart);
  if (countError) throw countError;
  if (!blockedReason && (todayRuns ?? 0) >= maxRuns) blockedReason = `Bu bot bugün ${maxRuns} koşu sınırına ulaştı.`;
  const { data: runs, error } = await db.from('social_bot_runs').select('id').eq('bot_id', profile.bot.id).eq('skill_id', profile.skill.id).in('status', ['completed', 'awaiting_approval']).order('created_at', { ascending: false }).limit(10);
  if (error) throw error;
  const runIds = (runs ?? []).map((row: { id: string }) => row.id);
  const telemetry = await runTelemetry(db, runIds);
  const samples = [...telemetry.values()].filter((row) => row.tokensIn + row.tokensOut > 0).map((row) => {
    const route = routeForModel(model)!;
    return freeProvider(route.provider, model) ? 0 : estimateCost(model, row.tokensIn, row.tokensOut);
  }).sort((a, b) => a - b);
  const middle = Math.floor(samples.length / 2);
  const estimate = samples.length ? (samples.length % 2 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2) : null;
  return {
    ready: true,
    can_start: !blockedReason,
    blocked_reason: blockedReason,
    bot_name: profile.bot.name,
    company_name: profile.client.name,
    skill_name: profile.skill.display_name,
    skill_id: profile.skill.id,
    task_id: profile.task.id,
    task_title: profile.task.title || profile.skill.display_name,
    model,
    durations: ALLOWED_DURATIONS,
    estimated_cost_usd: estimate === null ? null : Math.round(estimate * 10000) / 10000,
    estimate_samples: samples.length,
    budget: spend ? {
      enabled: spend.enabled,
      today_usd: Number(spend.today_usd) || 0,
      daily_usd: Number(spend.daily_usd) || 0,
      month_usd: Number(spend.month_usd) || 0,
      monthly_usd: Number(spend.monthly_usd) || 0,
    } : null,
    note: 'Ön tahmin, aynı bot/yetenek için son başarılı koşuların token hacminin seçili modele göre yeniden fiyatlanmış medyanıdır; kesin fiyat veya işlem başı tavan değildir. Gerçek kullanım koşu tamamlanınca gösterilir.',
  };
}

export async function startBot(db: Db, input: { bot_id?: unknown; client_id?: unknown; model?: unknown; duration_minutes?: unknown; task_id?: unknown; skill_id?: unknown }, actor: { userId: string; role: string }) {
  const profile = await profileFor(db, input.bot_id, input.client_id, { taskId: input.task_id, skillId: input.skill_id });
  const model = allowedModel(input.model);
  const duration = allowedDuration(input.duration_minutes);
  const spend = await budgetForStart(db);

  const maxRuns = Number(profile.bot.permissions?.max_runs_per_day) || 10;
  const { start: dayStart } = istanbulDayRange();
  const { count, error: countError } = await db.from('social_bot_runs').select('id', { count: 'exact', head: true }).eq('bot_id', profile.bot.id).gte('created_at', dayStart);
  if (countError) throw countError;
  if ((count ?? 0) >= maxRuns) throw new HttpError(429, `Bu bot bugün ${maxRuns} koşu sınırına ulaştı`, 'BOT_DAILY_RUN_LIMIT');

  const workerId = `oneclick:${actor.userId.slice(0, 8)}`;
  const { data: claimed, error: claimError } = await db.rpc('claim_task_now', { p_task_id: profile.task.id, p_worker: workerId, p_lease_seconds: Math.max(300, duration * 60 + 60) });
  if (claimError) throw claimError;
  const task = (claimed || [])[0] as TaskRow | undefined;
  if (!task) throw new HttpError(409, 'Bu botun hazır görevi zaten çalışıyor veya artık kullanılamıyor', 'TASK_LOCKED');
  if (!task.enabled || task.skill_id !== profile.skill.id || task.bot_id !== profile.bot.id) {
    await db.from('automation_tasks').update({ status: 'scheduled', locked_by: null, locked_until: null }).eq('id', task.id).eq('status', 'running');
    throw new HttpError(409, 'Görev durumu başlatma sırasında değişti; güvenlik için iptal edildi', 'TASK_STATE_CHANGED');
  }

  const taskInput = buildOneClickInput(task.input_config, profile.skill.skill_key, profile.client);
  const executionTask = { ...task, input_config: taskInput, timeout_seconds: duration * 60 };
  await db.rpc('write_audit_service', { p_actor: actor.userId, p_action: 'bot_start', p_entity_type: 'automation_bots', p_entity_id: profile.bot.id, p_summary: `${profile.client.name} · ${profile.skill.display_name} · ${duration} dk · ${model}` });
  const result = await executeTask(db, executionTask, { trigger: 'manual', workerId, actorId: actor.userId, actorRole: actor.role, model });
  const telemetry = await runTelemetry(db, [result.run_id]);
  const actual = telemetry.get(result.run_id);
  const actualCost = actual?.costUsd ?? null;
  return {
    ...result,
    bot_name: profile.bot.name,
    company_name: profile.client.name,
    skill_name: profile.skill.display_name,
    requested_model: model,
    model_used: actual?.models ?? [],
    tokens_in: actual?.tokensIn ?? null,
    tokens_out: actual?.tokensOut ?? null,
    recorded_cost_estimate_usd: actualCost === null ? null : Math.round(actualCost * 10000) / 10000,
    daily_budget_remaining_usd: spend.daily_usd > 0 ? Math.max(0, Number(spend.daily_usd) - Number(spend.today_usd)) : null,
    monthly_budget_remaining_usd: spend.monthly_usd > 0 ? Math.max(0, Number(spend.monthly_usd) - Number(spend.month_usd)) : null,
  };
}
