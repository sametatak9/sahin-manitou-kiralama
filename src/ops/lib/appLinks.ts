// "Uygulamayı aç": telefonda ilgili uygulamayı (Instagram, WhatsApp…) açar, bilgisayarda resmi web sürümünü yeni sekmede.
// Uygulamaların kendisi (Instagram, Facebook…) güvenlik nedeniyle başka bir sitenin içine gömülemez; bu yüzden ayrı açılır.
const WEB: Record<string, string> = {
  instagram: 'https://www.instagram.com/', facebook: 'https://www.facebook.com/', youtube: 'https://studio.youtube.com/',
  linkedin: 'https://www.linkedin.com/', x: 'https://x.com/', tiktok: 'https://www.tiktok.com/',
  sahibinden: 'https://www.sahibinden.com/', armut: 'https://armut.com/', google_business: 'https://business.google.com/',
  google_search_console: 'https://search.google.com/search-console', yandex_webmaster: 'https://webmaster.yandex.com/',
  website: 'https://sahin-manitou-kiralama.vercel.app/', email: 'https://mail.google.com/', whatsapp: 'https://web.whatsapp.com/',
  telegram: 'https://web.telegram.org/', canva: 'https://www.canva.com/',
};
// Telefonda doğrudan uygulamayı açan adresler (uygulama yüklü değilse web sürümüne düşer)
const MOBILE: Record<string, string> = { whatsapp: 'https://wa.me/', telegram: 'https://t.me/', youtube: 'https://www.youtube.com/', email: 'mailto:' };

export function appUrl(key: string): string | null {
  const mobile = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  return (mobile && MOBILE[key]) || WEB[key] || null;
}

export function openApp(key: string) {
  const url = appUrl(key); if (!url) return;
  if (url.startsWith('mailto:')) { window.location.href = url; return; }
  window.open(url, '_blank', 'noopener');
}
