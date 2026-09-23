// Embay Design Studio çekirdeği: katman tanımından SVG üretir, PNG'ye dönüştürür.
// Canva'yı kopyalamaz; AI içerik → hızlı marka uyumlu görsel → önizleme → onay akışını hızlandırır.
import { forwardRef } from 'react';
import type { BrandKit, DesignLayers } from '../lib/types';

const FONT = 'Space Grotesk, Plus Jakarta Sans, Arial, sans-serif';

function wrap(text: string, maxChars: number, maxLines: number) {
  const words = (text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…');
  return lines;
}

function TextBlock({ x, y, width, text, size, weight = 700, color, maxLines = 3, lineHeight = 1.12, anchor = 'start' }: { x: number; y: number; width: number; text: string; size: number; weight?: number; color: string; maxLines?: number; lineHeight?: number; anchor?: 'start' | 'middle' }) {
  const lines = wrap(text, Math.max(6, Math.floor(width / (size * 0.56))), maxLines);
  return (
    <text x={x} y={y} fill={color} fontFamily={FONT} fontWeight={weight} fontSize={size} textAnchor={anchor}>
      {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : size * lineHeight}>{l}</tspan>)}
    </text>
  );
}
function blockHeight(text: string, width: number, size: number, maxLines: number, lh = 1.12) {
  return wrap(text, Math.max(6, Math.floor(width / (size * 0.56))), maxLines).length * size * lh;
}

export interface CanvasProps {
  width: number; height: number; layers: DesignLayers; brand: BrandKit | null;
  imageHref?: string | null; logoHref?: string | null;
}

