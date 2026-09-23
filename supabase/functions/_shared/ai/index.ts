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

/** Hangi sağlayıcıların anahtarı tanımlı? (Edge Secrets veya panelden Vault; değer döndürmez, sadece var/yok) */
export { aiKeyAvailability as providerAvailability, initKeyStore } from './keys.ts';
