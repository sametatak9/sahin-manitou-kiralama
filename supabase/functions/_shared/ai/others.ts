// OpenAI ve Gemini adaptörleri (resmi REST uçları). Anahtar yoksa CONFIGURATION_REQUIRED.
import { ConfigurationRequiredError, extractJson } from './types.ts';
import { getAiKey, GROQ_URL, type KeyProvider } from './keys.ts';
import type { AgentConfig, AgentRunInput, AgentRunResult, AIProvider, CompleteInput, CompleteResult } from './types.ts';

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}

// ── OpenAI (Chat Completions + function calling) ─────────────────────────────
/** OpenAI ve OpenAI uyumlu sağlayıcılar (Groq) için ortak adaptör. */
function openAiCompatible(name: 'openai' | 'groq', url: string, envName: string): AIProvider {
  const openaiKey = async () => {
    const k = await getAiKey(name as KeyProvider);
    if (!k) throw new ConfigurationRequiredError(envName);
    return k;
  };
  return {
  name,
  async complete(agent: AgentConfig, input: CompleteInput): Promise<CompleteResult> {
    const body: Record<string, unknown> = {
      model: agent.model, max_completion_tokens: agent.max_tokens,
      messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.prompt }],
    };
    // Groq her modelde json_schema desteklemiyor: orada JSON metinden ayrıştırılır
    if (input.schema && name === 'openai') body.response_format = { type: 'json_schema', json_schema: { name: 'output', schema: input.schema, strict: false } };
    const data = await postJson(url, { authorization: `Bearer ${await openaiKey()}` }, body);
    const text = data.choices?.[0]?.message?.content ?? '';
    return { text, json: input.schema ? extractJson(text) : null, usage: { tokensIn: data.usage?.prompt_tokens ?? 0, tokensOut: data.usage?.completion_tokens ?? 0 }, stopReason: data.choices?.[0]?.finish_reason ?? '' };
  },
  async runAgent(agent: AgentConfig, input: AgentRunInput): Promise<AgentRunResult> {
    const key = await openaiKey();
    const tools = input.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
    // deno-lint-ignore no-explicit-any
    const messages: any[] = [{ role: 'system', content: input.system }, { role: 'user', content: input.prompt }];
    const usage = { tokensIn: 0, tokensOut: 0 };
    let turns = 0; let toolCalls = 0; let finalText = ''; let stopReason = '';
    while (turns < input.maxTurns) {
      turns++;
      const data = await postJson(url, { authorization: `Bearer ${key}` }, { model: agent.model, max_completion_tokens: agent.max_tokens, messages, tools });
      usage.tokensIn += data.usage?.prompt_tokens ?? 0; usage.tokensOut += data.usage?.completion_tokens ?? 0;
      const msg = data.choices?.[0]?.message; stopReason = data.choices?.[0]?.finish_reason ?? '';
      messages.push(msg);
      finalText = msg?.content || finalText;
      if (!msg?.tool_calls?.length) break;
      for (const call of msg.tool_calls) {
        toolCalls++;
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* boş */ }
        const r = await input.onToolCall(call.function.name, args);
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(r.content).slice(0, 20000) });
      }
    }
    return { finalText, turns, toolCalls, stopReason, usage };
  },
};
}

export const openaiProvider = openAiCompatible('openai', 'https://api.openai.com/v1/chat/completions', 'OPENAI_API_KEY');
export const groqProvider = openAiCompatible('groq', GROQ_URL, 'GROQ_API_KEY');

// ── Google Gemini (generateContent + functionDeclarations) ──────────────────
async function geminiKey() {
  const k = await getAiKey('gemini');
  if (!k) throw new ConfigurationRequiredError('GEMINI_API_KEY');
  return k;
}
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

export const geminiProvider: AIProvider = {
  name: 'gemini',
  async complete(agent: AgentConfig, input: CompleteInput): Promise<CompleteResult> {
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
      generationConfig: { temperature: agent.temperature, maxOutputTokens: agent.max_tokens, ...(input.schema ? { responseMimeType: 'application/json' } : {}) },
    };
    const data = await postJson(geminiUrl(agent.model), { 'x-goog-api-key': await geminiKey() }, body);
    // deno-lint-ignore no-explicit-any
    const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
    return { text, json: input.schema ? extractJson(text) : null, usage: { tokensIn: data.usageMetadata?.promptTokenCount ?? 0, tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0 }, stopReason: data.candidates?.[0]?.finishReason ?? '' };
  },
  async runAgent(agent: AgentConfig, input: AgentRunInput): Promise<AgentRunResult> {
    const key = await geminiKey();
    const tools = [{ functionDeclarations: input.tools.map((t) => ({ name: t.name, description: t.description, parameters: t.input_schema })) }];
    // deno-lint-ignore no-explicit-any
    const contents: any[] = [{ role: 'user', parts: [{ text: input.prompt }] }];
    const usage = { tokensIn: 0, tokensOut: 0 };
    let turns = 0; let toolCalls = 0; let finalText = ''; let stopReason = '';
    while (turns < input.maxTurns) {
      turns++;
      const data = await postJson(geminiUrl(agent.model), { 'x-goog-api-key': key }, { systemInstruction: { parts: [{ text: input.system }] }, contents, tools, generationConfig: { temperature: agent.temperature, maxOutputTokens: agent.max_tokens } });
      usage.tokensIn += data.usageMetadata?.promptTokenCount ?? 0; usage.tokensOut += data.usageMetadata?.candidatesTokenCount ?? 0;
      const content = data.candidates?.[0]?.content; stopReason = data.candidates?.[0]?.finishReason ?? '';
      if (!content) break;
      contents.push(content);
      // deno-lint-ignore no-explicit-any
      const parts: any[] = content.parts || [];
      finalText = parts.map((p) => p.text || '').join('') || finalText;
      const calls = parts.filter((p) => p.functionCall);
      if (!calls.length) break;
      const responses = [];
      for (const p of calls) {
        toolCalls++;
        const r = await input.onToolCall(p.functionCall.name, p.functionCall.args || {});
        responses.push({ functionResponse: { name: p.functionCall.name, response: { ok: r.ok, content: r.content } } });
      }
      contents.push({ role: 'user', parts: responses });
    }
    return { finalText, turns, toolCalls, stopReason, usage };
  },
};
