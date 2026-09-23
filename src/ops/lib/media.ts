// Medya yükleme ortak yardımcıları (Yayın Kuyruğu + Video Havuzu). Dosyalar herkese açık 'media-uploads' deposuna gider;
// Instagram/YouTube API'leri medyayı bu herkese açık adresten çeker.
import { db } from './hooks';
import { dayKey } from './format';

export type Target = { key: string; platform: 'instagram' | 'facebook' | 'youtube'; format: string; label: string; needsVideo?: boolean; maxSec?: number };
export const TARGETS: Target[] = [
  { key: 'ig_post', platform: 'instagram', format: 'post', label: 'Instagram gönderi' },
  { key: 'ig_reel', platform: 'instagram', format: 'reel', label: 'Instagram Reels', needsVideo: true, maxSec: 900 },
  { key: 'ig_story', platform: 'instagram', format: 'story', label: 'Instagram hikâye', maxSec: 60 },
  { key: 'fb_post', platform: 'facebook', format: 'post', label: 'Facebook gönderi' },
  { key: 'yt_short', platform: 'youtube', format: 'short', label: 'YouTube Shorts', needsVideo: true, maxSec: 180 },
  { key: 'yt_video', platform: 'youtube', format: 'video', label: 'YouTube video', needsVideo: true },
];
export const MAX_BYTES = 50 * 1024 * 1024;

/** Instagram yalnızca JPEG kabul eder: PNG/WebP/HEIC görselleri tarayıcıda JPEG'e çevirir (en fazla 1440 px). */
export async function toJpeg(file: File): Promise<Blob> {
  if (file.type === 'image/jpeg') return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1440 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  const g = canvas.getContext('2d'); if (!g) throw new Error('Görsel dönüştürülemedi');
  g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); g.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Görsel dönüştürülemedi'))), 'image/jpeg', 0.9));
}

export async function uploadMedia(file: File): Promise<string> {
  const video = file.type.startsWith('video/');
  if (!video && !file.type.startsWith('image/')) throw new Error(`${file.name}: yalnızca görsel veya video yüklenebilir`);
  const blob = video ? file : await toJpeg(file);
  if (blob.size > MAX_BYTES) throw new Error(`${file.name}: dosya 50 MB sınırını aşıyor`);
  const ext = video ? (file.type === 'video/quicktime' ? 'mov' : 'mp4') : 'jpg';
  const contentType = video ? (file.type === 'video/quicktime' ? 'video/quicktime' : 'video/mp4') : 'image/jpeg';
  const path = `${dayKey(new Date()).slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const s = db();
  const { error } = await s.storage.from('media-uploads').upload(path, blob, { contentType, upsert: false });
  if (error) throw new Error(`${file.name}: yükleme başarısız (${error.message})`);
  return s.storage.from('media-uploads').getPublicUrl(path).data.publicUrl;
}


/** Hazır bir Blob'u (kırpılmış video, kapak karesi) depoya yükler; herkese açık adresi döndürür. */
export async function uploadBlob(blob: Blob, ext: string, contentType: string): Promise<{ url: string; path: string }> {
  if (blob.size > MAX_BYTES) throw new Error('Dosya 50 MB sınırını aşıyor');
  const path = `${dayKey(new Date()).slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const s = db();
  const { error } = await s.storage.from('media-uploads').upload(path, blob, { contentType, upsert: false });
  if (error) throw new Error(`Yükleme başarısız (${error.message})`);
  return { url: s.storage.from('media-uploads').getPublicUrl(path).data.publicUrl, path };
}

/** Videonun süresi ve boyutu (tarayıcıda okunur). */
export function videoMeta(src: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((res) => {
    const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.src = src;
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) return res({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
      // Bazı telefon/tarayıcı kayıtlarında süre başlıkta yok: sona atlayıp gerçek süreyi öğren
      v.ondurationchange = () => { if (Number.isFinite(v.duration) && v.duration > 0) { v.ondurationchange = null; res({ duration: v.duration, width: v.videoWidth, height: v.videoHeight }); } };
      v.currentTime = 1e7;
      setTimeout(() => res({ duration: Number.isFinite(v.duration) ? v.duration : 0, width: v.videoWidth, height: v.videoHeight }), 4000);
    };
    v.onerror = () => res({ duration: 0, width: 0, height: 0 });
  });
}

/** Videonun belirli saniyesindeki kareyi JPEG olarak alır (kapak görseli). */
export function grabFrame(src: string, at: number): Promise<Blob> {
  return new Promise((res, rej) => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = src;
    v.onloadeddata = () => { v.currentTime = Math.max(0, Math.min(at, (v.duration || at) - 0.05)); };
    v.onseeked = () => {
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
      const g = c.getContext('2d'); if (!g) return rej(new Error('Kare alınamadı'));
      g.drawImage(v, 0, 0); c.toBlob((b) => (b ? res(b) : rej(new Error('Kare alınamadı'))), 'image/jpeg', 0.88);
    };
    v.onerror = () => rej(new Error('Video okunamadı'));
  });
}

