// Web araması: Tavily. Anahtar panel Vault'undan (TAVILY_API_KEY) okunur; hiçbir yanıt/anahtar gövdesi loglanmaz.
import { secret as appSecret } from './secrets.ts';
import { buildTavilyRequest, classifyTavilyHttpStatus } from './pure/search.ts';

export interface WebResult { title: string; url: string; snippet: string; posted: string | null; source: string | null }
export type TavilyFailure = 'missing_key' | 'network_error' | 'auth_error' | 'credit_error' | 'rate_limited' | 'bad_request' | 'provider_error' | 'http_error' | 'invalid_response';
export interface TavilySearchAttempt {
  status: 'ok' | TavilyFailure;
  http_status: number | null;
  result_count: number;
  results: WebResult[];
  detail: string;
}

export const hasWebSearch = () => Boolean(appSecret('TAVILY_API_KEY'));

/** Gerçek Tavily araması. Başarılı boş liste ile anahtar/ağ/sağlayıcı hatasını ayırır. */
export async function tavilySearchDetailed(query: string, opts: { max?: number; days?: number; domains?: string[] } = {}): Promise<TavilySearchAttempt> {
  const key = appSecret('TAVILY_API_KEY');
  if (!key) return { status: 'missing_key', http_status: null, result_count: 0, results: [], detail: 'TAVILY_API_KEY tanımlı değil' };

  const body = buildTavilyRequest(query, opts);

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res) return { status: 'network_error', http_status: null, result_count: 0, results: [], detail: 'Tavily bağlantısı başarısız veya zaman aşımına uğradı' };
  if (!res.ok) {
    const failure = classifyTavilyHttpStatus(res.status);
    return { status: failure.status, http_status: res.status, result_count: 0, results: [], detail: failure.detail };
  }

  const data = await res.json().catch(() => null) as { results?: unknown[] } | null;
  if (!data || !Array.isArray(data.results)) {
    return { status: 'invalid_response', http_status: res.status, result_count: 0, results: [], detail: 'Tavily yanıtında sonuç listesi bulunamadı' };
  }
  const results = data.results.map((raw) => {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const url = typeof r.url === 'string' ? r.url : '';
    let host: string | null = null;
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* geçersiz URL filtrede elenir */ }
    return {
      title: String(r.title ?? '').slice(0, 300),
      url,
      snippet: String(r.content ?? '').replace(/\s+/g, ' ').slice(0, 600),
      posted: r.published_date ? String(r.published_date).slice(0, 10) : null,
      source: host,
    };
  }).filter((r) => r.title && /^https?:\/\//.test(r.url));

  return { status: 'ok', http_status: res.status, result_count: results.length, results, detail: `Tavily araması yanıt verdi (${results.length} sonuç)` };
}

/** Geriye uyumlu yardımcı: Hata/anahtar yoksa null; başarılı fakat boş aramada []. */
export async function tavilySearch(query: string, opts: { max?: number; days?: number; domains?: string[] } = {}): Promise<WebResult[] | null> {
  const attempt = await tavilySearchDetailed(query, opts);
  return attempt.status === 'ok' ? attempt.results : null;
}
