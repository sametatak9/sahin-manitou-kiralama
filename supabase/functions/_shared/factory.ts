// İÇERİK FABRİKASI: her gün 5 platform × 3 içerik (1 kısa video + 2 banner/kampanya) taslağı üretir → onay kuyruğu.
// Kurallar: gerçek hizmetlerimiz, uydurma müşteri/rakam/proje yok; platform uzunluk/hashtag kuralları; paylaşım insan onayından sonra.
// Banner PNG sunucuda üretilir (SVG → PNG, resvg-wasm). Video: Video Havuzu'ndan gerçek video seçilir; yoksa çekim senaryosuyla "video gerekli" taslağı.
import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm@2.6.2';
import jpeg from 'npm:jpeg-js@0.4.4';
import { aiComplete, defaultBrand, istanbulDayRange, type Db } from './context.ts';
import { telegramSend } from './connectors/messaging.ts';
import { loadAppSecrets, secret as appSecret } from './secrets.ts';

type Platform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'x';
interface Quota { platform: Platform; enabled: boolean; video_per_day: number; image_per_day: number; slot_times: string[]; width: number; height: number }
interface Item { format: 'reel' | 'banner'; title: string; headline: string; subtitle: string; badge: string; caption: string; hashtags: string[]; cta: string; video_script?: string; brand: 'Embay Yapı' | 'Şahin Manitou' }

const PLATFORM_RULES: Record<Platform, string> = {
  instagram: 'Instagram: açıklama 80-150 kelime, ilk satır kanca, 8-12 hashtag (yerel: #çatalca #silivri #istanbul + sektör), konum ve WhatsApp çağrısı. Reels 15-30 sn.',
  tiktok: 'TikTok: açıklama en fazla 150 karakter, 3-5 hashtag (#inşaat #manitou #şantiye gibi), eğlenceli ama profesyonel; video 15-30 sn, ilk 2 saniye güçlü kanca.',
  youtube: 'YouTube Shorts: başlık en fazla 70 karakter + açıklama 2-3 cümle, 3 hashtag ve #shorts. Banner içerikleri Topluluk gönderisi olarak.',
  facebook: 'Facebook: 40-90 kelime, yerel ve güven veren dil, 2-4 hashtag, telefon ve WhatsApp çağrısı.',
  x: 'X (Twitter): toplam en fazla 260 karakter, 1-2 hashtag, net teklif/haber dili.',
};

// İçerik direkleri (her gün kaydırılır → tekrar yok)
const PILLARS = [
  { key: 'manitou', brand: 'Şahin Manitou', topic: 'Operatörlü Manitou (teleskopik yükleyici) kiralama: şantiyede yüksekte malzeme taşıma, montaj, günlük/aylık kiralama', badge: 'KİRALIK MANİTOU' },
  { key: 'villa', brand: 'Embay Yapı', topic: 'Çatalca ve çevresinde villa / müstakil ev yapımı: projelendirme, ruhsat, anahtar teslim', badge: 'VİLLA İNŞAATI' },
  { key: 'donusum', brand: 'Embay Yapı', topic: 'Kentsel dönüşüm ve kat karşılığı: süreç, haklar, güvenli müteahhit seçimi', badge: 'KENTSEL DÖNÜŞÜM' },
  { key: 'tadilat', brand: 'Embay Yapı', topic: 'Tadilat, çatı, dış cephe mantolama, güçlendirme ve ek kat işleri', badge: 'TADİLAT & TAMİRAT' },
  { key: 'santiye', brand: 'İkisi', topic: 'Şantiyeden gerçek iş: kaba inşaat, temel, çelik montaj ve manitou ile malzeme taşıma anları', badge: 'ŞANTİYEDEN' },
  { key: 'ipucu', brand: 'Embay Yapı', topic: 'Ev/villa yaptıracaklara bilgi: maliyeti etkileyen 5 kalem, betonarme mi prefabrik mi, zemin etüdü', badge: 'BİLGİ' },
  { key: 'kampanya', brand: 'Şahin Manitou', topic: 'Kampanya/hatırlatma: bu ay manitou kiralamada ücretsiz keşif, hızlı teklif, 7/24 destek', badge: 'KAMPANYA' },
] as const;

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
    fonts = await Promise.all([get('DejaVuSans-Bold.ttf'), get('DejaVuSans.ttf'), get('DejaVuSans-ExtraLight.ttf')]);
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
const PILLAR_ICON: Record<string, string> = { manitou: 'manitou', kampanya: 'manitou', villa: 'ev', donusum: 'bina', tadilat: 'alet', santiye: 'vinc', ipucu: 'baret' };
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

