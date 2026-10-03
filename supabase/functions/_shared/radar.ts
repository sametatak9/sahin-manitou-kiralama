// KİTLE RADARI + ARŞİV: (1) Instagram etiket aramasıyla (resmi Graph API) villa / müstakil ev / ev yaptırma ilgisi olan güncel gönderileri bulur,
// puanlar ve elle etkileşim listesine koyar (otomatik takip/beğeni/yorum YOK — Meta kuralı). (2) Kendi eski gönderilerimizden en çok ilgi göreni
// (gerçek biten projeler) video/fotoğraf havuzuna alır; içerik botu bunları yeni kurguyla yeniden kullanır.
import type { Db } from './context.ts';
import { tokenFor } from './publisher.ts';
import type { AccountRow } from './connectors/types.ts';
import { telegramSend } from './connectors/messaging.ts';
import { loadAppSecrets, secret as appSecret } from './secrets.ts';

const GRAPH = 'https://graph.facebook.com/v21.0';
// Hedef kitle etiketleri (Instagram: 7 günde en fazla 30 farklı etiket aranabilir → günde 7 etiket döner)
// Ekim 2026 düzeltmesi: #villa/#dağevi/#bahçe yabancı otel, manzara ve rakip reklamı getiriyordu → çıkarıldı.
// Öncelik: kendi evini yaptıran kişilerin kullandığı "süreç" etiketleri (birinci ağızdan paylaşım).
export const RADAR_TAGS = ['evimizyapılıyor', 'evyaptırmak', 'arsaüzerineev', 'müstakilev', 'hayalimdekiev', 'evinşaatı', 'kendievimiz',
  'yuvamızyapılıyor', 'temelattık', 'kabainşaat', 'evyapımı', 'bahçeliev', 'köyevi', 'taşev', 'çelikev', 'çelikvilla', 'hafifçelik', 'yeniyuva', 'müstakilevhayali', 'evimizinhikayesi'];

/** Türkçe mi? (yabancı otel/tatil gönderileri elenir) */
export function isTurkish(caption: string) {
  return /[çğışöüÇĞİŞÖÜ]/.test(caption) || /\b(ve|bir|bu|çok|için|ile|evimiz|evi|yeni|hayırlı)\b/i.test(caption);
}
/** Firma / ilan / rakip reklamı mı? (bunlara yorum yapmak takipçi getirmez) */
export function isBusinessPost(caption: string) {
  const t = caption.toLocaleLowerCase('tr-TR');
  return /0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}|\+90|https?:\/\/|www\.|\.com|ilan no|ilan linki|eids|satılık|kiralık|₺|\btl\b|projelerimiz|firmamız|şirketimiz|detaylı bilgi|bilgi için|iletişim|whatsapp|dm['’]?den|teklif al|fiyat|kampanya|inşaat ltd|yapı ltd|a\.ş\.|ltd\.? ?şti/.test(t);
}

export interface ClientRow { id: string; slug: string; name: string; sector: string | null; growth_tags: string[] | null; status: string }

