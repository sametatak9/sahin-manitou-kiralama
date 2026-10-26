// İÇERİK FABRİKASI: her gün 5 platform × 3 içerik (1 kısa video + 2 banner/kampanya) taslağı üretir → onay kuyruğu.
// Kurallar: gerçek hizmetlerimiz, uydurma müşteri/rakam/proje yok; platform uzunluk/hashtag kuralları; paylaşım insan onayından sonra.
// Banner PNG sunucuda üretilir (SVG → PNG, resvg-wasm). Video: Video Havuzu'ndan gerçek video seçilir; yoksa çekim senaryosuyla "video gerekli" taslağı.
import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm@2.6.2';
import jpeg from 'npm:jpeg-js@0.4.4';
import { aiComplete, brandForClient, istanbulDayRange, type Db } from './context.ts';
import { telegramSend } from './connectors/messaging.ts';
import { loadAppSecrets, secret as appSecret } from './secrets.ts';
import { getAiKey } from './ai/keys.ts';
import { chooseEditorialStyles, editorialPrompt, isEmbayOffScope, validateEditorialCandidate, type EditorialHistory } from './pure/editorial.ts';

type Platform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'x';
interface Quota { platform: Platform; enabled: boolean; video_per_day: number; image_per_day: number; slot_times: string[]; width: number; height: number }
interface Item { format: 'reel' | 'banner'; title: string; headline: string; subtitle: string; badge: string; caption: string; hashtags: string[]; cta: string; tone?: string; video_script?: string; brand: 'Embay Yapı' | 'Şahin Manitou' }

const PLATFORM_RULES: Record<Platform, string> = {
  instagram: 'Instagram: görsel öncelikli, ilk satırda özgün kanca; 35-70 kelime, kısa paragraf ve yalnız 3-5 ilgili hashtag. Reels 15-30 sn.',
  tiktok: 'TikTok: açıklama kısa (en fazla 150 karakter), yalnız 3-5 ilgili hashtag; ilk 2 saniyede doğal bir kanca, 15-30 sn video. #inşaat veya #tadilat kullanma.',
  youtube: 'YouTube Shorts: başlık en fazla 70 karakter, 2-3 kısa cümle ve 3-5 ilgili hashtag (#shorts dahil). Banner içerikleri Topluluk gönderisi olarak.',
  facebook: 'Facebook: 30-60 kelime, konuşma dili ve tek doğal soru/CTA; yalnız 3-5 ilgili hashtag.',
  x: 'X: toplam en fazla 260 karakter; net, doğal ve 2-3 hafif çelik/ev odaklı hashtag.',
};

// EMBAY YAPI için yalnızca hafif çelik ev/yapı: içerik stili her gün döner, başka hizmet türü eklenmez.
const PILLARS = [
  { key: 'question_hook', brand: 'Embay Yapı', topic: 'Hafif çelik ev yaptırmayı düşünen arsa sahibinin gerçek karar soruları; cevap için kaynak veya proje bilgisi yoksa kesin hüküm verme', badge: 'EV SAHİBİNİN SORUSU' },
  { key: 'myth_fact', brand: 'Embay Yapı', topic: 'Hafif çelik yapı hakkında yaygın bir yanlış anlaşılma ve kaynak gerektirmeyen, ölçülü bir açıklama; teknik üstünlük iddiası uydurma', badge: 'DOĞRU BİLİNENLER' },
  { key: 'mini_checklist', brand: 'Embay Yapı', topic: 'Hafif çelik ev için görüşmeye hazırlanan kişinin sorabileceği üç genel kontrol sorusu', badge: 'KISA KONTROL LİSTESİ' },
  { key: 'detail_closeup', brand: 'Embay Yapı', topic: 'Hafif çelik duvar/panel, birleşim veya yalıtım katmanında tek bir görülebilir detay; görüntüde olmayanı iddia etme', badge: 'BİR DETAYA YAKINDAN' },
  { key: 'project_journey', brand: 'Embay Yapı', topic: 'Yalnızca etiketlenmiş gerçek hafif çelik proje görüntüsünde görülebilen ilerleme; proje adı, tarih, ölçü veya teslim iddiası uydurma', badge: 'PROJE YOLCULUĞU' },
  { key: 'homeowner_view', brand: 'Embay Yapı', topic: 'Hafif çelik ev düşünen arsa sahibinin ihtiyaç, kullanım ve yerel koşulları netleştirme süreci', badge: 'ARSA SAHİBİNE NOT' },
  { key: 'short_explainer', brand: 'Embay Yapı', topic: 'Hafif çelik yapı sistemindeki tek bir terimi gündelik Türkçeyle, iddiasız biçimde açıklama', badge: 'KISA AÇIKLAMA' },
  { key: 'process_steps', brand: 'Embay Yapı', topic: 'Hafif çelik proje görüşmesinden uygulama planına uzanan genel süreci en fazla üç aşamada anlatma; süre uydurma', badge: 'SÜREÇTEN ÜÇ ADIM' },
  { key: 'visual_story', brand: 'Embay Yapı', topic: 'Yalnızca uygun etiketli gerçek hafif çelik saha/proje görselinde görülen bir ayrıntı üzerinden kısa anlatı', badge: 'GÖRÜNTÜDEN BİR NOT' },
  { key: 'choice_guide', brand: 'Embay Yapı', topic: 'Hafif çelik ev kararı öncesi arsa, kullanım amacı ve proje kapsamı hakkında değerlendirilecek bir soru', badge: 'KARAR REHBERİ' },
  { key: 'comment_prompt', brand: 'Embay Yapı', topic: 'Hafif çelik ev planlayan kişiye tek kısa bilgi ve doğal, tek cevaplı etkileşim sorusu', badge: 'SEN NE DÜŞÜNÜYORSUN?' },
  { key: 'quiet_asmr', brand: 'Embay Yapı', topic: 'Uygun gerçek hafif çelik saha görüntüsü için sakin ve kısa ASMR/saha notu; trend veya dayanım vaadi yok', badge: 'SAHADAN SAKİN BİR AN' },
  { key: 'materials', brand: 'Embay Yapı', topic: 'Hafif çelik duvar veya çatı sisteminde kullanılabilecek katman/malzeme hakkında genel bilgilendirme; marka ve teknik değer uydurma', badge: 'KATMANLARA YAKINDAN' },
] as const;
// Her direk için birden fazla yedek başlık; tükenince tarih-indeks ekiyle tekrar engellenir.
const HEADLINES: Record<string, string[]> = {
  question_hook: ['Hafif Çelik Ev Planlarken İlk Sorunuz Ne?', 'Arsanız Hazır mı, Planınız da Hazır mı?', 'Ev Projesine Nereden Başlamalı?', 'Hafif Çelik Ev Hakkında Merak Ettikleriniz', 'İlk Görüşmede Neleri Konuşmalı?'],
  myth_fact: ['Hafif Çelik Hakkında Bir Not', 'Sık Duyulan Bir Soruyu Açalım', 'Bilgi mi, Varsayım mı?', 'Bir Kavramı Netleştirelim', 'Yapı Sistemini Konuşalım'],
  mini_checklist: ['Görüşmeden Önce 3 Soru', 'Hafif Çelik İçin Mini Liste', 'Proje Konuşmasına Hazırlık', 'Bu Üç Noktayı Not Edin', 'İlk Adımda Neleri Sorarsınız?'],
  detail_closeup: ['Birleşim Detayına Yakından', 'Duvar Panelinde Bir Ayrıntı', 'Katman Katman Bir Bakış', 'Küçük Detay, Büyük Merak', 'Sahadaki Bir Noktaya Bakalım'],
  project_journey: ['Gerçek Projeden Bir Kare', 'Bir Proje, Bir Sonraki Adım', 'Sahadan Bugünün Görüntüsü', 'Proje Yolculuğundan Notlar', 'Görüntüde Hangi Aşamayı Görüyorsunuz?'],
  homeowner_view: ['Arsa Sahiplerine Kısa Bir Not', 'Evinizi Planlarken Kendinize Sorun', 'Kullanım İhtiyacınız Ne?', 'Hayalinizdeki Evi Tarif Edin', 'Planlamada Önce İhtiyaç'],
  short_explainer: ['Bir Terimi Kısaca Açıklayalım', 'Hafif Çelikte Bu Ne Demek?', 'Kısa Bilgi: Panel Sistemi', 'Bugünün Yapı Terimi', 'Tek Kavram, Sade Anlatım'],
  process_steps: ['Süreçte İlk Üç Adım', 'Proje Görüşmesinden Plana', 'Önce Konuşalım, Sonra Planlayalım', 'Birlikte Netleştirilecek Başlıklar', 'Başlangıç Noktası Neresi?'],
  visual_story: ['Bu Görüntüde Ne Dikkatinizi Çekti?', 'Sahadan Kısa Bir Not', 'Kadrajın İçindeki Detay', 'Bugünün Proje Anı', 'Görüntüden Bir Gözlem'],
  choice_guide: ['Karar Vermeden Önce', 'Arsa ve İhtiyaç Birlikte Düşünülür', 'Proje Kapsamını Netleştirin', 'Kendinize Sorabileceğiniz Bir Soru', 'Planınıza Uygun Sorular'],
  comment_prompt: ['Sizin İlk Sorunuz Ne Olurdu?', 'Sizce İlk Adım Hangisi?', 'Hayalinizdeki Evin Bir Detayı?', 'Yorumlarda Buluşalım', 'Bu Konuda Siz Ne Merak Ediyorsunuz?'],
  quiet_asmr: ['Sahadan Sakin Bir An', 'Günün Hafif Çelik Sesi', 'İşin Ritminden Kısa Bir Kesit', 'Saha Sesleri, Kısa Bir Not', 'Bir Anı Durduralım'],
  materials: ['Bir Katmanı Tanıyalım', 'Duvar Sistemine Yakından', 'Malzeme Seçiminde Sorular', 'Katmanların Görevi Nedir?', 'Detayı Görmeden Karar Vermeyin'],
};
function pickHeadline(key: string, di: number, used: Set<string>) {
  const list = HEADLINES[key] ?? HEADLINES.question_hook;
  for (let k = 0; k < list.length; k++) { const h = list[(di + k) % list.length]; if (!used.has(h.toLocaleLowerCase('tr-TR'))) return h; }
  return `${list[di % list.length]} · ${di + 1}`;
}

const CONTENT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['items'], properties: {
    items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['format', 'title', 'headline', 'subtitle', 'caption', 'hashtags', 'cta'], properties: {
      format: { type: 'string', enum: ['reel', 'banner'] }, title: { type: 'string' }, headline: { type: 'string' }, subtitle: { type: 'string' },
      caption: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, cta: { type: 'string' }, video_script: { type: 'string' },
    } } },
  },
};

// ── Banner çizimi (SVG → PNG) ────────────────────────────────────────────────
let wasmReady: Promise<void> | null = null;
let fonts: Uint8Array[] | null = null;
async function ensureRenderer() {
  wasmReady ??= (async () => { await initWasm(await fetch('https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm')); })();
  await wasmReady;
  if (!fonts) {
    const get = async (f: string) => new Uint8Array(await (await fetch(`https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/${f}`)).arrayBuffer());
    fonts = await Promise.all([get('DejaVuSans-Bold.ttf'), get('DejaVuSans.ttf'), get('DejaVuSans-ExtraLight.ttf'), get('DejaVuSerif-Bold.ttf'), get('DejaVuSerif.ttf'), get('DejaVuSerif-Italic.ttf')]);
    // Kurumsal yazı tipi: Montserrat (ince, sade). İndirilemezse DejaVu ile devam edilir (tasarım bozulmaz).
    const mont = async (wt: string) => { try { const r = await fetch(`https://cdn.jsdelivr.net/gh/JulietaUla/Montserrat@master/fonts/ttf/Montserrat-${wt}.ttf`); return r.ok ? new Uint8Array(await r.arrayBuffer()) : null; } catch { return null; } };
    for (const f of await Promise.all(['Light', 'Regular', 'SemiBold', 'Bold', 'ExtraBold'].map(mont))) if (f) fonts.push(f);
  }
}
function b64(bytes: Uint8Array) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function wrap(text: string, maxChars: number, maxLines: number) {
  const words = text.trim().split(/\s+/); const lines: string[] = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) { const cut = lines[maxLines - 1].replace(/\s*\S*$/, ''); lines[maxLines - 1] = (cut || lines[maxLines - 1]) + '…'; }
  return lines;
}