export const DesignCanvas = forwardRef<SVGSVGElement, CanvasProps>(function DesignCanvas({ width: W, height: H, layers, brand, imageHref, logoHref }, ref) {
  const primary = brand?.primary_color ?? '#3DAA5C';
  const secondary = brand?.secondary_color ?? '#115A31';
  const accent = brand?.accent_color ?? '#F5B301';
  const ink = brand?.text_color ?? '#0F1A14';
  const pad = Math.round(Math.min(W, H) * 0.07);
  const unit = Math.min(W, H);
  const hSize = Math.round(unit * (layers.variant === 'bold' ? 0.1 : 0.078));
  const sSize = Math.round(unit * 0.036);
  const cSize = Math.round(unit * 0.032);
  const phone = brand?.phone ?? '';
  const company = brand?.company_name ?? 'Embay Yapı';
  const img = imageHref || null;

  const Logo = ({ x, y, size, light = true }: { x: number; y: number; size: number; light?: boolean }) => layers.show_logo ? (
    <g>
      {logoHref ? <image href={logoHref} x={x} y={y} width={size} height={size} preserveAspectRatio="xMidYMid meet" /> : <rect x={x} y={y} width={size} height={size} rx={size * 0.22} fill={primary} />}
      <text x={x + size * 1.25} y={y + size * 0.62} fill={light ? '#FFFFFF' : ink} fontFamily={FONT} fontWeight={700} fontSize={size * 0.42}>{company}</text>
    </g>
  ) : null;

  const Cta = ({ x, y, dark = false }: { x: number; y: number; dark?: boolean }) => {
    if (!layers.cta) return null;
    const w = Math.min(W - pad * 2, layers.cta.length * cSize * 0.58 + cSize * 2.2);
    return (
      <g>
        <rect x={x} y={y} width={w} height={cSize * 2.2} rx={cSize * 1.1} fill={dark ? ink : accent} />
        <text x={x + cSize * 1.1} y={y + cSize * 1.45} fill={dark ? '#FFFFFF' : ink} fontFamily={FONT} fontWeight={700} fontSize={cSize}>{layers.cta}</text>
      </g>
    );
  };
  const Phone = ({ x, y, color, anchor = 'end' }: { x: number; y: number; color: string; anchor?: 'start' | 'end' }) => layers.show_phone && phone ? (
    <text x={x} y={y} fill={color} fontFamily={FONT} fontWeight={700} fontSize={sSize * 0.95} textAnchor={anchor}>☎ {phone}</text>
  ) : null;

  const ImageOr = ({ x, y, w, h, fallback, rx = 0 }: { x: number; y: number; w: number; h: number; fallback: string; rx?: number }) => (
    <g>
      <clipPath id={`clip-${x}-${y}`}><rect x={x} y={y} width={w} height={h} rx={rx} /></clipPath>
      {img ? <image href={img} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${x}-${y})`} />
        : <g clipPath={`url(#clip-${x}-${y})`}><rect x={x} y={y} width={w} height={h} fill={fallback} />
          {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={x - h + i * (w + h) / 8} y={y} width={w * 0.04} height={h * 1.6} fill="#000" opacity={0.08} transform={`rotate(35 ${x + w / 2} ${y + h / 2})`} />)}
        </g>}
    </g>
  );

  let body: React.ReactNode;
  switch (layers.variant) {
    case 'split': {
      const half = W * 0.5;
      const tw = half - pad * 2;
      const hh = blockHeight(layers.headline, tw, hSize, 4);
      body = (<>
        <rect width={W} height={H} fill={primary} />
        <ImageOr x={0} y={0} w={half} h={H} fallback={secondary} />
        <Logo x={half + pad} y={pad} size={unit * 0.07} />
        <TextBlock x={half + pad} y={H * 0.36} width={tw} text={layers.headline} size={hSize} color="#FFFFFF" maxLines={4} />
        <TextBlock x={half + pad} y={H * 0.36 + hh + sSize * 0.6} width={tw} text={layers.subtitle} size={sSize} weight={500} color="#E8F5EC" maxLines={3} lineHeight={1.3} />
        <Cta x={half + pad} y={H - pad - cSize * 2.2 - sSize * 1.6} />
        <Phone x={half + pad} y={H - pad} color="#FFFFFF" anchor="start" />
      </>);
      break;
    }
    case 'story': {
      const imgH = H * 0.56;
      body = (<>
        <rect width={W} height={H} fill={ink} />
        <ImageOr x={0} y={0} w={W} h={imgH} fallback={secondary} />
        <rect x={0} y={imgH - 6} width={W} height={12} fill={accent} />
        <Logo x={pad} y={pad} size={unit * 0.09} />
        <TextBlock x={pad} y={imgH + pad + hSize} width={W - pad * 2} text={layers.headline} size={hSize * 1.05} color="#FFFFFF" maxLines={4} />
        <TextBlock x={pad} y={imgH + pad + hSize + blockHeight(layers.headline, W - pad * 2, hSize * 1.05, 4) + sSize} width={W - pad * 2} text={layers.subtitle} size={sSize * 1.1} weight={500} color="#C7D8CF" maxLines={3} lineHeight={1.3} />
        <Cta x={pad} y={H - pad * 2.2 - cSize * 2.2} />
        <Phone x={W - pad} y={H - pad} color="#FFFFFF" />
      </>);
      break;
    }
    case 'corporate': {
      const tw = W * 0.5 - pad;
      body = (<>
        <rect width={W} height={H} fill="#F4F7F5" />
        <rect x={0} y={0} width={pad * 0.35} height={H} fill={primary} />
        <ImageOr x={W * 0.56} y={pad} w={W * 0.44 - pad} h={H - pad * 2} fallback={secondary} rx={unit * 0.03} />
        <Logo x={pad} y={pad} size={unit * 0.07} light={false} />
        <TextBlock x={pad} y={H * 0.38} width={tw} text={layers.headline} size={hSize * 0.95} color={ink} maxLines={4} />
        <TextBlock x={pad} y={H * 0.38 + blockHeight(layers.headline, tw, hSize * 0.95, 4) + sSize * 0.6} width={tw} text={layers.subtitle} size={sSize} weight={500} color="#44574D" maxLines={3} lineHeight={1.3} />
        <Cta x={pad} y={H - pad - cSize * 2.2 - sSize * 1.6} dark />
        <Phone x={pad} y={H - pad} color={secondary} anchor="start" />
      </>);
      break;
    }
    case 'bold': {
      const r = unit * 0.24;
      body = (<>
        <rect width={W} height={H} fill={primary} />
        <rect x={0} y={H - pad * 1.6} width={W} height={pad * 1.6} fill={ink} />
        <circle cx={W - pad - r} cy={H - pad * 1.6 - r - pad * 0.4} r={r + unit * 0.012} fill={accent} />
        <clipPath id="bold-circle"><circle cx={W - pad - r} cy={H - pad * 1.6 - r - pad * 0.4} r={r} /></clipPath>
        {img ? <image href={img} x={W - pad - r * 2} y={H - pad * 1.6 - r * 2 - pad * 0.4} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath="url(#bold-circle)" /> : <circle cx={W - pad - r} cy={H - pad * 1.6 - r - pad * 0.4} r={r} fill={secondary} />}
        <Logo x={pad} y={pad} size={unit * 0.07} />
        <TextBlock x={pad} y={pad * 2.2 + hSize} width={W * 0.62} text={layers.headline.toLocaleUpperCase('tr-TR')} size={hSize} weight={800} color="#FFFFFF" maxLines={4} lineHeight={1.02} />
        <TextBlock x={pad} y={pad * 2.2 + hSize + blockHeight(layers.headline, W * 0.62, hSize, 4, 1.02) + sSize * 0.4} width={W * 0.55} text={layers.subtitle} size={sSize} weight={500} color="#0F1A14" maxLines={3} lineHeight={1.3} />
        <Cta x={pad} y={H - pad * 1.6 - cSize * 3.2} dark />
        <Phone x={pad} y={H - pad * 0.55} color="#FFFFFF" anchor="start" />
      </>);
      break;
    }
    case 'listing': {
      const imgH = H * 0.68;
      body = (<>
        <rect width={W} height={H} fill="#FFFFFF" />
        <ImageOr x={0} y={0} w={W} h={imgH} fallback={secondary} />
        <rect x={pad} y={pad} width={unit * 0.34} height={cSize * 2} rx={cSize} fill={accent} />
        <text x={pad + cSize} y={pad + cSize * 1.35} fill={ink} fontFamily={FONT} fontWeight={800} fontSize={cSize}>{company.slice(0, 22)}</text>
        <TextBlock x={pad} y={imgH + pad * 0.9 + hSize * 0.8} width={W * 0.66} text={layers.headline} size={hSize * 0.8} color={ink} maxLines={2} />
        <TextBlock x={pad} y={imgH + pad * 0.9 + hSize * 0.8 + blockHeight(layers.headline, W * 0.66, hSize * 0.8, 2) + sSize * 0.2} width={W * 0.66} text={layers.subtitle} size={sSize * 0.9} weight={500} color="#44574D" maxLines={2} lineHeight={1.25} />
        <rect x={W * 0.72} y={imgH + pad * 0.8} width={W * 0.28 - pad} height={H - imgH - pad * 1.6} rx={unit * 0.02} fill={primary} />
        <text x={W * 0.72 + (W * 0.28 - pad) / 2} y={imgH + pad * 0.8 + (H - imgH - pad * 1.6) / 2 + sSize * 0.35} fill="#FFFFFF" fontFamily={FONT} fontWeight={800} fontSize={sSize * 0.95} textAnchor="middle">{layers.show_phone && phone ? phone : (layers.cta || 'Bilgi al').slice(0, 16)}</text>
      </>);
      break;
    }
    default: { // hero
      body = (<>
        <defs>
          <linearGradient id="hero-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.25" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.82" />
          </linearGradient>
        </defs>
        <ImageOr x={0} y={0} w={W} h={H} fallback={secondary} />
        <rect width={W} height={H} fill="url(#hero-shade)" />
        <rect x={pad} y={H * 0.5 - hSize * 0.9} width={unit * 0.12} height={unit * 0.012} fill={accent} />
        <Logo x={pad} y={pad} size={unit * 0.08} />
        <TextBlock x={pad} y={H * 0.5 + hSize * 0.4} width={W - pad * 2} text={layers.headline} size={hSize} color="#FFFFFF" maxLines={3} />
        <TextBlock x={pad} y={H * 0.5 + hSize * 0.4 + blockHeight(layers.headline, W - pad * 2, hSize, 3) + sSize * 0.4} width={W - pad * 2} text={layers.subtitle} size={sSize} weight={500} color="#E6F0EA" maxLines={2} lineHeight={1.3} />
        <Cta x={pad} y={H - pad - cSize * 2.2} />
        <Phone x={W - pad} y={H - pad - cSize * 0.7} color="#FFFFFF" />
      </>);
    }
  }

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', aspectRatio: `${W} / ${H}` }}>
      {body}
    </svg>
  );
});

