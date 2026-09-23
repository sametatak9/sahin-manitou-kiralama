import { anthropicProvider } from './anthropic.ts';
import { geminiProvider, openaiProvider } from './others.ts';
import type { AgentConfig, AIProvider } from './types.ts';

export * from './types.ts';

const providers: Record<AgentConfig['provider'], AIProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
};

export function getProvider(name: AgentConfig['provider']): AIProvider {
  const p = providers[name];
  if (!p) throw new Error(`Bilinmeyen AI sağlayıcı: ${name}`);
  return p;
}

/** Hangi sağlayıcıların anahtarı tanımlı? (değer döndürmez, sadece var/yok) */
export function providerAvailability() {
  return {
    anthropic: Boolean(Deno.env.get('ANTHROPIC_API_KEY')),
    openai: Boolean(Deno.env.get('OPENAI_API_KEY')),
    gemini: Boolean(Deno.env.get('GEMINI_API_KEY')),
  };
}
