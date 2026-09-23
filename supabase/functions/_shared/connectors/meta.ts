// Meta Graph API: Instagram (Business/Creator) + Facebook Sayfası. Resmi uçlar.
import { ConnectorError } from './types.ts';
import type { AccountRow, MetricsOutput, PublishInput, PublishOutput } from './types.ts';
import { secret as appSecret } from '../secrets.ts';

export const graphVersion = () => Deno.env.get('META_GRAPH_VERSION') || 'v23.0';
const graph = (path: string) => `https://graph.facebook.com/${graphVersion()}/${path.replace(/^\//, '')}`;

export const META_SCOPES = [
  'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'read_insights',
  'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'business_management',
];

async function call(method: 'GET' | 'POST', path: string, params: Record<string, string>) {
  const url = new URL(graph(path));
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

export function metaAuthorizeUrl(state: string, redirectUri: string) {
  const u = new URL(`https://www.facebook.com/${graphVersion()}/dialog/oauth`);
  u.searchParams.set('client_id', appSecret('META_APP_ID') || '');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', META_SCOPES.join(','));
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
  const accounts = await call('GET', 'me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: long.access_token, limit: '50' });
  // deno-lint-ignore no-explicit-any
  const pages: MetaPageAccount[] = (accounts.data || []).map((p: any) => ({
    pageId: p.id, pageName: p.name, pageToken: p.access_token,
    igId: p.instagram_business_account?.id ?? null, igUsername: p.instagram_business_account?.username ?? null,
  }));
  return { pages, userName: me.name ?? null };
}

const isVideo = (u: string) => /\.(mp4|mov|m4v)(\?|$)/i.test(u);

async function waitForContainer(containerId: string, token: string, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const s = await call('GET', containerId, { fields: 'status_code,status', access_token: token });
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
  const container = await call('POST', `${account.external_account_id}/media`, params);
  await waitForContainer(container.id, token, video ? 40 : 10);
  const published = await call('POST', `${account.external_account_id}/media_publish`, { creation_id: container.id, access_token: token });
  const info = await call('GET', published.id, { fields: 'permalink,timestamp', access_token: token }).catch(() => ({}));
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

export async function instagramMetrics(_account: AccountRow, token: string, mediaId: string): Promise<MetricsOutput> {
  const basic = await call('GET', mediaId, { fields: 'like_count,comments_count', access_token: token });
  let insights: Record<string, number> = {};
  let rawInsights: unknown = null;
  try {
    const ins = await call('GET', `${mediaId}/insights`, { metric: 'reach,saved,shares,views', access_token: token });
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
