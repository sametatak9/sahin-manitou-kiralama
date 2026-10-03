// TELEGRAM: yöneticinin cebindeki kısa özetler ve komutlar. Yalnızca okuma — Telegram'dan paylaşım/silme/onay YAPILMAZ.
// 1) Sabah özeti (08:00–11:00 arası günde bir): bugünün paylaşımları, dünün sonuçları, bekleyen müşteri adayları, takipçi, sorunlar
// 2) Paylaşım bildirimi: bot bir gönderiyi yayınladığında / yayınlayamadığında tek mesaj
// 3) Komutlar (webhook): /bugun /adaylar /durum /yardim — yalnızca kayıtlı yönetici sohbetinden (TELEGRAM_CHAT_ID) gelen mesaja cevap verilir
import type { Db } from './context.ts';
import { loadAppSecrets, secret as appSecret } from './secrets.ts';
import { telegramSend } from './connectors/messaging.ts';

const TZ = 'Europe/Istanbul';
const PANEL = 'https://embay-panel.vercel.app';
const PF: Record<string, string> = { instagram: 'IG', facebook: 'FB', youtube: 'YT', linkedin: 'LI' };
const dayOf = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
const hhmm = (iso: string) => new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const istHour = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date()));
// İstanbul günü [başlangıç, bitiş) UTC olarak (UTC+3, yaz saati yok)
const dayRange = (day: string) => [`${day}T00:00:00+03:00`, new Date(new Date(`${day}T00:00:00+03:00`).getTime() + 86400_000).toISOString()] as const;

async function ready(db: Db) {
  await loadAppSecrets(db);
  return Boolean(appSecret('TELEGRAM_BOT_TOKEN') && appSecret('TELEGRAM_CHAT_ID'));
}

interface DraftRow { id: string; headline: string | null; title: string | null; primary_platform: string | null; format: string | null; scheduled_at: string; workflow_status: string }

/** Bugünün planı: aynı saat + başlıktaki IG/FB ikizleri tek satır. */
async function todayLines(db: Db, day: string) {
  const [from, to] = dayRange(day);
  const { data } = await db.from('social_drafts').select('id,headline,title,primary_platform,format,scheduled_at,workflow_status')
    .is('archived_at', null).in('workflow_status', ['scheduled', 'approved', 'published', 'processing', 'failed']).gte('scheduled_at', from).lt('scheduled_at', to).order('scheduled_at');
  const groups = new Map<string, { at: string; name: string; format: string | null; pf: string[]; st: Set<string> }>();
  for (const d of (data ?? []) as DraftRow[]) {
    const name = (d.headline || d.title || 'Gönderi').replace(/^(INSTAGRAM|FACEBOOK)\s·\s/i, '').slice(0, 60);
    const k = `${d.scheduled_at}|${name}`;
    const g = groups.get(k) ?? { at: d.scheduled_at, name, format: d.format, pf: [], st: new Set<string>() };
    g.pf.push(PF[d.primary_platform ?? ''] ?? d.primary_platform ?? '?'); g.st.add(d.workflow_status); groups.set(k, g);
  }
  const FMT: Record<string, string> = { reel: '🎬', carousel: '🖼️', banner: '🟦', short: '🎬' };
  return [...groups.values()].map((g) => {
    const mark = g.st.has('failed') ? ' ⚠️ hata' : g.st.has('published') ? ' ✅' : '';
    return `${hhmm(g.at)} ${FMT[g.format ?? ''] ?? '•'} ${g.name} (${g.pf.join('+')})${mark}`;
  });
}

async function askers(db: Db, limit = 5) {
  const { data, count } = await db.from('social_inbox').select('username,text,intent,commented_at', { count: 'exact' })
    .in('intent', ['price', 'location', 'info']).eq('follow_stage', 'yeni').is('archived_at', null).order('commented_at', { ascending: false }).limit(limit);
  const L: Record<string, string> = { price: '💰', location: '📍', info: 'ℹ️' };
  return { count: count ?? 0, lines: (data ?? []).map((r: { username: string | null; text: string | null; intent: string }) =>
    `${L[r.intent] ?? '•'} @${r.username ?? '?'}: “${(r.text ?? '').slice(0, 70)}”${r.username ? `\n   ig.me/m/${r.username}` : ''}`) };
}

async function followers(db: Db) {
  const { data } = await db.from('growth_snapshots').select('platform,day,followers').order('day', { ascending: false }).limit(30);
  const out: string[] = [];
  for (const p of ['instagram', 'facebook']) {
    const rows = (data ?? []).filter((r: { platform: string; followers: number | null }) => r.platform === p && r.followers != null) as Array<{ day: string; followers: number }>;
    if (!rows.length) continue;
    const now = rows[0].followers; const week = rows.find((r) => new Date(rows[0].day).getTime() - new Date(r.day).getTime() >= 7 * 86400_000)?.followers;
    out.push(`${PF[p]} ${now}${week != null ? ` (7 gün: ${now - week >= 0 ? '+' : ''}${now - week})` : ''}`);
  }
  return out.join(' · ');
}

