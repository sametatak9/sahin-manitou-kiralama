export interface TavilyRequestOptions { max?: number; days?: number; domains?: string[] }

/** Tavily API body builder; API key or network access is deliberately not part of this pure helper. */
export function buildTavilyRequest(query: string, opts: TavilyRequestOptions = {}, now = new Date()): Record<string, unknown> {
  const topic = opts.days ? 'news' : 'general';
  const days = Math.max(1, Math.round(opts.days ?? 0));
  const dateFilter = opts.days
    ? { start_date: new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10), include_published_date: true }
    : {};
  return {
    query,
    search_depth: 'basic',
    max_results: Math.max(1, Math.min(20, Math.round(opts.max ?? 8))),
    include_answer: false,
    include_raw_content: false,
    topic,
    ...(topic === 'general' ? { country: 'turkey' } : {}),
    ...dateFilter,
    ...(opts.domains?.length ? { include_domains: opts.domains.slice(0, 20), include_domains_mode: 'prefer' } : {}),
  };
}

export type SearchScopeStatus = 'broad_web' | 'news_only' | 'unavailable';
export function searchScopeStatus(broadWebSucceeded: boolean, newsSucceeded: boolean): SearchScopeStatus {
  return broadWebSucceeded ? 'broad_web' : newsSucceeded ? 'news_only' : 'unavailable';
}

export type TavilyHttpFailure = 'auth_error' | 'credit_error' | 'rate_limited' | 'bad_request' | 'provider_error' | 'http_error';
export function classifyTavilyHttpStatus(status: number): { status: TavilyHttpFailure; detail: string } {
  if (status === 401 || status === 403) return { status: 'auth_error', detail: `Tavily anahtarı reddedildi (HTTP ${status})` };
  if (status === 402) return { status: 'credit_error', detail: 'Tavily hesap kredisi yetersiz (HTTP 402)' };
  if (status === 432) return { status: 'credit_error', detail: 'Tavily plan kullanım limiti aşıldı (HTTP 432); plan limitini artırın' };
  if (status === 433) return { status: 'credit_error', detail: 'Tavily pay-as-you-go limiti aşıldı (HTTP 433); kullanım limitini artırın' };
  if (status === 429) return { status: 'rate_limited', detail: 'Tavily kota veya hız sınırına ulaşıldı (HTTP 429)' };
  if (status === 400) return { status: 'bad_request', detail: 'Tavily isteği reddedildi (HTTP 400; arama parametrelerini kontrol edin)' };
  if (status >= 500) return { status: 'provider_error', detail: `Tavily sağlayıcısı geçici olarak hata verdi (HTTP ${status})` };
  return { status: 'http_error', detail: `Tavily HTTP ${status}` };
}

/** A no-findings run is a provider failure only when no live search actually ran. */
export function isSearchUnavailable(input: { hasTargetUrl: boolean; broadWebSucceeded: boolean; nativeSearchSucceeded: boolean; findingCount: number }): boolean {
  return !input.hasTargetUrl && !input.broadWebSucceeded && !input.nativeSearchSucceeded && input.findingCount === 0;
}