// ── İnşaat amblemleri (100×100 çizgi ikon; renk/kalınlık dışarıdan) ─────────
const ICONS: Record<string, string> = {
  vinc: '<path d="M32 94V14M18 94h30M32 14h58M32 14l14-10 14 10M32 26l10-12M32 40l10-12M32 54l10-12M32 68l10-12M32 82l10-12M42 14v80M80 14v30"/><path d="M74 44h12v9H74z"/><path d="M14 14h18v9H14z"/>',
  baret: '<path d="M12 72h76"/><path d="M20 72c0-34 60-34 60 0"/><path d="M50 36v22M38 40v26M62 40v26"/><path d="M26 80h48"/>',
  bina: '<path d="M18 94V22h36v72M54 44h28v50M10 94h80"/><path d="M26 32h8v8h-8zM40 32h8v8h-8zM26 48h8v8h-8zM40 48h8v8h-8zM26 64h8v8h-8zM40 64h8v8h-8zM62 54h8v8h-8zM62 70h8v8h-8z"/><path d="M32 94V82h10v12"/>',
  ev: '<path d="M10 52L50 18l40 34"/><path d="M22 44v48h56V44"/><path d="M42 92V68h16v24"/><path d="M28 54h10v10H28zM62 54h10v10H62z"/><path d="M68 30V16h8v20"/>',
  manitou: '<path d="M12 74h44V54H40l-6-12H20v12h-8z"/><path d="M48 60l34-30"/><path d="M52 66l34-30"/><path d="M84 26v16h12"/><circle cx="24" cy="80" r="9"/><circle cx="50" cy="80" r="9"/>',
  alet: '<path d="M22 84l36-36"/><path d="M58 48a14 14 0 1 0 12-22l-8 8-6-2-2-6 8-8a14 14 0 0 0-4 30"/><path d="M34 22l22 22M28 28l12-12 10 10-12 12z"/><path d="M50 44l30 30-6 6-30-30"/>',
};
const PILLAR_ICON: Record<string, string> = { teslim: 'ev', celik: 'bina', manitou: 'manitou', kampanya: 'manitou', ev: 'ev', bina: 'bina', tamirat: 'alet', villa: 'ev', donusum: 'bina', tadilat: 'alet', santiye: 'vinc', ipucu: 'baret' };
export function iconFor(badge: string) {
  const t = badge.toLocaleLowerCase('tr-TR');
  if (/manitou|kiralık|kiralama|kampanya/.test(t)) return 'manitou';
  if (/villa|müstakil|ev\b/.test(t)) return 'ev';
  if (/dönüşüm|kat|bina/.test(t)) return 'bina';
  if (/tadilat|tamir|cephe|çatı/.test(t)) return 'alet';
  if (/şantiye|temel|kaba/.test(t)) return 'vinc';
  return 'baret';
}
function icon(name: string, x0: number, y0: number, size: number, color: string, width = 6, opacity = 1) {
  const k = size / 100;
  return `<g transform="translate(${x0} ${y0}) scale(${k})" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">${ICONS[name] ?? ICONS.baret}</g>`;
}
void PILLAR_ICON;

type BannerOpts = { w: number; h: number; brand: { phone?: string | null; website?: string | null } | null; brandName: string; badge: string; headline: string; subtitle: string; cta: string; photo?: Uint8Array | null; photoMime?: string; icon?: string };

// ── EMBAY YAPI kimliği (Instagram @embayyapi): lacivert + kraliyet mavisi + bulutlu gökyüzü, beyaz çizgi ev logosu,
//    kalın büyük harfli başlık, altta lacivert şerit (iki telefon + web). Eski tarzın modern hali: amblemli etiket, ✓ hizmet çipleri.
const EMBAY = { navy: '#262A6B', navy2: '#1B1F52', royal: '#1E3FA0', sky: '#8FC6F2', skyLight: '#EAF4FD', white: '#FFFFFF' };
function embayLogo(cx: number, cy: number, r: number, color: string) {
  // Yuvarlak lacivert rozet içinde: iç içe iki çizgi ev + "EMBAY" + geniş aralıklı ince "YAPI" (Instagram logosunun sadeleştirilmiş hali)
  const k = r / 50; // rozet çapı 100 birim
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${EMBAY.navy}" stroke="${EMBAY.white}" stroke-width="${r * 0.05}"/>
<g transform="translate(${cx - 33 * k} ${cy - 40 * k}) scale(${k})" fill="none" stroke="${color}" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M6 44V26L24 12l18 14v18z"/><path d="M24 12l10-8 24 18v22H42"/><rect x="14" y="28" width="6" height="6"/><rect x="26" y="28" width="6" height="6"/><path d="M19 44v-6h10v6"/><rect x="47" y="26" width="5" height="5"/></g>
<text x="${cx}" y="${cy + 18 * k}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${15 * k}" fill="${color}" letter-spacing="${1.2 * k}">EMBAY</text>
<text x="${cx + 3 * k}" y="${cy + 33 * k}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="200" font-size="${13 * k}" fill="${color}" letter-spacing="${5 * k}">YAPI</text>`;
}
function renderEmbay(o: BannerOpts) {
  const { w, h } = o; const wide = w / h > 1.3; const tall = h / w > 1.5; const u = Math.min(w, h);
  const pad = Math.round(u * 0.07);
  const barH = Math.round(u * (wide ? 0.15 : 0.14));
  const phone = o.brand?.phone || '0531 436 29 04'; const site = o.brand?.website || 'www.embayyapi.com.tr';
  const ic = o.icon ?? iconFor(o.badge);
  const photoUri = o.photo ? `data:${o.photoMime || 'image/jpeg'};base64,${b64(o.photo)}` : null;
  const panelW = wide ? Math.round(w * 0.5) : w;
  const textW = panelW - pad * 2;
  const clean = (l: string) => l.replace(/^[\s·|,-]+|[\s·|,-]+$/g, '');
  const cta = (o.cta.replace(/[:\s]*(\+?90\s*)?0?\s*5\d{2}[\s\d]{7,}/g, '').trim().replace(/^WhatsApp:?$/i, 'WhatsApp’tan yazın')) || 'Ücretsiz keşif için arayın';
  const chips: Array<[string, string]> = [['bina', 'Hafif çelik'], ['vinc', 'Proje süreci'], ['ev', 'Müstakil ev']];
  const showChips = tall;
  // Yazı sığmazsa (fotoğraf en az %38 kalacak şekilde) başlık ve alt yazı %8'lik adımlarla küçültülür → taşma/üst üste binme olmaz
  let scale = 1; let hSize = 0, sSize = 0, badgeH = 0, chipH = 0, hLines: string[] = [], sLines: string[] = [], contentH = 0;
  for (let i = 0; i < 6; i++) {
    hSize = Math.round(u * (wide ? 0.06 : 0.07) * scale); sSize = Math.round(u * (wide ? 0.032 : 0.033) * Math.max(0.85, scale));
    hLines = wrap(o.headline.toLocaleUpperCase('tr-TR'), Math.floor(textW / (hSize * 0.68)), 3).map(clean);
    sLines = wrap(o.subtitle, Math.floor(textW / (sSize * 0.56)), 2);
    badgeH = Math.round(sSize * 1.7); chipH = Math.round(sSize * 1.8);
    contentH = Math.round(pad * 0.8 + u * 0.06) + badgeH + Math.round(hSize * 1.25) + (hLines.length - 1) * hSize * 1.2 + sSize * 2.1 + sLines.length * sSize * 1.45 + (cta ? sSize * 1.6 : 0) + (showChips ? chipH + pad * 0.6 : 0) + pad * 0.8;
    if (wide || h - barH - contentH >= h * 0.38) break;
    scale *= 0.92;
  }
  const badgeW = Math.round(o.badge.length * sSize * 0.78 + sSize * 2.8);
  const phH = wide ? h - barH : Math.round(Math.min(h * 0.62, Math.max(h * 0.38, h - barH - contentH)));
  // Fotoğraf çapraz kesimin altına kadar uzar; lacivert panel çaprazdan başlar
  const ph = wide ? { x: panelW - Math.round(u * 0.16), y: 0, w: w - panelW + Math.round(u * 0.16), h: phH } : { x: 0, y: 0, w, h: phH + Math.round(u * 0.07) };
  const panel = wide ? { x: 0, y: 0, w: panelW, h: h - barH } : { x: 0, y: phH, w, h: h - barH - phH };
  const badgeY = wide ? Math.round(pad + u * 0.2) : panel.y + Math.round(pad * 0.8 + u * 0.06);
  const textTop = badgeY + badgeH + Math.round(hSize * 1.25);
  const subTop = textTop + (hLines.length - 1) * hSize * 1.2 + sSize * 2.1;
  const ctaY = subTop + sLines.length * sSize * 1.45 + sSize * 0.35;
  const chipY = ctaY + sSize * 1.2;
  const cloud = (cx: number, cy: number, r: number, op: number) => `<g fill="#FFFFFF" opacity="${op}"><circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx + r * 0.9}" cy="${cy + r * 0.2}" r="${r * 0.8}"/><circle cx="${cx - r * 0.9}" cy="${cy + r * 0.25}" r="${r * 0.7}"/><rect x="${cx - r * 1.6}" y="${cy + r * 0.2}" width="${r * 3.3}" height="${r * 0.8}" rx="${r * 0.4}"/></g>`;
  const sky = `<rect x="${ph.x}" y="${ph.y}" width="${ph.w}" height="${ph.h}" fill="url(#sky)"/>${cloud(ph.x + ph.w * 0.62, ph.y + ph.h * 0.2, u * 0.06, 0.85)}${cloud(ph.x + ph.w * 0.85, ph.y + ph.h * 0.45, u * 0.04, 0.7)}${icon(ic, ph.x + ph.w / 2 - u * 0.16, ph.y + ph.h - u * 0.36, u * 0.32, EMBAY.navy, 3.5, 0.5)}`;
  const photo = photoUri ? `<image href="${photoUri}" x="${ph.x}" y="${ph.y}" width="${ph.w}" height="${ph.h}" preserveAspectRatio="xMidYMid slice"/><rect x="${ph.x}" y="${ph.y}" width="${ph.w}" height="${ph.h}" fill="url(#fade)"/>` : sky;
  const logoR = u * 0.085;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMBAY.sky}"/><stop offset="1" stop-color="${EMBAY.skyLight}"/></linearGradient>
<linearGradient id="pan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${EMBAY.royal}"/><stop offset="1" stop-color="${EMBAY.navy}"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMBAY.navy2}" stop-opacity="0.45"/><stop offset="0.28" stop-color="${EMBAY.navy2}" stop-opacity="0"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#pan)"/>
${photo}
${wide
  ? `<polygon points="0,0 ${panelW + u * 0.02},0 ${panelW - u * 0.08},${h} 0,${h}" fill="url(#pan)"/><line x1="${panelW + u * 0.02}" y1="0" x2="${panelW - u * 0.08}" y2="${h - barH}" stroke="${EMBAY.sky}" stroke-width="5"/>`
  : `<polygon points="0,${phH + u * 0.06} ${w},${phH - u * 0.05} ${w},${h} 0,${h}" fill="url(#pan)"/><line x1="0" y1="${phH + u * 0.06}" x2="${w}" y2="${phH - u * 0.05}" stroke="${EMBAY.sky}" stroke-width="5"/>`}
<g stroke="#FFFFFF" stroke-width="1" opacity="0.06">${Array.from({ length: Math.ceil(w / (u * 0.05)) }, (_, i) => `<line x1="${i * u * 0.05}" y1="${wide ? 0 : phH + u * 0.06}" x2="${i * u * 0.05}" y2="${h - barH}"/>`).join('')}${Array.from({ length: Math.ceil(h / (u * 0.05)) }, (_, i) => (wide || i * u * 0.05 > phH + u * 0.06) && i * u * 0.05 < h - barH ? `<line x1="0" y1="${i * u * 0.05}" x2="${wide ? panelW - u * 0.08 : w}" y2="${i * u * 0.05}"/>` : '').join('')}</g>
${icon(ic, panel.x + panel.w - pad - u * 0.22, panel.y + (wide ? panel.h - u * 0.3 : pad * 0.6), u * 0.22, EMBAY.sky, 4, 0.14)}
${embayLogo(pad + logoR, pad + logoR, logoR, EMBAY.white)}
<rect x="${pad}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${EMBAY.sky}"/>
${icon(ic, pad + sSize * 0.55, badgeY + sSize * 0.25, sSize * 1.2, EMBAY.navy, 9)}
<text x="${pad + sSize * 2.0}" y="${badgeY + sSize * 1.2}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${sSize}" fill="${EMBAY.navy}">${x(o.badge)}</text>
${hLines.map((l, i) => `<text x="${pad}" y="${textTop + i * hSize * 1.2}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${hSize}" fill="${EMBAY.white}">${x(l)}</text>`).join('')}
${sLines.map((l, i) => `<text x="${pad}" y="${subTop + i * sSize * 1.45}" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${sSize}" fill="#DCE9FB">${x(l)}</text>`).join('')}
${cta ? `<text x="${pad}" y="${ctaY + sSize * 0.9}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${Math.round(sSize * 0.95)}" fill="${EMBAY.sky}">→ ${x(cta)}</text>` : ''}
${showChips ? chips.map((c, i) => { const cw = Math.round((w - pad * 2 - u * 0.04) / 3); const cx0 = pad + i * (cw + u * 0.02); return `<rect x="${cx0}" y="${chipY + pad * 0.3}" width="${cw}" height="${chipH}" rx="${chipH / 2}" fill="none" stroke="${EMBAY.sky}" stroke-width="2" opacity="0.8"/>${icon(c[0], cx0 + sSize * 0.5, chipY + pad * 0.3 + sSize * 0.35, sSize * 1.1, EMBAY.sky, 8)}<text x="${cx0 + sSize * 1.85}" y="${chipY + pad * 0.3 + chipH * 0.66}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${Math.round(sSize * 0.7)}" fill="${EMBAY.white}">${x(c[1])}</text>`; }).join('') : ''}
<rect x="0" y="${h - barH}" width="${w}" height="${barH}" fill="${EMBAY.navy2}"/>
<rect x="0" y="${h - barH}" width="${w}" height="3" fill="${EMBAY.sky}" opacity="0.7"/>
<text x="${pad}" y="${h - barH / 2 + sSize * 0.42}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${Math.round(sSize * 1.15)}" fill="${EMBAY.white}">☎ ${x(phone)}</text>
<text x="${w - pad}" y="${h - barH / 2 + sSize * 0.3}" text-anchor="end" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${Math.round(sSize * 0.72)}" fill="#C9DBF5" letter-spacing="1.5">${x(site)}</text>
</svg>`;
}


// ── LÜKS KURUMSAL TASARIM (varsayılan): lacivert + altın, serif başlık, fotoğraf üstünde sol kolon metin,
//    sağ üstte asılı rozet, krem slogan bandı, 4 hizmet ikonu, altta iletişim şeridi (yönetici örneği: kamelya afişi tarzı).
const LUX = { navy: '#0F1A33', navy2: '#0A1226', gold: '#C9A45C', gold2: '#E2C98F', cream: '#EFE9DD', white: '#FFFFFF', mist: '#C8D1E3' };
function luxLogo(x0: number, y0: number, s: number, color: string) {
  // çizgi ev amblemi + EMBAY (serif, geniş aralık) + — YAPI —
  const k = s / 60;
  return `<g transform="translate(${x0} ${y0}) scale(${k})" fill="none" stroke="${color}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round">
