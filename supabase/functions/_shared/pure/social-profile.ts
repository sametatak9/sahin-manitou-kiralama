const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

const PROFILE_BLOCKLIST = new Set(['popular', 'p', 'reel', 'reels', 'explore', 'stories', 'tv', 'groups', 'events', 'hashtag', 'watch', 'search', 'share', 'photo', 'photos', 'videos', 'posts', 'people', 'pages', 'profile.php', 'marketplace', 'login']);
const BUSINESS_SIGNALS = [
  'ofis', 'emlak', 'arsa', 'yapi', 'insaat', 'mimari', 'prefabrik', 'celik', 'villa', 'santiye',
  'kentsel', 'donusum', 'makine', 'kiralama', 'hafriyat', 'platform', 'baskanligi', 'belediye',
  'malzeme', 'proje', 'konut', 'muteahhit', 'taseron', 'sektor', 'gayrimenkul',
];

function profileParts(url: string): { platform: 'instagram' | 'facebook'; handle: string } | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(www\.|m\.|tr-tr\.|tr\.)/, '').toLowerCase();
    const segments = parsed.pathname.split('/').filter(Boolean);
    const first = segments[0]?.toLowerCase();
    if (!first || PROFILE_BLOCKLIST.has(first)) return null;
    if (host === 'instagram.com' && /^[a-z0-9._]{2,30}$/i.test(first)) return { platform: 'instagram', handle: first };
    if (host === 'facebook.com' && /^[a-z0-9.\-]{2,60}$/i.test(first)) return { platform: 'facebook', handle: first };
  } catch {
    return null;
  }
  return null;
}

export interface SearchBackedSocialProfileInput {
  url: string;
  findingTitle: string;
  sourceTitle?: string | null;
  detail?: string | null;
  evidence?: string | null;
  fit?: string | null;
  sourceUrlPresent: boolean;
}

export interface SearchBackedSocialProfileResult {
  ok: boolean;
  platform?: 'instagram' | 'facebook';
  handle?: string;
  reason: string;
}

/**
 * A platform profile is intentionally not fetched: Instagram/Facebook are in the
 * no-scrape list. This accepts only an exact search-result URL plus a deterministic
 * business signal, so a missing or guessed handle can never become verified.
 */
export function searchBackedSocialProfile(input: SearchBackedSocialProfileInput): SearchBackedSocialProfileResult {
  const profile = profileParts(input.url);
  if (!profile) return { ok: false, reason: 'URL bir Instagram/Facebook işletme profili değil' };
  if (!input.sourceUrlPresent) return { ok: false, reason: 'Profil URL’si gerçek arama kaynakları arasında yok' };

  const text = normalize([input.findingTitle, input.sourceTitle || '', input.detail || '', input.evidence || '', input.fit || ''].join(' '));
  const signal = BUSINESS_SIGNALS.find((term) => text.includes(term));
  if (!signal) return { ok: false, platform: profile.platform, handle: profile.handle, reason: 'Profil başlığı/özeti işletme sinyali taşımıyor' };

  const handle = normalize(profile.handle);
  const identityInText = text.includes(handle) || normalize(input.findingTitle).includes(handle);
  const ruleBacked = normalize(input.fit || '').includes('kural tabanli on eleme') || Boolean(input.sourceTitle && normalize(input.sourceTitle).includes(handle));
  if (!identityInText && !ruleBacked) {
    return { ok: false, platform: profile.platform, handle: profile.handle, reason: 'Profil başlığı ile exact handle eşleşmesi yok' };
  }

  return {
    ok: true,
    platform: profile.platform,
    handle: profile.handle,
    reason: `Exact ${profile.platform} profil URL’si arama kaynağında bulundu; ${signal} işletme sinyali eşleşti. Platform sayfası kullanım koşulları nedeniyle doğrudan okunmadı.`,
  };
}
