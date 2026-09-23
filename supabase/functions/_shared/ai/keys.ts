// AI sağlayıcı anahtar çözümleyici: önce panelden girilip Vault'ta saklanan anahtar, yoksa Edge Function Secrets.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

export type KeyProvider = 'anthropic' | 'gemini' | 'openai' | 'groq' | 'openrouter' | 'github';
const ENV: Record<KeyProvider, string> = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY', github: 'GITHUB_MODELS_TOKEN' };
/** Groq (ücretsiz katman, kart gerekmez): OpenAI uyumlu uç. compound modeli kendi içinde web araması yapar. */
export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** OpenRouter (ücretsiz ':free' modeller, kart gerekmez) ve GitHub Models (GitHub hesabıyla ücretsiz, günlük sınırlı): OpenAI uyumlu. */
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const GITHUB_MODELS_URL = 'https://models.github.ai/inference/chat/completions';
export const COMPAT: Record<'openai' | 'groq' | 'openrouter' | 'github', { url: string; testModel: string; agentModel: string; free: boolean }> = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', testModel: 'gpt-4o-mini', agentModel: 'gpt-4o-mini', free: false },
  groq: { url: GROQ_URL, testModel: 'llama-3.1-8b-instant', agentModel: 'llama-3.3-70b-versatile', free: true },
  openrouter: { url: OPENROUTER_URL, testModel: 'meta-llama/llama-3.3-70b-instruct:free', agentModel: 'meta-llama/llama-3.3-70b-instruct:free', free: true },
  github: { url: GITHUB_MODELS_URL, testModel: 'openai/gpt-4.1-mini', agentModel: 'openai/gpt-4.1-mini', free: true },
};
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
  const [anthropic, gemini, openai, groq, openrouter, github] = await Promise.all((['anthropic', 'gemini', 'openai', 'groq', 'openrouter', 'github'] as const).map((p) => getAiKey(p)));
  return { anthropic: Boolean(anthropic), gemini: Boolean(gemini), openai: Boolean(openai), groq: Boolean(groq), openrouter: Boolean(openrouter), github: Boolean(github) };
}

export async function markAiKey(p: KeyProvider, ok: boolean, error?: string) {
  if (db) await db.rpc('mark_ai_key', { p_provider: p, p_ok: ok, p_error: error ?? null });
}

/** Anahtarın GERÇEKTEN çalıştığını test eder: sağlayıcıdan 1 kelimelik gerçek cevap ister (model listesi okumak yetmez —
 *  bakiyesi bitmiş ya da Google tarafından engellenmiş projeler listeyi okuyabilir ama cevap üretemez). Maliyeti yok denecek kadar azdır. */
export async function liveKeyTest(p: KeyProvider, key: string, model?: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const r = p === 'anthropic'
      ? await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: model || 'claude-haiku-4-5', max_tokens: 1, messages: [{ role: 'user', content: 'ok' }] }) })
      : p === 'gemini'
        ? await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest')}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ok' }] }], generationConfig: { maxOutputTokens: 5 } }) })
        : await fetch(COMPAT[p].url, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
            body: JSON.stringify({ model: model || COMPAT[p].testModel, max_tokens: 5, messages: [{ role: 'user', content: 'ok' }] }) });
    if (r.ok) return { ok: true, detail: 'Çalışıyor (gerçek cevap üretti)' };
    // Gemini ana modeli yoğunsa (503) hafif modelle doğrula — yoğunluk anahtar hatası değildir
    if (p === 'gemini' && r.status === 503 && !model) return await liveKeyTest(p, key, 'gemini-flash-lite-latest');
    const t = (await r.text()).slice(0, 500);
    const why = /credit balance|billing|insufficient_quota|exceeded your current quota/i.test(t) ? 'hesapta bakiye/kredi yok — sağlayıcı hesabına bakiye yükleyin'
      : /denied access/i.test(t) ? 'Google bu anahtarın projesini/hesabını engellemiş — FARKLI bir Gmail hesabıyla yeni anahtar alın'
      : /leaked/i.test(t) ? 'anahtar sızdırılmış diye işaretlenmiş — yeni anahtar alın'
      : /SERVICE_DISABLED|is disabled|has not been used/i.test(t) ? 'projede API kapalı'
      : /invalid|not valid|incorrect|authentication/i.test(t) ? 'anahtar geçersiz / yanlış kopyalanmış'
      : /not found|no longer available/i.test(t) ? 'model bulunamadı'
      : r.status === 429 ? 'kota/limit doldu' : `HTTP ${r.status}`;
    return { ok: false, detail: `Reddedildi: ${why}` };
  } catch (e) { return { ok: false, detail: `Bağlantı hatası: ${String(e).slice(0, 100)}` }; }
}
