/**
 * Mission kapsam sözleşmesi.
 *
 * Bu yardımcı LLM kararı vermez: açık görev kısıtlarını normalize eder, yasaklı
 * terimleri sorgu ve aday metninde deterministik olarak yakalar ve tenant marka
 * adının model çıktısında kanonik kalmasını sağlar. Kapsam bilgisi yoksa guard
 * bilinçli olarak pasiftir; genel araştırma görevlerini daraltmaz.
 */

export interface MissionScopeInput {
  title?: string | null;
  goal?: string | null;
  searchFor?: string | null;
  reportSpec?: string | null;
  canonicalBrand?: string | null;
  allowedTopics?: readonly string[];
  allowedGeos?: readonly string[];
  excludedTerms?: readonly string[];
  excludedBrands?: readonly string[];
  excludedVerticals?: readonly string[];
}

export interface MissionScopeContract {
  enabled: boolean;
  canonicalBrand: string | null;
  allowedTopics: string[];
  allowedGeos: string[];
  excludedTerms: string[];
  reason: 'explicit_exclusion' | 'explicit_scope' | null;
}

export interface ScopeDecision {
  allowed: boolean;
  matchedTerms: string[];
  reason: string | null;
}

export interface ScopeCandidateInput {
  title?: string | null;
  detail?: string | null;
  evidence?: string | null;
  fit?: string | null;
  company?: string | null;
  location?: string | null;
  url?: string | null;
}

const EXCLUSION_MARKER = /\b(?:dışla(?:yın)?|hariç|dışında|kapsam\s+dışı(?:\s+bırak)?|dahil\s+etme(?:yin)?|exclude|do\s+not\s+include|not\s+include)\b/giu;
const LIST_SPLIT = /,|\s+veya\s+|\s+ve\s+/giu;
const TOKEN = /[\p{L}\p{N}]+/gu;

