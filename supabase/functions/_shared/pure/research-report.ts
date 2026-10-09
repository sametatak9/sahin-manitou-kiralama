export interface ResearchReportFinding { title: string; url: string; verdict?: string; detail?: string; fit?: string }

/** Araştırma kaydı müşteri değildir. Serbest AI özeti rakip iddiasını kendi markasına taşıyamaz. */
export function researchReportSummary(findings: readonly ResearchReportFinding[]): string {
  const verified = findings.filter((f) => f.verdict === 'verified' && /^https?:\/\//i.test(f.url));
  if (!verified.length) return 'NE BULUNDU\nDoğrulanmış araştırma kaydı yok. İnceleme bekleyen adaylar sonuç veya müşteri olarak sayılmadı.';
  const clean = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);
  return [
    'NE BULUNDU',
    `${verified.length} kaynağı doğrulanmış sektör/içerik araştırması kaydı. Bunlar müşteri talebi veya kazanılmış müşteri değildir.`,
    ...verified.map((f) => `- ${clean(f.title, 200)} — Kaynak: ${clean(f.url, 1000)}`),
    '',
    'NE BULUNAMADI / KAPSAM',
    'Bu araştırma, müşteri kazanımı, takipçi artışı veya tüm pazarda bir içeriğin bulunmadığı sonucunu kanıtlamaz. Kaynağı okunamayan adaylar doğrulanmış listeye dahil değildir.',
    '',
    'ÖNERİLEN 3 SONRAKİ ADIM — İNSAN KONTROLÜ GEREKİR',
    '1. İncelenen konu başlıklarından kendi markanızın doğrulanmış proje ve teknik bilgileriyle özgün bir açıklayıcı içerik taslağı hazırlayın; kaynak metnini kopyalamayın.',
    '2. Kendi ürün/hizmet kataloğunuzu gerçek görseller ve doğrulanmış özelliklerle showroom sitesinde açıklayın; teklif çağrısını ilgili sayfaya bağlayın.',
    '3. Gerçek müşterilerinizin sorularından bir SSS taslağı ve kısa teklif formu hazırlayın; yayımlamadan önce marka ve teknik kontrolünden geçirin.',
    '',
    'MARKA KONTROLÜ: Rakibin tecrübe yılı, fiyatı, sertifikası, teslim süresi ve başarı iddiası kendi markanızın özelliği olarak kullanılamaz. Bu rapor yayın onayı değildir.',
  ].join('\n');
}
