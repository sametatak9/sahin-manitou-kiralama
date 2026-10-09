export const AGENCY_MODEL_PREFERENCE_KEY = 'embay.agency.preferred-model';

export const AGENCY_MODEL_FALLBACKS = [
  { id: 'gpt-5-mini', label: 'GPT-5 mini', note: 'Chat ve botlar için önerilen denge' },
  { id: 'gpt-5-nano', label: 'GPT-5 nano', note: 'Ön eleme ve kısa işler için ekonomik' },
  { id: 'gpt-5', label: 'GPT-5', note: 'Karmaşık muhakeme — daha yüksek maliyet' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', note: 'Dengeli ve ekonomik' },
  { id: 'claude-opus-5', label: 'Claude Opus 5', note: 'En güçlü muhakeme' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', note: 'Hızlı ve kısa işler' },
] as const;

export function getPreferredModel(fallback = 'gpt-5-mini') {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(AGENCY_MODEL_PREFERENCE_KEY);
    return value && /^[a-z0-9][a-z0-9._-]{2,100}$/.test(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function setPreferredModel(model: string) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(AGENCY_MODEL_PREFERENCE_KEY, model); } catch { /* özel tarayıcı modu */ }
}
