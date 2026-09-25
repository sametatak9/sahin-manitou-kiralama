// GOOGLE DRIVE → MEDYA HAVUZU: "bağlantıya sahip herkes görüntüleyebilir" paylaşılan klasörden fotoğraf ve videoları içe aktarır.
// Anahtar/OAuth gerekmez (yalnızca herkese açık klasör okunur). Aynı dosya iki kez alınmaz (storage_path = drive/<dosya-id>).
// Fotoğraflar Drive'ın JPEG önizlemesinden alınır (HEIC dahil her format JPEG'e çevrilir, en fazla 2000 px). Videolar olduğu gibi alınır (depo sınırı 50 MB).
// Silme yok: klasörden silinen dosya havuzda kalır; havuzdan kaldırmak = arşiv.
import type { Db } from './context.ts';

const BUCKET = 'media-uploads';
const MAX_VIDEO = 50 * 1024 * 1024;
const UA = { 'user-agent': 'Mozilla/5.0 (EmbayOps Drive import)' };

export interface DriveEntry { id: string; title: string; folder: boolean; path: string }
export interface DriveSyncResult { found: number; imported: number; skipped: number; already: number; errors: string[]; large: string[]; folders: number; pending: number }

export function parseFolderId(input: string): string | null {
  const s = String(input || '').trim();
  const m = s.match(/folders\/([A-Za-z0-9_-]{10,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,})/) || s.match(/^([A-Za-z0-9_-]{20,})$/);
  return m ? m[1] : null;
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

/** Herkese açık klasörün (ve alt klasörlerinin) dosya listesi. */
export async function listPublicFolder(folderId: string, path = '', depth = 0): Promise<{ title: string; entries: DriveEntry[] }> {
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`, { headers: UA });
  if (!r.ok) throw new Error(`Drive klasörü okunamadı (HTTP ${r.status}). Klasör "Bağlantıya sahip herkes" olarak paylaşılmalı.`);
  const html = await r.text();
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  const entries: DriveEntry[] = [];
  for (const block of html.split('class="flip-entry"').slice(1)) {
    const href = block.match(/href="([^"]+)"/)?.[1] ?? '';
    const name = decode(block.match(/flip-entry-title">([^<]*)</)?.[1] ?? '');
    const folder = href.match(/folders\/([A-Za-z0-9_-]+)/)?.[1];
    const file = href.match(/file\/d\/([A-Za-z0-9_-]+)/)?.[1] || block.match(/id="entry-([A-Za-z0-9_-]+)"/)?.[1];
    if (folder) {
      if (depth < 3) {
        const sub = await listPublicFolder(folder, path ? `${path}/${name}` : name, depth + 1).catch(() => null);
        entries.push({ id: folder, title: name, folder: true, path }, ...(sub?.entries ?? []));
      }
    } else if (file) entries.push({ id: file, title: name, folder: false, path });
  }
  return { title, entries };
}

const VIDEO_EXT: Record<string, string> = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp', 'tif', 'tiff']);
function classify(title: string): 'video' | 'image' | null {
  const ext = title.split('.').pop()?.toLowerCase() ?? '';
  if (VIDEO_EXT[ext]) return 'video';
  if (IMAGE_EXT.has(ext)) return 'image';
  return null;
}
/** Dosya adından konu tahmini (fabrika banner/reel seçerken işe yarar). */
function guessPillar(text: string): string | null {
  const t = text.toLocaleLowerCase('tr');
  if (/manitou|telehandler|teleskop|forklift|vinç|platform/.test(t)) return 'manitou';
  if (/villa|müstakil|mustakil|ev\b/.test(t)) return 'villa';
  if (/dönüşüm|donusum|kat karşılığı/.test(t)) return 'donusum';
  if (/tadilat|tamir|mantolama|çatı|cati|cephe/.test(t)) return 'tadilat';
  if (/şantiye|santiye|temel|beton|kalıp|kalip|demir|inşaat|insaat/.test(t)) return 'santiye';
  return null;
}
const cleanTitle = (t: string) => t.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 120) || 'Drive medyası';

async function upload(db: Db, path: string, bytes: Uint8Array, mime: string) {
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: true });
  if (error) throw new Error(`depoya yüklenemedi: ${error.message}`);
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
async function thumbnail(id: string, size: number) {
  const r = await fetch(`https://drive.google.com/thumbnail?id=${id}&sz=w${size}`, { headers: UA, redirect: 'follow' });
  const mime = r.headers.get('content-type') || '';
  if (!r.ok || !mime.startsWith('image/')) return null;
  return { bytes: new Uint8Array(await r.arrayBuffer()), mime: mime.split(';')[0] };
}

/** Klasörü eşitler: yeni fotoğraf/videoları havuza ekler. `budgetMs` dolunca durur; tekrar çalıştırınca kaldığı yerden devam eder. */
export async function syncDriveFolder(db: Db, src: { id: string; folder_id: string; created_by: string | null }, budgetMs = 110_000): Promise<DriveSyncResult> {
  const t0 = Date.now();
  const res: DriveSyncResult = { found: 0, imported: 0, skipped: 0, already: 0, errors: [], large: [], folders: 0, pending: 0 };
  const { title, entries } = await listPublicFolder(src.folder_id);
  const files = entries.filter((e) => !e.folder);
  res.folders = entries.length - files.length;
  res.found = files.length;
  const { data: have } = await db.from('media_library').select('storage_path').like('storage_path', 'drive/%').limit(5000);
  const known = new Set((have || []).map((h: { storage_path: string }) => h.storage_path.replace(/\.[a-z0-9]+$/, '')));
  for (const f of files) {
    if (known.has(`drive/${f.id}`)) { res.already++; continue; }
    const kind = classify(f.title);
    if (!kind) { res.skipped++; continue; }
    if (Date.now() - t0 > budgetMs) { res.pending++; continue; }
    const label = `${f.path ? f.path + '/' : ''}${f.title}`;
    try {
      const pillar = guessPillar(label);
      const base = { title: cleanTitle(f.title), status: 'pool', source: 'drive', pillar,
        notes: `Drive: ${title || 'klasör'}${f.path ? ' / ' + f.path : ''}`, created_by: src.created_by, edit: { drive_file_id: f.id, drive_source_id: src.id, drive_url: `https://drive.google.com/file/d/${f.id}/view` } };
      if (kind === 'image') {
        const th = await thumbnail(f.id, 2000);
        if (!th) throw new Error('önizleme alınamadı');
        const url = await upload(db, `drive/${f.id}.jpg`, th.bytes, th.mime === 'image/png' ? 'image/png' : 'image/jpeg');
        const { error } = await db.from('media_library').insert({ ...base, kind: 'image', url, original_url: url, storage_path: `drive/${f.id}.jpg`, mime: th.mime, size_bytes: th.bytes.length, cover_url: url });
        if (error) throw new Error(error.message);
      } else {
        const ext = f.title.split('.').pop()!.toLowerCase();
        const mime = VIDEO_EXT[ext];
        const r = await fetch(`https://drive.usercontent.google.com/download?id=${f.id}&export=download&confirm=t`, { headers: UA, redirect: 'follow' });
        const ct = r.headers.get('content-type') || '';
        if (!r.ok || ct.startsWith('text/html')) throw new Error(`video indirilemedi (HTTP ${r.status})`);
        const len = Number(r.headers.get('content-length') || 0);
        if (len > MAX_VIDEO) { await r.body?.cancel(); res.large.push(`${label} (${Math.round(len / 1048576)} MB)`); continue; }
        const bytes = new Uint8Array(await r.arrayBuffer());
        if (bytes.length > MAX_VIDEO) { res.large.push(`${label} (${Math.round(bytes.length / 1048576)} MB)`); continue; }
        const codec = detectCodec(bytes);
        const store = `drive/${f.id}.${ext === 'm4v' ? 'mp4' : ext}`;
        const url = await upload(db, store, bytes, mime);
        const th = await thumbnail(f.id, 1080).catch(() => null);
        const cover = th ? await upload(db, `drive/${f.id}-cover.jpg`, th.bytes, 'image/jpeg').catch(() => null) : null;
        const { error } = await db.from('media_library').insert({ ...base, edit: { ...base.edit, codec }, kind: 'video', url, original_url: url, storage_path: store, mime, size_bytes: bytes.length, cover_url: cover, targets: ['instagram', 'tiktok', 'youtube', 'facebook'] });
        if (error) throw new Error(error.message);
      }
      res.imported++;
    } catch (e) { res.errors.push(`${label}: ${String((e as Error).message).slice(0, 120)}`); }
  }
  await db.from('drive_sources').update({ title: title || null, last_synced_at: new Date().toISOString(), last_result: res }).eq('id', src.id);
  return res;
}

/** Video kodeği: H.264 (avc1) her tarayıcıda oynar; HEVC (hvc1/hev1, iPhone varsayılanı) Android/Windows Chrome'da çoğunlukla oynamaz. */
export function detectCodec(bytes: Uint8Array): 'h264' | 'hevc' | 'unknown' {
  const has = (tag: string) => { const t = [...tag].map((c) => c.charCodeAt(0)); outer: for (let i = 0; i + 4 <= bytes.length; i++) { for (let k = 0; k < 4; k++) if (bytes[i + k] !== t[k]) continue outer; return true; } return false; };
  if (has('hvc1') || has('hev1')) return 'hevc';
  if (has('avc1')) return 'h264';
  return 'unknown';
}

/** Kodeği bilinmeyen havuz videolarını yoklar (dakikada en fazla 3). Sonuç media_library.edit.codec'e yazılır. */
export async function probeVideos(db: Db) {
  const { data } = await db.from('media_library').select('id,url,edit').eq('kind', 'video').is('archived_at', null).is('edit->>codec', null).limit(3);
  let n = 0;
  for (const v of (data || []) as Array<{ id: string; url: string; edit: Record<string, unknown> | null }>) {
    let codec: string = 'unknown';
    try { const r = await fetch(v.url); if (r.ok) codec = detectCodec(new Uint8Array(await r.arrayBuffer())); } catch { /* ağ hatası: bilinmiyor */ }
    await db.from('media_library').update({ edit: { ...(v.edit ?? {}), codec } }).eq('id', v.id);
    n++;
  }
  return n;
}

/** Worker: her gün 06:00'dan sonra (fabrika 06:30'dan önce) etkin klasörleri bir kez eşitler. */
export async function driveTick(db: Db, background: (p: Promise<unknown>) => void) {
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const probed = await probeVideos(db).catch(() => 0);
  if (hm < '06:00') return { skipped: true, probed };
  const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
  const recent = new Date(Date.now() - 4 * 60 * 1000).toISOString();
  // Günde bir kez; yarım kalan (pending > 0) eşitleme 4 dakikada bir kaldığı yerden sürer
  const { data } = await db.from('drive_sources').select('id,folder_id,created_by').eq('enabled', true).is('archived_at', null)
    .or(`last_synced_at.is.null,last_synced_at.lt.${since},and(last_result->>pending.gt.0,last_synced_at.lt.${recent})`).limit(1);
  const src = data?.[0];
  if (!src) return { idle: true, probed };
  await db.from('drive_sources').update({ last_synced_at: new Date().toISOString() }).eq('id', src.id); // çift çalışmayı önle
  background(syncDriveFolder(db, src, 110_000).catch(async (e) => { await db.from('drive_sources').update({ last_result: { error: String(e).slice(0, 300) } }).eq('id', src.id); }));
  return { started: src.id };
}