<path d="M6 44V26L24 12l18 14v18z"/><path d="M24 12l10-8 24 18v22H42"/><rect x="14" y="28" width="6" height="6"/><rect x="26" y="28" width="6" height="6"/><path d="M19 44v-6h10v6"/><rect x="47" y="26" width="5" height="5"/></g>
<text x="${x0 + s * 1.12}" y="${y0 + s * 0.52}" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${s * 0.5}" fill="${color}" letter-spacing="${s * 0.09}">EMBAY</text>
<line x1="${x0 + s * 1.14}" y1="${y0 + s * 0.7}" x2="${x0 + s * 1.5}" y2="${y0 + s * 0.7}" stroke="${color}" stroke-width="${Math.max(1, s * 0.02)}"/>
<text x="${x0 + s * 1.62}" y="${y0 + s * 0.78}" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${s * 0.2}" fill="${color}" letter-spacing="${s * 0.1}">YAPI</text>
<line x1="${x0 + s * 2.62}" y1="${y0 + s * 0.7}" x2="${x0 + s * 2.98}" y2="${y0 + s * 0.7}" stroke="${color}" stroke-width="${Math.max(1, s * 0.02)}"/>`;
}
function renderLuxury(o: BannerOpts) {
  const { w, h } = o; const wide = w / h > 1.3; const tall = h / w > 1.5; const u = Math.min(w, h);
  const pad = Math.round(u * 0.06);
  const barH = Math.round(u * (wide ? 0.13 : 0.12));
  const svcH = Math.round(u * (wide ? 0.2 : 0.2));
  const bandH = Math.round(u * 0.06);
  const photoH = wide ? h - barH : Math.round(h * (tall ? 0.56 : 0.6));
  const photoX = wide ? Math.round(w * 0.42) : 0;
  const bandY = wide ? h - barH - bandH : photoH;
  const svcY = wide ? h - barH - bandH - svcH : bandY + bandH;
  const phone = o.brand?.phone || '0531 436 29 04';
  const site = (o.brand?.website && !/vercel\.app/.test(o.brand.website) ? o.brand.website : 'www.embayyapi.com.tr').replace(/^https?:\/\//, '');
  // başlık: serif, büyük harf, sol kolon; son satır altın
  const colW = wide ? w * 0.4 : w * (tall ? 0.62 : 0.56);
  const hSize = Math.round(u * (wide ? 0.066 : tall ? 0.064 : 0.058));
  const hLines = wrap(o.headline.toLocaleUpperCase('tr-TR'), Math.floor(colW / (hSize * 0.66)), wide ? 3 : 4);
  const sSize = Math.round(u * 0.027);
  const sLines = wrap(o.subtitle.toLocaleUpperCase('tr-TR'), Math.floor(colW / (sSize * 0.66)), 3);
  const logoS = Math.round(u * 0.085);
  const hTop = pad + logoS + Math.round(u * (tall ? 0.2 : 0.1));
  const photo = o.photo ? `<image href="data:${o.photoMime || 'image/jpeg'};base64,${b64(o.photo)}" x="${photoX}" y="0" width="${w - photoX}" height="${photoH}" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="${photoX}" y="0" width="${w - photoX}" height="${photoH}" fill="url(#noph)"/>${icon(iconFor(o.badge), photoX + (w - photoX) * 0.52, photoH * 0.3, u * 0.36, LUX.gold, 3, 0.35)}`;
  // sağ üst asılı rozet (altın çerçeveli lacivert, sivri uçlu)
  const rw = Math.round(u * 0.19); const rh = Math.round(u * 0.26); const rx = w - pad - rw;
  const badgeLines = wrap(o.badge.toLocaleUpperCase('tr-TR').replace(/\s*&\s*/g, ' & '), 12, 3);
  const ribbon = `<path d="M${rx} 0 H${rx + rw} V${rh} L${rx + rw / 2} ${rh + rw * 0.28} L${rx} ${rh} Z" fill="${LUX.navy}" fill-opacity="0.92" stroke="${LUX.gold}" stroke-width="${Math.max(2, u * 0.003)}"/>
${icon(iconFor(o.badge), rx + rw * 0.28, rh * 0.1, rw * 0.44, LUX.gold, 5)}
${badgeLines.map((l, i) => `<text x="${rx + rw / 2}" y="${rh * 0.62 + i * u * 0.03}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${Math.round(u * 0.021)}" fill="${LUX.white}" letter-spacing="${u * 0.001}">${x(l)}</text>`).join('')}`;
  const hY = (i: number) => hTop + i * hSize * 1.18;
  const ruleY = hY(hLines.length - 1) + hSize * 0.75;
  const svcs: Array<[string, string]> = [['ev', 'EV & VİLLA'], ['bina', 'BİNA YAPIMI'], ['alet', 'TADİLAT'], ['baret', 'TAMİRAT']];
  const svcW = (wide ? photoX - pad : w - pad * 2) / 4;
  const svcX0 = pad;
  const svcRow = svcs.map(([ic, label], i) => {
    const cx = svcX0 + svcW * i + svcW / 2; const is = Math.min(svcH * 0.4, svcW * 0.42);
    const lf = Math.min(Math.round(u * 0.022), Math.floor(svcW / (11 * 0.78)));
    return `${i ? `<line x1="${svcX0 + svcW * i}" y1="${svcY + svcH * 0.22}" x2="${svcX0 + svcW * i}" y2="${svcY + svcH * 0.82}" stroke="${LUX.gold}" stroke-opacity="0.35" stroke-width="1.5"/>` : ''}
${icon(ic, cx - is / 2, svcY + svcH * 0.14, is, LUX.gold, 5)}
<text x="${cx}" y="${svcY + svcH * 0.8}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${lf}" fill="${LUX.white}" letter-spacing="${u * 0.0015}">${x(label)}</text>`;
  }).join('');
  const bandText = 'KALİTE  |  GÜVEN  |  ESTETİK  |  DAYANIKLILIK';
  const bandW = wide ? photoX : w;
  const bs = Math.min(Math.round(u * 0.025), Math.floor((bandW - pad * 2 - u * 0.1) / (bandText.length * 0.66)));
  const tw = bandText.length * bs * 0.66;
  const band = `<rect x="0" y="${bandY}" width="${bandW}" height="${bandH}" fill="${LUX.cream}"/>
<line x1="${pad}" y1="${bandY + bandH / 2}" x2="${bandW / 2 - tw / 2 - u * 0.02}" y2="${bandY + bandH / 2}" stroke="${LUX.gold}" stroke-width="1.5"/>
<line x1="${bandW / 2 + tw / 2 + u * 0.02}" y1="${bandY + bandH / 2}" x2="${bandW - pad}" y2="${bandY + bandH / 2}" stroke="${LUX.gold}" stroke-width="1.5"/>
<text x="${bandW / 2}" y="${bandY + bandH / 2 + bs * 0.36}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${bs}" fill="#A8843F">${bandText}</text>`;
  const by = h - barH; const fs = Math.round(u * 0.027);
  const bar = `<rect x="0" y="${by}" width="${w}" height="${barH}" fill="${LUX.navy2}"/><rect x="0" y="${by}" width="${w}" height="${Math.max(2, u * 0.003)}" fill="${LUX.gold}"/>
${luxLogo(pad, by + barH * 0.2, barH * 0.5, LUX.gold)}
<text x="${w * (wide ? 0.4 : 0.47)}" y="${by + barH / 2 + fs * 0.36}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${fs}" fill="${LUX.white}"><tspan fill="${LUX.gold}">☎ </tspan>${x(phone)}</text>
<text x="${w * (wide ? 0.62 : 0.76)}" y="${by + barH / 2 + fs * 0.36}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${Math.round(fs * 0.85)}" fill="${LUX.mist}">${x(site)}</text>
${wide ? `<text x="${w - pad}" y="${by + barH / 2 + fs * 0.4}" text-anchor="end" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${Math.round(fs * 1.05)}" fill="${LUX.gold2}">İşimiz güvencenizdir.</text>` : ''}`;
  const exTop = svcY + svcH; const exH = by - exTop;
  const ctaTxt = (o.cta.replace(/[:\s]*(\+?90\s*)?0?\s*5\d{2}[\s\d]{7,}/g, '').replace(/^WhatsApp$/i, '').trim() || 'Ücretsiz keşif için arayın').toLocaleUpperCase('tr-TR');
  const cf = Math.round(u * 0.028); const cw = Math.min(w - pad * 2, ctaTxt.length * cf * 0.72 + cf * 3);
  const pillY = exH > u * 0.2 ? exTop + exH * 0.18 : exTop + (exH - cf * 2.4) / 2 - u * 0.01;
  const filler = !wide && exH > u * 0.08 ? `<rect x="${w / 2 - cw / 2}" y="${pillY}" width="${cw}" height="${cf * 2.4}" rx="${cf * 1.2}" fill="${LUX.gold}"/>
