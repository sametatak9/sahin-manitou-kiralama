/**
 * Mission/Copilot için skill catalog router.
 *
 * Snapshot'taki bütün skill'ler audit'te korunur; yalnızca görevin amacıyla
 * eşleşen sınırlı bölüm prompt'a ayrıntılı talimat olarak yüklenir. Bu dosya
 * bilinçli olarak LLM veya veritabanı çağırmaz: aynı giriş aynı sırayı üretir.
 */
export interface RoutableSkill {
  id: string;
  name: string;
  version: number;
  category?: string | null;
  instructions?: string | null;
  search_terms?: string[] | null;
  sources?: string[] | null;
}

export interface SkillRoute {
  all: RoutableSkill[];
  selected: RoutableSkill[];
  deferred: RoutableSkill[];
  selectedIds: string[];
  deferredIds: string[];
}

const STOP_WORDS = new Set([
  'ama', 'ana', 'artık', 'artik', 'bana', 'bir', 'bu', 'bul', 'da', 'de', 'degil', 'değil',
  'en', 'gibi', 'icin', 'için', 'ile', 'mi', 'mı', 'mu', 'mü', 'ne', 'olan', 'olarak',
  'sadece', 'şu', 'su', 've', 'veya', 'yap', 'yapılacak', 'yapilacak', 'yaz', 'olan',
]);

const CATEGORY_ALIASES: Record<string, string[]> = {
  analytics: ['analytics', 'analitik', 'rapor', 'metrik', 'performans', 'ölçüm', 'olcum', 'kpi'],
  communication: ['communication', 'iletişim', 'iletisim', 'mesaj', 'whatsapp', 'telegram', 'email', 'e-posta', 'dm', 'yorum'],
  content: ['content', 'içerik', 'icerik', 'caption', 'reels', 'post', 'metin', 'hashtag', 'takvim'],
  crm: ['crm', 'lead', 'müşteri', 'musteri', 'aday', 'talep', 'fırsat', 'firsat', 'teklif'],
  design: ['design', 'tasarım', 'tasarim', 'görsel', 'gorsel', 'video', 'canva', 'figma', 'photoshop'],
  growth: ['growth', 'büyüme', 'buyume', 'takipçi', 'takipci', 'etkileşim', 'etkilesim', 'hedef kitle', 'organik'],
  listing: ['listing', 'ilan', 'sahibinden', 'armut'],
  seo: ['seo', 'google', 'arama', 'anahtar', 'keyword', 'sitemap', 'canonical', 'search console'],
  social: ['social', 'sosyal', 'instagram', 'facebook', 'meta', 'tiktok', 'youtube', 'linkedin', 'x'],
};

const normalize = (value: string) => value
  .toLocaleLowerCase('tr-TR')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9çğıöşü\s-]/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function tokens(value: string): string[] {
  return [...new Set(normalize(value).split(/\s+/).filter((token) => token.length >= 3 && !STOP_WORDS.has(token)))];
}

function tokenOverlap(query: Set<string>, value: string | null | undefined): number {
  return tokens(value || '').reduce((score, token) => score + (query.has(token) ? 1 : 0), 0);
}

function categoryScore(queryText: string, category: string | null | undefined): number {
  const normalizedCategory = normalize(category || '');
  if (!normalizedCategory) return 0;
  const aliases = CATEGORY_ALIASES[normalizedCategory] || [normalizedCategory];
  return aliases.some((alias) => queryText.includes(normalize(alias))) ? 1 : 0;
}

function scoreSkill(skill: RoutableSkill, queryText: string, queryTokens: Set<string>): number {
  const nameScore = tokenOverlap(queryTokens, skill.name) * 6;
  const termScore = (skill.search_terms || []).reduce((score, term) => {
    const normalized = normalize(term);
    return score + (queryText.includes(normalized) || queryTokens.has(normalized) ? 5 : tokenOverlap(queryTokens, term) * 2);
  }, 0);
  const category = categoryScore(queryText, skill.category) * 4;
  const instructionScore = Math.min(3, tokenOverlap(queryTokens, skill.instructions) * 0.5);
  return nameScore + termScore + category + instructionScore;
}

/**
 * Deterministic route. Ties preserve snapshot/relationship order so the UI,
 * runtime and audit log do not disagree about which skills were chosen.
 */
export function routeSkills(skills: RoutableSkill[], request: string, maxDetailed = 8): SkillRoute {
  const max = Math.max(1, Math.min(20, Math.floor(maxDetailed) || 8));
  const all: RoutableSkill[] = [];
  const seen = new Set<string>();
  for (const skill of skills) {
    if (!skill?.id || seen.has(skill.id)) continue;
    seen.add(skill.id);
    all.push(skill);
  }

  const queryText = normalize(request);
  const queryTokens = new Set(tokens(request));
  const ranked = all.map((skill, index) => ({ skill, index, score: scoreSkill(skill, queryText, queryTokens) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selectedIds = new Set(ranked.slice(0, Math.min(max, ranked.length)).map(({ skill }) => skill.id));
  const selected = all.filter((skill) => selectedIds.has(skill.id));
  const deferred = all.filter((skill) => !selectedIds.has(skill.id));

  return { all, selected, deferred, selectedIds: selected.map((skill) => skill.id), deferredIds: deferred.map((skill) => skill.id) };
}

export const skillRouterInternals = { normalize, tokens, scoreSkill };
