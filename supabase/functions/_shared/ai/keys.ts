// AI sağlayıcı anahtar çözümleyici: önce panelden girilip Vault'ta saklanan anahtar, yoksa Edge Function Secrets.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

export type KeyProvider = 'anthropic' | 'gemini' | 'openai';
const ENV: Record<KeyProvider, string> = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY' };
let db: SupabaseClient | null = null;
const cache = new Map<KeyProvider, { v: string | null; at: number }>();

/** Edge function başında service-role istemcisiyle çağrılır. */
export function initKeyStore(client: SupabaseClient) { db = client; }

/** Öncelik: panelden girilen anahtar (Vault) → yoksa Edge Function Secrets. Panelden girilen, eski/bozuk sunucu anahtarını ezer. */
export async function getAiKey(p: KeyProvider): Promise<string | null> {
  const c = cache.get(p);
  let vaulted: string | null;
  if (c && Date.now() - c.at < 60_000) vaulted = c.v;
  else {
    vaulted = null;
    if (db) { const { data } = await db.rpc('get_ai_key', { p_provider: p }); vaulted = (data as string | null) || null; }
    cache.set(p, { v: vaulted, at: Date.now() });
  }
  return vaulted || Deno.env.get(ENV[p]) || null;
}

export async function aiKeyAvailability() {
  const [anthropic, gemini, openai] = await Promise.all([getAiKey('anthropic'), getAiKey('gemini'), getAiKey('openai')]);
  return { anthropic: Boolean(anthropic), gemini: Boolean(gemini), openai: Boolean(openai) };
}

export async function markAiKey(p: KeyProvider, ok: boolean, error?: string) {
  if (db) await db.rpc('mark_ai_key', { p_provider: p, p_ok: ok, p_error: error ?? null });
}
