// AI sağlayıcı anahtar çözümleyici: önce Edge Function Secrets, yoksa panelden girilip Vault'ta saklanan anahtar.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

export type KeyProvider = 'anthropic' | 'gemini' | 'openai';
const ENV: Record<KeyProvider, string> = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY' };
let db: SupabaseClient | null = null;
const cache = new Map<KeyProvider, { v: string | null; at: number }>();

/** Edge function başında service-role istemcisiyle çağrılır. */
export function initKeyStore(client: SupabaseClient) { db = client; }

export async function getAiKey(p: KeyProvider): Promise<string | null> {
  const env = Deno.env.get(ENV[p]); if (env) return env;
  const c = cache.get(p); if (c && Date.now() - c.at < 60_000) return c.v;
  let v: string | null = null;
  if (db) { const { data } = await db.rpc('get_ai_key', { p_provider: p }); v = (data as string | null) || null; }
  cache.set(p, { v, at: Date.now() });
  return v;
}

export async function aiKeyAvailability() {
  const [anthropic, gemini, openai] = await Promise.all([getAiKey('anthropic'), getAiKey('gemini'), getAiKey('openai')]);
  return { anthropic: Boolean(anthropic), gemini: Boolean(gemini), openai: Boolean(openai) };
}

export async function markAiKey(p: KeyProvider, ok: boolean, error?: string) {
  if (db) await db.rpc('mark_ai_key', { p_provider: p, p_ok: ok, p_error: error ?? null });
}