/** Tarayıcının kırpılmış video kaydında kullanabileceği biçim (önce MP4 — Instagram MP4 ister). */
export function recorderFormat(): { mime: string; ext: string; contentType: string } | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of ['video/mp4;codecs=avc1,mp4a', 'video/mp4']) if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext: 'mp4', contentType: 'video/mp4' };
  for (const m of ['video/webm;codecs=vp9,opus', 'video/webm']) if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext: 'webm', contentType: 'video/webm' };
  return null;
}

/** Videonun [start, end] aralığını gerçek zamanlı oynatıp yeniden kaydeder (gerçek kırpma). muted: sesi kaldır. */
export async function trimVideo(src: string, start: number, end: number, muted: boolean, onProgress?: (p: number) => void): Promise<{ blob: Blob; ext: string; contentType: string }> {
  const fmt = recorderFormat();
  if (!fmt) throw new Error('Bu tarayıcı video kırpmayı desteklemiyor (Chrome kullanın)');
  // Farklı adresten gelen videoyu önce yerel kopyaya al (tarayıcı güvenliği kaydı engellemesin)
  const local = src.startsWith('blob:') ? src : URL.createObjectURL(await (await fetch(src)).blob());
  const v = document.createElement('video'); v.src = local; v.playsInline = true; v.preload = 'auto';
  v.style.position = 'fixed'; v.style.opacity = '0'; v.style.pointerEvents = 'none'; v.style.width = '2px'; document.body.appendChild(v);
  try {
    await new Promise<void>((r, j) => { v.onloadeddata = () => r(); v.onerror = () => j(new Error('Video okunamadı')); });
    v.currentTime = start;
    await new Promise<void>((r) => { v.onseeked = () => r(); });
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const stream: MediaStream = (v as any).captureStream ? (v as any).captureStream() : (v as any).mozCaptureStream();
    if (muted) stream.getAudioTracks().forEach((t) => stream.removeTrack(t));
    const rec = new MediaRecorder(stream, { mimeType: fmt.mime, videoBitsPerSecond: 5_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise<void>((r) => { rec.onstop = () => r(); });
    rec.start(500);
    v.volume = muted ? 0 : 1;
    await v.play();
    await new Promise<void>((r) => {
      const tick = () => { onProgress?.(Math.min(1, (v.currentTime - start) / Math.max(0.1, end - start))); if (v.currentTime >= end || v.ended) r(); else requestAnimationFrame(tick); };
      tick();
    });
    v.pause(); rec.stop(); await done;
    return { blob: new Blob(chunks, { type: fmt.contentType }), ext: fmt.ext, contentType: fmt.contentType };
  } finally { v.remove(); if (local !== src) URL.revokeObjectURL(local); }
}
