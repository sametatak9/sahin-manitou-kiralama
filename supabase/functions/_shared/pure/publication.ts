import { parseFindingDate, publicationDay, publicationDateIssue, type RecencyMission } from '../recency.ts';

export interface PublicationEvidence { posted: string; raw?: string; origin: 'search_metadata' | 'page_metadata'; url: string }
const canonical = (u: string) => { try { const x = new URL(u); x.hash = ''; return x.toString().replace(/\/$/, ''); } catch { return ''; } };
export function makePublicationEvidence(posted: unknown, origin: PublicationEvidence['origin'], url: string): PublicationEvidence | undefined {
  if (typeof posted !== 'string' || !/^https?:\/\//i.test(url)) return undefined;
  const date = parseFindingDate(posted);
  return date ? { posted: publicationDay(date), raw: posted.trim().slice(0, 120), origin, url } : undefined;
}
export function trustedPublication(evidence: PublicationEvidence | undefined, url: string): PublicationEvidence | undefined {
  if (!evidence || !['search_metadata', 'page_metadata'].includes(evidence.origin) || !canonical(url) || canonical(evidence.url) !== canonical(url)) return undefined;
  const normalized = makePublicationEvidence(evidence.posted, evidence.origin, url);
  return normalized ? { ...normalized, raw: typeof evidence.raw === 'string' ? evidence.raw.slice(0, 120) : normalized.raw } : undefined;
}
export function findingDateIssue(evidence: PublicationEvidence | undefined, url: string, mission: RecencyMission, now = new Date()): string | null {
  return publicationDateIssue(trustedPublication(evidence, url)?.posted, mission, now);
}

export function sourceSupportsTitle(title: string, content: string): boolean {
  const normalize = (t: string) => t.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const words = [...new Set(normalize(title).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4))].slice(0, 8);
  if (!words.length || !content.trim()) return false;
  const text = normalize(content);
  const hits = words.filter((w) => text.includes(w.slice(0, Math.max(4, w.length - 2)))).length;
  return hits >= Math.max(Math.min(2, words.length), Math.ceil(words.length / 2));
}

/** Sadece ana içeriğin datePublished verisi; dateModified, yorum zamanı ve HTTP Date kullanılmaz. */
export function publicationFromHtml(html: string, url: string): PublicationEvidence | undefined {
  const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'");
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = new Map<string, string>();
    for (const attr of tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs.set(attr[1].toLowerCase(), decode(attr[2] ?? attr[3] ?? ''));
    const name = (attrs.get('property') || attrs.get('name') || attrs.get('itemprop') || '').toLowerCase();
    if (['article:published_time', 'datepublished', 'dc.date.issued'].includes(name)) {
      const evidence = makePublicationEvidence(attrs.get('content'), 'page_metadata', url);
      if (evidence) return evidence;
    }
  }
  const nodes: Record<string, unknown>[] = [];
  for (const tag of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    if (tag[1].length > 120_000) continue;
    try {
      const data = JSON.parse(tag[1]);
      const roots = Array.isArray(data) ? data : [data];
      for (const root of roots) if (root && typeof root === 'object') {
        if (Array.isArray(root['@graph'])) nodes.push(...root['@graph'].filter((n: unknown) => n && typeof n === 'object'));
        else nodes.push(root);
      }
    } catch { /* bozuk veya dinamik JSON-LD kanıt değildir */ }
  }
  const articles = nodes.filter((n) => [n['@type']].flat().some((t) => /^(?:NewsArticle|Article|BlogPosting|TechArticle|DiscussionForumPosting|SocialMediaPosting)$/.test(String(t))));
  for (const node of articles) {
    const main = node.mainEntityOfPage;
    const mainUrl = typeof main === 'string' ? main : main && typeof main === 'object' ? (main as Record<string, unknown>)['@id'] : undefined;
    const declared = node.url || mainUrl || node['@id'];
    // Çoklu artikelde URL'siz sidebar/ilgili içerik tarihleri ana içerik sayılmaz.
    if (typeof declared === 'string' ? canonical(declared) !== canonical(url) : articles.length !== 1) continue;
    const evidence = makePublicationEvidence(node.datePublished, 'page_metadata', url);
    if (evidence) return evidence;
  }
  return undefined;
}
