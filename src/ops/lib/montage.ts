// REELS MONTAJI (tarayıcıda): havuzdaki video/fotoğraflardan dikey (1080×1920) tanıtım videosu üretir.
// Her sahneye adım etiketi (ör. "1 · Temel"), üstte marka şeridi + inşaat amblemi, altta telefon şeridi, sonda kapanış kartı.
// Sunucu gerekmez: kareler canvas'a çizilir, MediaRecorder ile kaydedilir (Chrome: MP4; destek yoksa WebM).
import { recorderFormat } from './media';

export interface MontageClip { url: string; kind: 'video' | 'image'; label: string; start?: number; seconds: number }
export interface MontageOptions { brand: 'Embay Yapı' | 'Şahin Manitou'; title: string; phone: string; website: string; cta: string; emblem: EmblemName; hook?: string }
export type EmblemName = 'vinc' | 'baret' | 'bina' | 'ev' | 'manitou' | 'alet';

// hook: ilk 1.8 sn ekranı kaplayan merak sorusu (Shorts/Reels'te izleyiciyi tutar). Uydurma rakam/iddia yok.
export const MONTAGE_TEMPLATES: Array<{ key: string; name: string; brand: MontageOptions['brand']; emblem: EmblemName; title: string; cta: string; labels: string[]; hook: string }> = [
  { key: 'asamalar', name: 'İnşaat aşamaları', brand: 'Embay Yapı', emblem: 'bina', title: 'Temelden anahtar teslime', cta: 'Ücretsiz keşif için arayın', labels: ['Temel', 'Kaba inşaat', 'Çatı', 'Dış cephe', 'Anahtar teslim'], hook: 'Bu ev nasıl yükseldi? Sonuna kadar izleyin' },
  { key: 'villa', name: 'Villa / müstakil ev', brand: 'Embay Yapı', emblem: 'ev', title: 'Çatalca’da villa inşaatı', cta: 'Projenizi konuşalım', labels: ['Proje & ruhsat', 'Temel', 'Karkas', 'İnce işler', 'Teslim'], hook: 'Hayalinizdeki villa buradan başlıyor' },
  { key: 'manitou', name: 'Manitou iş başında', brand: 'Embay Yapı', emblem: 'manitou', title: 'Operatörlü Manitou kiralama', cta: 'Günlük / aylık kiralama', labels: ['Şantiyeye kurulum', 'Yükü alma', 'Yüksekte taşıma', 'Yerine bırakma'], hook: 'Bu yük yukarı nasıl çıkıyor?' },
  { key: 'tadilat', name: 'Tadilat · çatı · cephe', brand: 'Embay Yapı', emblem: 'alet', title: 'Tadilat ve dış cephe', cta: 'Ücretsiz keşif', labels: ['Önce', 'Söküm & hazırlık', 'Uygulama', 'Sonra'], hook: 'Önce ve sonra: farkı görün' },
  { key: 'santiye', name: 'Şantiyeden kareler', brand: 'Embay Yapı', emblem: 'vinc', title: 'Şantiyeden gerçek iş', cta: 'Hemen arayın', labels: ['Şantiye', 'Ekibimiz', 'Makinelerimiz', 'İşimiz'], hook: 'Şantiyede bir günümüz' },
];

// Banner'lardaki amblemlerin aynısı (100×100 çizgi ikon; SVG path)
const EMBLEMS: Record<EmblemName, string[]> = {
  vinc: ['M32 94V14M18 94h30M32 14h58M32 14l14-10 14 10M32 26l10-12M32 40l10-12M32 54l10-12M32 68l10-12M32 82l10-12M42 14v80M80 14v30', 'M74 44h12v9H74z', 'M14 14h18v9H14z'],
  baret: ['M12 72h76', 'M20 72c0-34 60-34 60 0', 'M50 36v22M38 40v26M62 40v26', 'M26 80h48'],
  bina: ['M18 94V22h36v72M54 44h28v50M10 94h80', 'M26 32h8v8h-8zM40 32h8v8h-8zM26 48h8v8h-8zM40 48h8v8h-8zM26 64h8v8h-8zM40 64h8v8h-8zM62 54h8v8h-8zM62 70h8v8h-8z', 'M32 94V82h10v12'],
  ev: ['M10 52L50 18l40 34', 'M22 44v48h56V44', 'M42 92V68h16v24', 'M28 54h10v10H28zM62 54h10v10H62z', 'M68 30V16h8v20'],
  manitou: ['M12 74h44V54H40l-6-12H20v12h-8z', 'M48 60l34-30', 'M52 66l34-30', 'M84 26v16h12', 'M15 80a9 9 0 1 0 18 0a9 9 0 1 0 -18 0', 'M41 80a9 9 0 1 0 18 0a9 9 0 1 0 -18 0'],
  alet: ['M22 84l36-36', 'M58 48a14 14 0 1 0 12-22l-8 8-6-2-2-6 8-8a14 14 0 0 0-4 30', 'M34 22l22 22M28 28l12-12 10 10-12 12z', 'M50 44l30 30-6 6-30-30'],
};
function drawEmblem(g: CanvasRenderingContext2D, name: EmblemName, x: number, y: number, size: number, color: string, width = 7) {
  g.save(); g.translate(x, y); g.scale(size / 100, size / 100);
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const d of EMBLEMS[name]) g.stroke(new Path2D(d));
  g.restore();
}

