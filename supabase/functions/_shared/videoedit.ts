// Panelden video düzenleme: kurgu (montage) ve düzeltme (fix) işleri.
// Render GitHub Actions'ta yapılır: kuyruk yalnızca herkese açık medya adreslerini ve metinleri verir (gizli bilgi yok);
// sonuç dosyası panel alan adımızda yayına girince "done" ile işe ve havuza bağlanır (yalnızca kendi alan adımızdaki dosya kabul edilir).
import type { Db } from './context.ts';
import { HttpError } from './http.ts';

export const EDIT_HOST = 'https://embay-panel.vercel.app';
const MUSIC = ['house_120_7', 'house_124_3', 'funk_128_11', 'funk_130_9', 'afro_108_4', 'phonk_125_8', 'none'];
const okUrl = (u: unknown) => typeof u === 'string' && /^https:\/\/(utngxnqlcayfjkknaysx\.supabase\.co\/storage\/v1\/object\/public\/|embay-panel\.vercel\.app\/|embayyapi\.vercel\.app\/)/.test(u);
const txt = (s: unknown, n: number) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const num = (v: unknown, lo: number, hi: number, d: number) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };

export interface Clip { url: string; kind: 'video' | 'image'; start: number; dur: number; caption: string }
export interface MontageSpec { clips: Clip[]; hook: string; end_line: string; end_photo: string | null; music: string; grade: boolean; stabilize: boolean }
export interface FixSpec { url: string; trim_start: number; trim_end: number | null; cuts: Array<[number, number]>; mute: boolean; end_card: boolean; end_line: string; music: string }

export function cleanSpec(kind: string, raw: Record<string, unknown>): MontageSpec | FixSpec {
  if (kind === 'montage') {
    const clips = (Array.isArray(raw.clips) ? raw.clips : []).slice(0, 14).map((c: Record<string, unknown>) => ({
      url: String(c.url || ''), kind: c.kind === 'image' ? 'image' : 'video',
      start: num(c.start, 0, 600, 0), dur: num(c.dur, 1, 12, c.kind === 'image' ? 2.5 : 3.5), caption: txt(c.caption, 60),
    }) as Clip).filter((c) => okUrl(c.url));
    if (clips.length < 2) throw new HttpError(400, 'En az 2 klip seçin (video ya da fotoğraf)');
    const total = clips.reduce((s, c) => s + c.dur, 0);
    if (total > 55) throw new HttpError(400, `Toplam süre ${Math.round(total)} sn — Reels için en fazla 55 sn`);
    return { clips, hook: txt(raw.hook, 60), end_line: txt(raw.end_line, 40) || 'Siz de böyle bir eve',
      end_photo: okUrl(raw.end_photo) ? String(raw.end_photo) : null, music: MUSIC.includes(String(raw.music)) ? String(raw.music) : 'house_120_7',
      grade: raw.grade !== false, stabilize: raw.stabilize !== false };
  }
  if (!okUrl(raw.url)) throw new HttpError(400, 'Düzeltilecek video bulunamadı (yalnızca kendi medya havuzumuzdaki videolar)');
  const cuts = (Array.isArray(raw.cuts) ? raw.cuts : []).slice(0, 6).map((c: unknown) => { const a = Array.isArray(c) ? c : []; return [num(a[0], 0, 600, 0), num(a[1], 0, 600, 0)] as [number, number]; }).filter(([a, b]) => b > a);
  return { url: String(raw.url), trim_start: num(raw.trim_start, 0, 600, 0), trim_end: raw.trim_end == null || raw.trim_end === '' ? null : num(raw.trim_end, 0.5, 600, 0),
    cuts, mute: Boolean(raw.mute), end_card: Boolean(raw.end_card), end_line: txt(raw.end_line, 40) || 'Siz de böyle bir eve',
    music: MUSIC.includes(String(raw.music)) ? String(raw.music) : 'none' };
}

export async function createEditJob(db: Db, body: Record<string, unknown>, userId: string) {
  const kind = body.kind === 'fix' ? 'fix' : 'montage';
  const spec = cleanSpec(kind, (body.spec ?? {}) as Record<string, unknown>);
  let version = 1; let parent: string | null = null;
  if (body.parent_id) {
    const { data: p } = await db.from('video_edit_jobs').select('id,version').eq('id', String(body.parent_id)).maybeSingle();
    if (p) { parent = p.id; version = (p.version ?? 1) + 1; }
  }
  const { count } = await db.from('video_edit_jobs').select('id', { count: 'exact', head: true }).in('status', ['queued', 'rendering']);
  if ((count ?? 0) >= 8) throw new HttpError(429, 'Sırada 8 video var — biri bitince tekrar deneyin');
  const { data, error } = await db.from('video_edit_jobs').insert({
    kind, spec, title: txt(body.title, 80) || (kind === 'fix' ? 'Düzeltilmiş video' : 'Yeni kurgu'), caption: txt(body.caption, 2000) || null,
    hashtags: (Array.isArray(body.hashtags) ? body.hashtags : []).map((h: unknown) => txt(h, 40)).filter(Boolean).slice(0, 30),
    source_url: kind === 'fix' ? (spec as FixSpec).url : null, parent_id: parent, version, created_by: userId, client_id: body.client_id ?? null,
  }).select('id,status').single();
  if (error) throw error;
  return { id: data.id, status: data.status, message: 'Sıraya alındı — video 10–20 dakika içinde hazır olur (GitHub Actions)' };
}