type BannerOpts = { w: number; h: number; brand: Record<string, string> | null; brandName: string; badge: string; headline: string; subtitle: string; cta: string; photo?: Uint8Array | null; photoMime?: string; icon?: string };

// ── EMBAY YAPI kimliği (Instagram @embayyapi): lacivert + kraliyet mavisi + bulutlu gökyüzü, beyaz çizgi ev logosu,
//    kalın büyük harfli başlık, altta lacivert şerit (iki telefon + web). Eski tarzın modern hali: amblemli etiket, ✓ hizmet çipleri.
const EMBAY = { navy: '#262A6B', navy2: '#1B1F52', royal: '#1E3FA0', sky: '#8FC6F2', skyLight: '#EAF4FD', white: '#FFFFFF' };
function embayLogo(cx: number, cy: number, r: number, color: string) {
  // Yuvarlak lacivert rozet içinde: iç içe iki çizgi ev + "EMBAY" + geniş aralıklı ince "YAPI" (Instagram logosunun sadeleştirilmiş hali)
  const k = r / 50; // rozet çapı 100 birim
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${EMBAY.navy}" stroke="${EMBAY.white}" stroke-width="${r * 0.05}"/>
<g transform="translate(${cx - 33 * k} ${cy - 40 * k}) scale(${k})" fill="none" stroke="${color}" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M6 44V26L24 12l18 14v18z"/><path d="M24 12l10-8 24 18v22H42"/><rect x="14" y="28" width="6" height="6"/><rect x="26" y="28" width="6" height="6"/><path d="M19 44v-6h10v6"/><rect x="47" y="26" width="5" height="5"/></g>
<text x="${cx}" y="${cy + 18 * k}" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="${15 * k}" fill="${color}" letter-spacing="${1.2 * k}">EMBAY</text>
<text x="${cx + 3 * k}" y="${cy + 33 * k}" text-anchor="middle" font-family="DejaVu Sans" font-weight="200" font-size="${13 * k}" fill="${color}" letter-spacing="${5 * k}">YAPI</text>`;
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
  const chips: Array<[string, string]> = [['bina', 'Betonarme'], ['vinc', 'Çelik yapı'], ['ev', 'Anahtar teslim']];
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
<text x="${pad + sSize * 2.0}" y="${badgeY + sSize * 1.2}" font-family="DejaVu Sans" font-weight="700" font-size="${sSize}" fill="${EMBAY.navy}">${x(o.badge)}</text>
${hLines.map((l, i) => `<text x="${pad}" y="${textTop + i * hSize * 1.2}" font-family="DejaVu Sans" font-weight="700" font-size="${hSize}" fill="${EMBAY.white}">${x(l)}</text>`).join('')}
${sLines.map((l, i) => `<text x="${pad}" y="${subTop + i * sSize * 1.45}" font-family="DejaVu Sans" font-size="${sSize}" fill="#DCE9FB">${x(l)}</text>`).join('')}
${cta ? `<text x="${pad}" y="${ctaY + sSize * 0.9}" font-family="DejaVu Sans" font-weight="700" font-size="${Math.round(sSize * 0.95)}" fill="${EMBAY.sky}">→ ${x(cta)}</text>` : ''}
${showChips ? chips.map((c, i) => { const cw = Math.round((w - pad * 2 - u * 0.04) / 3); const cx0 = pad + i * (cw + u * 0.02); return `<rect x="${cx0}" y="${chipY + pad * 0.3}" width="${cw}" height="${chipH}" rx="${chipH / 2}" fill="none" stroke="${EMBAY.sky}" stroke-width="2" opacity="0.8"/>${icon(c[0], cx0 + sSize * 0.5, chipY + pad * 0.3 + sSize * 0.35, sSize * 1.1, EMBAY.sky, 8)}<text x="${cx0 + sSize * 1.85}" y="${chipY + pad * 0.3 + chipH * 0.66}" font-family="DejaVu Sans" font-weight="700" font-size="${Math.round(sSize * 0.7)}" fill="${EMBAY.white}">${x(c[1])}</text>`; }).join('') : ''}
<rect x="0" y="${h - barH}" width="${w}" height="${barH}" fill="${EMBAY.navy2}"/>
<rect x="0" y="${h - barH}" width="${w}" height="3" fill="${EMBAY.sky}" opacity="0.7"/>
<text x="${pad}" y="${h - barH / 2 + sSize * 0.42}" font-family="DejaVu Sans" font-weight="700" font-size="${Math.round(sSize * 1.15)}" fill="${EMBAY.white}">☎ ${x(phone)}</text>
<text x="${w - pad}" y="${h - barH / 2 + sSize * 0.3}" text-anchor="end" font-family="DejaVu Sans" font-size="${Math.round(sSize * 0.72)}" fill="#C9DBF5" letter-spacing="1.5">${x(site)}</text>
</svg>`;
}