<text x="${w / 2}" y="${pillY + cf * 1.56}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${cf}" fill="${LUX.navy2}" letter-spacing="${u * 0.0015}">${x(ctaTxt)}</text>
${exH > u * 0.2 ? `<text x="${w / 2}" y="${exTop + exH * 0.18 + cf * 2.4 + u * 0.075}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${Math.round(u * 0.036)}" fill="${LUX.gold2}">İşimiz güvencenizdir.</text>` : ''}` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="lx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${LUX.navy}" stop-opacity="0.96"/><stop offset="${wide ? 0.25 : 0.42}" stop-color="${LUX.navy}" stop-opacity="0.8"/><stop offset="${wide ? 0.5 : 0.75}" stop-color="${LUX.navy}" stop-opacity="0.1"/><stop offset="1" stop-color="${LUX.navy}" stop-opacity="0"/></linearGradient>
<linearGradient id="lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LUX.navy}" stop-opacity="0.55"/><stop offset="0.25" stop-color="${LUX.navy}" stop-opacity="0"/><stop offset="0.8" stop-color="${LUX.navy}" stop-opacity="0"/><stop offset="1" stop-color="${LUX.navy}" stop-opacity="0.85"/></linearGradient>
<linearGradient id="noph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B2B55"/><stop offset="1" stop-color="${LUX.navy}"/></linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="${LUX.navy}"/>
${photo}
<rect x="${photoX}" y="0" width="${w - photoX}" height="${photoH}" fill="url(#lb)"/>
${wide ? '' : `<rect x="0" y="0" width="${w}" height="${photoH}" fill="url(#lx)"/>`}
${luxLogo(pad, pad, logoS, LUX.gold)}
${ribbon}
${hLines.map((l, i) => `<text x="${pad}" y="${hY(i)}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${hSize}" fill="${i === hLines.length - 1 && hLines.length > 1 ? LUX.gold : LUX.white}">${x(l)}</text>`).join('')}
<rect x="${pad}" y="${ruleY}" width="${u * 0.12}" height="${Math.max(2, u * 0.004)}" fill="${LUX.gold}"/>
${sLines.map((l, i) => `<text x="${pad}" y="${ruleY + sSize * 2.2 + i * sSize * 1.5}" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${sSize}" fill="${LUX.white}" fill-opacity="0.92" letter-spacing="${u * 0.001}">${x(l)}</text>`).join('')}
${band}
${svcRow}
${filler}
${bar}
</svg>`;
}


// ── Yapay zekâ görseli (Google Gemini görsel modeli). Temsili konsept görsel üretir; gönderide "temsilidir" notu düşülür.
const AI_SCENES: Record<string, string[]> = {
  question_hook: ['light gauge steel home planning desk with house sketches and site plan, no text, natural daylight', 'homeowner reviewing a small light steel house model and plans, candid hands only'],
  myth_fact: ['clean close-up of light gauge steel wall framing detail, bright neutral workshop, no people faces', 'light steel wall panel beside a simple house plan, editorial architecture photography'],
  mini_checklist: ['three blank note cards beside a light steel house model, calm blue palette, no legible text', 'architectural plan, pencil and small light steel home model on a bright desk'],
  detail_closeup: ['close-up of light gauge steel wall panel and connection detail, realistic galvanized profiles, no heavy beams', 'light steel framing detail in a residential wall, soft natural light, authentic construction photography'],
  project_journey: ['light gauge steel detached home project at an intermediate stage, residential scale, realistic site photo style', 'light steel wall panels being assembled for a small home, daylight, no crane or heavy beams'],
  homeowner_view: ['quiet view from a residential plot toward a modest light steel home concept, realistic architecture', 'homeowner hands pointing at a small house plan on a table, no text, warm daylight'],
  short_explainer: ['simple light steel wall cross section model on a white workbench, clear layers without labels', 'light gauge steel residential panel detail, neutral background, accurate modest scale'],
  process_steps: ['three-stage light steel home planning sequence represented by simple sketches, no text, editorial style', 'architectural plan and light steel wall-panel sample arranged as a project discussion scene'],
  visual_story: ['authentic light steel residential project detail with natural site light, documentary photography, no dramatic effects', 'light steel home wall-panel detail framed naturally in a real-looking residential worksite'],
  choice_guide: ['light steel home plan, plot outline and pencil, homeowner planning scene, no readable text', 'residential light steel model on a desk with a site sketch, bright editorial photography'],
  comment_prompt: ['light steel home model with a blank speech bubble card, no text, airy composition', 'homeowner looking at a small light steel home model from above, candid planning scene'],
  quiet_asmr: ['calm close-up of hands fitting a light steel panel detail, documentary natural light, no faces', 'quiet light steel residential site detail in soft morning light, authentic and understated'],
  materials: ['light steel wall sample with clearly separated layers on a clean table, no labels or text', 'residential light steel wall section sample with insulation layer visible, realistic materials'],
};
function aiPrompt(pillar: string, di: number) {
  const list = AI_SCENES[pillar] ?? AI_SCENES.ev;
  return `${list[di % list.length]}, photorealistic, high detail, professional real estate photography, 35mm, no text, no watermark, no logo, no people faces`;
}
export let aiImageLastError = '';
export async function aiImage(prompt: string, w: number, h: number, _seed: number): Promise<Uint8Array | null> {
  // Google Gemini görsel modeli (panelde kayıtlı Gemini anahtarı; Google AI Studio'da faturalandırma açık olmalı).
  // Başarısızsa null → banner gerçek fotoğrafımızla çizilir (filigranlı / düşük kaliteli ücretsiz servis KULLANILMAZ).
  const key = await getAiKey('gemini');
  if (!key) { aiImageLastError = 'Gemini anahtarı yok'; return null; }
  const r0 = w / h; const ratios: Array<[string, number]> = [['1:1', 1], ['4:5', 0.8], ['9:16', 0.5625], ['16:9', 1.778], ['3:4', 0.75], ['4:3', 1.333]];
  const aspectRatio = ratios.reduce((best, cur) => (Math.abs(cur[1] - r0) < Math.abs(best[1] - r0) ? cur : best))[0];
  for (const model of ['gemini-3.1-flash-image', 'gemini-2.5-flash-image']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(90_000),
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } } }),
      });
      if (!r.ok) { aiImageLastError = `${model}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`; continue; }
      const j = await r.json();
      // deno-lint-ignore no-explicit-any
      const part = (j?.candidates?.[0]?.content?.parts ?? []).find((p: any) => p?.inlineData?.data);
      if (!part) { aiImageLastError = `${model}: görsel dönmedi (${j?.candidates?.[0]?.finishReason ?? j?.promptFeedback?.blockReason ?? '?'})`; continue; }
      const bin = atob(part.inlineData.data); const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      if (out.length > 20_000) return out;
    } catch (e) { aiImageLastError = `${model}: ${(e as Error).message}`; /* sonraki model */ }
  }
  return null;
}

// ── İKRANUR TARZI (varsayılan, 06.10): gökyüzü mavisi degrade, ortada beyaz logo, iki ağırlıklı başlık
//    (ilk satır ince 300, ikinci satır kalın 800 — "Teslim Ettiğimiz / Villa Projemiz" gibi), yuvarlak beyaz rozet,
//    "BİLGİ & TEKLİF" + telefon, alt yarıda gökyüzüne yumuşak geçen fotoğraf, beyaz hap şeklinde CTA. Yazı tipi: Montserrat.
const IK = { top: '#16428F', mid: '#2E6CC4', bot: '#78B2E8', navy: '#182A68', white: '#FFFFFF', soft: '#E1ECFA' };
function splitHeadline(t: string): [string, string] {
  const words = t.trim().split(/\s+/);
  if (words.length < 3) return ['', words.join(' ')];
  const cut = Math.max(1, Math.round(words.length * 0.45));
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}
function ikLogo(cx: number, y0: number, s: number) {
  // beyaz çizgi ev amblemi + EMBAY (kalın) + geniş aralıklı ince YAPI, ortalı
  const k = s / 60;
  return `<g transform="translate(${cx - 30 * k} ${y0}) scale(${k})" fill="none" stroke="${IK.white}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round">
<path d="M6 44V26L24 12l18 14v18z"/><path d="M24 12l10-8 24 18v22H42"/><rect x="14" y="28" width="6" height="6"/><rect x="26" y="28" width="6" height="6"/><path d="M19 44v-6h10v6"/><rect x="47" y="26" width="5" height="5"/></g>
<text x="${cx}" y="${y0 + s * 1.12}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${s * 0.36}" fill="${IK.white}" letter-spacing="${s * 0.03}">EMBAY</text>
<text x="${cx + s * 0.06}" y="${y0 + s * 1.38}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${s * 0.17}" fill="${IK.white}" letter-spacing="${s * 0.12}">YAPI</text>`;
}
function ikBadge(cx: number, cy: number, r: number, lines: string[]) {
  const longest = Math.max(...lines.slice(0, 2).map((l) => l.length), 1);
  const f1 = Math.min(r * 0.27, (r * 1.6) / (longest * 0.62)), f2 = Math.min(r * 0.36, (r * 1.62) / (longest * 0.7));   // uzun kelime daireden taşmasın
  return `<circle cx="${cx}" cy="${cy}" r="${r * 1.07}" fill="${IK.white}" fill-opacity="0.35"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${IK.white}"/>
