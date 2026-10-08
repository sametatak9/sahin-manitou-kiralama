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

/** A no-findings run is a provider failure only when no live search actually ran. */
export function isSearchUnavailable(input: { hasTargetUrl: boolean; broadWebSucceeded: boolean; nativeSearchSucceeded: boolean; findingCount: number }): boolean {
  return !input.hasTargetUrl && !input.broadWebSucceeded && !input.nativeSearchSucceeded && input.findingCount === 0;
}
