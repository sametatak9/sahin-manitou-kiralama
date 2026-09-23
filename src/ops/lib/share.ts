// Telefondan paylaşım: geliştirici ayarı / hesap bağlantısı gerekmez. Medya + açıklama telefonun kendi paylaşım
// menüsüyle (Instagram, Facebook, WhatsApp, YouTube…) gönderilir. Açıklama ayrıca panoya kopyalanır
// (Instagram paylaşım menüsünden gelen metni almaz; uygulamada "yapıştır" yeterli).
export interface ShareItem { title?: string | null; caption?: string | null; hashtags?: string[] | null; media_urls?: string[] | null; video_url?: string | null }

export const canShareFiles = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export async function shareToPhone(item: ShareItem): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = [item.caption?.trim(), (item.hashtags ?? []).join(' ')].filter(Boolean).join('\n\n');
  try { if (text) await navigator.clipboard?.writeText(text); } catch { /* pano izni yoksa geç */ }
  const url = item.video_url || item.media_urls?.[0] || null;
  if (!canShareFiles()) return 'copied';
  try {
    const files: File[] = [];
    if (url) {
      const blob = await (await fetch(url)).blob();
      const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('quicktime') ? 'mov' : blob.type.includes('webm') ? 'webm' : blob.type.includes('png') ? 'png' : 'jpg';
      files.push(new File([blob], `sahin-manitou.${ext}`, { type: blob.type || (ext === 'mp4' ? 'video/mp4' : 'image/jpeg') }));
    }
    const data: ShareData = files.length && navigator.canShare?.({ files }) ? { files, text, title: item.title ?? undefined } : { text, title: item.title ?? undefined, url: url ?? undefined };
    await navigator.share(data);
    return 'shared';
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'cancelled';
    throw e;
  }
}
