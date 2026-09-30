/** Bulgu güncelliği: 90 günden eski / sonuçlanmış ihale elemesi. */
export function parseFindingDate(s?: string | null): Date | null {
  if (!s) return null;
  const t = s.trim();
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00+03:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const tr = t.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (tr) {
    const d = new Date(`${tr[3]}-${tr[2].padStart(2, '0')}-${tr[1].padStart(2, '0')}T12:00:00+03:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d2 = new Date(t);
  return isNaN(d2.getTime()) ? null : d2;
}

export function isStaleFinding(f: {
  title: string;
  detail: string;
  posted?: string;
  fit?: string;
  summary?: string;
}): string | null {
  const blob = `${f.title} ${f.detail} ${f.posted ?? ''} ${f.fit ?? ''} ${f.summary ?? ''}`.toLocaleLowerCase('tr-TR');
  if (/ihale\s*sonu[cç]|sonu[cç]\s*ilan|y[uü]klenici\s*belirlendi|s[oö]zle[sş]me\s*imzaland|i[sş]\s*tamamland|kesinle[sş]en\s*y[uü]klenici/.test(blob)) {
    return 'Sonuçlanmış / kapanmış ihale veya tamamlanmış iş — güncel fırsat değil';
  }
  const d = parseFindingDate(f.posted);
  if (d) {
    const age = Date.now() - d.getTime();
    if (age > 90 * 86400_000) return `Tarih ${f.posted} — 90 günden eski`;
  }
  const y = new Date().getFullYear();
  for (let yy = 2018; yy <= y - 1; yy++) {
    if (blob.includes(String(yy)) && !blob.includes(String(y))) {
      if (!d && new RegExp(`${yy}\\s*(yılı|yil|ihale|ilan|tarih)|${yy}[./-]`).test(blob)) {
        return `Metinde ${yy} — geçmiş dönem`;
      }
    }
  }
  return null;
}

export const RECENCY_RULES = [
  'GÜNCELLİK (ZORUNLU): Yalnızca SON 90 GÜN içindeki ilan/ihale/talep/haberler. 1 yıl veya daha eski ihale, sonuçlanmış ihale, “ihale sonuçlandı / yüklenici belirlendi / iş tamamlandı” kayıtları BULGU DEĞİLDİR. Tercihen son 30 gün.',
  'İHALE: Açık / başvurusu süren / henüz sonuçlanmamış. “Sonuç ilanı”, “kesinleşen yüklenici”, “sözleşme imzalandı” → reject.',
].join('\n');
