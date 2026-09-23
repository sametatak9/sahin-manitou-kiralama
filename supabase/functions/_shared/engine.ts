// EMBAY BOT ENGINE: Bot = configuration + skills + tools + permissions + schedule.
// Görev → bot/skill/tool yükle → izin kontrolü → (pipeline | AI agent) → run/log → retry/next_run.
import { ConfigurationRequiredError, getProvider } from './ai/index.ts';
import { COMPAT } from './ai/keys.ts';
import { budgetBlock, recordUsage } from './ai/budget.ts';
import type { AgentRunResult } from './ai/types.ts';
import { loadAgent, makeLogger, type BotRow, type Db, type EngineCtx, type SkillRow, type TaskRow, type ToolRow } from './context.ts';
import { decideToolUse } from './pure/rules.ts';
import { computeNextRun, retryDelaySeconds } from './pure/schedule.ts';
import { getHandler } from './tools/registry.ts';
import { planWeek } from './planner.ts';

export interface ExecuteOptions {
  trigger: 'schedule' | 'manual' | 'retry' | 'event';
  workerId: string;
  actorId?: string;     // manuel tetiklemede çalıştıran kullanıcı
  actorRole?: string;
}

class TimeoutError extends Error { code = 'TIMEOUT'; }

function withTimeout<T>(p: Promise<T>, seconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new TimeoutError(`Zaman aşımı (${seconds}s)`)), seconds * 1000); }),
  ]);
}

async function teamRole(db: Db, userId: string) {
  const { data } = await db.from('team_members').select('role').eq('user_id', userId).maybeSingle();
  return data?.role as string | undefined;
}

