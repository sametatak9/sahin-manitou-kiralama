export type MissionPolicy = 'lead' | 'growth' | 'research';
/** Sektör ve portföy kuralları yalnız açık iş bulma görevlerinde uygulanır. */
export function missionPolicy(bot: { bot_type?: string | null; slug?: string | null }, mission: { title?: string | null; goal?: string | null; search_for?: string | null }): MissionPolicy {
  if (bot.bot_type === 'lead' || ['insaat-is-bulucu', 'manitou-is-bulucu'].includes(bot.slug || '')) return 'lead';
  if (bot.slug === 'sosyal-buyume') return 'growth';
  const text = [mission.title, mission.goal, mission.search_for].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
  if (/(?:müşteri\s+taleb|(?:iş\s+fırsat|açık\s+ihale|ihale\s+ilan|taşeron\s+arayış|teklif\s+verilebil|hizmet\s+taleb))/.test(text)) return 'lead';
  if (/(?:işletme\s+hesa|sektör\s+hesa|profil\s+keş|takip\s+edilecek\s+hesa)/.test(text)) return 'growth';
  return 'research';
}
export const RESEARCH_RELEVANCE_RULES = [
  'GÖREV UYGUNLUĞU: Kaynakları görevin kendi amacına göre değerlendir. Pazar/anahtar kelime/SEO/içerik araştırması bir müşteri talebi bulma görevi değildir; veriyi zorla lead olarak etiketleme.',
  'Rakip, tedarikçi veya sektör medyası analiz için istenmişse bunları kaynak olarak kullanabilirsin; otomatik takip, beğeni, yorum veya DM yapma.',
  'Her kayıtta görevle alaka puanı relevance (0–10) ve kaynak verisinden çıkarılan tek cümlelik fit yaz. 7 altını ele; kaynak desteklemiyorsa boş sonuç ver.',
  'Sektörü ve bölgeyi görev veya müşteri talimatından al; her müşteriyi inşaat/İstanbul varsayma. Öneriyi kanıtlanan gerçeklikten açıkça ayır.',
].join('\n');
