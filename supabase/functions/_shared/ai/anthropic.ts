import Anthropic from 'npm:@anthropic-ai/sdk@0.127.0';
import { AIRefusalError, ConfigurationRequiredError, extractJson } from './types.ts';
import type { AgentConfig, AgentRunInput, AgentRunResult, AIProvider, CompleteInput, CompleteResult } from './types.ts';

// Opus 5 / Fable ailesi sampling parametrelerini kabul etmez; Haiku 4.5 eder.
function supportsSampling(model: string) {
  return model.startsWith('claude-haiku') || model.includes('-4-5') || model.includes('sonnet-4-6');
}
// Güvenlik sınıflandırıcısı reddederse sunucu tarafı fallback (Opus 5 / Fable 5.1).
function supportsServerFallback(model: string) {
  return model.startsWith('claude-opus-5') || model.startsWith('claude-fable-5');
}

function client() {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new ConfigurationRequiredError('ANTHROPIC_API_KEY');
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 110_000 });
}

function baseParams(agent: AgentConfig) {
  const params: Record<string, unknown> = { model: agent.model, max_tokens: agent.max_tokens };
  if (supportsSampling(agent.model)) params.temperature = agent.temperature;
  if (supportsServerFallback(agent.model)) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }
  return params;
}

function textOf(content: Array<{ type: string; text?: string }>) {
  return content.filter((b) => b.type === 'text').map((b) => b.text || '').join('\n').trim();
}

export const anthropicProvider: AIProvider = {
  name: 'anthropic',

  async complete(agent: AgentConfig, input: CompleteInput): Promise<CompleteResult> {
    const c = client();
    const params: Record<string, unknown> = {
      ...baseParams(agent),
      system: input.system,
      messages: [{ role: 'user', content: input.prompt }],
    };
    if (input.schema) params.output_config = { format: { type: 'json_schema', schema: input.schema } };
    // deno-lint-ignore no-explicit-any
    const res: any = await c.beta.messages.create(params as any);
    if (res.stop_reason === 'refusal') throw new AIRefusalError(res.stop_details?.explanation || 'Model isteği reddetti');
    const text = textOf(res.content);
    return {
      text,
      json: input.schema ? extractJson(text) : null,
      usage: { tokensIn: res.usage?.input_tokens ?? 0, tokensOut: res.usage?.output_tokens ?? 0 },
      stopReason: res.stop_reason,
    };
  },

  async runAgent(agent: AgentConfig, input: AgentRunInput): Promise<AgentRunResult> {
    const c = client();
    const tools = input.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
    // deno-lint-ignore no-explicit-any
    const messages: any[] = [{ role: 'user', content: input.prompt }];
    const usage = { tokensIn: 0, tokensOut: 0 };
    let turns = 0; let toolCalls = 0; let finalText = ''; let stopReason = '';

    while (turns < input.maxTurns) {
      turns++;
      // deno-lint-ignore no-explicit-any
      const res: any = await c.beta.messages.create({ ...baseParams(agent), system: input.system, tools, messages } as any);
      usage.tokensIn += res.usage?.input_tokens ?? 0;
      usage.tokensOut += res.usage?.output_tokens ?? 0;
      stopReason = res.stop_reason;
      if (res.stop_reason === 'refusal') throw new AIRefusalError(res.stop_details?.explanation || 'Model isteği reddetti');
      // Yanıt içeriği (thinking blokları dahil) değiştirilmeden geri eklenir.
      messages.push({ role: 'assistant', content: res.content });
      finalText = textOf(res.content) || finalText;
      if (res.stop_reason !== 'tool_use') break;

      // deno-lint-ignore no-explicit-any
      const uses = res.content.filter((b: any) => b.type === 'tool_use');
      const results = await Promise.all(uses.map(async (u: { id: string; name: string; input: Record<string, unknown> }) => {
        toolCalls++;
        const r = await input.onToolCall(u.name, u.input || {});
        return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(r.content).slice(0, 20000), is_error: !r.ok };
      }));
      messages.push({ role: 'user', content: results }); // tüm sonuçlar tek mesajda
    }
    return { finalText, turns, toolCalls, stopReason, usage };
  },
};
