// Embay Yapı alan adları için ayrı giriş sayfası: WhatsApp/Google önizlemesinde yalnızca "Embay Yapı" görünsün.
// vite build sonrası dist/index.html → dist/embay.html ve dist/site.html (başlık, açıklama, önizleme görseli değişir; uygulama aynı).
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
const TITLE = 'Embay Yapı | Anahtar Teslim Ev ve Villa Yapımı – İstanbul';
const DESC = "Embay Yapı: İstanbul'da müstakil ev, villa, çelik ve betonarme yapılarda anahtar teslim inşaat. Ev modellerimizi ve teslim ettiğimiz projeleri inceleyin. Teklif: 0531 436 29 04";
const IMAGE = 'https://utngxnqlcayfjkknaysx.supabase.co/storage/v1/object/public/media-uploads/drive/1FS7AkOuDCcUuRW8xy2iZDqKvBvYlABtx.jpg';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
let h = readFileSync('dist/index.html', 'utf8');
h = h.replace('<html lang="en">', '<html lang="tr">')
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(TITLE)}</title>`)
  .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(DESC)}" />`)
  .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(TITLE)}" />\n    <meta property="og:site_name" content="Embay Yapı" />\n    <meta property="og:image" content="${IMAGE}" />\n    <meta property="og:locale" content="tr_TR" />`)
  .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(DESC)}" />`)
  .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><h1>Embay Yapı</h1><p>${esc(DESC)}</p></noscript>`);
if (/Manitou/i.test(h.replace(/<script[\s\S]*?<\/script>/g, ''))) throw new Error('embay.html hâlâ Manitou içeriyor');
writeFileSync('dist/embay.html', h);
// Vercel kökte index.html bulursa yönlendirme kurallarına bakmadan onu sunar; bu yüzden alan adına göre seçim için
// varsayılan sayfa site.html olarak taşınır (vercel.json: Embay alan adları → embay.html, diğerleri → site.html).
renameSync('dist/index.html', 'dist/site.html');
console.log('dist/embay.html + dist/site.html yazıldı');