/** Uzak görseli data URL'e çevirir (canvas'ın "tainted" olmaması için). */
export async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const tryFetch = async (u: string) => { const r = await fetch(u, { mode: 'cors' }); if (!r.ok) throw new Error(String(r.status)); return r.blob(); };
  let blob: Blob;
  try { blob = await tryFetch(url); } catch { blob = await tryFetch(new URL(url, window.location.origin).pathname); }
  return await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result)); fr.onerror = reject; fr.readAsDataURL(blob); });
}

/** SVG düğümünü gerçek piksel boyutunda PNG'ye çevirir. */
export async function svgToPng(svg: SVGSVGElement, width: number, height: number): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width)); clone.setAttribute('height', String(height));
  const xml = new XMLSerializer().serializeToString(clone);
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  const image = new Image();
  image.decoding = 'async';
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('SVG görsele çevrilemedi')); image.src = src; });
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas desteklenmiyor');
  ctx.drawImage(image, 0, 0, width, height);
  return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG üretilemedi'))), 'image/png'));
}

export const FORMATS: Array<{ key: string; label: string; platform: string }> = [
  { key: 'instagram_post', label: 'Instagram Post 1:1', platform: 'instagram' },
  { key: 'instagram_portrait', label: 'Instagram 4:5', platform: 'instagram' },
  { key: 'instagram_story', label: 'Instagram Story 9:16', platform: 'instagram' },
  { key: 'facebook_post', label: 'Facebook Post', platform: 'facebook' },
  { key: 'linkedin_post', label: 'LinkedIn Post', platform: 'linkedin' },
  { key: 'x_post', label: 'X Post 16:9', platform: 'x' },
  { key: 'youtube_thumbnail', label: 'YouTube Thumbnail', platform: 'youtube' },
  { key: 'sahibinden_listing', label: 'Sahibinden İlan', platform: 'sahibinden' },
  { key: 'armut_cover', label: 'Armut Görseli', platform: 'armut' },
  { key: 'gbp_post', label: 'Google İşletme', platform: 'google_business' },
];
export const VARIANTS: Array<{ key: DesignLayers['variant']; label: string }> = [
  { key: 'hero', label: 'Hero' }, { key: 'split', label: 'Split' }, { key: 'story', label: 'Story' },
  { key: 'corporate', label: 'Kurumsal' }, { key: 'bold', label: 'Bold' }, { key: 'listing', label: 'İlan' },
];