/** Müşterinin bağlı Instagram iş hesabı + Graph için Facebook sayfa token'ı (müşteri bağı yoksa ilk bağlı hesap — eski kurulum). */
async function ig(db: Db, clientId?: string) {
  const pick = async (key: string) => {
    let q = db.from('social_accounts').select('*').eq('connector_key', key).eq('connection_status', 'connected');
    if (clientId) q = q.eq('client_id', clientId);
    const { data } = await q.limit(1).maybeSingle();
    return data;
  };
  const acc = await pick('instagram'); const fb = await pick('facebook');
  if (!acc || !fb) return null;
  return { igId: acc.external_account_id as string, token: await tokenFor(db, fb as AccountRow), igAccId: acc.id as string, fbId: fb.external_account_id as string, fbAccId: fb.id as string };
}
export async function activeClients(db: Db): Promise<ClientRow[]> {
  const { data } = await db.from('agency_clients').select('id,slug,name,sector,growth_tags,status').eq('status', 'active').is('archived_at', null);
  return (data ?? []) as ClientRow[];
}
async function g(path: string, token: string) {
  const r = await fetch(`${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(30_000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
  return j;
}

type Cat = 'ev_yaptiran' | 'rakip_talepli' | 'hayalperest' | 'arsa' | 'kitle';
export function categorize(caption: string, comments: number, sector = 'insaat'): Cat {
  const t = caption.toLocaleLowerCase('tr-TR');
  if (sector !== 'insaat') return comments >= 10 ? 'rakip_talepli' : /yaptır|arıyorum|öneri|tavsiye|lazım|ihtiyac/.test(t) ? 'ev_yaptiran' : 'kitle';
  if (/yaptırıyoruz|yaptırmak istiyor|evimiz yapılıyor|yuvamız|temelimiz|inşaatımız|kendi evimiz|arsamıza|evimizin|evimiz yükseliyor|ev yaptırdık|temel attık|temeli attık|taşındık|anahtarı aldık|ev yapıyoruz|evimizi yapıyoruz|kaba inşaatımız|çatımız|hayalimiz gerçek|yeni evimiz|yeni yuvamız/.test(t)) return 'ev_yaptiran';
  if (comments >= 10 && /anahtar teslim|m²|m2|fiyat|kampanya|teklif|inşaat|prefabrik|çelik|müteahhit|yapı/.test(t)) return 'rakip_talepli';
  if (/satılık arsa|arsa |imarlı|parsel|dönüm/.test(t)) return 'arsa';
  if (/bahçe|müstakil|villa|huzur|doğa|köy evi|taş ev|yuva/.test(t)) return 'hayalperest';
  return 'kitle';
}
const WEIGHT: Record<Cat, number> = { ev_yaptiran: 60, rakip_talepli: 45, arsa: 25, hayalperest: 15, kitle: 5 };
const COMMENT: Record<Cat, string[]> = {
  ev_yaptiran: ['Hayırlı olsun, çok güzel ilerliyor 👏 Emeğinize sağlık, güle güle oturun 🏡', 'Çok güzel bir yuva oluyor, hayırlı uğurlu olsun 🙏🏡', 'Emeği geçenlerin eline sağlık, şimdiden güle güle oturun 🌿'],
  rakip_talepli: [],
  arsa: ['Çok güzel bir konum 👌 Hayırlı olsun', 'Manzara harika, hayırlı olsun 🌿'],
  hayalperest: ['Çok güzel olmuş 😍 Böyle bir bahçe herkesin hayali 🌿', 'Harika bir yaşam alanı, emeğinize sağlık 👏', 'Huzur dolu bir ev olmuş, güle güle oturun 🏡'],
  kitle: ['Çok güzel 👏'],
};
const GENERIC_COMMENT = ['Çok güzel olmuş 👏', 'Emeğinize sağlık 🙌', 'Harika paylaşım, başarılar 🙏'];

/** 24 saat: 3 saatte bir, her aktif müşterinin bağlı Instagram hesabıyla günün 7 etiketini tarar (yeni gönderiler yakalanır).
 *  Aynı gün aynı etiketler tekrar aranır → Instagram'ın 7 günde 30 farklı etiket sınırı aşılmaz. Sıcak kart çıkarsa Telegram'a haber verir. */
export async function radarTick(db: Db, force = false) {
  const { data: ap } = await db.from('ops_autopilot').select('radar_synced_at').eq('id', 1).maybeSingle();
  const last = (ap as { radar_synced_at?: string | null } | null)?.radar_synced_at;
  if (!force && last && Date.now() - new Date(last).getTime() < 3 * 3600_000) return null;
  await db.from('ops_autopilot').update({ radar_synced_at: new Date().toISOString() }).eq('id', 1);
  const out: Array<Record<string, unknown>> = [];
  for (const c of await activeClients(db)) {
    const a = await ig(db, c.id); if (!a) { out.push({ client: c.slug, skipped: 'instagram/facebook bağlı değil' }); continue; }
    const pool = c.growth_tags?.length ? c.growth_tags : c.slug === 'embay-yapi' ? RADAR_TAGS : [];
    if (!pool.length) { out.push({ client: c.slug, skipped: 'büyüme etiketi girilmemiş' }); continue; }
    out.push({ client: c.slug, ...(await scanTags(db, c, a, pool)) });
  }
  return out;
}

async function scanTags(db: Db, c: ClientRow, a: { igId: string; token: string }, pool: string[]) {
  // Instagram kuralı: 7 günde en fazla 30 farklı etiket → günde 7 etiket, havuz en fazla 28 etiketle döner
  const tagsPool = pool.slice(0, 28);
  const day = Math.floor(Date.now() / 86400000);
  const tags = [...new Set(Array.from({ length: Math.min(7, tagsPool.length) }, (_, i) => tagsPool[(day * 7 + i) % tagsPool.length]))];
  const sector = c.sector || 'insaat';
  const own = new RegExp(c.name.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, ''), 'i');
  let added = 0; const errors: string[] = []; const hot: string[] = [];
  for (const tag of tags) {
    try {
      const h = await g(`ig_hashtag_search?user_id=${a.igId}&q=${encodeURIComponent(tag)}`, a.token);
      const hid = h?.data?.[0]?.id; if (!hid) continue;
      for (const edge of ['top_media', 'recent_media']) {
        const res = await g(`${hid}/${edge}?user_id=${a.igId}&fields=id,caption,permalink,timestamp,like_count,comments_count&limit=50`, a.token).catch(() => ({ data: [] }));
        for (const m of (res.data ?? []) as Array<{ id: string; caption?: string; permalink: string; timestamp?: string; like_count?: number; comments_count?: number }>) {
          const ts = m.timestamp ? new Date(m.timestamp).getTime() : 0;
          if (!ts || Date.now() - ts > 60 * 86400000) continue; // yalnızca son 60 gün — eski gönderiye yorum ilgi çekmez
          if (own.test(m.caption ?? '')) continue; // kendi gönderimiz
          // Yabancı dil, firma/ilan/rakip reklamı → kart açılmaz (yorum yapmak takipçi getirmez)
          if (sector === 'insaat' && (!isTurkish(m.caption ?? '') || isBusinessPost(m.caption ?? ''))) continue;
          const cat = categorize(m.caption ?? '', m.comments_count ?? 0, sector);
          const recency = Math.max(0, 30 - Math.floor((Date.now() - ts) / (2 * 86400000)));
          const score = WEIGHT[cat] + Math.min(60, (m.comments_count ?? 0) * 2) + Math.min(20, Math.floor((m.like_count ?? 0) / 50)) + recency;
          const list = sector === 'insaat' ? COMMENT[cat] : GENERIC_COMMENT;
          const sug = list.length ? list[(m.id.charCodeAt(m.id.length - 1)) % list.length] : null;
          const { data: ins, error } = await db.from('audience_radar').upsert({ media_id: m.id, permalink: m.permalink, hashtag: tag, category: cat, caption: (m.caption ?? '').slice(0, 600), client_id: c.id,
            like_count: m.like_count ?? null, comments_count: m.comments_count ?? null, posted_at: m.timestamp ?? null, score, suggested_comment: sug }, { onConflict: 'media_id', ignoreDuplicates: true }).select('id');
          if (!error && ins?.length) { added++; if (cat === 'ev_yaptiran' && Date.now() - ts < 3 * 86400000) hot.push(`• #${tag}: “${(m.caption ?? '').replace(/\s+/g, ' ').slice(0, 90)}”\n  ${m.permalink}`); }
        }
      }
    } catch (e) { errors.push(`#${tag}: ${String((e as Error).message).slice(0, 100)}`); }
  }
  // Yeni "ev yaptırıyor" gönderisi: yöneticiye hemen haber (gece 23–08 arası sessiz) — ilk yorumu yapan görünür olur
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false }).format(new Date()));
  if (hot.length && hour >= 8 && hour < 23) {
    await loadAppSecrets(db);
    if (appSecret('TELEGRAM_BOT_TOKEN') && appSecret('TELEGRAM_CHAT_ID'))
      await telegramSend([`🔥 ${c.name}: ${hot.length} yeni “ev yaptırıyor” gönderisi`, 'Hemen tebrik yorumu bırakın — ilk yorumlar en çok görülür.', '', ...hot.slice(0, 4), '', 'Panel → Büyüme Merkezi'].join('\n')).catch(() => null);
  }
  return { tags, added, hot: hot.length, errors };
}

