// YORUM BOTU (gelen kutusu): kendi Instagram gönderilerimize gelen yorumları toplar, niyetini ayırır (fiyat / bilgi / konum / övgü),
// otomatik yanıt açıksa YENİ sorulara kibar ve kurumsal bir yanıt yazar. Yalnızca kendi gönderilerimiz — Meta kurallarına uygun.
// Fiyat asla uydurulmaz: yanıt, kişiyi WhatsApp/DM'e yönlendirir. Kişisel veri: yalnızca herkese açık kullanıcı adı + yorum metni.
import type { Db } from './context.ts';
import { tokenFor } from './publisher.ts';
import type { AccountRow } from './connectors/types.ts';
import { telegramSend } from './connectors/messaging.ts';
import { loadAppSecrets, secret as appSecret } from './secrets.ts';

const GRAPH = 'https://graph.facebook.com/v21.0';
const PHONE = '0531 436 29 04';
type Intent = 'price' | 'info' | 'location' | 'praise' | 'other';

export function intentOf(text: string): Intent {
  const t = text.toLocaleLowerCase('tr-TR');
  if (/fiyat|fıyat|fiat|m2|m²|metrekare|metre kare|maliyet|kaç tl|kaça|ne kadar|teklif|ücret|kac tl/.test(t)) return 'price';
  if (/nerede|nerde|ofis|adres|yapıyor musunuz|yapıyormusunuz|yapiyo|şehir|bursa|eskişehir|kayseri|tekirdağ|yalova|izmir|antalya|ankara|kocaeli|sakarya/.test(t)) return 'location';
  if (/bilgi|prefabrik|çelik|celik|ytong|ömrü|malzeme|hafif|ağır|agır|betonarme|\?/.test(t)) return 'info';
  if (/güzel|harika|başarılı|emeğinize|tebrik|süper|mükemmel|👏|❤|😍|🔥|💯|🙏/.test(t)) return 'praise';
  return 'other';
}

