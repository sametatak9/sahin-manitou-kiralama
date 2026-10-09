/**
 * Araştırma bulgularını müşteri talebi, işletme/partner, rakip ve kamu
 * kurumu olarak ayırır. Bu yardımcı AI kararı vermez; aynı metin için her
 * çalışma ortamında aynı türü üretir ve portföy/lead sayaçlarını ayırır.
 */
export const FINDING_TYPES = [
  'customer_lead',
  'business_or_partner',
  'competitor_or_reference',
  'public_institution',
  'public_opportunity',
  'technical_seo',
  'market_reference',
  'excluded',
] as const;

export type FindingType = typeof FINDING_TYPES[number];

export interface FindingTaxonomyInput {
  title?: string | null;
  detail?: string | null;
  evidence?: string | null;
  fit?: string | null;
  company?: string | null;
  location?: string | null;
  url?: string | null;
}

const normalize = (value: string) => value.toLocaleLowerCase('tr-TR')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[._/:\-]+/g, ' ').replace(/\s+/g, ' ').trim();

const textOf = (input: FindingTaxonomyInput) => normalize([
  input.title, input.detail, input.evidence, input.fit, input.company, input.location,
].filter(Boolean).join(' '));

// Resmî kurum sinyali, genel “kamu” kelimesinden daha dar tutulur.
const PUBLIC_INSTITUTION = /\b(t c|belediye|bakanlik|bakanligi|kaymakam|kaymakamlik|valilik|valiligi|muhtarlik|devlet dairesi|resmi kurum|kamu kurumu|toki|dsi|karayollari|universite|hastane|okul mudurlugu|il ozel idaresi)\b/;
const PUBLIC_OPPORTUNITY = /\b(ihale|kamu alimi|is alimi|tender|resmi ilan|dogrudan temin|teklif cagrisi|yapim isi|hizmet alim)\b/;
const CUSTOMER_DEMAND = /\b(ariyor|araniyor|aramaktadir|yaptirmak istiyor|yaptirmak isteyen|hizmet ariyor|teklif almak|fiyat teklifi|talep|ihtiyac|is veren|isveren|tasaron ariyor|usta ariyor|muteahhit ariyor|kat karsiligi ariyor|arsa sahibi)\b/;
const BUSINESS = /\b(firma|sirket|ofis|emlak|arsa ofisi|gayrimenkul|mimarlik|mimar|insaat|yapi|prefabrik|celik|villa|konut|muteahhit|tedarik|malzeme|uretic|uretim|hizmet ver|kiralama|makine|construction|builder|build)\b/;
const COMPETITOR = /\b(rakip|uretic|uretim|hizmet ver|katalog|referans|proje tanitim|insaat firmasi|yapi firmasi|prefabrik|celik ev|construction|builder)\b/;
const MEDIA = /\b(haber|medya|dergi|gazete|sektor medyasi|blog|rehber|liste|makale)\b/;
const SOCIAL = /\b(instagram|facebook|tiktok|linkedin|twitter|x com)\b/;

/**
 * A profile or post is not a customer lead merely because it belongs to a
 * relevant company. Explicit demand evidence wins over generic sector terms;
 * official institutions are always separated before that check.
 */
export function classifyFindingType(input: FindingTaxonomyInput): FindingType {
  const text = textOf(input);
  if (!text) return 'excluded';

  const isPublic = PUBLIC_INSTITUTION.test(text);
  if (isPublic && PUBLIC_OPPORTUNITY.test(text)) return 'public_opportunity';
  if (isPublic) return 'public_institution';

  // A direct demand is a lead only when the text is not merely an offering or
  // company profile. “Prefabrik üreticisi” must remain a sector account.
  if (CUSTOMER_DEMAND.test(text) && !(/\b(hizmet veriyoruz|ureticiyiz|ureticisi|firma olarak|katalog|referans)\b/.test(text) && COMPETITOR.test(text))) {
    return 'customer_lead';
  }

  if (COMPETITOR.test(text)) return 'competitor_or_reference';
  if (BUSINESS.test(text)) return 'business_or_partner';
  if (MEDIA.test(text)) return 'market_reference';
  if (SOCIAL.test(text) && !BUSINESS.test(text)) return 'excluded';
  return 'market_reference';
}

export const FINDING_TYPE_LABEL: Record<FindingType, string> = {
  customer_lead: 'Müşteri talebi',
  business_or_partner: 'İşletme / iş ortağı',
  competitor_or_reference: 'Rakip / referans',
  public_institution: 'Kamu kurumu',
  public_opportunity: 'Kamu fırsatı / ihale',
  technical_seo: 'Teknik SEO',
  market_reference: 'Pazar / sektör referansı',
  excluded: 'Kapsam dışı',
};

export function isCustomerLead(input: FindingTaxonomyInput & { finding_type?: FindingType | null }): boolean {
  return (input.finding_type ?? classifyFindingType(input)) === 'customer_lead';
}
