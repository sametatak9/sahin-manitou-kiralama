export interface EditorialStyle {
  key: string;
  label: string;
  instruction: string;
}

export const EMBAY_EDITORIAL_STYLES: EditorialStyle[] = [
  { key: 'question_hook', label: 'Merak uyandıran soru', instruction: 'Bir ev sahibi adayının gerçek sorusuyla aç; cevabı kısa ve açık ver.' },
  { key: 'myth_fact', label: 'Yanlış bilinen / gerçek', instruction: 'Hafif çelik hakkında sık karıştırılan bir noktayı nazikçe düzelt; kanıtlanmamış üstünlük iddiası kurma.' },
  { key: 'mini_checklist', label: 'Mini kontrol listesi', instruction: 'Ev yaptırma sürecinde hafif çelik için sorulabilecek 3 kısa kontrol sorusu ver.' },
  { key: 'detail_closeup', label: 'Bir detaya yakından bakış', instruction: 'Bir yapı detayı veya üretim/kurulum aşamasını sade bir gözlemle anlat; görülmeyen işi olmuş gibi yazma.' },
  { key: 'project_journey', label: 'Proje yolculuğu', instruction: 'Gerçek görüntü varsa yalnızca görüntüde görülen ilerlemeyi aktar; proje adı, m², tarih veya teslim iddiası uydurma.' },
  { key: 'homeowner_view', label: 'Ev sahibinin gözünden', instruction: 'Arsa sahibi veya ev yaptırmayı düşünen kişinin karar anına odaklan; satış baskısı kurma.' },
  { key: 'short_explainer', label: 'Kısa açıklayıcı bilgi', instruction: 'Tek bir hafif çelik kavramını gündelik dille anlat; teknik kesinlik gerektiren iddiaları kaynak yoksa çıkar.' },
  { key: 'process_steps', label: 'Süreç adımları', instruction: 'Bir hafif çelik yapı sürecini en fazla 3 genel aşamada özetle; kesin süre veya teknik şartname uydurma.' },
  { key: 'visual_story', label: 'Görselden hikâye', instruction: 'Paylaşılan gerçek fotoğraf/video için tek bir gözleme dayalı kısa hikâye yaz; görselde olmayan ayrıntı ekleme.' },
  { key: 'choice_guide', label: 'Karar rehberi', instruction: 'Ev yaptırma kararında hafif çelikle ilgili değerlendirilebilecek bir soruyu ve pratik sonraki adımı sun.' },
  { key: 'comment_prompt', label: 'Yorum başlatan soru', instruction: 'Kısa bir bilgi verip doğal, tek ve kolay cevaplanabilir bir soru sor.' },
  { key: 'quiet_asmr', label: 'Sakin saha notu', instruction: 'Reels için görüntü/ses odaklı, sakin ve kısa bir saha notu yaz; yapay trend dili veya büyük vaat kullanma.' },
  { key: 'materials', label: 'Katman ve malzeme', instruction: 'Hafif çelik duvar veya çatı sisteminde bir malzeme/katmana dair genel bir soru sor; marka, ölçü ve teknik performans uydurma.' },
];

export interface EditorialHistory {
  headline?: string | null;
  caption?: string | null;
  tone?: string | null;
  content_pillar?: string | null;
}

export interface EditorialCandidate {
  headline?: string | null;
  title?: string | null;
  caption?: string | null;
  pillar?: string | null;
  hashtags?: string[] | null;
  cta?: string | null;
  image_idea?: string | null;
  video_script?: string | null;
  design_brief?: string | null;
}

const normalize = (value: unknown) => String(value ?? '').toLocaleLowerCase('tr-TR')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9#]+/g, ' ').replace(/\s+/g, ' ').trim();