${lines.slice(0, 2).map((l, i) => `<text x="${cx}" y="${cy + (lines.length > 1 ? (i === 0 ? -r * 0.06 : r * 0.36) : r * 0.13)}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="${i === 0 && lines.length > 1 ? 500 : 800}" font-size="${i === 0 && lines.length > 1 ? f1 : f2}" fill="${IK.navy}">${x(l)}</text>`).join('')}`;
}
export function renderIkranur(o: BannerOpts) {
  const { w, h } = o; const wide = w / h > 1.3; const u = Math.min(w, h);
  const phone = o.brand?.phone || '0531 436 29 04';
  const [l1, l2] = splitHeadline(o.headline);
  const textW = wide ? w * 0.5 : w;          // yatayda metin sol yarıda, fotoğraf sağ yarıda
  const cx = textW / 2;
  const pad = Math.round(u * 0.06);
  const fit = (t: string, size: number, k: number) => Math.min(size, Math.floor((textW - pad * 2) / Math.max(1, t.length * k)));
  const s1 = fit(l1, Math.round(u * 0.058), 0.56);
  const s2 = fit(l2, Math.round(u * 0.084), 0.66);
  const l2Lines = s2 < u * 0.06 ? wrap(l2, Math.floor((textW - pad * 2) / (u * 0.066 * 0.64)), 2) : [l2];
  const s2b = l2Lines.length > 1 ? Math.round(u * 0.066) : s2;
  const logoS = Math.round(u * (wide ? 0.11 : 0.1));
  const logoY = Math.round(u * 0.05);
  const y1 = logoY + logoS * 1.38 + u * (wide ? 0.09 : 0.1);
  const y2 = y1 + (l1 ? s1 * 0.4 + s2b * 1.05 : 0);
  const ySub = y2 + (l2Lines.length - 1) * s2b * 1.1 + u * 0.06;
  const subS = Math.round(u * 0.03);
  const sub = o.subtitle ? wrap(o.subtitle, Math.floor((textW - pad * 2) / (subS * 0.58)), 2) : [];
  const yRow = ySub + sub.length * subS * 1.35 + u * 0.08;
  const bR = Math.round(u * 0.075);
  const badgeLines = wrap(o.badge.toLocaleUpperCase('tr-TR'), 10, 2);
  const ctaTxt = (o.cta.replace(/[:\s]*(\+?90\s*)?0?\s*5\d{2}[\s\d]{7,}/g, '').replace(/^WhatsApp$/i, '').trim() || 'Bize DM atın');
  const photoTop = wide ? 0 : Math.min(h * 0.62, yRow + bR + u * 0.04);
  const photoX = wide ? textW : 0; const photoW = w - photoX; const photoH = h - photoTop;
  const fade = wide ? 0 : Math.round(u * 0.22);
  const photo = o.photo ? `<image href="data:${o.photoMime || 'image/jpeg'};base64,${b64(o.photo)}" x="${photoX}" y="${photoTop}" width="${photoW}" height="${photoH}" preserveAspectRatio="xMidYMid slice"/>` : '';
  const cf = Math.round(u * 0.032); const cw = Math.min(textW - pad * 2, ctaTxt.length * cf * 0.62 + cf * 2.6); const chh = cf * 2.3;
  const ctaY = wide ? yRow + bR + u * 0.07 : h - chh - u * 0.075;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${IK.top}"/><stop offset="0.55" stop-color="${IK.mid}"/><stop offset="1" stop-color="${IK.bot}"/></linearGradient>
<linearGradient id="fd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${IK.mid}" stop-opacity="1"/><stop offset="1" stop-color="${IK.mid}" stop-opacity="0"/></linearGradient>
<linearGradient id="bt" x1="0" y1="0" x2="0" y2="1"><stop offset="0.6" stop-color="#0B1E4A" stop-opacity="0"/><stop offset="1" stop-color="#0B1E4A" stop-opacity="0.45"/></linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#sky)"/>
${photo}
${!wide && o.photo ? `<rect x="0" y="${photoTop - 1}" width="${w}" height="${fade}" fill="url(#fd)"/><rect x="0" y="${photoTop}" width="${w}" height="${photoH}" fill="url(#bt)"/>` : ''}
${ikLogo(cx, logoY, logoS)}
${l1 ? `<text x="${cx}" y="${y1}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${s1}" fill="${IK.white}">${x(l1)}</text>` : ''}
${l2Lines.map((l, i) => `<text x="${cx}" y="${y2 + i * s2b * 1.1}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="800" font-size="${s2b}" fill="${IK.white}">${x(l)}</text>`).join('')}
${sub.map((l, i) => `<text x="${cx}" y="${ySub + i * subS * 1.35}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="600" font-size="${subS}" fill="${IK.white}">${x(l)}</text>`).join('')}
${ikBadge(pad + bR * 1.1, yRow, bR, badgeLines)}
<text x="${cx}" y="${yRow - u * 0.012}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="600" font-size="${Math.round(u * 0.022)}" fill="${IK.soft}" letter-spacing="${u * 0.002}">BİLGİ &amp; TEKLİF</text>
<text x="${cx}" y="${yRow + u * 0.04}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="800" font-size="${Math.round(u * 0.045)}" fill="${IK.white}">${x(phone)}</text>
${icon(iconFor(o.badge), textW - pad - bR * 2.1, yRow - bR, bR * 2, IK.white, 5, 0.9)}
<rect x="${cx - cw / 2}" y="${ctaY}" width="${cw}" height="${chh}" rx="${chh / 2}" fill="${IK.white}"/>
<text x="${cx}" y="${ctaY + chh * 0.66}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${cf}" fill="${IK.navy}">${x(ctaTxt)}</text>
<text x="${wide ? cx : w / 2}" y="${h - u * 0.028}" text-anchor="middle" font-family="Montserrat, DejaVu Sans" font-weight="500" font-size="${Math.round(u * 0.022)}" fill="${IK.white}" fill-opacity="0.92">@embayyapi</text>
</svg>`;
}

const LEGACY_SAHIN_DESIGN = false as boolean;
const LUXURY_DESIGN = true as boolean; // lacivert+altın lüks tasarım (false → önceki mavi Embay tasarımı)
const IKRANUR_DESIGN = true as boolean; // 06.10: İkranur tarzı gökyüzü mavisi + ince/kalın Montserrat (varsayılan)
export async function renderBanner(o: BannerOpts) {
  await ensureRenderer();
  // Tüm banner'lar Embay Yapı kimliğiyle (Manitou kiralama da Embay çatısı altında; eski sarı Şahin Manitou tasarımı yedekte duruyor)
  if (!LEGACY_SAHIN_DESIGN) {
    const r = new Resvg(IKRANUR_DESIGN ? renderIkranur(o) : LUXURY_DESIGN ? renderLuxury(o) : renderEmbay(o), { font: { fontBuffers: fonts!, defaultFontFamily: 'Montserrat' }, fitTo: { mode: 'original' } });
    const img = r.render();
    const out = jpeg.encode({ data: img.pixels, width: img.width, height: img.height }, 88).data;
    img.free?.(); r.free?.();
    return new Uint8Array(out);
  }
  const p = o.brandName === 'Şahin Manitou' ? { bg1: '#1F2933', bg2: '#111827', acc: '#F5B301', txt: '#FFFFFF' } : { bg1: '#115A31', bg2: '#0B3D22', acc: '#F5B301', txt: '#FFFFFF' };
  const { w, h } = o; const wide = w / h > 1.3; const u = Math.min(w, h);
  const pad = Math.round(u * 0.075); const logo = Math.round(u * 0.085);
  const hSize = Math.round(u * (wide ? 0.1 : 0.085)); const sSize = Math.round(u * (wide ? 0.042 : 0.036));
  const hLines = wrap(o.headline.toLocaleUpperCase('tr-TR'), Math.floor((w - pad * 2) / (hSize * 0.64)), wide ? 2 : 3);
  const sLines = wrap(o.subtitle, Math.floor((w - pad * 2) / (sSize * 0.56)), wide ? 2 : 3);
  const barH = Math.round(u * 0.13);
  const photoH = o.photo ? (wide ? h : Math.round(h * 0.42)) : 0;
  const photo = o.photo ? `<image href="data:${o.photoMime || 'image/jpeg'};base64,${b64(o.photo)}" x="0" y="0" width="${w}" height="${photoH}" preserveAspectRatio="xMidYMid slice"/><rect x="0" y="0" width="${w}" height="${photoH}" fill="url(#fade)"/><rect x="0" y="0" width="${w}" height="${Math.round(pad * 2 + logo)}" fill="url(#top)"/>` : '';
  const tall = h / w > 1.5;
  const badgeY = o.photo && !wide ? photoH - Math.round(sSize * 2.2) : pad + logo + Math.round(u * 0.07) + (tall ? Math.round(h * 0.16) : 0);
  const textTop = badgeY + Math.round(sSize * 1.7) + Math.round(hSize * 1.05);
  const phone = o.brand?.phone || '0531 436 29 04'; const site = o.brand?.website || 'sahin-manitou-kiralama.vercel.app';
  const ctaText = o.cta.replace(/[:\s]*(\+?90\s*)?0?\s*5\d{2}[\s\d]{7,}/g, '').replace(/^WhatsApp$/i, 'WhatsApp’tan yazın').trim() || 'Hemen arayın';
  const ctaSize = Math.round(sSize * 1.05); const phoneW = (phone.length + 2) * ctaSize * 0.64;
  const ctaMax = Math.floor((w - pad * 2 - phoneW - pad * 0.6) / (ctaSize * 0.56));
  // CTA sığmıyorsa önce yazıyı küçült (en fazla %25), yine sığmazsa kelime sınırından kısalt
  const ctaFont = ctaText.length > ctaMax ? Math.max(Math.round(ctaSize * 0.75), Math.floor((w - pad * 2 - phoneW - pad * 0.6) / (ctaText.length * 0.56))) : ctaSize;
  const ctaMax2 = Math.floor((w - pad * 2 - phoneW - pad * 0.6) / (ctaFont * 0.56));
  const cta = ctaText.length > ctaMax2 ? ctaText.slice(0, Math.max(0, ctaMax2 - 1)).replace(/\s+\S*$/, '') + '…' : ctaText;
  const longBrand = (o.brandName as string) === 'İkisi';
  const chips: Array<[string, string]> = [['baret', 'Ücretsiz keşif'], ['vinc', 'Hızlı teklif'], ['bina', 'Güvenli iş']];
  const ic = o.icon ?? iconFor(o.badge);
  const chipsY = h - barH - Math.round(u * 0.1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/></linearGradient>
<linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg2}" stop-opacity="0.85"/><stop offset="1" stop-color="${p.bg2}" stop-opacity="0"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.35" stop-color="${p.bg2}" stop-opacity="${wide ? 0.55 : 0}"/><stop offset="1" stop-color="${p.bg2}" stop-opacity="0.95"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<circle cx="${w * 0.95}" cy="${h * 0.05}" r="${u * 0.35}" fill="${p.acc}" opacity="0.09"/><circle cx="${w * 0.03}" cy="${h * 0.97}" r="${u * 0.28}" fill="#3DAA5C" opacity="0.10"/>
${photo}
<rect x="${pad}" y="${pad}" width="${logo}" height="${logo}" rx="${Math.round(logo * 0.22)}" fill="${p.acc}"/>
${icon(o.brandName === 'Şahin Manitou' ? 'manitou' : 'baret', pad + logo * 0.12, pad + logo * 0.1, logo * 0.76, p.bg2, 9)}
<text x="${pad + logo + u * 0.025}" y="${pad + logo * (longBrand && !wide ? 0.48 : 0.66)}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${Math.round(u * 0.036)}" fill="${p.txt}">${x(longBrand ? 'Embay Yapı · Şahin Manitou' : o.brandName)}</text>
${longBrand && !wide ? `<text x="${pad + logo + u * 0.025}" y="${pad + logo * 0.9}" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${Math.round(u * 0.024)}" fill="#CFE8D8">${x(site)}</text>` : `<text x="${w - pad}" y="${pad + logo * 0.66}" text-anchor="end" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${Math.round(u * 0.024)}" fill="#CFE8D8">${x(site)}</text>`}
${wide ? icon(ic, w - pad - u * 0.4, h - barH - u * 0.46, u * 0.4, p.acc, 4, 0.22) : o.photo ? '' : icon(ic, w - pad - u * 0.3, chipsY - u * 0.34, u * 0.3, p.acc, 4, 0.25)}
<rect x="${pad}" y="${badgeY}" width="${Math.round(o.badge.length * sSize * 0.78 + sSize * 2.8)}" height="${Math.round(sSize * 1.7)}" rx="${Math.round(sSize * 0.85)}" fill="${p.acc}"/>
${icon(ic, pad + sSize * 0.55, badgeY + sSize * 0.25, sSize * 1.2, p.bg2, 9)}
<text x="${pad + sSize * 2.0}" y="${badgeY + sSize * 1.2}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${sSize}" fill="${p.bg2}">${x(o.badge)}</text>
${hLines.map((l, i) => `<text x="${pad}" y="${textTop + i * hSize * 1.1}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${hSize}" fill="${p.txt}">${x(l)}</text>`).join('')}
${sLines.map((l, i) => `<text x="${pad}" y="${textTop + (hLines.length - 1) * hSize * 1.1 + sSize * 2.1 + i * sSize * 1.35}" font-family="Montserrat, DejaVu Sans" font-weight="300" font-size="${sSize}" fill="#E5F3EA">${x(l)}</text>`).join('')}
${wide ? '' : chips.map((c, i) => { const cw = Math.round((w - pad * 2 - u * 0.04) / 3); return `<rect x="${pad + i * (cw + u * 0.02)}" y="${chipsY}" width="${cw}" height="${Math.round(sSize * 1.9)}" rx="${Math.round(sSize * 0.95)}" fill="#FFFFFF" opacity="0.12"/>${icon(c[0], pad + i * (cw + u * 0.02) + sSize * 0.5, chipsY + sSize * 0.42, sSize * 1.05, p.acc, 9)}<text x="${pad + i * (cw + u * 0.02) + sSize * 1.85}" y="${chipsY + sSize * 1.24}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${Math.round(sSize * 0.76)}" fill="#FFFFFF">${x(c[1])}</text>`; }).join('')}
<rect x="0" y="${h - barH}" width="${w}" height="${barH}" fill="${p.acc}"/>
<text x="${pad}" y="${h - barH / 2 + ctaSize * 0.36}" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${ctaFont}" fill="${p.bg2}">${x(cta)}</text>
<text x="${w - pad}" y="${h - barH / 2 + ctaSize * 0.36}" text-anchor="end" font-family="Montserrat, DejaVu Sans" font-weight="700" font-size="${ctaSize}" fill="${p.bg2}">☎ ${x(phone)}</text>
</svg>`;
  const r = new Resvg(svg, { font: { fontBuffers: fonts!, defaultFontFamily: 'Montserrat' }, fitTo: { mode: 'original' } });
  // Instagram API yalnızca JPEG görsel kabul eder → banner JPEG olarak üretilir
  const img = r.render();
  const out = jpeg.encode({ data: img.pixels, width: img.width, height: img.height }, 88).data;
  img.free?.(); r.free?.();
  return new Uint8Array(out);
}

// ── Günlük üretim ────────────────────────────────────────────────────────────
function slotIso(day: string, hhmm: string) { return new Date(`${day}T${hhmm}:00+03:00`).toISOString(); }
function dayIndex(day: string) { return Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 86400000); }

// ── Etiket stratejisi: kısa, konu/marka/yer bakımından alakalı 3–5 etiket. ──
const LIGHT_STEEL_TAGS = ['#hafifçelik', '#hafifçelikev', '#hafifçelikyapı', '#hafifçelikevler', '#müstakilev', '#evyaptırmak', '#evprojesi', '#hafifçelikduvar', '#duvarpaneli', '#yalıtım', '#evsahibi', '#arsa', '#mimari', '#istanbul', '#çatalca', '#silivri', '#büyükçekmece', '#embayyapı', '#evhayali', '#projeplanlama', '#sahagünlüğü', '#reels'];
const STYLE_TAGS: Record<string, string[]> = {
  question_hook: ['#sorucevap', '#evsahibisoruyor'], myth_fact: ['#doğrubeklenen', '#yapıbilgisi'], mini_checklist: ['#kontrol listesi'.replace(' ', ''), '#projehazırlığı'],
  detail_closeup: ['#yapıdetayı', '#detayayakından'], project_journey: ['#projejurnali', '#projesüreci'], homeowner_view: ['#arsa', '#evplanı'],
  short_explainer: ['#kısabilgi', '#hafifçelikbilgi'], process_steps: ['#süreçadımları', '#planlama'], visual_story: ['#sahadangörüntü', '#gerçekproje'],
  choice_guide: ['#kararrehberi', '#evyaptırmak'], comment_prompt: ['#yorumlarda', '#sorunuzualalım'], quiet_asmr: ['#sahaasmr', '#hafifçelik'], materials: ['#duvarkatmanları', '#malzemebilgisi'],
};
function tagMix(p: Platform, pillar: string) {
  const max = p === 'x' ? 3 : 5;
  const topic = [...(STYLE_TAGS[pillar] ?? []), ...LIGHT_STEEL_TAGS].filter((t) => !isEmbayOffScope(t));
  const extra = p === 'youtube' ? ['#shorts'] : p === 'instagram' ? ['#reels'] : [];
  const plan = p === 'x' ? [topic[0], '#istanbul', '#embayyapı'] : [...topic.slice(0, 2), ...extra, '#hafifçelik', '#embayyapı'];
  const out: string[] = [];
  // Yalnız doğrulanmış konu/marka etiketlerini kullan; AI'ın genel/alakasız etiketlerini ekleme.
  for (const t of plan) {
    const k = t.toLocaleLowerCase('tr-TR');
    if (t.startsWith('#') && !isEmbayOffScope(t) && !out.some((o) => o.toLocaleLowerCase('tr-TR') === k)) out.push(t);
  }
  return out.slice(0, max);
}

function fallbackItems(p: Platform, pillars: typeof PILLARS[number][], di: number, used: Set<string>, V = 1): Item[] {
  // AI yoksa: style başına değişen, marka bilgisiyle uyumlu, uydurma içermeyen metinler.
  return pillars.map((pl, i) => {
    const headline = pickHeadline(pl.key, di + i, used); used.add(headline.toLocaleLowerCase('tr-TR'));
    const captions: Record<string, string> = {
      question_hook: 'Hafif çelik ev planlarken aklınıza ilk hangi soru geliyor? İhtiyacınızı ve arsanızla ilgili bilgileri netleştirerek görüşmeye başlayabilirsiniz.',
      myth_fact: 'Hafif çelik yapı hakkında duyduğunuz her bilgiyi kendi projenizin koşullarıyla birlikte değerlendirin. Merak ettiğiniz noktayı bize sorabilirsiniz.',
      mini_checklist: 'Görüşme öncesi üç başlığı not edin: kullanım amacı, arsa bilgileri ve proje kapsamı. Böylece ihtiyaçlarınızı daha net konuşabilirsiniz.',
      detail_closeup: 'Bir yapı sistemini değerlendirirken tek bir detaya değil, projenin bütününe bakmak gerekir. Hafif çelik ev planınız için sorularınızı birlikte netleştirelim.',
      project_journey: 'Her proje kendi ihtiyaçları ve koşullarıyla şekillenir. Hafif çelik ev düşünceniz varsa ilk adım beklentilerinizi ve kapsamı konuşmaktır.',
      homeowner_view: 'Arsanızda nasıl bir yaşam alanı hayal ediyorsunuz? Kullanım ihtiyacınızı tarif etmek, proje görüşmesinin iyi bir başlangıcı olabilir.',
      short_explainer: 'Hafif çelik ev planında sistem, kullanım amacı ve proje kapsamı birlikte değerlendirilir. Aklınızdaki soruyu bize iletin.',
      process_steps: 'İlk görüşmede ihtiyacınızı, arsa bilgilerinizi ve proje kapsamını netleştirin. Uygun sonraki adımlar bu başlıklar üzerinden konuşulur.',
      visual_story: 'Bu karede dikkatinizi çeken ilk detay ne? Hafif çelik ev projelerini gerçek görüntüler ve doğru bilgilerle konuşalım.',
      choice_guide: 'Karar vermeden önce arsanız, kullanım amacınız ve ihtiyaç listeniz üzerine düşünün. Sonra seçenekleri birlikte değerlendirebiliriz.',
      comment_prompt: 'Hafif çelik ev planlarken ilk hangi konuyu öğrenmek isterdiniz? Yorumlarda paylaşın, birlikte konuşalım.',
      quiet_asmr: 'Sahadan sakin bir an. Görüntünün ritmini izleyin; hafif çelik ev projenizle ilgili sorularınızı bize iletin.',
      materials: 'Duvar ve çatı katmanları projeye göre değerlendirilir. Malzeme seçimiyle ilgili sorularınızı görüşmede netleştirebilirsiniz.',
    };
    return {
      format: i < V ? 'reel' : 'banner', brand: 'Embay Yapı', title: `${pl.badge} · ${p}`, badge: pl.badge, headline,
      subtitle: pl.topic.split(';')[0].slice(0, 100), tone: pl.key, caption: captions[pl.key] ?? captions.question_hook,
      hashtags: p === 'x' ? ['#hafifçelik', '#istanbul', '#embayyapı'] : ['#hafifçelik', '#hafifçelikev', '#embayyapı', '#istanbul', '#evprojesi'].slice(0, p === 'tiktok' ? 4 : 5),
      cta: 'Bize danışın', video_script: i < V ? '0-2 sn: o günün farklı soru/gözlem kancası · 3-12 sn: yalnız gerçek ve uygun hafif çelik görüntüsü · son bölüm: kısa açıklama + logo. Görüntüde olmayan bilgi veya sonuç ekleme.' : undefined,
    } as Item;
  });
}

// Sunucu CPU sınırı (istek başına ~2 sn): fotoğraflı banner çizimi ağır → her çağrıda en fazla 1 banner çizilir; worker dakikada bir kaldığı yerden sürdürür.
/** Günlük yayın sınırı (platform başına): 1 banner + 1 Reels. Üretim sürer; sınırı aşan içerik taslak olarak HAVUZDA bekler
 *  (önerilen saati korunur; Yayın Kuyruğu → Havuz sekmesinden tek tıkla planlanır). Gerekçe: günde 3-4 banner etkileşimi düşürüyordu (0-5 beğeni). */
export const DAILY_LIMIT: Record<string, { formats: string[]; max: number }> = { banner: { formats: ['banner'], max: 1 }, reel: { formats: ['reel', 'short'], max: 1 } };
async function dayFull(db: Db, platform: string, day: string, format: string, clientId: string) {
  const lim = DAILY_LIMIT[format]; if (!lim) return false;
  const start = `${day}T00:00:00+03:00`; const end = new Date(new Date(start).getTime() + 86400_000).toISOString();
  const { count } = await db.from('social_drafts').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('primary_platform', platform).in('format', lim.formats).is('archived_at', null)
    .in('workflow_status', ['scheduled', 'approved', 'pending_approval', 'processing', 'published']).gte('scheduled_at', start).lt('scheduled_at', end);
  return (count ?? 0) >= lim.max;
}

export async function runContentFactory(db: Db, opts: { force?: boolean; maxBanners?: number } = {}) {
  const maxBanners = opts.maxBanners ?? 1; let rendered = 0; let partial = false;
  const { label: day } = istanbulDayRange();
  const { data: quotas } = await db.from('content_quota').select('*').eq('enabled', true);
  const { data: client } = await db.from('agency_clients').select('id,name').eq('slug', 'embay-yapi').eq('status', 'active').maybeSingle();
  if (!client?.id) return { day, created: 0, errors: ['İçerik Fabrikası durduruldu: aktif Embay Yapı müşterisi bulunamadı.'], partial: false, blocked: true };
  const clientId = String(client.id);
  // Haftalık plan olan günde ayrıca günlük içerik üretilmez; yalnız seçili müşteri planı etkili olur.
  const { count: planned } = await db.from('content_plan').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('day', day);
  if (planned) { await db.from('content_factory_days').update({ finished_at: new Date().toISOString() }).eq('day', day); return { day, created: 0, errors: [], partial: false, plan: planned }; }
  const { data: brand } = await db.from('brand_kits').select('*').eq('client_id', clientId).order('is_default', { ascending: false }).limit(1).maybeSingle();
  if (!brand || !/embay/i.test(String(brand.company_name ?? ''))) return { day, created: 0, errors: ['İçerik Fabrikası durduruldu: Embay Yapı marka kiti doğrulanamadı.'], partial: false, blocked: true };
  const { data: bot } = await db.from('automation_bots').select('id').eq('slug', 'icerik-fabrikasi').maybeSingle();
  const { data: admin } = await db.from('team_members').select('user_id').eq('role', 'admin').order('created_at').limit(1).maybeSingle();
  // Otopilot 'onaysız yayın' açıksa taslaklar doğrudan zamanlanır (Reels otomatik montaj bağlanana kadar yayınlanmaz)
  const { data: ap } = await db.from('ops_autopilot').select('auto_publish').eq('id', 1).maybeSingle();
  const autoPublish = (ap as { auto_publish?: boolean } | null)?.auto_publish === true;
  // Gerçek medya: en az kullanılan video/fotoğraf önce (Drive'dan gelenler dahil) → her gün farklı kareler
  const { data: vids } = await db.from('media_library').select('id,url,cover_url,title,caption,use_count,source,edit').eq('client_id', clientId).eq('kind', 'video').is('archived_at', null)
    .order('last_used_at', { ascending: true, nullsFirst: true }).order('created_at', { ascending: true }).limit(300);
  // Önce hazır montajlar (logolu, adım yazılı Reels), sonra ham videolar; HEVC en sona (bazı tarayıcılarda önizlenmez)
  // Ham şantiye videoları önce (otomatik montaj yeni Embay tarzında editler); eski tarz montajlar ve HEVC en sona
  const rank = (v: { source?: string | null; edit?: { codec?: string } | null }) => (v.source === 'ig_archive' ? 0 : v.source === 'montage' ? 3 : v.edit?.codec === 'hevc' ? 2 : 1);
  const videos = (vids || []).filter((v) => !isEmbayOffScope(`${v.title ?? ''} ${v.caption ?? ''}`)).map((v, i) => ({ v, i })).sort((a, b) => rank(a.v) - rank(b.v) || a.i - b.i).map((x) => x.v);
  const { data: photos } = await db.from('media_library').select('id,url,mime,use_count,title,caption').eq('client_id', clientId).eq('kind', 'image').neq('source', 'ai').is('archived_at', null)
    .order('last_used_at', { ascending: true, nullsFirst: true }).order('created_at', { ascending: true }).limit(60);
  let pIdx = 0;
  // Tekrar yasağı: son 30 günün başlıkları (yayınlanmış/planlanmış) ve daha önce bir gönderide kullanılmış videolar yeniden kullanılmaz
  const { data: recent } = await db.from('social_drafts').select('headline,video_url,caption,tone,content_pillar').eq('client_id', clientId).gte('created_at', new Date(Date.now() - 45 * 86400_000).toISOString()).order('created_at', { ascending: false }).limit(1000);
  const usedHeads = new Set<string>((recent || []).map((r) => String(r.headline ?? '').toLocaleLowerCase('tr-TR')).filter(Boolean));
  const editorialHistory = (recent || []) as EditorialHistory[];
  const usedVideos = new Set<string>((recent || []).map((r) => r.video_url as string).filter(Boolean));
  const freshVideos = videos.filter((v) => (v.use_count ?? 0) === 0 && v.source !== 'montage' && v.edit?.codec !== 'hevc' && !usedVideos.has(v.url));
  const cleanPhotos = (photos || []).filter((v) => !isEmbayOffScope(`${v.title ?? ''} ${v.caption ?? ''}`));
  const markUsed = async (m: { id: string; use_count?: number | null }) => {
    m.use_count = (m.use_count ?? 0) + 1;
    await db.from('media_library').update({ use_count: m.use_count, last_used_at: new Date().toISOString() }).eq('id', m.id);
  };
  const { data: existing } = await db.from('social_drafts').select('primary_platform,format').eq('client_id', clientId).is('archived_at', null)
    .in('workflow_status', ['scheduled', 'approved', 'pending_approval', 'processing', 'published']).gte('scheduled_at', `${day}T00:00:00+03:00`).lt('scheduled_at', new Date(new Date(`${day}T00:00:00+03:00`).getTime() + 86400_000).toISOString()).limit(1000);
  const have = new Map<string, { videos: number; banners: number }>();
  for (const row of existing ?? []) {
    const entry = have.get(row.primary_platform) ?? { videos: 0, banners: 0 };
    if (['reel', 'short'].includes(row.format)) entry.videos++;
    if (row.format === 'banner') entry.banners++;
    have.set(row.primary_platform, entry);
  }
  const di = dayIndex(day); let created = 0; const errors: string[] = []; let vIdx = 0;
  const actx = { db, runId: null, actorId: admin?.user_id ?? null, tokens: { in: 0, out: 0 }, agent: null } as unknown as Parameters<typeof aiComplete>[0];

  const ORDER = ['instagram', 'facebook', 'youtube', 'tiktok', 'x'];
  // Bugün daha önce yapay zekâ görselli banner üretildiyse (yarım kalan üretim) yeniden üretme
  // Embay Yapı için yalnızca tenant'a atanmış gerçek fotoğraf/video kullanılır; AI ile temsili yapı görseli üretilmez.
  for (const q of ((quotas || []) as Quota[]).sort((a, b) => ORDER.indexOf(a.platform) - ORDER.indexOf(b.platform))) {
    if (partial) break;
    const h = have.get(q.platform); const needV = Math.max(0, q.video_per_day - (h?.videos ?? 0)); const needB = Math.max(0, q.image_per_day - (h?.banners ?? 0));
    if (!needV && !needB && !opts.force) continue;
    const pIdx0 = ['instagram', 'tiktok', 'youtube', 'facebook', 'x'].indexOf(q.platform);
    const V = Math.max(0, q.video_per_day); const B = Math.max(0, q.image_per_day); const N = V + B;
    const pillars: Array<typeof PILLARS[number]> = [];
    const chosenStyles = chooseEditorialStyles(editorialHistory, N, di + pIdx0 * N);
    for (const style of chosenStyles) pillars.push(PILLARS.find((pillar) => pillar.key === style.key) ?? PILLARS[0]);
    // Reels videoları önceden seçilir: eski başarılı gönderilerimizin (ig_archive) videosu ise gerçek proje bilgisi (konum, m², sistem) metne bağlam olarak verilir
    const reelVids = freshVideos.slice(vIdx, vIdx + needV) as Array<{ source?: string | null; caption?: string | null; title?: string | null }>;
    const context = reelVids.map((rv, k) => rv?.source === 'ig_archive' && (rv.caption || rv.title) && !isEmbayOffScope(`${rv.caption ?? ''} ${rv.title ?? ''}`) ? `${k + 1}. GERÇEK GÖRÜNTÜ BAĞLAMI: "${String(rv.caption || rv.title).replace(/\s+/g, ' ').slice(0, 240)}". Yalnız doğrulanabilir bilgi ve kadrajda görüleni kullan; metni özgün kur.` : '').filter(Boolean);
    let items: Item[] = [];
    try {
      const { json } = await aiComplete(actx, 'content_factory', [
        `Embay Yapı için ${q.platform.toUpperCase()} platformunda ${N} özgün içerik hazırla. Marka kapsamı SADECE HAFİF ÇELİK EV/YAPI. Hafif çelik ev düşünen arsa sahiplerine yararlı, doğal ve çeşitli içerikler üret. Her öğe kendi açısını ve anlatım düzenini kullanmalı.`,
        `HER ÖĞE İÇİN AYRI TARZ: ${pillars.map((p, i) => `${i + 1}. ${editorialPrompt(chosenStyles[i])}`).join('\n')}`,
        ...context,
        `YASAK: Ağır çelik, betonarme, kentsel dönüşüm, tadilat, tamirat, Manitou, kiralama ve alakasız hizmetleri anma. Proje adı, teslim, m², süre, teknik üstünlük, fiyat veya başarı iddiası UYDURMA. Son 45 gündeki başlık ve kalıpları tekrar etme: ${editorialHistory.slice(0, 20).map((r) => `${r.headline ?? ''}: ${(r.caption ?? '').slice(0, 80)}`).join(' | ') || '—'}`,
        `İlk ${V} içerik format=reel (kısa dikey video: kanca + çekim senaryosu video_script'e), kalan ${B} içerik format=banner (görsel üzerinde büyük başlık "headline" en fazla 5 kelime, "subtitle" en fazla 14 kelime).`,
        `Konular sırasıyla: ${pillars.map((p, i) => `${i + 1}) ${p.topic}`).join(' · ')}`,
        PLATFORM_RULES[q.platform],
        `"cta" en fazla 24 karakter ve her öğede aynı CTA'yı tekrarlama. Gerçek iletişim: ${brand.phone ?? ''}${brand.phone2 ? ' / ' + brand.phone2 : ''} · ${brand.website ?? ''}. Türkçe, doğal ve kısa yaz. Hashtag önerileri ver; sistem sonradan yalnız hafif çelik, ev ve yerel alakalı etiketleri kullanacak.`,
      ].join('\n'), CONTENT_SCHEMA);
      // deno-lint-ignore no-explicit-any
      const generated = ((json?.items ?? []) as any[]).slice(0, N).map((it, i) => ({ ...it, format: i < V ? 'reel' : 'banner', badge: pillars[i].badge, tone: pillars[i].key, brand: 'Embay Yapı' as Item['brand'],
        hashtags: (Array.isArray(it.hashtags) ? it.hashtags : []).map((t: string) => (String(t).startsWith('#') ? String(t) : `#${t}`)).slice(0, 30) } as Item));
      for (const candidate of generated) {
        const check = validateEditorialCandidate({ ...candidate, pillar: candidate.badge }, [...editorialHistory, ...items.map((it) => ({ headline: it.headline, caption: it.caption, tone: it.tone }))]);
        if (check.ok) items.push(candidate);
      }
    } catch (e) { errors.push(`${q.platform}: AI — ${String((e as Error).message).slice(0, 120)} (hazır metin kullanıldı)`); }
    if (items.length < N) {
      const fallbacks = fallbackItems(q.platform, pillars.slice(items.length), di, usedHeads, Math.max(0, V - items.length));
      for (const candidate of fallbacks) if (items.length < N && validateEditorialCandidate({ ...candidate, pillar: candidate.badge }, [...editorialHistory, ...items.map((x) => ({ headline: x.headline, caption: x.caption, tone: x.tone }))]).ok) items.push(candidate);
    }
    for (const it of items) usedHeads.add(it.headline.toLocaleLowerCase('tr-TR'));
    items = items.map((it, i) => ({ ...it, tone: it.tone ?? pillars[i]?.key ?? 'question_hook', hashtags: tagMix(q.platform, it.tone ?? pillars[i]?.key ?? 'question_hook') }));

    const plan = [...items.slice(V - needV, V), ...items.slice(V + (B - needB), V + B)]; // yarım kalan günde kalan içerikten devam
    for (const [i, it] of plan.entries()) {
        if (it.format === 'banner' && rendered >= maxBanners) { partial = true; break; }
      try {
        const slot = q.slot_times[Math.min(i + Math.max(0, q.slot_times.length - plan.length), q.slot_times.length - 1)] ?? '12:00';
        let media: string[] = []; let video_url: string | null = null; let note = ''; let reelCover: string | null = null;
        if (it.format === 'banner') {
          // Banner'lar yalnızca bu şirketin atanmış gerçek görselleriyle hazırlanır.
          let photo: Uint8Array | null = null; let photoMime: string | undefined; let ph: { id: string; url: string; mime?: string | null } | null = null;
          ph = cleanPhotos.length ? cleanPhotos[pIdx++ % cleanPhotos.length] : null;
          if (!ph) { errors.push(`${q.platform}: atanmış gerçek şirket fotoğrafı bulunamadı; temsili görsel oluşturulmadı.`); continue; }
          const photoResponse = await fetch(ph.url);
          if (!photoResponse.ok) { errors.push(`${q.platform}: atanmış gerçek şirket fotoğrafı okunamadı; banner oluşturulmadı.`); continue; }
          photo = new Uint8Array(await photoResponse.arrayBuffer()); photoMime = ph.mime ?? photoResponse.headers.get('content-type') ?? undefined;
          if (photo.length > 4_000_000) { errors.push(`${q.platform}: gerçek şirket fotoğrafı 4 MB sınırını aşıyor; banner oluşturulmadı.`); continue; }
          rendered++;
          if (ph) await markUsed(ph as { id: string });
          const png = await renderBanner({ w: q.width, h: q.height, brand, brandName: it.brand, badge: it.badge, headline: it.headline, subtitle: it.subtitle, cta: it.cta, photo, photoMime });
          const path = `factory/${day}/${q.platform}-${Date.now()}-${i}.jpg`;
          const up = await db.storage.from('design-exports').upload(path, png, { contentType: 'image/jpeg', upsert: true });
          if (up.error) throw up.error;
          media = [db.storage.from('design-exports').getPublicUrl(path).data.publicUrl];
          await db.from('media_library').insert({ kind: 'banner', title: it.headline.slice(0, 120), url: media[0], mime: 'image/jpeg', width: q.width, height: q.height, targets: [q.platform],
            caption: it.caption, hashtags: it.hashtags, status: 'queued', platform: q.platform, pillar: it.badge, source: 'factory', created_by: admin?.user_id ?? null,
            client_id: clientId, template: { headline: it.headline, subtitle: it.subtitle, badge: it.badge, cta: it.cta, brand: it.brand, width: q.width, height: q.height, photo_url: ph?.url ?? null, tone: it.tone } });
        } else {
          // Her Reels için DAHA ÖNCE HİÇ KULLANILMAMIŞ bir video; kalmadıysa aynı videoyu tekrar atmak yerine Reels üretilmez
          const v = freshVideos[vIdx++];
          if (v) { video_url = v.url; media = [v.url]; reelCover = v.cover_url ?? null; usedVideos.add(v.url); await markUsed(v); }
          else {
            // Yeni video kalmadıysa: kendi fotoğraflarımızdan ritme oturan foto-Reels (otomatik montaj müzik + geçiş ekler)
            const set: Array<{ id: string; url: string; use_count?: number | null }> = [];
            while (set.length < 6 && cleanPhotos.length && pIdx < cleanPhotos.length * 2) { const ph = cleanPhotos[pIdx++ % cleanPhotos.length]; if (!set.some((x) => x.id === ph.id)) set.push(ph); }
            if (set.length < 4) { errors.push(`${q.platform}: uygun hafif çelik içerik medyası yetersiz — Havuzdaki uygun video/fotoğrafları kontrol edin`); continue; }
            for (const ph of set) await markUsed(ph);
            media = set.map((x) => x.url); reelCover = set[0].url; note = 'FOTO-REELS: fotoğraflardan otomatik montaj';
          }
        }
        const body = `${it.caption}\n\n${it.hashtags.join(' ')}`;
        const toPool = await dayFull(db, q.platform, day, it.format, clientId);
        const { error } = await db.from('social_drafts').insert({
          brand: it.brand, title: `${q.platform.toUpperCase()} · ${it.format === 'reel' ? 'Kısa video' : 'Banner'} · ${it.headline}`.slice(0, 200), body,
          caption: it.caption, headline: it.headline, hashtags: it.hashtags, cta: it.cta, tone: it.tone ?? null, format: it.format, networks: [q.platform], platform_targets: [q.platform], primary_platform: q.platform, client_id: clientId,
          media_urls: media, video_url, design_url: it.format === 'banner' ? media[0] : reelCover, design_brief: it.video_script ? `Çekim senaryosu: ${it.video_script}` : null,
          image_brief: note || null, scheduled_at: slotIso(day, slot), // havuzdakiler de önerilen saati taşır (günlük kota sayımı için); yayın yalnızca scheduled/approved alır
          status: toPool ? 'taslak' : autoPublish ? 'planlandi' : 'onay_bekliyor', workflow_status: toPool ? 'draft' : autoPublish ? 'scheduled' : 'pending_approval', archive_status: 'active',
          ...(autoPublish && !toPool ? { approved_at: new Date().toISOString(), approved_by: admin?.user_id ?? null } : {}),
          bot_id: bot?.id ?? null, content_pillar: it.badge, campaign_name: `Günlük içerik ${day}`, created_by: admin?.user_id ?? null,
          kvkk_basis: autoPublish ? 'İçerik Fabrikası; yönetici otomatik yayını açtı (otopilot).' : 'İçerik Fabrikası taslağı; yayın öncesi insan onayı zorunlu.',
        });
        if (error) throw error;
        await db.from('post_templates').insert({ title: it.headline.slice(0, 200), platform: q.platform, brand: it.brand, pillar: it.badge, headline: it.headline, caption: it.caption, tone: it.tone ?? null, client_id: clientId,
          hashtags: it.hashtags, cta: it.cta, source: 'factory', created_by: admin?.user_id ?? null });
        editorialHistory.unshift({ headline: it.headline, caption: it.caption, tone: it.tone ?? null, content_pillar: it.badge });
        created++;
      } catch (e) { errors.push(`${q.platform}/${it.format}: ${String((e as Error).message).slice(0, 160)}`); }
    }
  }
  const { data: prev } = await db.from('content_factory_days').select('created,errors').eq('day', day).maybeSingle();
  await db.from('content_factory_days').update({ created: (prev?.created ?? 0) + created, errors: [...((prev?.errors as string[]) ?? []), ...errors].slice(-30),
    ...(partial ? {} : { finished_at: new Date().toISOString() }) }).eq('day', day);
  return { day, created, errors, partial };
}

