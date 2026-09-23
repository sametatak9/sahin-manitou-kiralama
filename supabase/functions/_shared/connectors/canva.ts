// Canva Connect API (resmi REST). OAuth 2.0 + PKCE. Brand template autofill Canva Enterprise ister.
import { ConnectorError } from './types.ts';

const API = 'https://api.canva.com/rest/v1';
export const CANVA_SCOPES = ['design:content:read', 'design:content:write', 'design:meta:read', 'asset:read', 'asset:write', 'profile:read'];

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function pkceVerifier() {
  return b64url(crypto.getRandomValues(new Uint8Array(48)));
}
export async function pkceChallenge(verifier: string) {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

export async function canvaAuthorizeUrl(state: string, verifier: string, redirectUri: string) {
  const u = new URL('https://www.canva.com/api/oauth/authorize');
  u.searchParams.set('code_challenge_method', 's256');
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', Deno.env.get('CANVA_CLIENT_ID') || '');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('scope', CANVA_SCOPES.join(' '));
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', await pkceChallenge(verifier));
  return u.toString();
}

export interface CanvaTokens { access_token: string; refresh_token: string; expires_in: number; scope?: string }

async function tokenRequest(body: Record<string, string>): Promise<CanvaTokens> {
  const basic = btoa(`${Deno.env.get('CANVA_CLIENT_ID')}:${Deno.env.get('CANVA_CLIENT_SECRET')}`);
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ConnectorError(data.error_description || data.message || `Canva token ${res.status}`, 'CANVA_TOKEN', data);
  return data;
}

export const canvaExchange = (code: string, verifier: string, redirectUri: string) =>
  tokenRequest({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: redirectUri });
export const canvaRefresh = (refreshToken: string) => tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });

async function api(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ConnectorError(data.message || `Canva API ${res.status}`, `CANVA_${data.code || res.status}`, data);
  return data;
}

export const canvaProfile = (token: string) => api(token, 'GET', '/users/me/profile');

async function pollJob(token: string, path: string, pick: (d: Record<string, unknown>) => Record<string, unknown>) {
  for (let i = 0; i < 20; i++) {
    const job = pick(await api(token, 'GET', path));
    if (job.status === 'success') return job;
    if (job.status === 'failed') throw new ConnectorError(`Canva işi başarısız: ${JSON.stringify(job.error || {})}`, 'CANVA_JOB_FAILED', job);
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new ConnectorError('Canva işi zaman aşımına uğradı', 'CANVA_JOB_TIMEOUT');
}

/** Herkese açık bir görsel URL'sini Canva varlığına yükler. */
export async function canvaUploadFromUrl(token: string, name: string, url: string): Promise<string> {
  const started = await api(token, 'POST', '/url-asset-uploads', { name: name.slice(0, 50), url });
  // deno-lint-ignore no-explicit-any
  const job: any = await pollJob(token, `/url-asset-uploads/${started.job.id}`, (d) => d.job as Record<string, unknown>);
  return job.asset.id;
}

export async function canvaCreateDesign(token: string, title: string, width: number, height: number, assetId?: string) {
  const d = await api(token, 'POST', '/designs', {
    design_type: { type: 'custom', width, height },
    title: title.slice(0, 255),
    ...(assetId ? { asset_id: assetId } : {}),
  });
  return { id: d.design.id as string, editUrl: d.design.urls?.edit_url as string, viewUrl: d.design.urls?.view_url as string, raw: d };
}

export async function canvaExportPng(token: string, designId: string): Promise<string[]> {
  const started = await api(token, 'POST', '/exports', { design_id: designId, format: { type: 'png' } });
  // deno-lint-ignore no-explicit-any
  const job: any = await pollJob(token, `/exports/${started.job.id}`, (d) => d.job as Record<string, unknown>);
  return job.urls || [];
}