/** Her sabah 09:00: günün en sıcak 5 kartı (hazır yorumla) Telegram'a — yönetici telefondan 5 dakikada etkileşim yapar. */
export async function radarDigest(db: Db) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false }).format(new Date()));
  if (hour < 9 || hour >= 12) return null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
  const { data: claimed } = await db.from('ops_autopilot').update({ radar_digest_at: new Date().toISOString() }).eq('id', 1)
    .or(`radar_digest_at.is.null,radar_digest_at.lt.${today}T06:00:00+00:00`).select('id');
  if (!claimed?.length) return null;
  await loadAppSecrets(db);
  if (!appSecret('TELEGRAM_BOT_TOKEN') || !appSecret('TELEGRAM_CHAT_ID')) return { skipped: 'telegram yok' };
  const out: Array<Record<string, unknown>> = [];
  for (const c of await activeClients(db)) {
    const { data: cards } = await db.from('audience_radar').select('permalink,category,caption,suggested_comment').eq('client_id', c.id).is('done_at', null).is('skipped_at', null).is('archived_at', null)
      .gte('posted_at', new Date(Date.now() - 30 * 86400000).toISOString()).order('score', { ascending: false }).limit(5);
    if (!cards?.length) continue;
    const LBL: Record<string, string> = { ev_yaptiran: '🏗️ Ev yaptırıyor', rakip_talepli: '💬 Talep toplayan', arsa: '📍 Arsa sahibi', hayalperest: '🏡 Ev hayali', kitle: '👥 Kitle' };
    const lines = cards.map((k, i) => `${i + 1}) ${LBL[k.category] ?? k.category}\n${k.permalink}${k.suggested_comment ? `\n💬 “${k.suggested_comment}”` : ''}`);
    await telegramSend([`☀️ ${c.name} · Bugünün 5 etkileşim kartı`, 'Gönderiyi aç → yorumu yapıştır → beğen. Toplam 5 dakika.', '', ...lines, '', 'Hepsi: Panel → Büyüme Merkezi'].join('\n')).catch(() => null);
    out.push({ client: c.slug, sent: cards.length });
  }
  return out;
}