async function yesterdayResults(db: Db, day: string) {
  const [from, to] = dayRange(day);
  const { data: pubs } = await db.from('social_publications').select('id,platform,content_id,external_url').eq('status', 'published').gte('published_at', from).lt('published_at', to);
  if (!pubs?.length) return { n: 0, lines: [] as string[] };
  const ids = pubs.map((p: { id: string }) => p.id);
  const [{ data: mets }, { data: drafts }] = await Promise.all([
    db.from('social_post_metrics').select('publication_id,likes,comments,fetched_at').in('publication_id', ids).order('fetched_at', { ascending: false }),
    db.from('social_drafts').select('id,headline,title').in('id', pubs.map((p: { content_id: string }) => p.content_id)),
  ]);
  const last = new Map<string, { likes: number | null; comments: number | null }>();
  for (const m of mets ?? []) if (!last.has(m.publication_id)) last.set(m.publication_id, m);
  const name = new Map((drafts ?? []).map((d: { id: string; headline: string | null; title: string | null }) => [d.id, (d.headline || d.title || '').replace(/^(INSTAGRAM|FACEBOOK)\s·\s/i, '').slice(0, 50)]));
  return { n: pubs.length, lines: pubs.map((p: { id: string; platform: string; content_id: string }) => {
    const m = last.get(p.id); return `${PF[p.platform] ?? p.platform} ${name.get(p.content_id) ?? ''}${m ? ` — ❤️ ${m.likes ?? 0} 💬 ${m.comments ?? 0}` : ''}`;
  }) };
}

async function problems(db: Db) {
  const out: string[] = [];
  const { count: failed } = await db.from('social_drafts').select('id', { count: 'exact', head: true }).eq('workflow_status', 'failed').is('archived_at', null)
    .gte('updated_at', new Date(Date.now() - 36 * 3600_000).toISOString());
  if (failed) out.push(`⚠️ ${failed} paylaşım hata verdi → Panel → Yayın Merkezi`);
  const { data: acc } = await db.from('social_accounts').select('connector_key,connection_status,scopes').in('connector_key', ['instagram', 'facebook']);
  const live = (acc ?? []).filter((a: { connection_status: string }) => a.connection_status === 'connected');
  for (const k of ['instagram', 'facebook']) if (!live.some((a: { connector_key: string }) => a.connector_key === k)) out.push(`🔌 ${k === 'instagram' ? 'Instagram' : 'Facebook'} bağlı değil → Panel → Uygulamalar`);
  const scopes = new Set(live.flatMap((a: { scopes: string[] | null }) => a.scopes ?? []));
  if (scopes.size && !scopes.has('instagram_manage_comments')) out.push('🔑 Meta yorum izni eksik → Panel → Uygulamalar → Facebook → İzinleri ver');
  return out;
}

/** Sabah özeti: 08:00–11:00 arasında günde bir kez. */
export async function morningBrief(db: Db, force = false) {
  const h = istHour();
  if (!force && (h < 8 || h >= 11)) return null;
  const today = dayOf(new Date());
  if (!force) {
    const { data: claimed } = await db.from('ops_autopilot').update({ tg_morning_at: new Date().toISOString() }).eq('id', 1)
      .or(`tg_morning_at.is.null,tg_morning_at.lt.${today}T05:00:00+00:00`).select('id');
    if (!claimed?.length) return null;
  }
  if (!(await ready(db))) return { skipped: 'telegram yok' };
  const yday = dayOf(new Date(Date.now() - 86400_000));
  const [plan, ask, fol, res, prob] = await Promise.all([todayLines(db, today), askers(db, 3), followers(db), yesterdayResults(db, yday), problems(db)]);
  const text = [
    `☀️ Günaydın! Embay Yapı · ${new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, day: 'numeric', month: 'long', weekday: 'long' }).format(new Date())}`,
    '', '📅 Bugün paylaşılacaklar:', ...(plan.length ? plan : ['— Bugün planlı paylaşım yok']),
    '', `📊 Dün: ${res.n} paylaşım`, ...res.lines.slice(0, 6),
    ...(fol ? ['', `👥 Takipçi: ${fol}`] : []),
    '', ask.count ? `💬 Cevap bekleyen ${ask.count} müşteri adayı:` : '💬 Cevap bekleyen müşteri adayı yok', ...ask.lines,
    ...(prob.length ? ['', ...prob] : []),
    '', 'Komutlar: /bugun /adaylar /durum', `Panel: ${PANEL}`,
  ].join('\n');
  await telegramSend(text);
  return { sent: true };
}