const REPLIES: Record<Exclude<Intent, 'other'>, string[]> = {
  price: [
    `Merhaba 👋 İlginiz için teşekkür ederiz! Fiyat; metrekare, kat sayısı, arsanın konumu ve malzeme tercihine göre değişiyor. Size özel net teklif için DM'den ya da WhatsApp ${PHONE}'ten yazabilirsiniz 🙏`,
    `Merhaba, teşekkürler! 🏡 Anahtar teslim fiyat projeye göre hesaplanıyor. Arsanızın yerini ve istediğiniz m²'yi WhatsApp ${PHONE}'e yazarsanız ücretsiz ön teklif hazırlayalım.`,
    `Merhaba 🙌 Maliyet; m², kat sayısı ve seçilen sisteme (betonarme / çelik) göre değişiyor. Detaylı bilgi ve ücretsiz keşif için WhatsApp ${PHONE} ya da DM 🙏`,
  ],
  info: [
    `Merhaba, güzel soru 👍 Detaylı bilgi için DM'den ya da WhatsApp ${PHONE}'ten ulaşabilirsiniz; ekibimiz en kısa sürede dönüş yapacak.`,
    `Merhaba 👋 Sorunuz için teşekkürler! Projenize göre en doğru bilgiyi verebilmemiz için WhatsApp ${PHONE}'ten yazmanız yeterli 🙏`,
  ],
  location: [
    `Merhaba 👋 Merkezimiz Çatalca / İstanbul; farklı şehirlerdeki projeler için de ön görüşme yapıyoruz. Konum ve proje detayını WhatsApp ${PHONE}'e yazabilirsiniz 🙏`,
    `Merhaba, teşekkürler! 📍 Çatalca / İstanbul merkezliyiz. Arsanızın bulunduğu yeri WhatsApp ${PHONE}'ten iletirseniz sizin için değerlendirelim.`,
  ],
  praise: ['Çok teşekkür ederiz 🙏', 'Güzel sözleriniz için teşekkürler 🏡🙏', 'Teşekkür ederiz, iyi ki varsınız 🙌'],
};
export function replyFor(intent: Intent, seed: string) {
  if (intent === 'other') return null;
  const list = REPLIES[intent]; let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

/** Instagram iş hesabı kimliği + Graph (graph.facebook.com) için Facebook sayfa token'ı (IG yorumları sayfa token'ıyla okunur/yanıtlanır). */
async function igAccess(db: Db) {
  const { data: acc } = await db.from('social_accounts').select('*').eq('connector_key', 'instagram').eq('connection_status', 'connected').limit(1).maybeSingle();
  if (!acc) return { acc: null, token: null };
  const { data: fb } = await db.from('social_accounts').select('*').eq('connector_key', 'facebook').eq('connection_status', 'connected').limit(1).maybeSingle();
  const token = fb ? await tokenFor(db, fb as AccountRow) : await tokenFor(db, acc as AccountRow);
  return { acc, token };
}

async function g(path: string, token: string) {
  const r = await fetch(`${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
  return j;
}

/** Worker her dakika çağırır; 10 dakikada bir Instagram yorumlarını tarar. */
export async function inboxTick(db: Db, force = false) {
  const { data: ap } = await db.from('ops_autopilot').select('auto_reply,auto_reply_since,inbox_synced_at').eq('id', 1).maybeSingle();
  const st = ap as { auto_reply?: boolean; auto_reply_since?: string; inbox_synced_at?: string | null } | null;
  if (!force && st?.inbox_synced_at && Date.now() - new Date(st.inbox_synced_at).getTime() < 10 * 60_000) return null;
  await db.from('ops_autopilot').update({ inbox_synced_at: new Date().toISOString() }).eq('id', 1);
  const { acc, token } = await igAccess(db);
  if (!acc || !token) return { skipped: 'instagram bağlı değil' };
  const me = await g(`${acc.external_account_id}?fields=id,username`, token);
  const media = await g(`${acc.external_account_id}/media?fields=id,permalink,comments_count&limit=60`, token);
  const since = st?.auto_reply_since ? new Date(st.auto_reply_since).getTime() : Date.now();
  let found = 0; let replied = 0; const fresh: string[] = [];
  for (const m of (media.data ?? []) as Array<{ id: string; permalink: string; comments_count: number }>) {
    if (!m.comments_count) continue;
    const cs = await g(`${m.id}/comments?fields=id,text,timestamp,username,user,replies{user,username}&limit=50`, token).catch(() => ({ data: [] }));
    for (const c of (cs.data ?? []) as Array<{ id: string; text?: string; timestamp?: string; username?: string; user?: { id?: string }; replies?: { data?: Array<{ username?: string; user?: { id?: string } }> } }>) {
      // Meta, yorum yapanın kullanıcı adını her zaman vermez; bizim yorum/yanıtlarımız 'user.id' ile tanınır
      if (c.user?.id === me.id || (c.username && c.username === me.username)) continue;
      const answered = (c.replies?.data ?? []).some((r) => r.user?.id === me.id || (r.username && r.username === me.username));
      const intent = intentOf(c.text ?? '');
      const { data: existing } = await db.from('social_inbox').select('id,replied').eq('external_id', c.id).maybeSingle();
      if (!existing) {
        await db.from('social_inbox').insert({ platform: 'instagram', external_id: c.id, media_id: m.id, permalink: m.permalink, username: c.username ?? null, text: (c.text ?? '').slice(0, 2000),
          intent, commented_at: c.timestamp ?? null, replied: answered, status: answered ? 'replied' : 'open', reply_source: answered ? 'manual' : null });
        found++;
        if (!answered && ['price', 'info', 'location'].includes(intent)) fresh.push(`• ${c.username ? '@' + c.username : 'Bir kullanıcı'}: “${(c.text ?? '').slice(0, 120)}”\n  ${m.permalink}`);
      } else if (answered && !existing.replied) {
        await db.from('social_inbox').update({ replied: true, status: 'replied', reply_source: 'manual', updated_at: new Date().toISOString() }).eq('id', existing.id);
        continue;
      }
      // Otomatik yanıt: yalnızca bot açıldıktan SONRA gelen, yanıtlanmamış yorumlara (eski yorumlara toplu yanıt atılmaz)
      const isNew = c.timestamp ? new Date(c.timestamp).getTime() >= since : false;
      const text = replyFor(intent, c.id);
      if (st?.auto_reply && isNew && !answered && text && replied < 10) {
        try {
          const r = await fetch(`${GRAPH}/${c.id}/replies`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ message: text, access_token: token }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
          await db.from('social_inbox').update({ replied: true, replied_at: new Date().toISOString(), reply_text: text, reply_source: 'bot', status: 'replied', updated_at: new Date().toISOString() }).eq('external_id', c.id);
          replied++;
        } catch (e) {
          await db.from('social_inbox').update({ reply_source: `hata: ${String((e as Error).message).slice(0, 180)}`, updated_at: new Date().toISOString() }).eq('external_id', c.id);
        }
      }
    }
  }
  if (fresh.length) {
    await loadAppSecrets(db);
    if (appSecret('TELEGRAM_BOT_TOKEN') && appSecret('TELEGRAM_CHAT_ID'))
      await telegramSend([`💬 Instagram'da ${fresh.length} yeni soru/talep`, '', ...fresh.slice(0, 10), '', 'Panel → Raporlar → Gelen sorular'].join('\n')).catch(() => null);
  }
  return { found, replied };
}

/** Panelden tek tek yanıt (yönetici yazısıyla) — yalnızca kendi gönderimizdeki yoruma. */
export async function inboxReply(db: Db, id: string, message: string) {
  const { data: row } = await db.from('social_inbox').select('*').eq('id', id).maybeSingle();
  if (!row) throw new Error('Kayıt bulunamadı');
  const msg = String(message || '').trim().slice(0, 900);
  if (msg.length < 2) throw new Error('Yanıt boş');
  const { acc, token } = await igAccess(db);
  if (!acc || !token) throw new Error('Instagram bağlı değil');
  const r = await fetch(`${GRAPH}/${row.external_id}/replies`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ message: msg, access_token: token }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
  await db.from('social_inbox').update({ replied: true, replied_at: new Date().toISOString(), reply_text: msg, reply_source: 'panel', status: 'replied', updated_at: new Date().toISOString() }).eq('id', id);
  return { ok: true, reply_id: j.id };
}
