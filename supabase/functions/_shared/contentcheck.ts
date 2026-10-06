// İÇERİK KONTROL BOTU: her taslağı yayından önce tam kontrol listesinden geçirir.
// Seviye: ok (geçti) · warn (bakılmalı) · error (yayınlanmaz). Hata varsa yayıncı paylaşmaz; "Bot düzeltsin" metni AI ile onarır.
import { aiComplete, loadAgent, type Db } from './context.ts';
import { mediaKey } from './publisher.ts';

export const PHONE = '0531 436 29 04';
type Level = 'ok' | 'warn' | 'error';
export interface CheckItem { key: string; label: string; level: Level; detail: string; fixable?: boolean }
export interface Draft { id: string; title: string | null; headline: string | null; caption: string | null; body: string | null; hashtags: string[] | null; media_urls: string[] | null;
  video_url: string | null; format: string | null; primary_platform: string | null; scheduled_at: string | null; workflow_status: string; design_url: string | null; brand: string | null }

const PHONE_RE = /(\+?90[\s-]?)?\(?0?\s?5\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g;
const norm = (s: string) => s.replace(/\D/g, '').replace(/^90/, '').replace(/^0?/, '0');

export async function checkDraft(db: Db, d: Draft, ctx?: { published?: Array<{ platform: string; key: string; at: string | null }>; sameDay?: Map<string, number>; connected?: Set<string>; aiMedia?: Set<string> }): Promise<{ id: string; level: Level; score: number; items: CheckItem[] }> {
  const items: CheckItem[] = [];
  const add = (key: string, label: string, level: Level, detail: string, fixable = false) => items.push({ key, label, level, detail, fixable });
  const cap = String(d.caption || d.body || '');
  const tagsInline = cap.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const tags = new Set([...(d.hashtags || []), ...tagsInline].map((t) => t.toLocaleLowerCase('tr-TR')));
  const media = (d.media_urls || []).filter(Boolean);
  const isReel = ['reel', 'short'].includes(d.format || '') || Boolean(d.video_url);

  // 1) Telefon
  const phones = [...cap.matchAll(PHONE_RE)].map((m) => norm(m[0]));
  const wrong = phones.filter((p) => p !== '05314362904');
  if (wrong.length) add('phone', 'Telefon numarası', 'error', `Metinde farklı numara var (${[...new Set(wrong)].join(', ')}). Yalnızca ${PHONE} kullanılır.`, true);
  else if (!phones.length) add('phone', 'Telefon numarası', 'warn', `Metinde telefon yok — ${PHONE} eklenmesi önerilir.`, true);
  else add('phone', 'Telefon numarası', 'ok', PHONE);
  // 2) Marka adı
  if (/\b(emray|enbay|embai|embey)\b/i.test(cap) || /#emray|#embayyapi(?!\b)/i.test(cap)) add('brand', 'Marka adı', 'error', 'Marka adı yanlış yazılmış (doğrusu: Embay Yapı).', true);
  else add('brand', 'Marka adı', 'ok', 'Doğru');
  // 3) Metin uzunluğu ve yer tutucular
  if (!cap.trim()) add('text', 'Paylaşım metni', 'error', 'Metin boş.', true);
  else if (/\{\{|\}\}|\[(başlık|metin|telefon|isim)\]|lorem ipsum|TODO|XXX/i.test(cap)) add('text', 'Paylaşım metni', 'error', 'Metinde doldurulmamış yer tutucu var.', true);
  else if (cap.length > 2200) add('text', 'Paylaşım metni', 'error', `Metin ${cap.length} karakter — Instagram sınırı 2200.`, true);
  else if (cap.length < 40) add('text', 'Paylaşım metni', 'warn', 'Metin çok kısa (40 karakterden az).', true);
  else add('text', 'Paylaşım metni', 'ok', `${cap.length} karakter`);
  // 4) Etiketler
  if (tags.size > 30) add('tags', 'Etiketler', 'error', `${tags.size} etiket — Instagram en fazla 30 kabul eder.`, true);
  else if (tags.size < 5) add('tags', 'Etiketler', 'warn', `${tags.size} etiket — 8–20 arası önerilir.`, true);
  else add('tags', 'Etiketler', 'ok', `${tags.size} etiket`);
  if (!tags.has('#embayyapı') && !tags.has('#embayyapi')) add('brandtag', 'Marka etiketi', 'warn', '#embayyapı etiketi yok.', true);
  // 5) Doğrulanmamış iddialar (fiyat, süre, garanti, m²)
  const claims = cap.match(/(\d[\d.]*\s?(tl|₺|bin\s?tl|milyon))|(\d+\s?(gün|günde|ayda)\s?(teslim|biter|hazır))|(\d+\s?yıl\s?garanti)|(m²\s?\/?\s?\d)|(\d+\s?m²\s?(fiyat|tl))/gi);
  if (claims?.length) add('claims', 'Rakam / vaat', 'warn', `Kaynağı doğrulanmalı: ${[...new Set(claims)].slice(0, 3).join(' · ')}`, true);
  else add('claims', 'Rakam / vaat', 'ok', 'Fiyat, süre veya garanti vaadi yok');
  // 6) Kişisel veri (başkasının telefonu / e-postası)
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(cap) && !/embay/i.test(cap.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? '')) add('kvkk', 'Kişisel veri (KVKK)', 'warn', 'Metinde e-posta adresi var — kişisel veri olmadığından emin olun.');
  else add('kvkk', 'Kişisel veri (KVKK)', 'ok', 'Kişisel veri yok');
  // 7) Medya
  if (!media.length && !d.video_url && !d.design_url) add('media', 'Görsel / video', 'error', 'Paylaşılacak görsel veya video yok.');
  else if (isReel && !d.video_url && !media.some((u) => /\.(mp4|mov)(\?|$)/i.test(u))) add('media', 'Görsel / video', 'error', 'Reels ama video dosyası yok.');
  else add('media', 'Görsel / video', 'ok', isReel ? 'Video hazır' : `${media.length || 1} görsel`);
  const first = d.video_url || media[0] || d.design_url || '';
  if (first && ctx?.aiMedia?.has(first)) add('ai', 'Yapay zekâ görseli', 'warn', 'Bu görsel yapay zekâ ile üretildi — üzerinde küçük “Temsili görsel” etiketi olmalı.');
  // 8) Video kalite raporu (kendi alan adımızdaki videolar)
  if (d.video_url && /embay-panel\.vercel\.app|embayyapi\.vercel\.app/.test(d.video_url)) {
    const rel = d.video_url.split('/reels/')[1];
    const qc = rel ? await fetch(`https://embay-panel.vercel.app/reels/qc/${rel}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
    if (qc?.sorunlar?.length) add('qc', 'Video kalitesi', 'warn', qc.sorunlar.join(' · '));
    else if (qc) add('qc', 'Video kalitesi', 'ok', `${qc.sure_sn} sn · ses ${qc.lufs ?? 'yok'} LUFS`);
  }
  // 9) Tekrar paylaşım
  if (first && ctx?.published) {
    const k = mediaKey(first);
    const dup = ctx.published.find((p) => p.platform === d.primary_platform && p.key === k);
    if (dup) add('dup', 'Tekrar paylaşım', 'error', `Bu içerik ${String(dup.at || '').slice(0, 10)} tarihinde ${d.primary_platform} hesabında paylaşıldı.`);
    else add('dup', 'Tekrar paylaşım', 'ok', 'Daha önce paylaşılmadı');
  }
  // 10) Aynı gün çakışma ve zaman
  if (d.scheduled_at) {
    const day = `${d.primary_platform}|${d.format}|${d.scheduled_at.slice(0, 10)}`;
    if ((ctx?.sameDay?.get(day) ?? 0) > 1) add('slot', 'Takvim', 'warn', `Aynı gün ${d.primary_platform} için birden fazla ${d.format || 'gönderi'} planlı.`);
    else if (new Date(d.scheduled_at).getTime() < Date.now() - 3600_000 && !['published', 'cancelled'].includes(d.workflow_status)) add('slot', 'Takvim', 'warn', 'Paylaşım saati geçmiş ama paylaşılmamış.');
    else add('slot', 'Takvim', 'ok', new Date(d.scheduled_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }));
  }
  // 11) Hesap bağlantısı
  if (ctx?.connected && d.primary_platform && !ctx.connected.has(d.primary_platform)) add('account', 'Hesap bağlantısı', 'warn', `${d.primary_platform} hesabı bağlı değil — paylaşım sırada bekler.`);

  const lv: Level = items.some((i) => i.level === 'error') ? 'error' : items.some((i) => i.level === 'warn') ? 'warn' : 'ok';
  const score = Math.round((items.filter((i) => i.level === 'ok').length / Math.max(1, items.length)) * 100);
  return { id: d.id, level: lv, score, items };
}

const SEL = 'id,title,headline,caption,body,hashtags,media_urls,video_url,format,primary_platform,scheduled_at,workflow_status,design_url,brand';
export async function checkContext(db: Db) {
  const since = new Date(Date.now() - 180 * 86400000).toISOString();
  const [{ data: pubs }, { data: upcoming }, { data: accts }, { data: ai }] = await Promise.all([
    db.from('social_publications').select('platform,media_urls,published_at').eq('status', 'published').gte('created_at', since).limit(800),
    db.from('social_drafts').select('primary_platform,format,scheduled_at').in('workflow_status', ['scheduled', 'approved', 'pending_approval']).not('scheduled_at', 'is', null).is('archived_at', null).limit(600),
    db.from('social_accounts').select('connector_key,platform,connection_status').eq('connection_status', 'connected'),
    db.from('media_library').select('url').or('source.eq.ai,notes.ilike.%temsil%').limit(500),
  ]);
  const sameDay = new Map<string, number>();
  for (const u of upcoming || []) { const k = `${u.primary_platform}|${u.format}|${String(u.scheduled_at).slice(0, 10)}`; sameDay.set(k, (sameDay.get(k) ?? 0) + 1); }
  return {
    published: (pubs || []).filter((p) => (p.media_urls || []).length).map((p) => ({ platform: p.platform, key: mediaKey(p.media_urls![0]), at: p.published_at })),
    sameDay, connected: new Set((accts || []).flatMap((a) => [a.connector_key, a.platform]).filter(Boolean)), aiMedia: new Set((ai || []).map((m) => m.url)),
  };
}

/** Yaklaşan (14 gün) + havuz + onay bekleyen taslakları kontrol eder. */
export async function checkUpcoming(db: Db, ids?: string[]) {
  let q = db.from('social_drafts').select(SEL).is('archived_at', null);
  q = ids?.length ? q.in('id', ids) : q.in('workflow_status', ['draft', 'pending_approval', 'approved', 'scheduled']).or(`scheduled_at.is.null,scheduled_at.lte.${new Date(Date.now() + 14 * 86400000).toISOString()}`);
  const { data } = await q.order('scheduled_at', { ascending: true, nullsFirst: false }).limit(120);
  const ctx = await checkContext(db);
  const res = [];
  for (const d of (data || []) as Draft[]) res.push({ ...(await checkDraft(db, d, ctx)), title: d.headline || d.title, platform: d.primary_platform, format: d.format, scheduled_at: d.scheduled_at, status: d.workflow_status, thumb: d.design_url || (d.media_urls || [])[0] || null, video: d.video_url });
  return { checked: res.length, errors: res.filter((r) => r.level === 'error').length, warnings: res.filter((r) => r.level === 'warn').length, items: res };
}

/** "Bot düzeltsin": metni kurallara göre AI ile onarır (gerçekler korunur, uydurma yok). Önceki metin not olarak saklanır. */
export async function fixDraftText(db: Db, id: string, actorId: string | null) {
  const { data: d } = await db.from('social_drafts').select(`${SEL},performance_notes`).eq('id', id).maybeSingle();
  if (!d) throw new Error('Taslak bulunamadı');
  const r0 = await checkDraft(db, d as Draft, await checkContext(db));
  const problems = r0.items.filter((i) => i.level !== 'ok' && i.fixable).map((i) => `- ${i.label}: ${i.detail}`).join('\n');
  if (!problems) return { id, changed: false, message: 'Metinde düzeltilecek bir şey bulunmadı' };
  const agent = await loadAgent(db, null);
  const r = await aiComplete({ db, runId: null, actorId: actorId as string, tokens: { in: 0, out: 0 }, agent }, 'content_fix',
    `Aşağıdaki Instagram/Facebook paylaşım metnini şu sorunlara göre düzelt:\n${problems}\n\nMETİN:\n${String(d.caption || d.body || '')}\n\nETİKETLER: ${(d.hashtags || []).join(' ')}`,
    { type: 'object', additionalProperties: false, required: ['caption', 'hashtags'], properties: { caption: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } } } },
    `Kurallar: Marka "Embay Yapı". Tek telefon ${PHONE}; başka numara yazma. Metindeki gerçekleri koru; yeni fiyat, süre, garanti, m² veya proje bilgisi UYDURMA — doğrulanamayan rakamları çıkar. Doğal, samimi Türkçe; 1–3 emoji. Etiketler metnin içinde değil ayrı listede; 10–20 etiket, #embayyapı dahil, Türkçe karakterli. Kişisel veri yazma.`);
  const j = r.json as { caption?: string; hashtags?: string[] };
  if (!j.caption) throw new Error('Bot metni düzeltemedi');
  const hashtags = [...new Set((j.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`).replace(/\s+/g, '')))].slice(0, 25);
  const caption = j.caption.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/[ \t]+\n/g, '\n').trim();
  await db.from('social_drafts').update({ caption, body: caption, hashtags, performance_notes: `${d.performance_notes ? `${d.performance_notes}\n` : ''}[Bot düzeltmesi ${new Date().toISOString().slice(0, 16)}] Önceki metin: ${String(d.caption || d.body || '').slice(0, 1500)}` }).eq('id', id);
  const r1 = await checkDraft(db, { ...(d as Draft), caption, hashtags }, await checkContext(db));
  return { id, changed: true, before: r0.level, after: r1.level, caption, hashtags };
}