/** Worker her dakika çağırır: 06:30'da günlük üretim, 08:00 sabah özeti, 18:30 eksik/paylaşılmamış hatırlatması (Telegram). */
export async function factoryTick(db: Db, background: (p: Promise<unknown>) => void) {
  const { label: day } = istanbulDayRange();
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  if (hm >= '06:30') {
    const { data: ins } = await db.from('content_factory_days').upsert({ day }, { onConflict: 'day', ignoreDuplicates: true }).select('day');
    if (ins?.length) { background(runContentFactory(db).catch((e) => db.from('content_factory_days').update({ errors: [String(e).slice(0, 300)] }).eq('day', day))); return { factory: 'started' }; }
  }
  const { data: row } = await db.from('content_factory_days').select('*').eq('day', day).maybeSingle();
  if (!row) return null;
  if (!row.finished_at) {
    // Yarım kalan üretimi sürdür (tek çalışan: started_at ile kilit)
    const { data: claimed } = await db.from('content_factory_days').update({ started_at: new Date().toISOString() }).eq('day', day).is('finished_at', null)
      .lt('started_at', new Date(Date.now() - 50_000).toISOString()).select('day');
    if (claimed?.length) background(runContentFactory(db).catch((e) => console.error('factory', String(e))));
    return { factory: claimed?.length ? 'continued' : 'running' };
  }
  await loadAppSecrets(db);
  if (!appSecret('TELEGRAM_BOT_TOKEN') || !appSecret('TELEGRAM_CHAT_ID')) return null;
  const quota = async () => ((await db.rpc('content_quota_today')).data || []) as Array<{ platform: string; target: number; drafted: number; approved: number; published: number }>;
  const NAME: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', x: 'X' };
  if (hm >= '08:00' && row.finished_at && !row.morning_sent_at) {
    const { data: claimed } = await db.from('content_factory_days').update({ morning_sent_at: new Date().toISOString() }).eq('day', day).is('morning_sent_at', null).select('day');
    if (claimed?.length) {
      const q = await quota();
      await telegramSend([`🏭 İçerik Fabrikası — ${day}`, `Bugün için ${row.created} yeni içerik taslağı hazır (her platformda 1 kısa video + 2 banner).`, '',
        ...q.map((r) => `${NAME[r.platform] ?? r.platform}: ${r.drafted}/${r.target} hazır · ${r.approved} onaylı`), '',
        'Onay: https://embay-panel.vercel.app → Yayın Kuyruğu → "Onayla". Bağlı olmayan platformlarda "Telefondan paylaş".'].join('\n')).catch(() => null);
    }
  }
  if (hm >= '18:30' && !row.evening_sent_at) {
    const { data: claimed } = await db.from('content_factory_days').update({ evening_sent_at: new Date().toISOString() }).eq('day', day).is('evening_sent_at', null).select('day');
    if (claimed?.length) {
      const q = await quota(); const behind = q.filter((r) => r.published < r.target);
      await telegramSend(behind.length ? [`⏰ Hatırlatma — günlük paylaşım hedefi (${day})`, 'Günde her platformda 3 paylaşım zorunluluğu:', '',
        ...behind.map((r) => `${NAME[r.platform] ?? r.platform}: ${r.published}/${r.target} paylaşıldı${r.approved > r.published ? ` (${r.approved - r.published} onaylı bekliyor)` : ''}`), '',
        'Kalanları şimdi paylaşın: Yayın Kuyruğu → "Telefondan paylaş" / "Şimdi yayınla".'].join('\n') : `✅ Bugünün paylaşım hedefi tamam (${day}). Tebrikler!`).catch(() => null);
    }
  }
  return null;
}

