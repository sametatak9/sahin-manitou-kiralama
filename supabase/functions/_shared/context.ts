import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';
import { budgetBlock, recordUsage } from './ai/budget.ts';
import { ConfigurationRequiredError, getProvider } from './ai/index.ts';
import type { AgentConfig } from './ai/index.ts';
import { getAiKey } from './ai/keys.ts';

export type Db = SupabaseClient;

export function serviceClient(): Db {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface BotRow {
  id: string; slug: string; name: string; platform: string | null; status: string; instructions: string;
  connector_key: string | null; permissions: { denied_tools?: string[]; max_runs_per_day?: number } | null; ai_agent_id: string | null;
}
export interface SkillRow {
  id: string; skill_key: string; display_name: string; instructions: string; execution_mode: 'agent' | 'pipeline';
  pipeline: string[]; approval_required: boolean; enabled: boolean;
}
export interface ToolRow {
  id: string; tool_key: string; name: string; description: string; min_role: string; approval_required: boolean;
  active: boolean; input_schema: Record<string, unknown>; handler: string; platform: string | null;
}
export interface TaskRow {
  id: string; bot_id: string | null; skill_id: string | null; platform: string | null; task_type: string; title: string | null;
  schedule_type: string; run_time: string | null; run_at: string | null; cron_expression: string | null; timezone: string;
  status: string; enabled: boolean; next_run_at: string | null; attempt: number; max_retries: number; timeout_seconds: number;
  input_config: Record<string, unknown>; created_by: string; content_id: string | null;
}

export interface EngineCtx {
  db: Db;
  runId: string | null;
  task: TaskRow | null;
  bot: BotRow | null;
  skill: SkillRow | null;
  agent: AgentConfig | null;
  actorId: string;
  actorRole: string;
  approvalsCreated: string[];
  outputs: Record<string, unknown>;
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => Promise<void>;
  tokens: { in: number; out: number };
}

export function makeLogger(db: Db, runId: string | null) {
  return async (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => {
    if (!runId) { console.log(`[${level}] ${message}`); return; }
    await db.from('automation_run_logs').insert({ run_id: runId, level, message: message.slice(0, 2000), data: data === undefined ? null : data });
  };
}

export async function loadAgent(db: Db, agentId: string | null, fallbackKey = 'content-writer'): Promise<AgentConfig & { id: string }> {
  const q = db.from('ai_agents').select('id,provider,model,temperature,max_tokens,system_prompt').eq('active', true);
  const { data } = agentId ? await q.eq('id', agentId).maybeSingle() : await q.eq('agent_key', fallbackKey).maybeSingle();
  if (!data) throw new Error('Aktif AI agent bulunamadı');
  const agent = { ...data, temperature: Number(data.temperature) } as AgentConfig & { id: string };
  // Ajanın sağlayıcısının anahtarı yoksa tanımlı başka sağlayıcıya geç (önce Claude, sonra Gemini)
  if (!(await getAiKey(agent.provider))) {
    if (agent.provider !== 'anthropic' && (await getAiKey('anthropic'))) return { ...agent, provider: 'anthropic', model: 'claude-sonnet-5' };
    if (agent.provider !== 'gemini' && (await getAiKey('gemini'))) return { ...agent, provider: 'gemini', model: Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest' };
    if (agent.provider !== 'groq' && (await getAiKey('groq'))) return { ...agent, provider: 'groq', model: Deno.env.get('GROQ_AGENT_MODEL') || 'llama-3.3-70b-versatile' };
  }
  return agent;
}

/** Tek seferlik yapılandırılmış AI çağrısı; her üretim ai_generations'a yazılır. */
export async function aiComplete(ctx: Pick<EngineCtx, 'db' | 'runId' | 'actorId' | 'tokens'> & { agent: AgentConfig | null }, kind: string, prompt: string, schema?: Record<string, unknown>, systemExtra = '') {
  const agent = ctx.agent ?? await loadAgent(ctx.db, null);
  const started = Date.now();
  const system = [agent.system_prompt, systemExtra].filter(Boolean).join('\n\n');
  const base = { agent_id: (agent as { id?: string }).id ?? null, provider: agent.provider, model: agent.model, kind, input: { prompt: prompt.slice(0, 4000) }, run_id: ctx.runId, created_by: ctx.actorId };
  try {
    const blocked = await budgetBlock(ctx.db);
    if (blocked) throw new Error(`${blocked}. Yapay zekâ çağrısı yapılmadı (Ayarlar → Harcama sınırı).`);
    const res = await getProvider(agent.provider).complete(agent, { system, prompt, schema });
    ctx.tokens.in += res.usage.tokensIn; ctx.tokens.out += res.usage.tokensOut;
    await recordUsage(ctx.db, { source: 'generate', ref_id: null, provider: agent.provider, model: agent.model, tokens_in: res.usage.tokensIn, tokens_out: res.usage.tokensOut });
    const { data: gen } = await ctx.db.from('ai_generations').insert({ ...base, status: 'succeeded', output: res.json ?? { text: res.text }, tokens_in: res.usage.tokensIn, tokens_out: res.usage.tokensOut, duration_ms: Date.now() - started }).select('id').single();
    if (schema && !res.json) throw new Error('AI yanıtı beklenen JSON biçiminde değil');
    return { json: res.json as Record<string, unknown>, text: res.text, generationId: gen?.id as string | undefined };
  } catch (e) {
    const status = e instanceof ConfigurationRequiredError ? 'configuration_required' : 'failed';
    await ctx.db.from('ai_generations').insert({ ...base, status, error: String((e as Error).message).slice(0, 1000), duration_ms: Date.now() - started });
    throw e;
  }
}

export async function defaultBrand(db: Db) {
  const { data } = await db.from('brand_kits').select('*').order('is_default', { ascending: false }).limit(1).maybeSingle();
  return data as Record<string, string> | null;
}

export function istanbulDayRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const start = new Date(`${parts}T00:00:00+03:00`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400_000).toISOString(), label: parts };
}
