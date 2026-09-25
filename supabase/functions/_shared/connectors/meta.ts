// Meta Graph API: Instagram (Business/Creator) + Facebook Sayfası. Resmi uçlar.
import { ConnectorError } from './types.ts';
import type { AccountRow, MetricsOutput, PublishInput, PublishOutput } from './types.ts';
import { secret as appSecret } from '../secrets.ts';

export const graphVersion = () => Deno.env.get('META_GRAPH_VERSION') || 'v23.0';
const graph = (path: string, host = 'graph.facebook.com') => `https://${host}/${graphVersion()}/${path.replace(/^\//, '')}`;
/** "Instagram ile giriş" ile bağlanan hesaplar graph.instagram.com'u, Facebook sayfası üzerinden bağlananlar graph.facebook.com'u kullanır. */
const igHost = (account: AccountRow) => (account.metadata?.login === 'instagram' ? 'graph.instagram.com' : 'graph.facebook.com');

// Facebook sayfası için yalnızca sayfa izinleri istenir. Instagram izinleri, uygulamaya "Instagram (Facebook girişiyle)"
// kullanım durumu eklenmeden istenirse Meta tüm girişi "Invalid Scopes" ile durdurur → yalnızca "Facebook sayfası üzerinden Instagram" bağlarken eklenir.
export const META_PAGE_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
export const META_IG_SCOPES = ['instagram_basic', 'instagram_content_publish', 'business_management'];
export const META_SCOPES = [...META_PAGE_SCOPES, ...META_IG_SCOPES];

async function call(method: 'GET' | 'POST', path: string, params: Record<string, string>, host?: string) {
  const url = new URL(graph(path, host));
  const init: RequestInit = { method };
  if (method === 'GET') Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  else init.body = new URLSearchParams(params);
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new ConnectorError(data.error?.message || `Graph API ${res.status}`, data.error?.code ? `META_${data.error.code}` : 'META_HTTP', data);
  }
  return data;
}

export function metaAuthorizeUrl(state: string, redirectUri: string, switchAccount = false, withInstagram = false) {
  const u = new URL(`https://www.facebook.com/${graphVersion()}/dialog/oauth`);
  u.searchParams.set('client_id', appSecret('META_APP_ID') || '');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', (withInstagram ? META_SCOPES : META_PAGE_SCOPES).join(','));
  // Hesap değiştir: Facebook izin/sayfa seçim ekranını yeniden gösterir (başka sayfa/IG hesabı seçilebilir)
  if (switchAccount) u.searchParams.set('auth_type', 'rerequest');
  return u.toString();
}

export interface MetaPageAccount {
  pageId: string; pageName: string; pageToken: string;
  igId: string | null; igUsername: string | null;
}

