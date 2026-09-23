// Panel ↔ ops edge function köprüsü. Secret yok; yalnızca kullanıcının oturum JWT'si gönderilir.
import { supabase, supabasePublishableKey, supabaseUrl } from '../../lib/supabase';

export class OpsApiError extends Error {
  constructor(message: string, public code: string, public status: number) { super(message); }
}

export function callOps<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  return callFn<T>('ops', action, body);
}

/** Bot görevleri (mission) ve yetenek tanımlama: missions edge function. */
export function callMissions<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  return callFn<T>('missions', action, body);
}

async function callFn<T>(fn: 'ops' | 'missions', action: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new OpsApiError('Supabase yapılandırılmamış', 'CONFIGURATION_REQUIRED', 0);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new OpsApiError('Oturum bulunamadı', 'UNAUTHENTICATED', 401);
  const res = await fetch(`${supabaseUrl}/functions/v1/${fn}/api`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, apikey: supabasePublishableKey },
    body: JSON.stringify({ action, ...body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new OpsApiError(json.error || `İstek başarısız (${res.status})`, json.code || 'ERROR', res.status);
  return json as T;
}

export function errorText(e: unknown): string {
  if (e instanceof OpsApiError) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: string }).message);
  return String(e);
}

export function errorCode(e: unknown): string {
  if (e instanceof OpsApiError) return e.code;
  if (e && typeof e === 'object' && 'code' in e) return String((e as { code: string }).code);
  return 'ERROR';
}
