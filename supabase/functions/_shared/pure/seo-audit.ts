export type SeoCheckLevel = 'ok' | 'warn' | 'error';

export interface SeoCheck {
  key: string;
  level: SeoCheckLevel;
  message: string;
  observed?: string;
}

export interface SeoAuditResult {
  url: string;
  final_url: string;
  status: number;
  response_ms: number;
  title: string | null;
  description: string | null;
  h1_count: number;
  html_lang: string | null;
  canonical: string | null;
  robots_meta: string | null;
  x_robots_tag: string | null;
  html_bytes: number;
  jsonld_count: number;
  og_present: boolean;
  robots: { url: string; status: number; body: string };
  sitemap: { url: string; status: number; urls: number; body: string };
  checks: SeoCheck[];
  score: number;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const decode = (value: string) => value
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const tags = (html: string, name: string) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
const attr = (tag: string, name: string) => {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  return re.exec(tag)?.[1]?.trim() ?? null;
};
const meta = (html: string, key: string, attrName: 'name' | 'property' = 'name') => {
  for (const tag of tags(html, 'meta')) {
    if ((attr(tag, attrName) || '').toLowerCase() === key.toLowerCase()) return decode(attr(tag, 'content') || '');
  }
  return null;
};
const canonicalHref = (html: string) => {
  for (const tag of tags(html, 'link')) {
    const rel = (attr(tag, 'rel') || '').toLowerCase().split(/\s+/);
    if (rel.includes('canonical')) return attr(tag, 'href');
  }
  return null;
};

function check(level: SeoCheckLevel, key: string, message: string, observed?: string): SeoCheck {
  return { key, level, message, ...(observed ? { observed } : {}) };
}

function absoluteUrl(value: string | null, base: string) {
  if (!value) return null;
  try { return new URL(value, base).toString(); } catch { return value; }
}

export async function runSeoAudit(inputUrl: string, fetcher: FetchLike = fetch): Promise<SeoAuditResult> {
  let url: URL;
  try { url = new URL(inputUrl); } catch { throw new Error('SEO denetimi için geçerli bir URL gerekli'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('SEO denetimi yalnızca http/https URL kabul eder');

  const started = Date.now();
  const response = await fetcher(url.toString(), {
    redirect: 'follow',
    headers: { 'user-agent': 'EmbaySEOBot/1.0 (+panel)', 'accept-language': 'tr-TR,tr;q=0.9,en;q=0.7' },
  });
  const html = (await response.text()).slice(0, 1_500_000);
  const finalUrl = response.url || url.toString();
  const final = new URL(finalUrl);
  const responseMs = Date.now() - started;
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decode(titleMatch[1].replace(/\s+/g, ' ').trim()) : null;
  const description = meta(html, 'description');
  const htmlLang = attr(tags(html, 'html')[0] || '', 'lang');
  const canonical = absoluteUrl(canonicalHref(html), finalUrl);
  const robotsMeta = meta(html, 'robots');
  const xRobotsTag = response.headers.get('x-robots-tag');
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const jsonldCount = (html.match(/<script[^>]+application\/ld\+json[^>]*>/gi) || []).length;
  const ogPresent = Boolean(meta(html, 'og:title', 'property') || meta(html, 'og:description', 'property'));
  const origin = final.origin;
  const robotsUrl = `${origin}/robots.txt`;
  const sitemapUrl = `${origin}/sitemap.xml`;
  const [robots, sitemap] = await Promise.all([
    fetcher(robotsUrl, { headers: { 'user-agent': 'EmbaySEOBot/1.0 (+panel)' } })
      .then(async (r) => ({ url: r.url || robotsUrl, status: r.status, body: (await r.text()).slice(0, 5000) }))
      .catch((e) => ({ url: robotsUrl, status: 0, body: String(e).slice(0, 300) })),
    fetcher(sitemapUrl, { headers: { 'user-agent': 'EmbaySEOBot/1.0 (+panel)' } })
      .then(async (r) => { const body = (await r.text()).slice(0, 200_000); return { url: r.url || sitemapUrl, status: r.status, urls: (body.match(/<loc>/gi) || []).length, body: body.slice(0, 5000) }; })
      .catch((e) => ({ url: sitemapUrl, status: 0, urls: 0, body: String(e).slice(0, 300) })),
  ]);

  const checks: SeoCheck[] = [];
  checks.push(response.status === 200 ? check('ok', 'http', 'HTTP 200') : check('error', 'http', `HTTP ${response.status}`, String(response.status)));
  checks.push(title && title.length >= 20 && title.length <= 65
    ? check('ok', 'title', `Title uygun (${title.length} karakter)`, title)
    : check('warn', 'title', `Title uzunluğu uygun değil (${title?.length ?? 0})`, title || 'yok'));
  checks.push(description && description.length >= 70 && description.length <= 165
    ? check('ok', 'description', `Meta description uygun (${description.length} karakter)`, description)
    : check('warn', 'description', `Meta description uygun değil (${description?.length ?? 0})`, description || 'yok'));
  checks.push(canonical ? check('ok', 'canonical', 'Canonical var', canonical) : check('warn', 'canonical', 'Canonical etiketi yok'));
  checks.push(htmlLang?.toLowerCase().startsWith('tr') ? check('ok', 'lang', 'html lang="tr" var', htmlLang) : check('warn', 'lang', 'html lang="tr" yok', htmlLang || 'yok'));
  checks.push(h1Count === 1 ? check('ok', 'h1', 'Tek H1 var', '1') : check('warn', 'h1', `H1 sayısı ideal değil (${h1Count})`, String(h1Count)));
  checks.push(jsonldCount > 0 ? check('ok', 'jsonld', `JSON-LD var (${jsonldCount})`, String(jsonldCount)) : check('warn', 'jsonld', 'JSON-LD yapısal veri yok'));
  checks.push(ogPresent ? check('ok', 'og', 'Open Graph başlık/açıklama var') : check('warn', 'og', 'Open Graph title/description yok'));
  const noindex = /noindex/i.test(`${robotsMeta || ''} ${xRobotsTag || ''}`);
  checks.push(!noindex ? check('ok', 'indexability', 'Sayfa indexlenebilir') : check('error', 'indexability', 'Sayfa noindex olarak işaretlenmiş'));
  checks.push(robots.status === 200 ? check('ok', 'robots', 'robots.txt var', String(robots.status)) : check('warn', 'robots', `robots.txt ${robots.status}`, String(robots.status)));
  checks.push(sitemap.status === 200 && sitemap.urls > 0 ? check('ok', 'sitemap', `sitemap.xml var (${sitemap.urls} URL)`, String(sitemap.urls)) : check('warn', 'sitemap', `sitemap.xml ${sitemap.status} veya URL içermiyor`, String(sitemap.urls)));
  checks.push(responseMs < 1500 ? check('ok', 'response_time', `Yanıt süresi ${responseMs} ms`, String(responseMs)) : check('warn', 'response_time', `Yanıt süresi yavaş (${responseMs} ms)`, String(responseMs)));

  const okCount = checks.filter((x) => x.level === 'ok').length;
  return {
    url: url.toString(), final_url: finalUrl, status: response.status, response_ms: responseMs, title, description,
    h1_count: h1Count, html_lang: htmlLang, canonical, robots_meta: robotsMeta, x_robots_tag: xRobotsTag,
    html_bytes: html.length, jsonld_count: jsonldCount, og_present: ogPresent, robots, sitemap, checks,
    score: Math.round((okCount / checks.length) * 100),
  };
}

export function seoAuditDetail(audit: SeoAuditResult) {
  return audit.checks.map((x) => `${x.level === 'ok' ? '✅' : x.level === 'error' ? '❌' : '⚠️'} ${x.message}${x.observed ? ` · ${x.observed}` : ''}`).join('\n');
}