const STOP = new Set('ve veya ile icin bu bir de da mi mu ne nasil daha gibi olan olarak kadar her cok en ise'.split(' '));
function tokens(value: unknown) {
  return new Set(normalize(value).split(' ').filter((x) => x.length > 2 && !STOP.has(x)));
}
function similarity(a: unknown, b: unknown) {
  const aa = tokens(a); const bb = tokens(b);
  if (aa.size < 7 || bb.size < 7) return 0;
  let shared = 0;
  for (const token of aa) if (bb.has(token)) shared++;
  return shared / Math.min(aa.size, bb.size);
}

const OFF_SCOPE = /\b(?:agir\s*celik|heavy\s*steel|beton(?:arme)?|prefabrik|kentsel\s+donusum|kat\s+karsiligi|istinat\s+duvari|tas\s+duvar|tadilat|tamirat|manitou|telehandler|is\s+makinesi\s+kiralama|kiralama\s+hizmeti)\b/i;
const GENERIC_STEEL_CONSTRUCTION = /\bcelik\s+(?:yap(?:i|ilar)|ev(?:ler)?)\b/i;
const EXPLICIT_LIGHT_STEEL = /\bhafif\s+celik\s+(?:yap(?:i|ilar)|ev(?:ler)?)\b/i;
const AMBIGUOUS_STEEL_HASHTAG = /(?:^|\s)#?celikev(?:ler|projesi)?(?:\s|$)|(?:^|\s)#?celikyapi(?:lar)?(?:\s|$)/i;

export function isEmbayOffScope(value: string) {
  const normalized = normalize(value);
  return OFF_SCOPE.test(normalized) || AMBIGUOUS_STEEL_HASHTAG.test(normalized)
    || (GENERIC_STEEL_CONSTRUCTION.test(normalized) && !EXPLICIT_LIGHT_STEEL.test(normalized));
}

export function chooseEditorialStyles(history: EditorialHistory[], count: number, seed = 0): EditorialStyle[] {
  const recentKeys = history.slice(0, 36).map((row) => normalize(row.tone));
  const selected: EditorialStyle[] = [];
  const useCount = (style: EditorialStyle) => recentKeys.filter((tone) => tone.includes(normalize(style.key)) || tone.includes(normalize(style.label))).length
    + selected.filter((item) => item.key === style.key).length;
  for (let i = 0; i < Math.max(0, count); i++) {
    const ranked = [...EMBAY_EDITORIAL_STYLES].sort((a, b) => useCount(a) - useCount(b)
      || ((EMBAY_EDITORIAL_STYLES.indexOf(a) - (seed + i)) % EMBAY_EDITORIAL_STYLES.length)
        - ((EMBAY_EDITORIAL_STYLES.indexOf(b) - (seed + i)) % EMBAY_EDITORIAL_STYLES.length));
    selected.push(ranked[0]);
  }
  return selected;
}

export function editorialPrompt(style: EditorialStyle) {
  return `İÇERİK TARZI: ${style.label} (${style.key}). ${style.instruction}\n\nSon paylaşımların kalıp cümlelerini, aynı açılışı ve aynı paragraf düzenini tekrar etme. Kısa, doğal ve özgün yaz; gereksiz emoji, klişe giriş ve sürekli aynı CTA kullanma.`;
}

export function validateEditorialCandidate(candidate: EditorialCandidate, history: EditorialHistory[]) {
  const body = [candidate.title, candidate.headline, candidate.caption, candidate.pillar, ...(candidate.hashtags ?? []), candidate.cta, candidate.image_idea, candidate.video_script, candidate.design_brief]
    .filter(Boolean).join('\n');
  if (isEmbayOffScope(body)) return { ok: false as const, reason: 'light_steel_scope' as const };
  const normalizedHeadline = normalize(candidate.headline || candidate.title);
  if (normalizedHeadline && history.some((row) => normalize(row.headline) === normalizedHeadline)) return { ok: false as const, reason: 'duplicate_headline' as const };
  if (history.some((row) => similarity(candidate.caption, row.caption) >= 0.72)) return { ok: false as const, reason: 'repeated_copy' as const };
  return { ok: true as const, reason: null };
}