const W = 1080, H = 1920, FPS = 30;
const PALETTE = { 'Embay Yapı': { bg: '#262A6B', acc: '#8FC6F2', ink: '#1B1F52' }, 'Şahin Manitou': { bg: '#111827', acc: '#F5B301', ink: '#111827' } } as const;

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function cover(g: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, zoom = 1) {
  const s = Math.max(W / sw, H / sh) * zoom; const dw = sw * s, dh = sh * s;
  g.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
function wrapLines(g: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/); const out: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (g.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}

async function loadMedia(c: MontageClip): Promise<{ el: HTMLVideoElement | HTMLImageElement; w: number; h: number; local: string }> {
  const local = URL.createObjectURL(await (await fetch(c.url)).blob()); // yerel kopya: canvas "kirlenmesin"
  if (c.kind === 'image') {
    const img = new Image(); img.src = local; await img.decode();
    return { el: img, w: img.naturalWidth, h: img.naturalHeight, local };
  }
  const v = document.createElement('video'); v.src = local; v.muted = true; v.playsInline = true; v.preload = 'auto';
  await new Promise<void>((r, j) => { v.onloadeddata = () => r(); v.onerror = () => j(new Error('Video açılamadı (tarayıcı bu formatı oynatamıyor olabilir)')); });
  return { el: v, w: v.videoWidth, h: v.videoHeight, local };
}

/** Montajı üretir: toplam süre ≈ sahneler + 3 sn kapanış. Gerçek zamanlı kaydedilir (süre kadar bekler). */
export async function renderMontage(clips: MontageClip[], o: MontageOptions, onProgress?: (p: number, note: string) => void): Promise<{ blob: Blob; ext: string; contentType: string; cover: Blob }> {
  const fmt = recorderFormat();
  if (!fmt) throw new Error('Bu tarayıcı video üretmeyi desteklemiyor (Chrome kullanın)');
  if (!clips.length) throw new Error('En az bir sahne seçin');
  await document.fonts?.ready;
  onProgress?.(0, 'Sahneler hazırlanıyor…');
  const media = [];
  for (const [i, c] of clips.entries()) { onProgress?.(0, `Sahne ${i + 1}/${clips.length} yükleniyor…`); media.push(await loadMedia(c)); }

  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  const pal = PALETTE[o.brand];
  const stream = canvas.captureStream(FPS);
  const rec = new MediaRecorder(stream, { mimeType: fmt.mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>((r) => { rec.onstop = () => r(); });
  const END = 3; const total = clips.reduce((s, c) => s + c.seconds, 0) + END;
  let coverBlob: Blob | null = null;

  const overlay = (label: string, step: number, t: number, scene: number) => {
    // üst marka şeridi
    const grad = g.createLinearGradient(0, 0, 0, 330); grad.addColorStop(0, 'rgba(0,0,0,0.65)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, W, 330);
    g.fillStyle = pal.acc; roundRect(g, 60, 70, 120, 120, 26); g.fill();
    drawEmblem(g, o.emblem, 72, 80, 96, pal.ink, 9);
    g.fillStyle = '#fff'; g.font = 'bold 54px "DejaVu Sans", system-ui, sans-serif'; g.fillText(o.brand, 210, 125);
    g.font = '32px system-ui, sans-serif'; g.fillStyle = '#E5F3EA'; g.fillText(o.title, 210, 172);
    // adım etiketi (sahneye girerken kayarak gelir)
    const slide = Math.min(1, t / 0.4);
    g.font = 'bold 64px system-ui, sans-serif';
    const text = `${step} · ${label}`; const tw = g.measureText(text).width;
    const bx = 60 - (1 - slide) * (tw + 200), by = H - 560;
    g.fillStyle = pal.acc; roundRect(g, bx, by, tw + 150, 110, 55); g.fill();
    drawEmblem(g, o.emblem, bx + 22, by + 17, 76, pal.ink, 10);
    g.fillStyle = pal.ink; g.fillText(text, bx + 115, by + 77);
    // ilerleme noktaları
    clips.forEach((_, i) => { g.fillStyle = i === scene ? pal.acc : 'rgba(255,255,255,0.45)'; roundRect(g, 60 + i * 70, H - 410, i === scene ? 56 : 40, 12, 6); g.fill(); });
    // alt şerit
    g.fillStyle = pal.acc; g.fillRect(0, H - 250, W, 250);
    g.fillStyle = pal.ink; g.font = 'bold 50px system-ui, sans-serif'; g.fillText(o.cta, 60, H - 150);
    g.font = 'bold 76px system-ui, sans-serif'; g.fillText(`☎ ${o.phone}`, 60, H - 62);
  };
  // Açılış merak kartı: yarı saydam lacivert zemin, büyük beyaz soru, gökyüzü mavisi çizgi; 1.4 sn'den sonra söner
  const hookCard = (text: string, t: number) => {
    const a = t < 1.4 ? 1 : Math.max(0, 1 - (t - 1.4) / 0.4);
    g.save(); g.globalAlpha = a;
    g.fillStyle = 'rgba(27,31,82,0.78)'; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.fillStyle = '#FFFFFF'; g.font = 'bold 92px system-ui, sans-serif';
    const lines = wrapLines(g, text.toLocaleUpperCase('tr-TR'), W - 180).slice(0, 4);
    const top = H / 2 - (lines.length * 110) / 2 + 60;
    lines.forEach((l, k) => g.fillText(l, W / 2, top + k * 110));
    g.fillStyle = pal.acc; roundRect(g, W / 2 - 90, top + lines.length * 110 - 40, 180, 12, 6); g.fill();
    g.restore(); g.textAlign = 'left';
  };
  const endCard = (t: number) => {
    g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.12; drawEmblem(g, o.emblem, 140, 420, 800, pal.acc, 5); g.globalAlpha = 1;
    g.fillStyle = pal.acc; roundRect(g, W / 2 - 110, 360, 220, 220, 44); g.fill();
    drawEmblem(g, o.emblem, W / 2 - 88, 382, 176, pal.ink, 9);
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = 'bold 84px system-ui, sans-serif'; g.fillText(o.brand, W / 2, 720);
    g.font = 'bold 60px system-ui, sans-serif';
    wrapLines(g, o.title, W - 160).slice(0, 2).forEach((l, i) => g.fillText(l, W / 2, 840 + i * 76));
    const pulse = 1 + 0.04 * Math.sin(t * 6);
    g.save(); g.translate(W / 2, 1180); g.scale(pulse, pulse);
    g.fillStyle = pal.acc; roundRect(g, -470, -90, 940, 180, 90); g.fill();
    g.fillStyle = pal.ink; g.font = 'bold 76px system-ui, sans-serif'; g.fillText(`☎ ${o.phone}`, 0, 28); g.restore();
    g.fillStyle = '#E5F3EA'; g.font = '38px system-ui, sans-serif'; g.fillText('WhatsApp’tan yazın', W / 2, 1350); if (o.website) g.fillText(o.website, W / 2, 1410);
    g.textAlign = 'left';
  };

  rec.start(500);
  try {
    let elapsed = 0;
    for (const [i, c] of clips.entries()) {
      const m = media[i];
      if (m.el instanceof HTMLVideoElement) { m.el.currentTime = c.start ?? 0; await new Promise<void>((r) => { (m.el as HTMLVideoElement).onseeked = () => r(); }); await m.el.play(); }
      const t0 = performance.now();
      await new Promise<void>((resolve) => {
        const frame = () => {
          const t = (performance.now() - t0) / 1000;
          g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
          // fotoğrafta yavaş yakınlaşma (Ken Burns), videoda gerçek görüntü
          cover(g, m.el, m.w, m.h, m.el instanceof HTMLImageElement ? 1 + 0.06 * (t / c.seconds) : 1);
          // sahne geçişi: ilk 0.3 sn karartmadan açılış
          if (t < 0.3) { g.fillStyle = `rgba(0,0,0,${1 - t / 0.3})`; g.fillRect(0, 0, W, H); }
          overlay(c.label, i + 1, t, i);
          if (i === 0 && o.hook && t < 1.8) hookCard(o.hook, t);
          if (!coverBlob && i === 0 && t > 0.8) canvas.toBlob((b) => { if (b && !coverBlob) coverBlob = b; }, 'image/jpeg', 0.88);
          onProgress?.(Math.min(0.99, (elapsed + t) / total), `Sahne ${i + 1}/${clips.length}: ${c.label}`);
          if (t >= c.seconds || (m.el instanceof HTMLVideoElement && m.el.ended)) resolve(); else requestAnimationFrame(frame);
        };
        frame();
      });
      if (m.el instanceof HTMLVideoElement) m.el.pause();
      elapsed += c.seconds;
    }
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => { const t = (performance.now() - t0) / 1000; endCard(t); onProgress?.(Math.min(0.99, (elapsed + t) / total), 'Kapanış kartı'); if (t >= END) resolve(); else requestAnimationFrame(frame); };
      frame();
    });
  } finally {
    rec.stop(); await stopped;
    media.forEach((m) => URL.revokeObjectURL(m.local));
  }
  onProgress?.(1, 'Hazır');
  const blob = new Blob(chunks, { type: fmt.contentType });
  const fallbackCover = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.88));
  return { blob, ext: fmt.ext, contentType: fmt.contentType, cover: coverBlob ?? fallbackCover };
}
