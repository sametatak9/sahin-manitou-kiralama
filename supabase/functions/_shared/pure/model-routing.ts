export type RuntimeProvider = 'anthropic' | 'gemini' | 'openai' | 'groq' | 'openrouter' | 'github' | 'cerebras' | 'mistral';

export type ModelRole = 'chat' | 'agent' | 'research' | 'fast';

export interface ModelRoute {
  model: string;
  provider: RuntimeProvider;
  role: ModelRole;
  rationale: string;
}

/**
 * Provider priority is deliberately cheap-first for interactive work, while
 * mission research keeps its own web-capable selection unless a model is
 * explicitly requested. This file contains no secrets, network calls, or DB.
 */
export const PROVIDER_FAILOVER_ORDER: readonly RuntimeProvider[] = [
  'openai', 'anthropic', 'gemini', 'groq', 'cerebras', 'mistral', 'openrouter', 'github',
];

export const MODEL_ROUTES: readonly ModelRoute[] = [
  { model: 'gpt-5-mini', provider: 'openai', role: 'chat', rationale: 'Chat/Copilot ve genel bot işleri için kalite-maliyet dengesi.' },
  { model: 'gpt-5-mini', provider: 'openai', role: 'agent', rationale: 'Tool-use ve çok adımlı bot görevleri için varsayılan.' },
  { model: 'gpt-5-nano', provider: 'openai', role: 'fast', rationale: 'Ön eleme, sınıflandırma ve kısa özetlerde düşük maliyet.' },
  { model: 'gpt-5', provider: 'openai', role: 'research', rationale: 'Karmaşık sentez; yalnız açıkça seçildiğinde kullanılmalı.' },
  { model: 'claude-sonnet-5', provider: 'anthropic', role: 'research', rationale: 'Web araçları etkin araştırma fallbackı.' },
  { model: 'claude-sonnet-5', provider: 'anthropic', role: 'agent', rationale: 'Genel güvenilir agent fallbackı.' },
  { model: 'claude-haiku-4-5', provider: 'anthropic', role: 'fast', rationale: 'Kısa ve hızlı yardımcı işler.' },
  { model: 'gemini-flash-latest', provider: 'gemini', role: 'research', rationale: 'Google aramalı araştırma fallbackı.' },
  { model: 'gemini-flash-latest', provider: 'gemini', role: 'agent', rationale: 'Genel agent fallbackı.' },
  { model: 'llama-3.3-70b-versatile', provider: 'groq', role: 'agent', rationale: 'Hızlı ücretsiz katman fallbackı.' },
];

export const DEFAULT_INTERACTIVE_MODEL = 'gpt-5-mini';
export const DEFAULT_FAST_MODEL = 'gpt-5-nano';
export const DEFAULT_RESEARCH_MODEL = 'claude-sonnet-5';

/** Panelde “Otomatik” seçildiğinde kayıt altına alınacak ilk model tercihi. */
export function resolveRequestedModel(preferred: string | null | undefined, allowed: readonly string[]): string {
  const value = String(preferred || '').trim();
  return allowed.includes(value) ? value : DEFAULT_INTERACTIVE_MODEL;
}

export function routeForModel(model: string | null | undefined): ModelRoute | null {
  const value = String(model || '').trim().toLowerCase();
  if (!value) return null;
  const exact = MODEL_ROUTES.find((route) => route.model.toLowerCase() === value);
  if (exact) return exact;
  if (value.startsWith('gpt-oss-')) return { model: value, provider: 'cerebras', role: 'agent', rationale: 'Cerebras uyumlu gpt-oss model adı.' };
  if (value.startsWith('gpt-')) return { model: value, provider: 'openai', role: 'agent', rationale: 'OpenAI uyumlu model adı.' };
  if (value.startsWith('claude-')) return { model: value, provider: 'anthropic', role: 'agent', rationale: 'Anthropic uyumlu model adı.' };
  if (value.startsWith('gemini-')) return { model: value, provider: 'gemini', role: 'research', rationale: 'Gemini uyumlu model adı.' };
  return null;
}

export function defaultModelForProvider(provider: RuntimeProvider, role: ModelRole = 'agent', overrides?: Partial<Record<RuntimeProvider, string>>): string {
  if (overrides?.[provider]) return overrides[provider]!;
  if (provider === 'openai') return role === 'fast' ? DEFAULT_FAST_MODEL : role === 'research' ? 'gpt-5' : DEFAULT_INTERACTIVE_MODEL;
  if (provider === 'anthropic') return role === 'fast' ? 'claude-haiku-4-5' : DEFAULT_RESEARCH_MODEL;
  if (provider === 'gemini') return 'gemini-flash-latest';
  if (provider === 'groq') return 'llama-3.3-70b-versatile';
  if (provider === 'cerebras') return 'gpt-oss-120b';
  if (provider === 'mistral') return 'mistral-small-latest';
  if (provider === 'openrouter') return 'meta-llama/llama-3.3-70b-instruct:free';
  return 'openai/gpt-4.1-mini';
}

export function fallbackProviders(preferred: RuntimeProvider | string | null | undefined): RuntimeProvider[] {
  const first = String(preferred || '') as RuntimeProvider;
  return [first, ...PROVIDER_FAILOVER_ORDER.filter((provider) => provider !== first)];
}

export function shouldUseOpenAiForResearch(model: string | null | undefined): boolean {
  return routeForModel(model)?.provider === 'openai';
}