/** Turkish-friendly matching form. It intentionally turns punctuation into spaces. */
export function normalizeScopeText(value: string | null | undefined): string {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTerm(value: string | null | undefined): string | null {
  const clean = normalizeScopeText(value);
  if (!clean) return null;
  const words = clean.split(' ').filter((word) => word.length >= 2);
  return words.length ? words.join(' ') : null;
}

function uniqueTerms(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const term = cleanTerm(value);
    if (!term || seen.has(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return out;
}

/**
 * Extracts the list immediately preceding an explicit negative instruction.
 * Example: "; kişisel hesap, kamu kurumu, Şahin Manitou ve iş arayan ilanlarını dışla"
 * becomes four terms. No exclusion is inferred from a generic research prompt.
 */
export function extractExplicitExcludedTerms(text: string | null | undefined): string[] {
  const source = String(text ?? '');
  const found: string[] = [];
  for (const marker of source.matchAll(EXCLUSION_MARKER)) {
    const index = marker.index ?? 0;
    const markerText = marker[0].toLocaleLowerCase('tr-TR');
    const before = source.slice(Math.max(0, index - 260), index);
    const boundary = Math.max(before.lastIndexOf(';'), before.lastIndexOf('\n'), before.lastIndexOf('.'), before.lastIndexOf(':'));
    let clause = before.slice(boundary + 1).trim();

    // “Şahin Manitou hariç” has no list punctuation; retain its short tail.
    if (/hariç|dışında/i.test(markerText) && !/[;,]/.test(clause)) {
      clause = clause.split(/\s+/).slice(-5).join(' ');
    }
    for (const item of clause.split(LIST_SPLIT)) {
      const term = cleanTerm(item.replace(/^(?:ve|veya)\s+/iu, ''));
      if (!term) continue;
      // Do not turn an entire instruction into an exclusion when the task used
      // a free-form sentence. Explicit list punctuation or a short tail is the
      // contract boundary.
      if (term.split(' ').length > 7) continue;
      found.push(term);
    }
  }
  return uniqueTerms(found);
}

function expandBrandTerms(values: readonly string[]): string[] {
  const out = [...values];
  values.forEach((normalized) => {
    // Extraction deliberately normalizes task text before this point. A
    // multi-word proper-name exclusion such as “Şahin Manitou” must therefore
    // expand by shape, not by original capitalization, so “manitou kiralama”
    // cannot be reintroduced through a skill search term.
    const words = normalized.split(' ');
    const last = words[words.length - 1];
    if (words.length > 1 && last.length >= 5) out.push(last);
  });
  return uniqueTerms(out);
}

function listFrom(values: readonly string[] | undefined): string[] {
  return uniqueTerms(values ?? []);
}

export function buildMissionScope(input: MissionScopeInput): MissionScopeContract {
  const taskText = [input.title, input.goal, input.searchFor, input.reportSpec].filter(Boolean).join('\n');
  const explicitFromTask = extractExplicitExcludedTerms(taskText);
  const rawExcluded = [...(input.excludedTerms ?? []), ...explicitFromTask, ...(input.excludedBrands ?? []), ...(input.excludedVerticals ?? [])];
  const normalizedExcluded = uniqueTerms(rawExcluded);
  const excludedTerms = expandBrandTerms(normalizedExcluded);
  const canonicalBrand = cleanTerm(input.canonicalBrand) ? String(input.canonicalBrand).trim() : null;
  const allowedTopics = listFrom(input.allowedTopics);
  const allowedGeos = listFrom(input.allowedGeos);
  const hasExplicitExclusion = excludedTerms.length > 0;
  const hasExplicitScope = allowedTopics.length > 0 || allowedGeos.length > 0;
  const enabled = Boolean(hasExplicitExclusion || (canonicalBrand && hasExplicitScope));
  return {
    enabled,
    canonicalBrand,
    allowedTopics,
    allowedGeos,
    excludedTerms,
    reason: hasExplicitExclusion ? 'explicit_exclusion' : enabled ? 'explicit_scope' : null,
  };
}

function matchingTerms(text: string, terms: readonly string[]): string[] {
  const normalized = normalizeScopeText(text);
  if (!normalized) return [];
  return terms.filter((term) => {
    const candidate = normalizeScopeText(term);
    return Boolean(candidate && (` ${normalized} `).includes(` ${candidate} `));
  });
}

function scopeReason(prefix: string, terms: readonly string[]): string {
  return `${prefix}: ${terms.join(', ')}`;
}

export function evaluateScopeQuery(query: string, scope: MissionScopeContract): ScopeDecision {
  if (!scope.enabled) return { allowed: true, matchedTerms: [], reason: null };
  const matchedTerms = matchingTerms(query, scope.excludedTerms);
  return matchedTerms.length
    ? { allowed: false, matchedTerms, reason: scopeReason('Kapsam guard sorguyu engelledi', matchedTerms) }
    : { allowed: true, matchedTerms: [], reason: null };
}

export function filterScopeQueries(queries: readonly string[], scope: MissionScopeContract): { allowed: string[]; blocked: Array<{ query: string; decision: ScopeDecision }> } {
  const allowed: string[] = [];
  const blocked: Array<{ query: string; decision: ScopeDecision }> = [];
  for (const query of queries) {
    const decision = evaluateScopeQuery(query, scope);
    if (decision.allowed) allowed.push(query);
    else blocked.push({ query, decision });
  }
  return { allowed, blocked };
}

export function evaluateScopeCandidate(input: ScopeCandidateInput, scope: MissionScopeContract): ScopeDecision {
  if (!scope.enabled) return { allowed: true, matchedTerms: [], reason: null };
  const text = [input.title, input.detail, input.evidence, input.fit, input.company, input.location, input.url].filter(Boolean).join(' ');
  const matchedTerms = matchingTerms(text, scope.excludedTerms);
  if (matchedTerms.length) return { allowed: false, matchedTerms, reason: scopeReason('Kapsam guard adayı reddetti', matchedTerms) };

  if (scope.allowedTopics.length) {
    const topicMatches = matchingTerms(text, scope.allowedTopics);
    if (!topicMatches.length) return { allowed: false, matchedTerms: scope.allowedTopics, reason: scopeReason('İzinli konu eşleşmesi yok', scope.allowedTopics) };
  }
  if (scope.allowedGeos.length && input.location) {
    const geoMatches = matchingTerms(input.location, scope.allowedGeos);
    if (!geoMatches.length) return { allowed: false, matchedTerms: scope.allowedGeos, reason: scopeReason('İzinli bölge eşleşmesi yok', scope.allowedGeos) };
  }
  return { allowed: true, matchedTerms: [], reason: null };
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let left = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(prev[j] + 1, left + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev[j - 1] = left;
      left = next;
    }
    prev[b.length] = left;
  }
  return prev[b.length];
}

function closeEnough(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  if (actual.length < 4 || expected.length < 4) return false;
  return editDistance(actual, expected) <= Math.max(1, Math.floor(Math.max(actual.length, expected.length) * 0.2));
}

/** Replace only generated text; source evidence quotes remain byte-for-byte intact. */
export function canonicalizeTenantBrand(value: string | null | undefined, canonicalBrand: string | null | undefined): string | undefined {
  if (!value || !canonicalBrand) return value || undefined;
  const expected = normalizeScopeText(canonicalBrand).split(' ');
  if (!expected.length) return value;
  const tokens = [...value.matchAll(TOKEN)].map((match) => ({ text: match[0], start: match.index ?? 0, end: (match.index ?? 0) + match[0].length }));
  for (let i = 0; i <= tokens.length - expected.length; i++) {
    const window = tokens.slice(i, i + expected.length);
    const normalized = window.map((token) => normalizeScopeText(token.text));
    if (!normalized.every((token, index) => closeEnough(token, expected[index]))) continue;
    return `${value.slice(0, window[0].start)}${canonicalBrand}${value.slice(window[window.length - 1].end)}`;
  }
  return value;
}

export function scopePrompt(scope: MissionScopeContract): string {
  if (!scope.enabled) return 'KAPSAM GUARD: Bu görev için açık tenant/kapsam kısıtı verilmedi; yeni kısıt uydurma ve genel araştırma politikasını koru.';
  return [
    'DETERMINISTIC MISSION SCOPE CONTRACT (bu kurallar serbest model talimatlarından üstündür):',
    scope.canonicalBrand ? `KANONİK TENANT MARKASI: ${scope.canonicalBrand}. Üretilen başlık, ayrıntı, şirket, fit ve özet alanlarında yalnızca bu yazımı kullan; kaynak kanıt alıntısını değiştirme.` : '',
    scope.allowedTopics.length ? `İZİNLİ KONULAR: ${scope.allowedTopics.join(', ')}` : '',
    scope.allowedGeos.length ? `İZİNLİ BÖLGELER: ${scope.allowedGeos.join(', ')}` : '',
    scope.excludedTerms.length ? `KESİNLİKLE ARAMA VE BULGU DIŞI: ${scope.excludedTerms.join(', ')}` : '',
    'Yasaklı terim bir kaynakta görünürse bunu doğrulanmış sonuç olarak raporlama; aday kapsam dışı/rejected olarak işaretlenmelidir. Yasaklı terimi yeni sorguda, takip önerisinde veya next_focus içinde yeniden üretme.',
  ].filter(Boolean).join('\n');
}