/** Bot paylaşım yaptıktan sonra tek mesaj (başarılı + hatalı). */
export async function notifyPublished(db: Db, results: Array<Record<string, unknown>>) {
  if (!results?.length || !(await ready(db))) return null;
  const ok = results.filter((r) => r.published && r.publication_id); const bad = results.filter((r) => r.error && r.content_id);
  if (!ok.length && !bad.length) return null;
  const lines: string[] = [];
  if (ok.length) {
    const { data } = await db.from('social_publications').select('id,platform,external_url,content_id').in('id', ok.map((r) => String(r.publication_id)));
    const { data: dr } = await db.from('social_drafts').select('id,headline,title').in('id', (data ?? []).map((p: { content_id: string }) => p.content_id));
    const name = new Map((dr ?? []).map((d: { id: string; headline: string | null; title: string | null }) => [d.id, (d.headline || d.title || '').replace(/^(INSTAGRAM|FACEBOOK)\s·\s/i, '').slice(0, 60)]));
    for (const p of (data ?? []) as Array<{ platform: string; external_url: string | null; content_id: string }>) lines.push(`✅ ${PF[p.platform] ?? p.platform}: ${name.get(p.content_id) ?? 'Gönderi'} yayında${p.external_url ? `\n${p.external_url}` : ''}`);
  }
  if (bad.length) {
    const { data: dr } = await db.from('social_drafts').select('id,headline,title,primary_platform').in('id', bad.map((r) => String(r.content_id)));
    for (const d of (dr ?? []) as Array<{ id: string; headline: string | null; title: string | null; primary_platform: string | null }>) {
      const err = String(bad.find((r) => r.content_id === d.id)?.error ?? '').slice(0, 160);
      lines.push(`⚠️ ${PF[d.primary_platform ?? ''] ?? ''} ${(d.headline || d.title || 'Gönderi').slice(0, 60)} paylaşılamadı: ${err}`);
    }
    lines.push('Panel → Yayın Merkezi → “Yeniden planla”');
  }
  await telegramSend(lines.join('\n')).catch(() => null);
  return { sent: lines.length };
}

/** Telegram'dan gelen komutlar. Yalnızca yönetici sohbeti (TELEGRAM_CHAT_ID); diğerlerine cevap verilmez. */
export async function telegramWebhook(db: Db, update: Record<string, unknown>) {
  // deno-lint-ignore no-explicit-any
  const msg = (update as any)?.message;
  const chatId = String(msg?.chat?.id ?? '');
  const text = String(msg?.text ?? '').trim();
  await loadAppSecrets(db);
  const owner = appSecret('TELEGRAM_CHAT_ID') || '';
  if (!chatId || !text || chatId !== owner) return { ignored: true };
  const cmd = text.split(/[\s@]/)[0].toLowerCase();
  const today = dayOf(new Date());
  let reply: string;
  if (cmd === '/bugun' || cmd === '/bugün') {
    const plan = await todayLines(db, today);
    reply = ['📅 Bugünün paylaşımları:', ...(plan.length ? plan : ['— Planlı paylaşım yok']), '', `Yarın: ${(await todayLines(db, dayOf(new Date(Date.now() + 86400_000)))).length} paylaşım planlı`].join('\n');
  } else if (cmd === '/adaylar') {
    const a = await askers(db, 8);
    reply = a.count ? [`💬 Cevap bekleyen ${a.count} müşteri adayı (en yeniler):`, ...a.lines, '', 'DM metni ve takip: Panel → Müşteri Adayları'].join('\n') : '💬 Cevap bekleyen müşteri adayı yok 👍';
  } else if (cmd === '/durum') {
    const [prob, fol, res] = await Promise.all([problems(db), followers(db), yesterdayResults(db, dayOf(new Date(Date.now() - 86400_000)))]);
    const { data: lastPub } = await db.from('social_publications').select('published_at,platform').eq('status', 'published').order('published_at', { ascending: false }).limit(1).maybeSingle();
    reply = ['🩺 Sistem durumu', prob.length ? prob.join('\n') : '✅ Bağlantılar ve paylaşımlar sorunsuz',
      lastPub ? `Son paylaşım: ${PF[lastPub.platform] ?? lastPub.platform} ${hhmm(lastPub.published_at)} (${dayOf(new Date(lastPub.published_at))})` : '',
      `Dün: ${res.n} paylaşım`, fol ? `Takipçi: ${fol}` : ''].filter(Boolean).join('\n');
  } else {
    reply = ['Embay Yapı botu 🤖', '/bugun — bugünün paylaşımları', '/adaylar — cevap bekleyen fiyat/konum soranlar', '/durum — bağlantılar, son paylaşım, takipçi', '', 'Her sabah 08:00’de özet gelir; paylaşım olunca haber veririm.'].join('\n');
  }
  await telegramSend(reply, chatId);
  return { replied: cmd };
}

/** Webhook kurulumu: Telegram'a adresimizi ve gizli doğrulama belirtecini bildirir (belirteç Vault'ta). */
export async function telegramSetupWebhook(db: Db, url: string) {
  await loadAppSecrets(db);
  const token = appSecret('TELEGRAM_BOT_TOKEN');
  if (!token) return { error: 'TELEGRAM_BOT_TOKEN yok' };
  const { data: sec } = await db.rpc('telegram_webhook_secret');
  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, secret_token: sec, allowed_updates: ['message'], drop_pending_updates: true }) });
  const j = await r.json().catch(() => ({}));
  await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ commands: [{ command: 'bugun', description: 'Bugünün paylaşımları' }, { command: 'adaylar', description: 'Cevap bekleyen müşteri adayları' }, { command: 'durum', description: 'Sistem durumu' }] }) }).catch(() => null);
  return { ok: Boolean(j?.ok), description: j?.description ?? null };
}