/** Havuzdaki banner'ı şablonundan (yeniden) çizer ve kaydeder. id verilirse aynı kayıt güncellenir, yoksa yeni banner eklenir. */
export async function renderBannerToPool(db: Db, input: { id?: string | null; clientId: string; title?: string; platform?: string; template: { headline: string; subtitle?: string; badge?: string; cta?: string; brand?: string; width?: number; height?: number; photo_url?: string | null } }, userId: string | null) {
  const t = input.template;
  const { data: client } = await db.from('agency_clients').select('id,name,status').eq('id', input.clientId).eq('status', 'active').maybeSingle();
  if (!client) throw new Error('Etkin müşteri seçimi doğrulanamadı.');
  const brand = await brandForClient(db, input.clientId);
  if (!brand) throw new Error('Bu müşteriye atanmış marka kiti yok; başka müşterinin markası kullanılmadı.');
  const size: Record<string, [number, number]> = { instagram: [1080, 1350], facebook: [1080, 1350], tiktok: [1080, 1920], youtube: [1080, 1920], x: [1600, 900] };
  const [w, h] = t.width && t.height ? [t.width, t.height] : size[input.platform ?? 'instagram'] ?? [1080, 1350];
  let photo: Uint8Array | null = null; let photoMime: string | undefined;
  if (t.photo_url) {
    const { data: selectedPhoto } = await db.from('media_library').select('url,mime').eq('client_id', input.clientId).eq('kind', 'image').eq('url', t.photo_url).is('archived_at', null).limit(1).maybeSingle();
    if (!selectedPhoto?.url) throw new Error('Seçilen fotoğraf bu müşteriye ait değil veya arşivli.');
    const r = await fetch(selectedPhoto.url).catch(() => null);
    if (!r?.ok) throw new Error('Müşteriye ait seçili fotoğraf okunamadı.');
    photo = new Uint8Array(await r.arrayBuffer()); photoMime = selectedPhoto.mime ?? r.headers.get('content-type') ?? undefined;
    if (photo.length > 4_000_000) throw new Error('Fotoğraf boyutu 4 MB sınırını aşıyor.');
  }
  const brandName = brand.company_name || client.name;
  const png = await renderBanner({ w, h, brand, brandName, badge: (t.badge || 'EMBAY').slice(0, 24), headline: t.headline, subtitle: t.subtitle ?? '', cta: t.cta || brand?.default_cta || 'Hemen arayın', photo, photoMime });
  const path = `pool/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  const up = await db.storage.from('design-exports').upload(path, png, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw up.error;
  const url = db.storage.from('design-exports').getPublicUrl(path).data.publicUrl;
  const row = { client_id: input.clientId, url, mime: 'image/jpeg', width: w, height: h, template: { ...t, brand: brandName, width: w, height: h }, title: (input.title || t.headline).slice(0, 120), platform: input.platform ?? null, pillar: t.badge ?? null, updated_at: new Date().toISOString() };
  if (input.id) {
    const { data, error } = await db.from('media_library').update(row).eq('id', input.id).eq('client_id', input.clientId).eq('kind', 'banner').select('*').single();
    if (error) throw error; return data;
  }
  const { data, error } = await db.from('media_library').insert({ ...row, kind: 'banner', status: 'pool', source: 'manual', targets: input.platform ? [input.platform] : [], created_by: userId }).select('*').single();
  if (error) throw error; return data;
}

// ── HAFTALIK İÇERİK PLANI (content_plan) ──
// Plan satırı = hangi gün/saatte, hangi GERÇEK fotoğraf/video ile, hangi başlık ve açıklama çıkacak. Satırlar fotoğraflar
// gözle etiketlendikten sonra (media_library.vision) yazılır → görsel ile yazı birebir uyumlu. Bot planı aynen uygular:
// banner'ı o fotoğrafla çizer, Reels'i o videoyla otomatik montaja gönderir, taslağı o saate zamanlar. Plan olan günde AI üretimi yapılmaz.
interface PlanRow { id: string; day: string; slot: string; platforms: string[]; format: 'reel' | 'banner'; badge: string | null; media_ids: string[]; headline: string; subtitle: string | null;
  caption: string; hashtags: string[]; cta: string | null; drafted_platforms: string[]; draft_ids: string[] }
export async function planTick(db: Db) {
  const { data: client } = await db.from('agency_clients').select('id').eq('slug', 'embay-yapi').eq('status', 'active').maybeSingle();
  if (!client?.id) return { processed: 0, done: [], errors: ['Etkin Embay Yapı müşteri kaydı bulunamadı.'] };
  const clientId = String(client.id);
  const { data: rows } = await db.from('content_plan').select('*').eq('client_id', clientId).eq('status', 'planned').order('day').order('slot').limit(6);
  if (!rows?.length) return null;
  const { data: recent } = await db.from('social_drafts').select('headline,caption,tone,content_pillar').eq('client_id', clientId)
    .gte('created_at', new Date(Date.now() - 45 * 86400_000).toISOString()).order('created_at', { ascending: false }).limit(300);
  const editorialHistory = (recent ?? []) as EditorialHistory[];
  const brand = await brandForClient(db, clientId);
  if (!brand) return { processed: 0, done: [], errors: ['Embay Yapı için atanmış marka kiti bulunamadı; başka müşterinin markası kullanılmadı.'] };
  const { data: quotas } = await db.from('content_quota').select('platform,width,height');
  const size = new Map(((quotas || []) as Array<{ platform: string; width: number; height: number }>).map((q) => [q.platform, q]));
  const { data: bot } = await db.from('automation_bots').select('id').eq('slug', 'icerik-fabrikasi').maybeSingle();
  const { data: admin } = await db.from('team_members').select('user_id').eq('role', 'admin').order('created_at').limit(1).maybeSingle();
  const { data: ap } = await db.from('ops_autopilot').select('auto_publish').eq('id', 1).maybeSingle();
  const autoPublish = (ap as { auto_publish?: boolean } | null)?.auto_publish === true;
  let banners = 0; const done: string[] = []; const errors: string[] = [];
  for (const r of rows as PlanRow[]) {
    const quality = validateEditorialCandidate({ headline: r.headline, caption: r.caption, pillar: r.badge, hashtags: r.hashtags, cta: r.cta }, editorialHistory);
    if (!quality.ok) {
      await db.from('content_plan').update({ status: 'blocked', error: `Hafif çelik kapsamı/özgünlük kontrolü: ${quality.reason}`, updated_at: new Date().toISOString() }).eq('id', r.id).eq('client_id', clientId);
      errors.push(`${r.id}: kapsam/özgünlük kontrolünden geçmedi (${quality.reason})`);
      continue;
    }
    const todo = r.platforms.filter((p) => !r.drafted_platforms.includes(p));
    const drafted = [...r.drafted_platforms]; const ids = [...r.draft_ids];
    try {
      const { data: media } = await db.from('media_library').select('id,url,cover_url,mime,kind').eq('client_id', clientId).in('id', r.media_ids.length ? r.media_ids : ['00000000-0000-0000-0000-000000000000']);
      const ordered = r.media_ids.map((id) => (media || []).find((m) => m.id === id)).filter(Boolean) as Array<{ id: string; url: string; cover_url: string | null; mime: string | null; kind: string }>;
      if (!ordered.length || ordered.length !== r.media_ids.length) {
        const reason = !ordered.length ? 'Atanmış gerçek Embay medyası bulunamadı.' : 'Plan medyasının bir kısmı bu şirkete ait değil veya arşivli.';
        await db.from('content_plan').update({ status: 'blocked', error: reason, updated_at: new Date().toISOString() }).eq('id', r.id).eq('client_id', clientId);
        errors.push(`${r.id}: ${reason}`);
        continue;
      }
      for (const p of todo) {
        let mediaUrls: string[] = []; let video_url: string | null = null; let design: string | null = null;
        if (r.format === 'banner') {
          if (banners >= 1) break; // sunucu CPU sınırı: çağrı başına 1 banner
          banners++;
          const ph = ordered[0];
          const photo = ph ? new Uint8Array(await (await fetch(ph.url)).arrayBuffer()) : null;
          const q = size.get(p) ?? { width: 1080, height: 1350 };
          const png = await renderBanner({ w: q.width, h: q.height, brand, brandName: 'Embay Yapı', badge: r.badge ?? 'EMBAY YAPI', headline: r.headline, subtitle: r.subtitle ?? '', cta: r.cta ?? 'WhatsApp: 0531 436 29 04',
            photo: photo && photo.length < 4_000_000 ? photo : null, photoMime: ph?.mime ?? undefined });
          const path = `plan/${r.day}/${p}-${r.id}.jpg`;
          const up = await db.storage.from('design-exports').upload(path, png, { contentType: 'image/jpeg', upsert: true });
          if (up.error) throw up.error;
          design = db.storage.from('design-exports').getPublicUrl(path).data.publicUrl; mediaUrls = [design];
          await db.from('media_library').insert({ kind: 'banner', title: r.headline.slice(0, 120), url: design, mime: 'image/jpeg', width: q.width, height: q.height, targets: [p], caption: r.caption, hashtags: r.hashtags,
            status: 'queued', platform: p, pillar: r.badge, source: 'factory', client_id: clientId, created_by: admin?.user_id ?? null, template: { headline: r.headline, subtitle: r.subtitle, badge: r.badge, cta: r.cta, photo_url: ph?.url ?? null, plan_id: r.id } });
        } else {
          // Ana video + aynı projenin diğer videoları (montaj ek sahneleri yalnızca bunlardan keser — alakasız kare girmez)
          const vid = ordered.find((m) => m.kind === 'video');
          if (vid) { video_url = vid.url; mediaUrls = [vid.url, ...ordered.filter((m) => m.kind === 'video' && m.id !== vid.id).map((m) => m.url)]; design = vid.cover_url; }
          else { mediaUrls = ordered.map((m) => m.url); design = mediaUrls[0] ?? null; }
        }
        const toPool = await dayFull(db, p, r.day, r.format, clientId);
        const { data: ins, error } = await db.from('social_drafts').insert({
          brand: 'Embay Yapı', title: `${p.toUpperCase()} · ${r.format === 'reel' ? 'Reels' : 'Banner'} · ${r.headline}`.slice(0, 200), body: `${r.caption}\n\n${r.hashtags.join(' ')}`,
          caption: r.caption, headline: r.headline, hashtags: r.hashtags, cta: r.cta, format: r.format, networks: [p], platform_targets: [p], primary_platform: p, client_id: clientId,
          media_urls: mediaUrls, video_url, design_url: design, scheduled_at: slotIso(r.day, r.slot),
          status: toPool ? 'taslak' : autoPublish ? 'planlandi' : 'onay_bekliyor', workflow_status: toPool ? 'draft' : autoPublish ? 'scheduled' : 'pending_approval', archive_status: 'active',
          ...(autoPublish && !toPool ? { approved_at: new Date().toISOString(), approved_by: admin?.user_id ?? null } : {}),
          bot_id: bot?.id ?? null, content_pillar: r.badge, campaign_name: `Haftalık plan ${r.day}`, created_by: admin?.user_id ?? null,
          kvkk_basis: 'Haftalık içerik planı (görseller gözle etiketlendi, metin görsele göre yazıldı).',
        }).select('id').single();
        if (error) throw error;
        drafted.push(p); ids.push(ins.id);
      }
      for (const m of ordered) await db.from('media_library').update({ use_count: 1, last_used_at: new Date().toISOString() }).eq('id', m.id);
      const complete = r.platforms.every((p) => drafted.includes(p));
      await db.from('content_plan').update({ drafted_platforms: drafted, draft_ids: ids, status: complete ? 'drafted' : 'planned', error: null, updated_at: new Date().toISOString() }).eq('id', r.id).eq('client_id', clientId);
      editorialHistory.unshift({ headline: r.headline, caption: r.caption, tone: r.pillar, content_pillar: r.badge });
      if (complete) done.push(r.id);
    } catch (e) {
      errors.push(`${r.day} ${r.slot}: ${String((e as Error).message).slice(0, 160)}`);
      await db.from('content_plan').update({ error: String((e as Error).message).slice(0, 300), updated_at: new Date().toISOString() }).eq('id', r.id);
    }
    if (banners >= 1) break;
  }
  return { done: done.length, errors };
}
