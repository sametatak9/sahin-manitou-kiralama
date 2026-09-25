// Web araması: Tavily (yapay zekâ botları için arama API'si; ayda 1000 ücretsiz arama, kart gerekmez).
// Anahtar panelden (Vault) girilir: TAVILY_API_KEY. Anahtar yoksa null döner → çağıran haber yedeğine düşer.
import { secret as appSecret } from './secrets.ts';

export interface WebResult { title: string; url: string; snippet: string; posted: string | null; source: string | null }

export const hasWebSearch = () => Boolean(appSecret('TAVILY_API_KEY'));

/** Gerçek web araması. Hata/anahtar yoksa null (yedek kaynağa geçilsin diye); sonuç yoksa []. */
export async function tavilySearch(query: string, opts: { max?: number; days?: number; domains?: string[] } = {}): Promise<WebResult[] | null> {
  const key = appSecret('TAVILY_API_KEY');
  if (!key) return null;
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query, search_depth: 'basic', max_results: opts.max ?? 8, include_answer: false, include_raw_content: false, country: 'turkey',
      ...(opts.days ? { days: opts.days, topic: 'news' } : { topic: 'general' }),
      ...(opts.domains?.length ? { include_domains: opts.domains.slice(0, 20) } : {}),
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json().catch(() => ({}));
  // deno-lint-ignore no-explicit-any
  return (Array.isArray(data.results) ? data.results : []).map((r: any) => {
    let host: string | null = null; try { host = new URL(r.url).hostname.replace(/^www\./, ''); } catch { /* */ }
    return { title: String(r.title || '').slice(0, 300), url: String(r.url || ''), snippet: String(r.content || '').replace(/\s+/g, ' ').slice(0, 600),
      posted: r.published_date ? String(r.published_date).slice(0, 10) : null, source: host };
  }).filter((r: WebResult) => r.title && /^https?:\/\//.test(r.url));
}
