// Uygulama aktivite günlüğü (connector_activity): bağlan / paylaş / istatistik / token yenile / hata / gelen olay.
// Günlük yazımı asla asıl işi bozmaz (hata yutulur). Token ve gizli anahtar yazılmaz.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

export interface ActivityRow {
  connector_key: string; action: 'connect' | 'disconnect' | 'token_refresh' | 'verify' | 'publish' | 'metrics_sync' | 'manual_share' | 'message_send' | 'webhook' | 'rate_limit' | 'error';
  status: 'ok' | 'failed' | 'skipped' | 'pending';
  account_id?: string | null; bot_id?: string | null; ref_type?: string | null; ref_id?: string | null;
  external_id?: string | null; external_url?: string | null; duration_ms?: number | null; summary?: string | null;
  error_code?: string | null; error?: string | null; data?: Record<string, unknown>; actor?: string | null;
}

export async function logActivity(db: SupabaseClient, row: ActivityRow) {
  try {
    await db.from('connector_activity').insert({ ...row, summary: row.summary?.slice(0, 500) ?? null, error: row.error?.slice(0, 1000) ?? null, data: row.data ?? {} });
  } catch (e) { console.error('activity log', e); }
}
