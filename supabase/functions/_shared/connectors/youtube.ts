// YouTube Data API v3: Google OAuth (offline, refresh token) + resumable video yükleme. Resmi uçlar.
import { ConnectorError } from './types.ts';
import type { AccountRow, PublishInput, PublishOutput } from './types.ts';
import { secret as appSecret } from '../secrets.ts';

export const YOUTUBE_SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];

export function googleAuthorizeUrl(state: string, redirectUri: string) {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', appSecret('GOOGLE_CLIENT_ID') || '');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', YOUTUBE_SCOPES.join(' '));
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  u.searchParams.set('state', state);
  return u.toString();
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    client_id: appSecret('GOOGLE_CLIENT_ID') || '', client_secret: appSecret('GOOGLE_CLIENT_SECRET') || '', ...params }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new ConnectorError(data.error_description || data.error || `Google OAuth ${res.status}`, 'GOOGLE_OAUTH', data);
  return data as { access_token: string; refresh_token?: string; expires_in: number };
}

/** code → token + kanal bilgisi (bağlantı yalnızca kanal API'den okunduğunda CONNECTED sayılır). */
export async function googleExchange(code: string, redirectUri: string) {
  const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
  if (!t.refresh_token) throw new ConnectorError('Google yenileme anahtarı vermedi; bağlantıyı kaldırıp tekrar deneyin', 'GOOGLE_NO_REFRESH');
  const ch = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { authorization: `Bearer ${t.access_token}` } }).then((r) => r.json());
  const channel = ch.items?.[0];
  if (!channel) throw new ConnectorError('Bu Google hesabında YouTube kanalı bulunamadı', 'YT_NO_CHANNEL', ch);
  return { refreshToken: t.refresh_token, channelId: channel.id as string, channelTitle: channel.snippet?.title as string, customUrl: channel.snippet?.customUrl as string | undefined };
}

export async function youtubePublish(account: AccountRow, secret: string, input: PublishInput): Promise<PublishOutput> {
  let refresh = secret; try { refresh = JSON.parse(secret).refresh_token ?? secret; } catch { /* düz metin */ }
  const { access_token } = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refresh });
  const video = input.mediaUrls.find((u) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(u)) ?? input.mediaUrls[0];
  if (!video) throw new ConnectorError('YouTube için video dosyası gerekli', 'YT_VIDEO_REQUIRED');
  const file = await fetch(video);
  if (!file.ok) throw new ConnectorError(`Video indirilemedi (HTTP ${file.status})`, 'YT_VIDEO_FETCH');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = file.headers.get('content-type') || 'video/mp4';
  const isShort = input.format === 'short';
  const firstLine = (input.title || input.caption.split('\n')[0] || 'Embay Yapı & Şahin Manitou').slice(0, isShort ? 90 : 100);
  const meta = {
    snippet: { title: isShort && !/#shorts/i.test(firstLine) ? `${firstLine} #Shorts` : firstLine, description: input.caption.slice(0, 4900),
      tags: (input.caption.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1)).slice(0, 15), categoryId: '22', defaultLanguage: 'tr' },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
  };
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST', headers: { authorization: `Bearer ${access_token}`, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': type, 'x-upload-content-length': String(bytes.length) },
    body: JSON.stringify(meta),
  });
  if (!init.ok) throw new ConnectorError(`YouTube yükleme başlatılamadı: ${(await init.text()).slice(0, 300)}`, 'YT_INIT');
  const uploadUrl = init.headers.get('location');
  if (!uploadUrl) throw new ConnectorError('YouTube yükleme adresi dönmedi', 'YT_INIT');
  const up = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': type, 'content-length': String(bytes.length) }, body: bytes });
  const data = await up.json().catch(() => ({}));
  if (!up.ok || !data.id) throw new ConnectorError(`YouTube yükleme hatası: ${JSON.stringify(data).slice(0, 300)}`, 'YT_UPLOAD', data);
  return { externalPostId: data.id, externalUrl: isShort ? `https://www.youtube.com/shorts/${data.id}` : `https://www.youtube.com/watch?v=${data.id}`, raw: { id: data.id, status: data.status } };
}
