// Yapay zekâ harcama freni: her AI çağrısının tahmini dolar maliyetini deftere (ai_usage) yazar,
// günlük / aylık / görev başı sınır dolunca yeni çağrı yapılmaz. Fiyatlar 1M token başına ABD doları.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

const PRICE: Array<{ match: RegExp; inp: number; out: number }> = [
  { match: /^claude-(fable|mythos)/, inp: 10, out: 50 },
  { match: /^claude-opus-5-5/, inp: 4, out: 20 },
  { match: /^claude-opus/, inp: 5, out: 25 },
  { match: /^claude-sonnet-5/, inp: 2, out: 10 },
  { match: /^claude-sonnet/, inp: 3, out: 15 },
  { match: /^claude-haiku/, inp: 1, out: 5 },
  { match: /^gpt-4o-mini|^gpt-4\.1-nano|^gpt-5-nano/, inp: 0.15, out: 0.6 },
  { match: /^gpt-/, inp: 2.5, out: 10 },
  { match: /^gemini/, inp: 0.3, out: 2.5 }, // ücretsiz katmanda 0; ücretli olursa üst sınır tahmini
];
const WEB_SEARCH_USD = 0.01; // Anthropic web araması: 1000 aramada 10 $

export function estimateCost(model: string | null | undefined, tokensIn: number, tokensOut: number, searches = 0) {
  const p = PRICE.find((x) => x.match.test(model || '')) ?? { inp: 5, out: 25 }; // bilinmeyen model: pahalı varsay (güvenli taraf)
  const isAnthropic = (model || '').startsWith('claude-');
  return Math.round(((tokensIn * p.inp + tokensOut * p.out) / 1e6 + (isAnthropic ? searches * WEB_SEARCH_USD : 0)) * 10000) / 10000;
}

export interface SpendStatus { enabled: boolean; daily_usd: number; monthly_usd: number; per_mission_usd: number; today_usd: number; month_usd: number }

export async function spendStatus(db: SupabaseClient): Promise<SpendStatus | null> {
  const { data } = await db.rpc('ai_spend_status');
  return (data as SpendStatus | null) ?? null;
}

/** Sınır aşıldıysa Türkçe sebep döndürür; aşılmadıysa null. missionCost: görevin şimdiye kadarki harcaması. */
export async function budgetBlock(db: SupabaseClient, missionCost?: number): Promise<string | null> {
  const s = await spendStatus(db);
  if (!s || !s.enabled) return null;
  const n = (v: unknown) => Number(v) || 0;
  if (n(s.monthly_usd) > 0 && n(s.month_usd) >= n(s.monthly_usd)) return `Aylık yapay zekâ harcama sınırı doldu ($${n(s.month_usd).toFixed(2)} / $${n(s.monthly_usd).toFixed(2)})`;
  if (n(s.daily_usd) > 0 && n(s.today_usd) >= n(s.daily_usd)) return `Günlük yapay zekâ harcama sınırı doldu ($${n(s.today_usd).toFixed(2)} / $${n(s.daily_usd).toFixed(2)}) — yarın yeniden başlar`;
  if (missionCost != null && n(s.per_mission_usd) > 0 && missionCost >= n(s.per_mission_usd)) return `Bu görevin harcama sınırı doldu ($${missionCost.toFixed(2)} / $${n(s.per_mission_usd).toFixed(2)})`;
  return null;
}

export async function recordUsage(db: SupabaseClient, row: { source: 'mission' | 'agent' | 'generate' | 'test'; ref_id?: string | null; provider?: string | null; model?: string | null; tokens_in: number; tokens_out: number; searches?: number }) {
  const cost = estimateCost(row.model, row.tokens_in, row.tokens_out, row.searches ?? 0);
  await db.from('ai_usage').insert({ ...row, searches: row.searches ?? 0, cost_usd: cost });
  return cost;
}