/** Günde bir kez: her müşterinin bağlı Instagram / Facebook hesabının gerçek takipçi ve gönderi sayısı (büyüme grafiği). */
export async function growthTick(db: Db, force = false) {
  const { data: ap } = await db.from('ops_autopilot').select('growth_synced_at').eq('id', 1).maybeSingle();
  const last = (ap as { growth_synced_at?: string | null } | null)?.growth_synced_at;
  if (!force && last && Date.now() - new Date(last).getTime() < 6 * 3600_000) return null;
  await db.from('ops_autopilot').update({ growth_synced_at: new Date().toISOString() }).eq('id', 1);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
  const out: Array<Record<string, unknown>> = [];
  for (const c of await activeClients(db)) {
    const a = await ig(db, c.id); if (!a) continue;
    try {
      const i = await g(`${a.igId}?fields=followers_count,follows_count,media_count`, a.token);
      await db.from('growth_snapshots').upsert({ client_id: c.id, platform: 'instagram', account_id: a.igAccId, day, followers: i.followers_count ?? null, media_count: i.media_count ?? null, raw: i }, { onConflict: 'account_id,day' });
      out.push({ client: c.slug, instagram: i.followers_count });
    } catch (e) { out.push({ client: c.slug, instagram_error: String((e as Error).message).slice(0, 120) }); }
    try {
      const f = await g(`${a.fbId}?fields=followers_count,fan_count`, a.token);
      await db.from('growth_snapshots').upsert({ client_id: c.id, platform: 'facebook', account_id: a.fbAccId, day, followers: f.followers_count ?? f.fan_count ?? null, raw: f }, { onConflict: 'account_id,day' });
      out.push({ client: c.slug, facebook: f.followers_count ?? f.fan_count });
    } catch (e) { out.push({ client: c.slug, facebook_error: String((e as Error).message).slice(0, 120) }); }
  }
  return out;
}