const LEGACY_SAHIN_DESIGN = false as boolean;
export async function renderBanner(o: BannerOpts) {
  await ensureRenderer();
  // Tüm banner'lar Embay Yapı kimliğiyle (Manitou kiralama da Embay çatısı altında; eski sarı Şahin Manitou tasarımı yedekte duruyor)
  if (!LEGACY_SAHIN_DESIGN) {
    const r = new Resvg(renderEmbay(o), { font: { fontBuffers: fonts!, defaultFontFamily: 'DejaVu Sans' }, fitTo: { mode: 'original' } });
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
<text x="${pad + logo + u * 0.025}" y="${pad + logo * (longBrand && !wide ? 0.48 : 0.66)}" font-family="DejaVu Sans" font-weight="700" font-size="${Math.round(u * 0.036)}" fill="${p.txt}">${x(longBrand ? 'Embay Yapı · Şahin Manitou' : o.brandName)}</text>
${longBrand && !wide ? `<text x="${pad + logo + u * 0.025}" y="${pad + logo * 0.9}" font-family="DejaVu Sans" font-size="${Math.round(u * 0.024)}" fill="#CFE8D8">${x(site)}</text>` : `<text x="${w - pad}" y="${pad + logo * 0.66}" text-anchor="end" font-family="DejaVu Sans" font-size="${Math.round(u * 0.024)}" fill="#CFE8D8">${x(site)}</text>`}
${wide ? icon(ic, w - pad - u * 0.4, h - barH - u * 0.46, u * 0.4, p.acc, 4, 0.22) : o.photo ? '' : icon(ic, w - pad - u * 0.3, chipsY - u * 0.34, u * 0.3, p.acc, 4, 0.25)}
<rect x="${pad}" y="${badgeY}" width="${Math.round(o.badge.length * sSize * 0.78 + sSize * 2.8)}" height="${Math.round(sSize * 1.7)}" rx="${Math.round(sSize * 0.85)}" fill="${p.acc}"/>
${icon(ic, pad + sSize * 0.55, badgeY + sSize * 0.25, sSize * 1.2, p.bg2, 9)}
<text x="${pad + sSize * 2.0}" y="${badgeY + sSize * 1.2}" font-family="DejaVu Sans" font-weight="700" font-size="${sSize}" fill="${p.bg2}">${x(o.badge)}</text>
${hLines.map((l, i) => `<text x="${pad}" y="${textTop + i * hSize * 1.1}" font-family="DejaVu Sans" font-weight="700" font-size="${hSize}" fill="${p.txt}">${x(l)}</text>`).join('')}
${sLines.map((l, i) => `<text x="${pad}" y="${textTop + (hLines.length - 1) * hSize * 1.1 + sSize * 2.1 + i * sSize * 1.35}" font-family="DejaVu Sans" font-size="${sSize}" fill="#E5F3EA">${x(l)}</text>`).join('')}
${wide ? '' : chips.map((c, i) => { const cw = Math.round((w - pad * 2 - u * 0.04) / 3); return `<rect x="${pad + i * (cw + u * 0.02)}" y="${chipsY}" width="${cw}" height="${Math.round(sSize * 1.9)}" rx="${Math.round(sSize * 0.95)}" fill="#FFFFFF" opacity="0.12"/>${icon(c[0], pad + i * (cw + u * 0.02) + sSize * 0.5, chipsY + sSize * 0.42, sSize * 1.05, p.acc, 9)}<text x="${pad + i * (cw + u * 0.02) + sSize * 1.85}" y="${chipsY + sSize * 1.24}" font-family="DejaVu Sans" font-weight="700" font-size="${Math.round(sSize * 0.76)}" fill="#FFFFFF">${x(c[1])}</text>`; }).join('')}
<rect x="0" y="${h - barH}" width="${w}" height="${barH}" fill="${p.acc}"/>
<text x="${pad}" y="${h - barH / 2 + ctaSize * 0.36}" font-family="DejaVu Sans" font-weight="700" font-size="${ctaFont}" fill="${p.bg2}">${x(cta)}</text>
<text x="${w - pad}" y="${h - barH / 2 + ctaSize * 0.36}" text-anchor="end" font-family="DejaVu Sans" font-weight="700" font-size="${ctaSize}" fill="${p.bg2}">☎ ${x(phone)}</text>
</svg>`;
  const r = new Resvg(svg, { font: { fontBuffers: fonts!, defaultFontFamily: 'DejaVu Sans' }, fitTo: { mode: 'original' } });
  // Instagram API yalnızca JPEG görsel kabul eder → banner JPEG olarak üretilir
  const img = r.render();
  const out = jpeg.encode({ data: img.pixels, width: img.width, height: img.height }, 88).data;
  img.free?.(); r.free?.();
  return new Uint8Array(out);
}

// ── Günlük üretim ────────────────────────────────────────────────────────────
function slotIso(day: string, hhmm: string) { return new Date(`${day}T${hhmm}:00+03:00`).toISOString(); }
function dayIndex(day: string) { return Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 86400000); }

// ── Etiket stratejisi: her gönderide yerel + konu + marka karışımı (keşfet için geniş, müşteri için yerel) ──
// Yerel etiketler nitelikli (bölgede ev/iş yaptıracak) kitleyi getirir; geniş etiketler görünürlük sağlar; marka etiketi arşiv oluşturur.
const TAGS = {
  yerel: ['#çatalca', '#silivri', '#büyükçekmece', '#istanbul', '#arnavutköy', '#beylikdüzü'],
  konu: {
    manitou: ['#manitou', '#telehandler', '#manitoukiralama', '#vinçkiralama', '#iskele', '#şantiye'],
    kampanya: ['#manitoukiralama', '#manitou', '#şantiye', '#işmakinesi'],
    villa: ['#villa', '#villainşaatı', '#müstakilev', '#evyapımı', '#anahtarteslim', '#mimari'],
    donusum: ['#kentseldönüşüm', '#katkarşılığı', '#depremedayanıklı', '#müteahhit', '#yenibina'],
    tadilat: ['#tadilat', '#dışcephe', '#mantolama', '#çatıtamiri', '#renovasyon'],
    santiye: ['#şantiye', '#inşaat', '#betonarme', '#kabainşaat', '#yapı'],
    ipucu: ['#evyaptırmak', '#inşaatipuçları', '#müstakilev', '#zeminetüdü'],
  } as Record<string, string[]>,
  genis: ['#inşaat', '#construction', '#insaat'],
  marka: { manitou: '#şahinmanitou', diger: '#embayyapı' },
};
function tagMix(p: Platform, pillar: string, ai: string[]) {
  const max = p === 'x' ? 2 : p === 'tiktok' ? 5 : p === 'youtube' ? 3 : p === 'facebook' ? 4 : 12;
  const brand = pillar === 'manitou' || pillar === 'kampanya' ? TAGS.marka.manitou : TAGS.marka.diger;
  const topic = (TAGS.konu[pillar] ?? TAGS.konu.santiye).filter((t) => !/[^\p{L}#]/u.test(t));
  const plan = p === 'instagram'
    ? [brand, ...TAGS.yerel.slice(0, 4), ...topic.slice(0, 5), ...TAGS.genis.slice(0, 2)]
    : p === 'facebook' ? [TAGS.yerel[0], TAGS.yerel[3], topic[0], brand]
    : p === 'x' ? [topic[0], TAGS.yerel[3]]
    : p === 'youtube' ? [topic[0], TAGS.yerel[3], '#shorts']
    : [topic[0], topic[1], TAGS.yerel[0], TAGS.yerel[3], '#fyp'];
  const out: string[] = [];
  for (const t of [...plan, ...ai]) { const k = t.toLocaleLowerCase('tr-TR'); if (t.startsWith('#') && !out.some((o) => o.toLocaleLowerCase('tr-TR') === k)) out.push(t); }
  return out.slice(0, max);
}

function fallbackItems(p: Platform, pillars: typeof PILLARS[number][]): Item[] {
  // AI yoksa: marka bilgisiyle hazır, uydurma içermeyen kısa metinler (yine onaya düşer)
  return pillars.map((pl, i) => ({
    format: i === 0 ? 'reel' : 'banner', brand: pl.brand as Item['brand'], title: `${pl.badge} · ${p}`, badge: pl.badge,
    headline: pl.key === 'manitou' ? 'Operatörlü Manitou Kiralama' : pl.key === 'villa' ? 'Çatalca’da Villa & Müstakil Ev' : pl.key === 'donusum' ? 'Kentsel Dönüşümde Güvenilir Çözüm' : pl.key === 'tadilat' ? 'Tadilat · Çatı · Dış Cephe' : pl.key === 'kampanya' ? 'Ücretsiz Keşif · Hızlı Teklif' : pl.key === 'ipucu' ? 'Ev Yaptıracaklara 5 İpucu' : 'Şantiyeden Gerçek İş',
    subtitle: pl.topic, caption: `${pl.topic}. Keşif ve teklif için bize yazın: 0531 436 29 04`,
    hashtags: p === 'x' ? ['#inşaat', '#istanbul'] : ['#inşaat', '#istanbul', '#çatalca', '#manitou', '#şantiye'].slice(0, p === 'tiktok' ? 4 : 5),
    cta: 'WhatsApp: 0531 436 29 04', video_script: i === 0 ? '0-2 sn: şantiyeden güçlü görüntü (manitou kaldırırken) · 3-10 sn: işin yapılışı · 11-20 sn: bitmiş iş/önce-sonra · son 3 sn: logo + telefon' : undefined,
  }));
}

// Sunucu CPU sınırı (istek başına ~2 sn): fotoğraflı banner çizimi ağır → her çağrıda en fazla 1 banner çizilir; worker dakikada bir kaldığı yerden sürdürür.
export async function runContentFactory(db: Db, opts: { force?: boolean; maxBanners?: number } = {}) {
  const maxBanners = opts.maxBanners ?? 1; let rendered = 0; let partial = false;
  const { label: day } = istanbulDayRange();
  const { data: quotas } = await db.from('content_quota').select('*').eq('enabled', true);
  const brand = await defaultBrand(db);
  const { data: bot } = await db.from('automation_bots').select('id').eq('slug', 'icerik-fabrikasi').maybeSingle();
  const { data: admin } = await db.from('team_members').select('user_id').eq('role', 'admin').order('created_at').limit(1).maybeSingle();
  // Gerçek medya: en az kullanılan video/fotoğraf önce (Drive'dan gelenler dahil) → her gün farklı kareler
  const { data: vids } = await db.from('media_library').select('id,url,cover_url,title,use_count,source,edit').eq('kind', 'video').is('archived_at', null)
    .order('last_used_at', { ascending: true, nullsFirst: true }).order('created_at', { ascending: true }).limit(40);
  // Önce hazır montajlar (logolu, adım yazılı Reels), sonra ham videolar; HEVC en sona (bazı tarayıcılarda önizlenmez)
  const rank = (v: { source?: string | null; edit?: { codec?: string } | null }) => (v.source === 'montage' ? 0 : v.edit?.codec === 'hevc' ? 2 : 1);
  const videos = (vids || []).map((v, i) => ({ v, i })).sort((a, b) => rank(a.v) - rank(b.v) || a.i - b.i).map((x) => x.v);
  const { data: photos } = await db.from('media_library').select('id,url,mime,use_count').eq('kind', 'image').is('archived_at', null)
    .order('last_used_at', { ascending: true, nullsFirst: true }).order('created_at', { ascending: true }).limit(60);
  let pIdx = 0;
  const markUsed = async (m: { id: string; use_count?: number | null }) => {
    m.use_count = (m.use_count ?? 0) + 1;
    await db.from('media_library').update({ use_count: m.use_count, last_used_at: new Date().toISOString() }).eq('id', m.id);
  };
  const { data: existing } = await db.rpc('content_quota_today');
  const have = new Map(((existing || []) as Array<{ platform: string; videos: number; banners: number }>).map((r) => [r.platform, r]));
  const di = dayIndex(day); let created = 0; const errors: string[] = []; let vIdx = 0;
  const actx = { db, runId: null, actorId: admin?.user_id ?? null, tokens: { in: 0, out: 0 }, agent: null } as unknown as Parameters<typeof aiComplete>[0];

  for (const q of (quotas || []) as Quota[]) {
    if (partial) break;
    const h = have.get(q.platform); const needV = Math.max(0, q.video_per_day - (h?.videos ?? 0)); const needB = Math.max(0, q.image_per_day - (h?.banners ?? 0));
    if (!needV && !needB && !opts.force) continue;
    const pillars = [0, 1, 2].map((i) => PILLARS[(di * 3 + i + ['instagram', 'tiktok', 'youtube', 'facebook', 'x'].indexOf(q.platform)) % PILLARS.length]);
    let items: Item[] = [];
    try {
      const { json } = await aiComplete(actx, 'content_factory', [
        `Embay Yapı (villa, müstakil ev, kentsel dönüşüm, tadilat — Çatalca/İstanbul) ve Şahin Manitou (operatörlü teleskopik yükleyici kiralama) için ${q.platform.toUpperCase()} platformunda BUGÜN paylaşılacak 3 içerik yaz.`,
        `1. içerik format=reel (kısa dikey video: kanca + çekim senaryosu video_script'e), 2. ve 3. içerik format=banner (görsel üzerinde büyük başlık "headline" en fazla 5 kelime, "subtitle" en fazla 14 kelime).`,
        `Konular sırasıyla: ${pillars.map((p, i) => `${i + 1}) ${p.topic} [marka: ${p.brand}]`).join(' · ')}`,
        PLATFORM_RULES[q.platform],
        `"cta" en fazla 24 karakter. İletişim: ${brand?.phone ?? '0531 436 29 04'} · WhatsApp · ${brand?.website ?? ''}. Uydurma müşteri adı, rakam, fiyat, proje YAZMA. Türkçe, doğal, satış baskısı olmayan ama harekete geçiren dil. Hashtag'ler # ile.`,
      ].join('\n'), CONTENT_SCHEMA);
      // deno-lint-ignore no-explicit-any
      items = ((json?.items ?? []) as any[]).slice(0, 3).map((it, i) => ({ ...it, format: i === 0 ? 'reel' : 'banner', badge: pillars[i].badge, brand: pillars[i].brand as Item['brand'],
        hashtags: (Array.isArray(it.hashtags) ? it.hashtags : []).map((t: string) => (String(t).startsWith('#') ? String(t) : `#${t}`)).slice(0, q.platform === 'x' ? 2 : q.platform === 'tiktok' ? 5 : 12) }));
    } catch (e) { errors.push(`${q.platform}: AI — ${String((e as Error).message).slice(0, 120)} (hazır metin kullanıldı)`); }
    if (items.length < 3) items = fallbackItems(q.platform, pillars);
    items = items.map((it, i) => ({ ...it, hashtags: tagMix(q.platform, pillars[i].key, it.hashtags) }));

    const plan = [...(needV ? [items[0]] : []), ...items.slice(1 + Math.max(0, q.image_per_day - needB)).slice(0, needB)]; // yarım kalan günde kalan konudan devam
    for (const [i, it] of plan.entries()) {
      if (it.format === 'banner' && rendered >= maxBanners) { partial = true; break; }
      try {
        if (it.format === 'banner') rendered++;
        const slot = q.slot_times[Math.min(i + (3 - plan.length), q.slot_times.length - 1)] ?? '12:00';
        let media: string[] = []; let video_url: string | null = null; let note = ''; let reelCover: string | null = null;
        if (it.format === 'banner') {
          const ph = photos?.length ? photos[pIdx++ % photos.length] : null;
          const photo = ph ? new Uint8Array(await (await fetch(ph.url)).arrayBuffer()).slice(0) : null;
          if (ph) await markUsed(ph);
          const png = await renderBanner({ w: q.width, h: q.height, brand, brandName: it.brand, badge: it.badge, headline: it.headline, subtitle: it.subtitle, cta: it.cta, photo: photo && photo.length < 4_000_000 ? photo : null, photoMime: ph?.mime });
          const path = `factory/${day}/${q.platform}-${Date.now()}-${i}.jpg`;
          const up = await db.storage.from('design-exports').upload(path, png, { contentType: 'image/jpeg', upsert: true });
          if (up.error) throw up.error;
          media = [db.storage.from('design-exports').getPublicUrl(path).data.publicUrl];
          await db.from('media_library').insert({ kind: 'banner', title: it.headline.slice(0, 120), url: media[0], mime: 'image/jpeg', width: q.width, height: q.height, targets: [q.platform],
            caption: it.caption, hashtags: it.hashtags, status: 'queued', platform: q.platform, pillar: it.badge, source: 'factory', created_by: admin?.user_id ?? null,
            template: { headline: it.headline, subtitle: it.subtitle, badge: it.badge, cta: it.cta, brand: it.brand, width: q.width, height: q.height, photo_url: ph?.url ?? null } });
        } else {
          const v = videos?.[vIdx++ % Math.max(1, videos?.length ?? 0)];
          if (v) { video_url = v.url; media = [v.url]; reelCover = v.cover_url ?? null; await markUsed(v); }
          else note = 'VİDEO GEREKLİ: Video Havuzu’na şantiye/manitou videosu yükleyin; aşağıdaki senaryoya göre çekin.';
        }
        const body = `${it.caption}\n\n${it.hashtags.join(' ')}`;
        const { error } = await db.from('social_drafts').insert({
          brand: it.brand, title: `${q.platform.toUpperCase()} · ${it.format === 'reel' ? 'Kısa video' : 'Banner'} · ${it.headline}`.slice(0, 200), body,
          caption: it.caption, headline: it.headline, hashtags: it.hashtags, cta: it.cta, format: it.format, networks: [q.platform], platform_targets: [q.platform], primary_platform: q.platform,
          media_urls: media, video_url, design_url: it.format === 'banner' ? media[0] : reelCover, design_brief: it.video_script ? `Çekim senaryosu: ${it.video_script}` : null,
          image_brief: note || null, scheduled_at: slotIso(day, slot), status: 'onay_bekliyor', workflow_status: 'pending_approval', archive_status: 'active',
          bot_id: bot?.id ?? null, content_pillar: it.badge, campaign_name: `Günlük içerik ${day}`, created_by: admin?.user_id ?? null,
          kvkk_basis: 'İçerik Fabrikası taslağı; yayın öncesi insan onayı zorunlu.',
        });
        if (error) throw error;
        await db.from('post_templates').insert({ title: it.headline.slice(0, 200), platform: q.platform, brand: it.brand, pillar: it.badge, headline: it.headline, caption: it.caption,
          hashtags: it.hashtags, cta: it.cta, source: 'factory', created_by: admin?.user_id ?? null });
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
export async function renderBannerToPool(db: Db, input: { id?: string | null; title?: string; platform?: string; template: { headline: string; subtitle?: string; badge?: string; cta?: string; brand?: string; width?: number; height?: number; photo_url?: string | null } }, userId: string | null) {
  const t = input.template;
  const brand = await defaultBrand(db);
  const size: Record<string, [number, number]> = { instagram: [1080, 1350], facebook: [1080, 1350], tiktok: [1080, 1920], youtube: [1080, 1920], x: [1600, 900] };
  const [w, h] = t.width && t.height ? [t.width, t.height] : size[input.platform ?? 'instagram'] ?? [1080, 1350];
  let photo: Uint8Array | null = null; let photoMime: string | undefined;
  if (t.photo_url) { const r = await fetch(t.photo_url).catch(() => null); if (r?.ok) { photo = new Uint8Array(await r.arrayBuffer()); photoMime = r.headers.get('content-type') ?? undefined; if (photo.length > 4_000_000) photo = null; } }
  const brandName = (t.brand === 'Şahin Manitou' || t.brand === 'Embay Yapı') ? t.brand : 'İkisi';
  const png = await renderBanner({ w, h, brand, brandName, badge: (t.badge || 'EMBAY').slice(0, 24), headline: t.headline, subtitle: t.subtitle ?? '', cta: t.cta || brand?.default_cta || 'Hemen arayın', photo, photoMime });
  const path = `pool/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  const up = await db.storage.from('design-exports').upload(path, png, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw up.error;
  const url = db.storage.from('design-exports').getPublicUrl(path).data.publicUrl;
  const row = { url, mime: 'image/jpeg', width: w, height: h, template: { ...t, width: w, height: h }, title: (input.title || t.headline).slice(0, 120), platform: input.platform ?? null, pillar: t.badge ?? null, updated_at: new Date().toISOString() };
  if (input.id) {
    const { data, error } = await db.from('media_library').update(row).eq('id', input.id).eq('kind', 'banner').select('*').single();
    if (error) throw error; return data;
  }
  const { data, error } = await db.from('media_library').insert({ ...row, kind: 'banner', status: 'pool', source: 'manual', targets: input.platform ? [input.platform] : [], created_by: userId }).select('*').single();
  if (error) throw error; return data;
}
