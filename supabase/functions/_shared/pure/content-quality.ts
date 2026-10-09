export type ContentQualityLevel = 'ok' | 'warning' | 'error';

export type ContentQualityIssue = {
  key: string;
  level: Exclude<ContentQualityLevel, 'ok'>;
  message: string;
};

export type SitePostQualityInput = {
  slug?: string | null;
  kind?: string | null;
  title?: string | null;
  excerpt?: string | null;
  body?: string | null;
  cover_url?: string | null;
  images?: unknown;
  district?: string | null;
  district_slug?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export type SitePostQuality = {
  ok: boolean;
  score: number;
  blocking: ContentQualityIssue[];
  warnings: ContentQualityIssue[];
  checks: Array<ContentQualityIssue & { level: ContentQualityLevel }>;
};

const text = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
const hasMedia = (post: SitePostQualityInput) => Boolean(text(post.cover_url)) || (Array.isArray(post.images) && post.images.some((x) => text(x)));
const CLAIM_PATTERN = /(?:en iyi|en ucuz|rakipsiz|t[uü]rkiye['’]nin\s+1\.?\s*numaras[ıi]|%\s*100|y[uü]zde\s*100|kesin fiyat|garantili|garanti eder)(?=\s|$|[.,;:!?])/i;

/**
 * Public yayın öncesi içerik kontrolü.
 * Yapısal eksikler yayınlamayı bloke eder; iddia dili uyarı olarak kalır ve insanın son kararına bırakılır.
 */
export function inspectSitePost(post: SitePostQualityInput, brandName?: string | null): SitePostQuality {
  const blocking: ContentQualityIssue[] = [];
  const warnings: ContentQualityIssue[] = [];
  const checks: SitePostQuality['checks'] = [];
  const add = (key: string, level: ContentQualityLevel, message: string) => {
    const check = { key, level, message } as ContentQualityIssue & { level: ContentQualityLevel };
    checks.push(check);
    if (level === 'error') blocking.push(check);
    if (level === 'warning') warnings.push(check);
  };

  const slug = text(post.slug);
  if (!/^[a-z0-9-]{3,120}$/.test(slug)) add('slug', 'error', 'Slug 3–120 karakterlik küçük harfli URL biçiminde olmalı.');
  else add('slug', 'ok', 'Slug geçerli.');

  const title = text(post.title);
  if (!title) add('title', 'error', 'Başlık boş olamaz.');
  else if (title.length < 10 || title.length > 120) add('title', 'error', `Başlık uzunluğu uygun değil (${title.length} karakter).`);
  else if (title.length < 30 || title.length > 70) add('title', 'warning', `Başlık SEO için sınırda (${title.length} karakter).`);
  else add('title', 'ok', `Başlık uygun (${title.length} karakter).`);

  const body = text(post.body);
  if (!body) add('body', 'error', 'İçerik gövdesi boş olamaz.');
  else if (body.length < 300) add('body', 'error', `İçerik gövdesi çok kısa (${body.length} karakter).`);
  else if (body.length > 9000) add('body', 'warning', `İçerik gövdesi uzun; yayın öncesi düzenleme önerilir (${body.length} karakter).`);
  else add('body', 'ok', `İçerik gövdesi mevcut (${body.length} karakter).`);

  if (!hasMedia(post)) add('media', 'error', 'Yazı için en az bir kapak veya görsel gerekli.');
  else add('media', 'ok', 'Kapak/görsel mevcut.');

  const excerpt = text(post.excerpt);
  if (!excerpt) add('excerpt', 'error', 'Kart özeti boş olamaz.');
  else if (excerpt.length < 80 || excerpt.length > 220) add('excerpt', 'warning', `Kart özeti önerilen uzunlukta değil (${excerpt.length} karakter).`);
  else add('excerpt', 'ok', `Kart özeti uygun (${excerpt.length} karakter).`);

  const seoTitle = text(post.seo_title);
  if (!seoTitle) add('seo_title', 'error', 'SEO başlığı boş olamaz.');
  else if (seoTitle.length < 20 || seoTitle.length > 70) add('seo_title', 'warning', `SEO başlığı önerilen uzunlukta değil (${seoTitle.length} karakter).`);
  else add('seo_title', 'ok', `SEO başlığı mevcut (${seoTitle.length} karakter).`);

  const seoDescription = text(post.seo_description);
  if (!seoDescription) add('seo_description', 'error', 'SEO açıklaması boş olamaz.');
  else if (seoDescription.length < 100 || seoDescription.length > 180) add('seo_description', 'warning', `SEO açıklaması önerilen uzunlukta değil (${seoDescription.length} karakter).`);
  else add('seo_description', 'ok', `SEO açıklaması mevcut (${seoDescription.length} karakter).`);

  if (post.kind === 'ilce' && (!text(post.district) || !text(post.district_slug))) add('district', 'error', 'İlçe rehberinde ilçe ve ilçe slug bilgisi gerekli.');
  else if (post.kind === 'ilce') add('district', 'ok', 'İlçe bilgisi mevcut.');

  if (CLAIM_PATTERN.test(`${title}\n${body}`)) add('claims', 'warning', 'Kanıt gerektiren üstünlük/garanti dili bulundu; insan marka kontrolü gerekli.');
  else add('claims', 'ok', 'Belirgin üstünlük/garanti iddiası bulunmadı.');

  const brand = text(brandName);
  if (brand && !new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(`${title}\n${body}`))
    add('brand_context', 'warning', `${brand} adı başlık veya gövdede görünmüyor; tenant marka kontrolü gerekli.`);
  else if (brand) add('brand_context', 'ok', `${brand} marka bağlamı metinde mevcut.`);

  const score = Math.max(0, Math.round(100 - blocking.length * 25 - warnings.length * 5));
  return { ok: blocking.length === 0, score, blocking, warnings, checks };
}