/** Kendi eski gönderilerimizden en çok ilgi görenleri (gerçek projeler) havuza alır — her çağrıda en fazla 2 dosya. */
export async function archiveTick(db: Db) {
  const { data: ap } = await db.from('ops_autopilot').select('archive_imported_at').eq('id', 1).maybeSingle();
  if ((ap as { archive_imported_at?: string | null } | null)?.archive_imported_at) return null; // bitti
  const { data: embay } = await db.from('agency_clients').select('id').eq('slug', 'embay-yapi').maybeSingle();
  const a = await ig(db, embay?.id); if (!a) return null;
  const res = await g(`${a.igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{media_type,media_url}&limit=100`, a.token);
  type M = { id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink: string; timestamp: string; like_count?: number; comments_count?: number; children?: { data?: Array<{ media_type: string; media_url?: string }> } };
  const list = ((res.data ?? []) as M[]).filter((m) => new Date(m.timestamp).getTime() < Date.parse('2026-09-20')) // bot öncesi gerçek gönderiler
    .sort((x, y) => ((y.like_count ?? 0) + 3 * (y.comments_count ?? 0)) - ((x.like_count ?? 0) + 3 * (x.comments_count ?? 0)));
  const files: Array<{ kind: 'video' | 'image'; url: string; m: M; n: number }> = [];
  for (const m of list) {
    if (m.media_type === 'VIDEO' && m.media_url) files.push({ kind: 'video', url: m.media_url, m, n: 0 });
    else if (m.media_type === 'IMAGE' && m.media_url) files.push({ kind: 'image', url: m.media_url, m, n: 0 });
    else if (m.media_type === 'CAROUSEL_ALBUM') (m.children?.data ?? []).forEach((c, n) => { if (c.media_url) files.push({ kind: c.media_type === 'VIDEO' ? 'video' : 'image', url: c.media_url, m, n }); });
  }
  let done = 0;
  for (const f of files) {
    if (done >= 2) return { imported: done, remaining: true };
    const key = `ig:${f.m.id}:${f.n}`;
    const { data: ex } = await db.from('media_library').select('id').eq('original_url', key).maybeSingle();
    if (ex) continue;
    const r = await fetch(f.url, { signal: AbortSignal.timeout(90_000) }).catch(() => null);
    if (!r?.ok) continue;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > 60_000_000) continue;
    const ext = f.kind === 'video' ? 'mp4' : 'jpg';
    const path = `ig-archive/${f.m.id}-${f.n}.${ext}`;
    const up = await db.storage.from('media-uploads').upload(path, buf, { contentType: f.kind === 'video' ? 'video/mp4' : 'image/jpeg', upsert: true });
    if (up.error) continue;
    const pub = db.storage.from('media-uploads').getPublicUrl(path).data.publicUrl;
    await db.from('media_library').insert({ kind: f.kind, source: 'ig_archive', client_id: embay?.id ?? null, title: (f.m.caption || 'Eski gönderimiz').replace(/\s+/g, ' ').slice(0, 110), url: pub, original_url: key,
      mime: f.kind === 'video' ? 'video/mp4' : 'image/jpeg', size_bytes: buf.length, status: 'pool', caption: (f.m.caption ?? '').slice(0, 2000),
      edit: { codec: 'h264', ig_permalink: f.m.permalink, likes: f.m.like_count ?? 0, comments: f.m.comments_count ?? 0, posted_at: f.m.timestamp },
      notes: `Instagram arşivimizden (${f.m.like_count ?? 0} beğeni, ${f.m.comments_count ?? 0} yorum) — gerçek proje görüntüsü` });
    done++;
  }
  await db.from('ops_autopilot').update({ archive_imported_at: new Date().toISOString() }).eq('id', 1);
  return { imported: done, remaining: false };
}