export async function executeTask(db: Db, task: TaskRow, opts: ExecuteOptions) {
  const started = Date.now();
  const [{ data: bot }, { data: skill }] = await Promise.all([
    task.bot_id ? db.from('automation_bots').select('*').eq('id', task.bot_id).maybeSingle() : Promise.resolve({ data: null }),
    task.skill_id ? db.from('automation_skills').select('*').eq('id', task.skill_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const actorId = opts.actorId ?? task.created_by;
  const actorRole = opts.actorRole ?? (await teamRole(db, actorId)) ?? '';

  const { data: run, error: runErr } = await db.from('social_bot_runs').insert({
    platform: task.platform || bot?.platform || 'system', run_scope: task.task_type, status: 'running', started_at: new Date().toISOString(),
    task_id: task.id, bot_id: task.bot_id, skill_id: task.skill_id, attempt: Math.max(1, task.attempt), trigger: opts.trigger, worker_id: opts.workerId,
    input: task.input_config ?? {}, created_by: actorId,
  }).select('id').single();
  if (runErr) throw runErr;

  const log = makeLogger(db, run.id);
  const ctx: EngineCtx = { db, runId: run.id, task, bot: bot as BotRow | null, skill: skill as SkillRow | null, agent: null, actorId, actorRole,
    approvalsCreated: [], outputs: {}, log, tokens: { in: 0, out: 0 } };

  let status: 'completed' | 'awaiting_approval' | 'blocked' | 'failed' | 'timeout' = 'completed';
  let summary = ''; let errorMsg: string | null = null; let errorCode: string | null = null;
  let continuation: Record<string, unknown> | null = null;

  try {
    await log('info', `Başladı · ${bot?.name ?? 'Botsuz görev'} → ${skill?.display_name ?? task.task_type}`, { trigger: opts.trigger, worker: opts.workerId });
    if (!actorRole) throw Object.assign(new Error('Görevi oluşturan kullanıcı artık ekip üyesi değil'), { code: 'PERMISSION_DENIED' });
    if (!skill) throw new Error('Görevde skill tanımlı değil');
    if (!skill.enabled) throw Object.assign(new Error('Skill pasif'), { code: 'SKILL_DISABLED' });
    if (bot && (bot.status === 'paused' || bot.status === 'archived')) throw Object.assign(new Error(`Bot ${bot.status}`), { code: 'BOT_INACTIVE' });

    const { data: links } = await db.from('automation_skill_tools').select('tool:automation_tools(*)').eq('skill_id', skill.id);
    // deno-lint-ignore no-explicit-any
    const tools: ToolRow[] = (links || []).map((l: any) => (Array.isArray(l.tool) ? l.tool[0] : l.tool)).filter(Boolean);
    const toolKeys = tools.map((t) => t.tool_key);
    ctx.agent = await loadAgent(db, bot?.ai_agent_id ?? null);

    const invoke = async (toolKey: string, input: Record<string, unknown>) => {
      const tool = tools.find((t) => t.tool_key === toolKey);
      const decision = decideToolUse(actorRole, tool, bot as BotRow | null, toolKeys);
      if (!decision.allowed) {
        await log('warn', `Tool reddedildi: ${toolKey} (${decision.reason})`);
        return { ok: false, content: { error: `İzin yok: ${decision.reason}` } };
      }
      if (decision.requiresApproval) {
        const { data: ap, error } = await db.from('approval_requests').insert({
          entity_type: toolKey === 'publish_post' ? 'publication' : toolKey === 'send_email' ? 'email' : toolKey === 'prepare_whatsapp_message' ? 'whatsapp' : toolKey === 'create_listing' ? 'listing' : 'other',
          entity_id: (input.content_id as string) || null, title: `${tool!.name} · ${bot?.name ?? 'Bot'}`, summary: JSON.stringify(input).slice(0, 400),
          bot_id: bot?.id ?? null, task_id: task.id, run_id: run.id, tool_key: toolKey, platform: (input.platform as string) || task.platform,
          payload: input, status: 'pending_approval', requested_by: actorId,
        }).select('id').single();
        if (error) throw error;
        ctx.approvalsCreated.push(ap.id);
        await log('info', `Onaya gönderildi: ${toolKey}`, { approval_id: ap.id });
        return { ok: true, content: { status: 'pending_approval', approval_id: ap.id, note: 'Bu işlem insan onayından sonra yürütülecek.' } };
      }
      const handler = getHandler(tool!.handler);
      if (!handler) return { ok: false, content: { error: `Handler yok: ${tool!.handler}` } };
      try {
        const result = await handler(ctx, input);
        ctx.outputs[toolKey] = result;
        await log('info', `Tool tamam: ${toolKey}`);
        return { ok: true, content: result };
      } catch (e) {
        if (e instanceof ConfigurationRequiredError) throw e;
        await log('error', `Tool hatası: ${toolKey}`, { error: String((e as Error).message) });
        return { ok: false, content: { error: String((e as Error).message) } };
      }
    };

    const baseInput = { ...(task.input_config ?? {}), platform: task.platform ?? (task.input_config as Record<string, unknown>)?.platform ?? bot?.platform };

    const work = async () => {
      // Aylık plan: haftalık parçalar halinde kuyruk üzerinden devam eder (uzun işler request'e bağlı kalmaz)
      if (skill.skill_key === 'campaign_planner' && task.input_config?.campaign_id) {
        const res = await planWeek(ctx, task, invoke);
        summary = res.summary; continuation = res.continuation;
        return;
      }
      if (skill.execution_mode === 'pipeline') {
        for (const key of skill.pipeline) {
          const r = await invoke(key, { ...baseInput, ...(ctx.outputs as Record<string, unknown>) });
          if (!r.ok) throw new Error(`${key}: ${JSON.stringify(r.content).slice(0, 300)}`);
        }
        const last = ctx.outputs[skill.pipeline[skill.pipeline.length - 1]] as Record<string, unknown> | undefined;
        summary = (last?.title as string) || (last?.body as string)?.split('\n')[0] || `${skill.display_name} tamamlandı`;
        return;
      }
      // Agent modu: sağlayıcıdan bağımsız tool-use döngüsü
      const allowedTools = tools.filter((t) => decideToolUse(actorRole, t, bot as BotRow | null, toolKeys).allowed);
      const system = [ctx.agent!.system_prompt, `Bot: ${bot?.name ?? '-'} — ${bot?.instructions ?? ''}`, `Skill: ${skill.display_name} — ${skill.instructions}`,
        'Yalnızca verilen araçları kullan. Onay gerektiren araçlar hemen yürütülmez, onay kuyruğuna düşer. Veri uydurma. Bitince 1-2 cümlelik Türkçe özet yaz.'].join('\n\n');
      const prompt = `Görev: ${task.title ?? skill.display_name}\nPlatform: ${baseInput.platform ?? 'genel'}\nGirdi: ${JSON.stringify(task.input_config ?? {})}\nBugün: ${new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}`;
      let res: AgentRunResult | undefined;
      let used = { provider: ctx.agent!.provider as string, model: ctx.agent!.model };
      const blocked = await budgetBlock(ctx.db);
      if (blocked) throw new Error(`${blocked}. Yapay zekâ çağrısı yapılmadı (Ayarlar → Harcama sınırı).`);
      try {
        res = await getProvider(ctx.agent!.provider).runAgent(ctx.agent!, {
          system, prompt, maxTurns: 8,
          tools: allowedTools.map((t) => ({ name: t.tool_key, description: t.description, input_schema: t.input_schema })),
          onToolCall: (name, input) => invoke(name, input),
        });
      } catch (agentErr) {
        const errStr = String((agentErr as Error)?.message || agentErr);
        const isQuota = /credit|balance|quota|rate_limit|too_many_requests|429|overloaded|billing/i.test(errStr);
        if (isQuota) {
          const fallbacks = (['anthropic', 'gemini', 'groq', 'openrouter', 'github', 'openai'] as const).filter((p) => p !== ctx.agent!.provider);
          let recovered = false;
          for (const fallback of fallbacks) {
            try {
              await log('warn', `${ctx.agent!.provider} limiti/hatası nedeniyle ${fallback} modeline otomatik geçiliyor (Failover)...`);
              const altAgent = {
                ...ctx.agent!,
                provider: fallback,
                model: fallback === 'gemini' ? 'gemini-flash-latest' : fallback === 'anthropic' ? 'claude-sonnet-5' : COMPAT[fallback].agentModel
              };
              res = await getProvider(fallback).runAgent(altAgent, {
                system, prompt, maxTurns: 8,
                tools: allowedTools.map((t) => ({ name: t.tool_key, description: t.description, input_schema: t.input_schema })),
                onToolCall: (name, input) => invoke(name, input),
              });
              recovered = true; used = { provider: fallback, model: altAgent.model };
              await log('info', `Failover başarılı: ${fallback} modeli ile görev tamamlandı.`);
              break;
            } catch {
              continue;
            }
          }
          if (!recovered || !res) throw agentErr;
        } else {
          throw agentErr;
        }
      }
      if (!res) throw new Error('AI yanıtı alınamadı');
      ctx.tokens.in += res.usage.tokensIn; ctx.tokens.out += res.usage.tokensOut;
      await recordUsage(ctx.db, { source: 'agent', ref_id: ctx.runId ?? null, provider: used.provider, model: used.model, tokens_in: res.usage.tokensIn, tokens_out: res.usage.tokensOut });
      summary = res.finalText.slice(0, 500) || `${res.toolCalls} araç çağrısı`;
      await log('info', 'Agent tamamlandı', { turns: res.turns, tool_calls: res.toolCalls, stop: res.stopReason });
    };

    await withTimeout(work(), task.timeout_seconds || 120);
    if (ctx.approvalsCreated.length) status = 'awaiting_approval';
  } catch (e) {
    const err = e as Error & { code?: string };
    errorMsg = String(err.message).slice(0, 1000);
    errorCode = err.code ?? (e instanceof ConfigurationRequiredError ? 'CONFIGURATION_REQUIRED' : 'ERROR');
    status = e instanceof TimeoutError ? 'timeout' : ['CONFIGURATION_REQUIRED', 'PERMISSION_DENIED', 'SKILL_DISABLED', 'BOT_INACTIVE'].includes(errorCode) ? 'blocked' : 'failed';
    await log('error', errorMsg, { code: errorCode });
  }

  const duration = Date.now() - started;
  await db.from('social_bot_runs').update({
    status, summary: summary || errorMsg, error: errorMsg, error_code: errorCode, output: { tools: ctx.outputs, approvals: ctx.approvalsCreated },
    completed_at: new Date().toISOString(), duration_ms: duration, tokens_in: ctx.tokens.in || null, tokens_out: ctx.tokens.out || null,
    candidate_count: ctx.approvalsCreated.length,
  }).eq('id', run.id);

  // ── Görev durumunu ilerlet: sonraki çalışma / retry / dead letter ─────────
  const now = new Date();
  const base = { locked_by: null, locked_until: null, last_run_at: now.toISOString(), last_run_status: status };
  let update: Record<string, unknown>;
  if (continuation) {
    update = { ...base, status: 'scheduled', attempt: 0, input_config: continuation, next_run_at: new Date(now.getTime() + 5_000).toISOString(), last_error: null, result_summary: summary };
  } else if (status === 'completed' || status === 'awaiting_approval') {
    const next = computeNextRun(task, now);
    update = { ...base, status: next ? 'scheduled' : 'completed', next_run_at: next?.toISOString() ?? null, attempt: 0, last_error: null, result_summary: summary };
  } else if (status === 'blocked') {
    // Yapılandırma/izin sorunu: tekrar denemek anlamsız; normal takvime döner
    const next = computeNextRun(task, now);
    update = { ...base, status: next ? 'scheduled' : 'failed', next_run_at: next?.toISOString() ?? null, attempt: 0, last_error: errorMsg, result_summary: `ENGELLENDİ: ${errorMsg}` };
  } else if (task.attempt <= task.max_retries) {
    update = { ...base, status: 'scheduled', next_run_at: new Date(now.getTime() + retryDelaySeconds(task.attempt) * 1000).toISOString(), last_error: errorMsg, result_summary: `Hata, yeniden denenecek (${task.attempt}/${task.max_retries})` };
  } else {
    update = { ...base, status: 'dead_letter', dead_lettered_at: now.toISOString(), last_error: errorMsg, result_summary: `Dead letter: ${task.max_retries} deneme başarısız` };
  }
  await db.from('automation_tasks').update(update).eq('id', task.id);
  return { run_id: run.id, status, summary, error: errorMsg, error_code: errorCode, duration_ms: duration, approvals: ctx.approvalsCreated };
}
