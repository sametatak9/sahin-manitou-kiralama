// Ortak connector arayüzü. Resmi API'si olmayan platform için sahte entegrasyon yazılmaz.

export type ConnectorCategory = 'social' | 'listing' | 'search' | 'communication' | 'design';
export type AuthType = 'oauth' | 'api_key' | 'manual' | 'none';

export interface Capabilities {
  publish: boolean;
  metrics: boolean;
  messaging: boolean;
  design: boolean;
}

export interface AccountRow {
  id: string;
  platform: string;
  connector_key: string | null;
  connection_status: string;
  external_account_id: string | null;
  external_account_name: string | null;
  credential_secret_id: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown>;
}

export interface PublishInput {
  caption: string;
  mediaUrls: string[];
}

export interface PublishOutput {
  externalPostId: string;
  externalUrl: string | null;
  raw: unknown;
}

export interface MetricsOutput {
  reach?: number | null; impressions?: number | null; likes?: number | null; comments?: number | null;
  shares?: number | null; saves?: number | null; clicks?: number | null; video_views?: number | null;
  raw: unknown;
}

export interface ConnectorDef {
  key: string;
  name: string;
  category: ConnectorCategory;
  authType: AuthType;
  officialApi: boolean;
  requiredEnv: string[];
  capabilities: Capabilities;
  docsUrl: string;
  note: string;
  /** true ise bu depoda gerçek API çağrısı uygulanmıştır. */
  implemented: boolean;
  publish?: (account: AccountRow, token: string, input: PublishInput) => Promise<PublishOutput>;
  fetchMetrics?: (account: AccountRow, token: string, externalPostId: string) => Promise<MetricsOutput>;
}

export class ConnectorError extends Error {
  constructor(message: string, public code: string, public raw?: unknown) { super(message); }
}

/** Gerçek durum: env eksikse CONFIG REQUIRED, hesap yoksa OAUTH REQUIRED, API yoksa MANUEL. */
export function resolveStatus(def: ConnectorDef, account?: Pick<AccountRow, 'connection_status' | 'token_expires_at'> | null, env: (k: string) => string | undefined = (k) => Deno.env.get(k)): string {
  if (!def.officialApi) return def.authType === 'manual' ? 'manual_only' : 'api_unavailable';
  if (def.requiredEnv.some((k) => !env(k))) return def.authType === 'api_key' ? 'api_key_required' : 'config_required';
  if (!def.implemented) return 'config_required';
  if (def.authType === 'oauth') {
    if (!account || account.connection_status === 'not_connected' || account.connection_status === 'oauth_required') return 'oauth_required';
    if (account.token_expires_at && new Date(account.token_expires_at).getTime() < Date.now()) return 'expired';
    return account.connection_status;
  }
  return account?.connection_status === 'error' ? 'error' : 'connected';
}