/** Herkese açık kuyruk: yalnızca medya adresleri ve metinler (gizli bilgi yok). En eski 3 iş "rendering"e alınır. */
export async function editQueue(db: Db) {
  // 40 dk'dan uzun süren işler yeniden sıraya alınır (çöken çalışma)
  await db.from('video_edit_jobs').update({ status: 'queued' }).eq('status', 'rendering').lt('started_at', new Date(Date.now() - 40 * 60_000).toISOString());
  const { data } = await db.from('video_edit_jobs').select('id,kind,spec,title').eq('status', 'queued').is('archived_at', null).order('created_at').limit(3);
  const ids = (data || []).map((j) => j.id);
  if (ids.length) await db.from('video_edit_jobs').update({ status: 'rendering', started_at: new Date().toISOString(), error: null }).in('id', ids);
  return { items: data || [] };
}

/** Render bitti bildirimi: dosya kendi alan adımızda yayına girdiyse işi tamamlar, medya havuzuna ve İçerik Havuzu'na (taslak) ekler. */
export async function editDone(db: Db, body: Record<string, unknown>) {
  const id = String(body.id || '');
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(400, 'Geçersiz id');
  const { data: j } = await db.from('video_edit_jobs').select('*').eq('id', id).maybeSingle();
  if (!j) throw new HttpError(404, 'İş yok');
  if (j.status === 'done') return { id, done: true, already: true };
  if (body.ok === false) {
    if (!['rendering', 'queued'].includes(j.status)) return { id, ignored: true };
    await db.from('video_edit_jobs').update({ status: 'failed', error: txt(body.error, 500) || 'Render başarısız', finished_at: new Date().toISOString() }).eq('id', id);
    return { id, failed: true };
  }
  const url = `${EDIT_HOST}/reels/edits/${id}.mp4`; const cover = `${EDIT_HOST}/reels/edits/${id}.jpg`;
  const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
  if (!head?.ok || !/video\/mp4/.test(head.headers.get('content-type') || '')) return { id, done: false, reason: `video henüz yayında değil (${head?.status ?? 'bağlantı yok'})` };
  const qcRes = await fetch(`${EDIT_HOST}/reels/qc/edits/${id}.mp4.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const { data: media } = await db.from('media_library').insert({
    kind: 'video', url, original_url: url, cover_url: cover, title: j.title, source: 'editor', status: 'pool', caption: j.caption, hashtags: j.hashtags,
    notes: `Panel video düzenleyici · ${j.kind === 'fix' ? 'düzeltme' : 'kurgu'} v${j.version}`, edit: { editor_job: id, kind: j.kind, version: j.version }, created_by: j.created_by,
  }).select('id').single();
  await db.from('video_edit_jobs').update({ status: 'done', output_url: url, cover_url: cover, qc: qcRes, media_id: media?.id ?? null, finished_at: new Date().toISOString(), error: null }).eq('id', id);
  return { id, done: true, url };
}

/** Hazır videoyu İçerik Havuzu'na (Instagram + Facebook taslağı) ekler; onay/planlama Yayın Merkezi'nden yapılır. */
export async function editToPool(db: Db, id: string, userId: string) {
  const { data: j } = await db.from('video_edit_jobs').select('*').eq('id', id).maybeSingle();
  if (!j || j.status !== 'done' || !j.output_url) throw new HttpError(400, 'Video henüz hazır değil');
  if ((j.draft_ids || []).length) return { id, draft_ids: j.draft_ids, already: true };
  const rows = ['instagram', 'facebook'].map((p) => ({
    title: `${p.toUpperCase()} · Panel kurgusu · ${j.title}`, headline: j.title, format: 'reel', primary_platform: p, networks: [p], brand: 'Embay Yapı',
    caption: j.caption || j.title, body: j.caption || j.title, hashtags: j.hashtags || [], video_url: j.output_url, media_urls: [j.output_url], design_url: j.cover_url,
    design_provider: 'embay_editor', workflow_status: 'draft', status: 'taslak', created_by: userId,
  }));
  const { data, error } = await db.from('social_drafts').insert(rows).select('id');
  if (error) throw error;
  const ids = (data || []).map((d) => d.id);
  await db.from('video_edit_jobs').update({ draft_ids: ids }).eq('id', id);
  return { id, draft_ids: ids };
}
