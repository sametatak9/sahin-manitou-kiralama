/** Bulgu güncelliği: kaynak yayın tarihi ve görevin istediği takvim aralığı. */
export function parseFindingDate(s?: string | null): Date | null {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim();
  const make = (y: number, m: number, d: number): Date | null => {
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const day = new Date(Date.UTC(y, m - 1, d));
    if (day.getUTCFullYear() !== y || day.getUTCMonth() !== m - 1 || day.getUTCDate() !== d) return null;
    return new Date(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00+03:00`);
  };
  // Eksik yıl, yıl tek başına, göreli süre ve JS Date'in 31 Şubat normalizasyonu kabul edilmez.
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)?)?$/);
  if (iso) return make(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (numeric) return make(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));
  const named = t.toLocaleLowerCase('tr-TR').match(/^(\d{1,2})\s+(ocak|oca|şubat|şub|mart|mar|nisan|nis|mayıs|may|haziran|haz|temmuz|tem|ağustos|ağu|eylül|eyl|ekim|eki|kasım|kas|aralık|ara)\.?\s+(\d{4})$/);
  if (named) {
    const months: Record<string, number> = { ocak: 1, oca: 1, şubat: 2, şub: 2, mart: 3, mar: 3, nisan: 4, nis: 4, mayıs: 5, may: 5, haziran: 6, haz: 6, temmuz: 7, tem: 7, ağustos: 8, ağu: 8, eylül: 9, eyl: 9, ekim: 10, eki: 10, kasım: 11, kas: 11, aralık: 12, ara: 12 };
    return make(Number(named[3]), months[named[2]], Number(named[1]));
  }
  return null;
}

export const MAX_FINDING_AGE_DAYS = 60;
export interface RecencyMission { title?: string | null; goal?: string | null; search_for?: string | null; report_spec?: string | null }
const missionText = (m: RecencyMission) => [m.title, m.goal, m.search_for, m.report_spec].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
export function requiresRecentEvidence(m: RecencyMission): boolean {
  return /(?:\bson\s*(?:\d+|bir|iki|üç|dört|beş|on|otuz)\s*(?:gün|hafta|ay)|güncel|bugün|bu\s+hafta|bu\s+ay)/i.test(missionText(m));
}

/** Günler İstanbul takvimine göre; saat bulunmadığı için günün ilerleyen saati gelecek tarih sayılmaz. */
export function publicationDay(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)?.value).join('-');
}
export function recencyWindow(m: RecencyMission, now = new Date()): { required: boolean; from: string; to: string; days: number } {
  const text = missionText(m);
  const to = publicationDay(now);
  const today = new Date(`${to}T00:00:00Z`);
  let days = MAX_FINDING_AGE_DAYS;
  const words: Record<string, number> = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, on: 10, otuz: 30 };
  for (const hit of text.matchAll(/\bson\s*(\d+|bir|iki|üç|dört|beş|on|otuz)\s*(gün|hafta|ay)/gi)) {
    const n = words[hit[1]] ?? Number(hit[1]);
    if (Number.isFinite(n) && n > 0) days = Math.min(days, n * (hit[2] === 'hafta' ? 7 : hit[2] === 'ay' ? 30 : 1));
  }
  let start = new Date(today.getTime() - days * 86400_000);
  if (/bugün/.test(text)) { start = today; days = 0; }
  else if (/bu\s+hafta/.test(text)) { days = (today.getUTCDay() + 6) % 7; start = new Date(today.getTime() - days * 86400_000); }
  else if (/bu\s+ay/.test(text)) { start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); days = Math.round((today.getTime() - start.getTime()) / 86400_000); }
  return { required: requiresRecentEvidence(m), from: start.toISOString().slice(0, 10), to, days };
}

/** Kaynak metadata tarihi bu kapıdan geçer; AI'nin posted iddiası tarih kanıtı değildir. */
export function publicationDateIssue(posted: string | null | undefined, m: RecencyMission, now = new Date()): string | null {
  const window = recencyWindow(m, now);
  const d = parseFindingDate(posted);
  if (!d) return window.required ? 'Kaynak yayın tarihi doğrulanamadı; göreli veya AI tarafından üretilmiş tarih kabul edilmez' : null;
  const day = publicationDay(d);
  if (day > window.to) return `Yayın tarihi ${day} gelecekte; doğrulanabilir yayın değil`;
  if (day < window.from) return `Yayın tarihi ${day}, görev tarih aralığı dışında (${window.from}–${window.to})`;
  return null;
}

export function isStaleFinding(f: { title: string; detail: string; posted?: string; fit?: string; summary?: string; evidence?: string }, now = new Date()): string | null {
  const blob = `${f.title} ${f.detail} ${f.posted ?? ''} ${f.fit ?? ''} ${f.summary ?? ''} ${f.evidence ?? ''}`.toLocaleLowerCase('tr-TR');
  if (/ihale\s*sonu[cç]|sonu[cç]\s*ilan|y[uü]klenici\s*belirlendi|s[oö]zle[sş]me\s*imzaland|i[sş]\s*tamamland|kesinle[sş]en\s*y[uü]klenici|ihale\s*iptal|ihaleyi\s*kazan|sözleşme\s*imza|iş\s*bit(ti|miş)|teslim\s*edildi|kabul\s*yapıldı/.test(blob)) return 'Sonuçlanmış / kapanmış ihale veya tamamlanmış iş — güncel fırsat değil';
  const issue = publicationDateIssue(f.posted, {}, now);
  if (issue) return issue;
  const d = parseFindingDate(f.posted);
  const currentYear = Number(publicationDay(now).slice(0, 4));
  for (let yy = 2018; yy < currentYear; yy++) {
    if (blob.includes(String(yy)) && !blob.includes(String(currentYear)) && (new RegExp(`${yy}\\s*(yılı|yil|ihale|ilan|tarih|dönem|sezon)|${yy}[./-]|\\b${yy}\\b`).test(blob) || !d)) return `Metinde ${yy} — geçmiş dönem (güncel yıl ${currentYear} yok)`;
  }
  if (/\b(geçen\s*yıl|geçtiğimiz\s*yıl|bir\s*yıl\s*önce|eski\s*ihale|eski\s*ilan|202[0-4]\s*[-–]\s*202[0-5])\b/.test(blob)) return 'Metinde geçmiş dönem ifadesi — güncel fırsat değil';
  return null;
}

export const RECENCY_RULES = [
  `GÜNCELLİK: Görevin istediği gerçek yayın tarih aralığına uy. Genel üst sınır ${MAX_FINDING_AGE_DAYS} gündür; görev son 7/30 gün istiyorsa daha dar olan pencere geçerlidir. Sonuçlanmış ihale ve tamamlanmış işler güncel müşteri fırsatı değildir.`,
  'TARİH KAYNAĞI: Sunucunun arama metadata veya sayfa yayın metadata bilgisini kullan. dateModified, taranma/ziyaret tarihi, AI tahmini, bugünkü yıl veya “2 saat önce” ifadesi yayın tarihi yerine geçmez.',
  'İHALE: Açık / başvurusu süren / henüz sonuçlanmamış olmalı. İhale günü yayın günüyle aynı değildir; başvuru bitişi ayrı bilgidir.',
  'ARAMA: Kısa ve somut sorgular kullan; tarih filtresi gerçek metadata üzerinden uygulanır, güncel yıl başlığa eklenerek eski kaynak yenilenmiş sayılmaz.',
].join('\n');
