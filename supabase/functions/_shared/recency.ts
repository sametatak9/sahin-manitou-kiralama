/** Bulgu güncelliği: 60 günden eski / sonuçlanmış ihale elemesi. mission.ts ile paylaşılır.
 *  Bugün (2026-09): 1 yıl önceki ihale çoktan alınmış/yapılmıştır — BULGU DEĞİLDİR.
 */
export function parseFindingDate(s?: string | null): Date | null {
  if (!s) return null;
  const t = s.trim();
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00+03:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const tr = t.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (tr) {
    const d = new Date(`${tr[3]}-${tr[2].padStart(2, '0')}-${tr[1].padStart(2, '0')}T12:00:00+03:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  // "15 Eylül 2025", "Eylül 2025", "2025 yılı"
  const trMonth = t.match(/(\d{1,2})?\s*(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s*(\d{4})/i);
  if (trMonth) {
    const months: Record<string, string> = {
      ocak: '01', şubat: '02', mart: '03', nisan: '04', mayıs: '05', haziran: '06',
      temmuz: '07', ağustos: '08', eylül: '09', ekim: '10', kasım: '11', aralık: '12',
    };
    const m = months[trMonth[2].toLocaleLowerCase('tr-TR')];
    const day = (trMonth[1] || '15').padStart(2, '0');
    if (m) {
      const d = new Date(`${trMonth[3]}-${m}-${day}T12:00:00+03:00`);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d2 = new Date(t);
  return isNaN(d2.getTime()) ? null : d2;
}

/** Maksimum yaş (gün). 60 = yaklaşık 2 ay; 1 yıl önceki ihale asla geçmez. */
export const MAX_FINDING_AGE_DAYS = 60;

export function isStaleFinding(f: {
  title: string;
  detail: string;
  posted?: string;
  fit?: string;
  summary?: string;
  evidence?: string;
}): string | null {
  const blob = `${f.title} ${f.detail} ${f.posted ?? ''} ${f.fit ?? ''} ${f.summary ?? ''} ${f.evidence ?? ''}`.toLocaleLowerCase('tr-TR');

  // Sonuçlanmış / kapanmış işler
  if (/ihale\s*sonu[cç]|sonu[cç]\s*ilan|y[uü]klenici\s*belirlendi|s[oö]zle[sş]me\s*imzaland|i[sş]\s*tamamland|kesinle[sş]en\s*y[uü]klenici|ihale\s*iptal|ihaleyi\s*kazan|sözleşme\s*imza|iş\s*bit(ti|miş)|teslim\s*edildi|kabul\s*yapıldı/.test(blob)) {
    return 'Sonuçlanmış / kapanmış ihale veya tamamlanmış iş — güncel fırsat değil';
  }

  const now = new Date();
  const currentYear = now.getFullYear(); // 2026
  const d = parseFindingDate(f.posted);

  if (d) {
    const ageDays = (Date.now() - d.getTime()) / 86400_000;
    if (ageDays > MAX_FINDING_AGE_DAYS) {
      return `Tarih ${f.posted} — ${MAX_FINDING_AGE_DAYS} günden eski (yaş ~${Math.round(ageDays)} gün)`;
    }
    if (d.getFullYear() < currentYear - 0 && ageDays > 30) {
      // 2025 veya daha eski yıl + 30 günden fazla → reddet
      if (d.getFullYear() < currentYear) {
        return `Tarih yılı ${d.getFullYear()} — geçmiş dönem, güncel değil`;
      }
    }
  }

  // Metinde açıkça eski yıl geçiyorsa (2025, 2024, ...) ve güncel yıl yoksa reddet
  for (let yy = 2018; yy < currentYear; yy++) {
    const hasOld = blob.includes(String(yy));
    const hasCurrent = blob.includes(String(currentYear));
    if (hasOld && !hasCurrent) {
      if (
        new RegExp(`${yy}\\s*(yılı|yil|ihale|ilan|tarih|dönem|sezon)|${yy}[./-]|\\b${yy}\\b`).test(blob) ||
        !d // posted yoksa metindeki yıl yeterli kanıt
      ) {
        return `Metinde ${yy} — geçmiş dönem (güncel yıl ${currentYear} yok)`;
      }
    }
  }

  // "geçen yıl", "2024-2025", "eski ihale" gibi ifadeler
  if (/\b(geçen\s*yıl|geçtiğimiz\s*yıl|bir\s*yıl\s*önce|eski\s*ihale|eski\s*ilan|202[0-4]\s*[-–]\s*202[0-5])\b/.test(blob)) {
    return 'Metinde geçmiş dönem ifadesi — güncel fırsat değil';
  }

  return null;
}

export const RECENCY_RULES = [
  `GÜNCELLİK (ZORUNLU — ${MAX_FINDING_AGE_DAYS} GÜN): Yalnızca SON ${MAX_FINDING_AGE_DAYS} GÜN içindeki ilan/ihale/talep/haberler. Tercihen son 21–30 gün. 1 yıl veya daha eski ihale, sonuçlanmış ihale, “ihale sonuçlandı / yüklenici belirlendi / iş tamamlandı” kayıtları BULGU DEĞİLDİR. Tarih yoksa ve metinden 2025 veya daha eski olduğu anlaşılıyorsa ele.`,
  'İHALE: Açık / başvurusu süren / henüz sonuçlanmamış. “Sonuç ilanı”, “kesinleşen yüklenici”, “sözleşme imzalandı” → reject.',
  'ARAMA: Sorgulara “2026”, “güncel”, “son ilan”, “yeni duyuru” ekle; eski arşiv sayfalarını atla.',
].join('\n');