/** code → uzun ömürlü kullanıcı token'ı → sayfa token'ları + bağlı IG hesabı. */
export async function metaExchange(code: string, redirectUri: string): Promise<{ pages: MetaPageAccount[]; userName: string | null }> {
  const appId = appSecret('META_APP_ID') || '';
  const secret = appSecret('META_APP_SECRET') || '';
  const short = await call('GET', 'oauth/access_token', { client_id: appId, client_secret: secret, redirect_uri: redirectUri, code });
  const long = await call('GET', 'oauth/access_token', { grant_type: 'fb_exchange_token', client_id: appId, client_secret: secret, fb_exchange_token: short.access_token });
  const me = await call('GET', 'me', { fields: 'name', access_token: long.access_token });
  // Instagram izni verilmediyse IG alanı hata verebilir → IG alanı olmadan tekrar dene
  const accounts = await call('GET', 'me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: long.access_token, limit: '50' })
    .catch(() => call('GET', 'me/accounts', { fields: 'id,name,access_token', access_token: long.access_token, limit: '50' }));
  // deno-lint-ignore no-explicit-any
  const pages: MetaPageAccount[] = (accounts.data || []).map((p: any) => ({
    pageId: p.id, pageName: p.name, pageToken: p.access_token,
    igId: p.instagram_business_account?.id ?? null, igUsername: p.instagram_business_account?.username ?? null,
  }));
  return { pages, userName: me.name ?? null };
}

const isVideo = (u: string) => /\.(mp4|mov|m4v)(\?|$)/i.test(u);

async function waitForContainer(containerId: string, token: string, tries = 10, host?: string) {
  for (let i = 0; i < tries; i++) {
    const s = await call('GET', containerId, { fields: 'status_code,status', access_token: token }, host);
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new ConnectorError(`Instagram medya işleme hatası: ${s.status || s.status_code}`, 'IG_CONTAINER', s);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new ConnectorError('Instagram medya kapsayıcısı zamanında hazır olmadı', 'IG_CONTAINER_TIMEOUT');
}

export async function instagramPublish(account: AccountRow, token: string, input: PublishInput): Promise<PublishOutput> {
  if (!account.external_account_id) throw new ConnectorError('Instagram hesap kimliği yok', 'IG_NO_ACCOUNT');
  const media = input.mediaUrls[0];
  if (!media) throw new ConnectorError('Instagram API görselsiz/videosuz gönderi kabul etmez; önce medya yükleyin veya Design Studio’dan PNG dışa aktarın.', 'IG_MEDIA_REQUIRED');
  const video = isVideo(media);
  const params: Record<string, string> = { access_token: token };
  if (input.format === 'story') { params.media_type = 'STORIES'; params[video ? 'video_url' : 'image_url'] = media; }
  else if (video || input.format === 'reel') {
    if (!video) throw new ConnectorError('Reels için video (mp4/mov) gerekli', 'IG_REEL_VIDEO_REQUIRED');
    params.media_type = 'REELS'; params.video_url = media; params.caption = input.caption; params.share_to_feed = 'true';
  } else { params.image_url = media; params.caption = input.caption; }
  const host = igHost(account);
  const container = await call('POST', `${account.external_account_id}/media`, params, host);
  await waitForContainer(container.id, token, video ? 40 : 10, host);
  const published = await call('POST', `${account.external_account_id}/media_publish`, { creation_id: container.id, access_token: token }, host);
  const info = await call('GET', published.id, { fields: 'permalink,timestamp', access_token: token }, host).catch(() => ({}));
  return { externalPostId: published.id, externalUrl: info.permalink ?? null, raw: { container, published, info } };
}

export async function facebookPublish(account: AccountRow, token: string, input: PublishInput): Promise<PublishOutput> {
  if (!account.external_account_id) throw new ConnectorError('Facebook sayfa kimliği yok', 'FB_NO_PAGE');
  const media = input.mediaUrls[0];
  const res = media && isVideo(media)
    ? await call('POST', `${account.external_account_id}/videos`, { file_url: media, description: input.caption, access_token: token })
    : media
      ? await call('POST', `${account.external_account_id}/photos`, { url: media, caption: input.caption, access_token: token })
      : await call('POST', `${account.external_account_id}/feed`, { message: input.caption, access_token: token });
  const postId = res.post_id || res.id;
  const info = await call('GET', postId, { fields: 'permalink_url', access_token: token }).catch(() => ({}));
  return { externalPostId: postId, externalUrl: info.permalink_url ?? null, raw: { res, info } };
}

export async function instagramMetrics(account: AccountRow, token: string, mediaId: string): Promise<MetricsOutput> {
  const host = igHost(account);
  const basic = await call('GET', mediaId, { fields: 'like_count,comments_count', access_token: token }, host);
  let insights: Record<string, number> = {};
  let rawInsights: unknown = null;
  try {
    const ins = await call('GET', `${mediaId}/insights`, { metric: 'reach,saved,shares,views', access_token: token }, host);
    rawInsights = ins;
    // deno-lint-ignore no-explicit-any
    insights = Object.fromEntries((ins.data || []).map((m: any) => [m.name, m.values?.[0]?.value ?? m.total_value?.value ?? null]));
  } catch (e) { rawInsights = { error: String(e) }; }
  return {
    likes: basic.like_count ?? null, comments: basic.comments_count ?? null,
    reach: insights.reach ?? null, saves: insights.saved ?? null, shares: insights.shares ?? null, video_views: insights.views ?? null,
    impressions: null, clicks: null, raw: { basic, insights: rawInsights },
  };
}

export async function facebookMetrics(_account: AccountRow, token: string, postId: string): Promise<MetricsOutput> {
  const d = await call('GET', postId, { fields: 'reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares', access_token: token });
  return {
    likes: d.reactions?.summary?.total_count ?? null, comments: d.comments?.summary?.total_count ?? null, shares: d.shares?.count ?? null,
    reach: null, impressions: null, saves: null, clicks: null, video_views: null, raw: d,
  };
}

// ── Doğrudan "Instagram ile giriş" (Instagram API with Instagram Login) — Facebook sayfası gerekmez ──
export const IG_LOGIN_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish', 'instagram_business_manage_insights'];

export function instagramLoginUrl(state: string, redirectUri: string) {
  const u = new URL('https://www.instagram.com/oauth/authorize');
  u.searchParams.set('client_id', appSecret('INSTAGRAM_APP_ID') || '');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', IG_LOGIN_SCOPES.join(','));
  u.searchParams.set('state', state);
  u.searchParams.set('force_reauth', 'true'); // her seferinde hangi Instagram hesabıyla girileceği sorulur
  return u.toString();
}

/** code → kısa token → 60 günlük token + profil (kullanıcı adı, hesap türü). */
export async function instagramLoginExchange(code: string, redirectUri: string) {
  const res = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: new URLSearchParams({
    client_id: appSecret('INSTAGRAM_APP_ID') || '', client_secret: appSecret('INSTAGRAM_APP_SECRET') || '', grant_type: 'authorization_code', redirect_uri: redirectUri, code: code.replace(/#_$/, '') }) });
  const d = await res.json().catch(() => ({}));
  const short = d.access_token ?? d.data?.[0]?.access_token;
  if (!res.ok || !short) throw new ConnectorError(d.error_message || d.error?.message || `Instagram giriş hatası (HTTP ${res.status})`, 'IG_LOGIN', d);
  const lr = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret('INSTAGRAM_APP_SECRET') || '')}&access_token=${encodeURIComponent(short)}`);
  const long = await lr.json().catch(() => ({}));
  const token: string = long.access_token ?? short;
  const expiresIn: number = long.expires_in ?? 3600;
  const me = await call('GET', 'me', { fields: 'user_id,username,account_type,name', access_token: token }, 'graph.instagram.com');
  return { token, expiresIn, igId: String(me.user_id ?? me.id), username: me.username as string, accountType: (me.account_type ?? null) as string | null, name: (me.name ?? null) as string | null };
}

/** 60 günlük Instagram token'ını yeniler (en az 24 saatlik token gerekir). */
export async function instagramRefresh(token: string) {
  const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new ConnectorError(d.error?.message || `Instagram token yenilenemedi (HTTP ${r.status})`, 'IG_REFRESH', d);
  return { token: d.access_token as string, expiresIn: (d.expires_in ?? 5184000) as number };
}

/** Rakip/tedarikçi İşletme hesabı analizi — resmi Instagram Graph API "Business Discovery" (yalnızca herkese açık işletme/yaratıcı hesaplar).
 *  Facebook Girişi ile bağlanmış Instagram işletme hesabı token'ı gerekir (Instagram Girişi token'ı bu uç noktayı desteklemez). Kişi verisi dönmez. */
export async function businessDiscovery(igUserId: string, token: string, username: string) {
  const fields = `business_discovery.username(${username}){username,name,followers_count,media_count,media.limit(12){like_count,comments_count,media_type,timestamp,permalink,caption}}`;
  const d = await call('GET', igUserId, { fields, access_token: token });
  const b = d.business_discovery ?? {};
  // deno-lint-ignore no-explicit-any
  const media: any[] = b.media?.data ?? [];
  const eng = media.map((m) => (m.like_count ?? 0) + (m.comments_count ?? 0));
  const avg = eng.length ? eng.reduce((a, c) => a + c, 0) / eng.length : 0;
  const days = media.length > 1 ? (new Date(media[0].timestamp).getTime() - new Date(media[media.length - 1].timestamp).getTime()) / 86400000 : null;
  const byType: Record<string, number[]> = {};
  for (const m of media) (byType[m.media_type] ??= []).push((m.like_count ?? 0) + (m.comments_count ?? 0));
  return {
    username: b.username as string, name: b.name as string | undefined, followers: b.followers_count as number | undefined, media_count: b.media_count as number | undefined,
    avg_engagement: Math.round(avg), engagement_rate: b.followers_count ? Math.round((avg / b.followers_count) * 10000) / 100 : null,
    posts_per_week: days && days > 0 ? Math.round(((media.length - 1) / days) * 7 * 10) / 10 : null,
    by_type: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v.reduce((a, c) => a + c, 0) / v.length)])),
    top_posts: media.map((m) => ({ url: m.permalink, type: m.media_type, at: m.timestamp, engagement: (m.like_count ?? 0) + (m.comments_count ?? 0), caption: String(m.caption ?? '').slice(0, 140) }))
      .sort((a, c) => c.engagement - a.engagement).slice(0, 3),
  };
}
