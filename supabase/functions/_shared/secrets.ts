// Uygulama giriş bilgileri çözümleyici: önce Edge Function Secrets, yoksa panelden girilip Vault'ta saklanan değer.
// İstek başında loadAppSecrets() bir kez çağrılır (60 sn önbellek); sonra secret() senkron okunur.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

let vaulted: Record<string, string> = {};
let loadedAt = 0;

export async function loadAppSecrets(db: SupabaseClient) {
  if (Date.now() - loadedAt < 60_000) return;
  const { data, error } = await db.rpc('get_app_credentials');
  if (!error && data && typeof data === 'object') vaulted = data as Record<string, string>;
  loadedAt = Date.now();
}

/** Önbelleği boşaltır (panelden yeni değer girildiğinde). */
export function resetAppSecrets() { loadedAt = 0; }

export function secret(name: string): string | undefined {
  return Deno.env.get(name) || vaulted[name] || undefined;
}
