// Uygulama giriş bilgileri çözümleyici: önce panelden girilip Vault'ta saklanan değer, yoksa Edge Function Secrets.
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
  // Panelden girilen değer önceliklidir (sunucudaki eski değeri ezer)
  return vaulted[name] || Deno.env.get(name) || undefined;
}

/** Değer nereden geliyor: panel (Vault) mi, sunucu ayarı (Edge Function Secrets) mı? Değerin kendisi döndürülmez. */
export function secretSource(name: string): 'panel' | 'sunucu' | null {
  return vaulted[name] ? 'panel' : Deno.env.get(name) ? 'sunucu' : null;
}
