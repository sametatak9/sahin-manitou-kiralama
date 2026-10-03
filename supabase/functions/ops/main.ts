// EMBAY OPS edge function — tek giriş noktası:
//   POST /ops/worker            → pg_cron (x-worker-secret) : due task + onaylı işlemler + zamanı gelen yayınlar + metrikler
//   POST /ops/api {action,...}  → panel (kullanıcı JWT + ekip rolü)
//   GET  /ops/oauth/callback    → Meta / Canva OAuth dönüşü
import { initKeyStore, providerAvailability } from '../_shared/ai/index.ts';
import { getAiKey, liveKeyTest } from '../_shared/ai/keys.ts';
import { loadAppSecrets, resetAppSecrets, secret, secretSource } from '../_shared/secrets.ts';
import { googleAuthorizeUrl, googleExchange } from '../_shared/connectors/youtube.ts';
import { aiComplete, loadAgent, serviceClient, type Db, type EngineCtx, type TaskRow } from '../_shared/context.ts';
import { executeTask } from '../_shared/engine.ts';
import { logActivity } from '../_shared/activity.ts';
import { CONNECTORS, connectorByKey, publicConnectorInfo } from '../_shared/connectors/registry.ts';
import { ConnectorError, resolveStatus } from '../_shared/connectors/types.ts';
import { businessDiscovery, graphVersion, instagramLoginExchange, instagramLoginUrl, metaAuthorizeUrl, metaExchange } from '../_shared/connectors/meta.ts';
import { canvaAuthorizeUrl, canvaCreateDesign, canvaExchange, canvaExportPng, canvaProfile, canvaRefresh, canvaUploadFromUrl, pkceVerifier } from '../_shared/connectors/canva.ts';
import { telegramSend } from '../_shared/connectors/messaging.ts';
import { inboxReply, inboxTick } from '../_shared/inbox.ts';
import { archiveTick, growthTick, radarDigest, radarTick } from '../_shared/radar.ts';
import { aiImage, factoryTick, planTick, renderBanner, renderBannerToPool, runContentFactory } from '../_shared/factory.ts';
import { istanbulDayRange } from '../_shared/context.ts';
import { driveTick, parseFolderId, syncDriveFolder } from '../_shared/drive.ts';
import { processDueApprovals, publishContent, syncMetrics, tokenFor } from '../_shared/publisher.ts';
import { generateContent } from '../_shared/tools/registry.ts';

const PANEL_URL = () => Deno.env.get('PANEL_URL') || 'https://embay-panel.vercel.app';
const REDIRECT_URI = () => `${Deno.env.get('SUPABASE_URL')}/functions/v1/ops/oauth/callback`;

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-worker-secret',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
class HttpError extends Error { constructor(public status: number, message: string, public code = 'ERROR') { super(message); } }

async function requireUser(db: Db, req: Request, minRole: 'staff' | 'admin' = 'staff') {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) throw new HttpError(401, 'Oturum gerekli', 'UNAUTHENTICATED');
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, 'Geçersiz oturum', 'UNAUTHENTICATED');
  const { data: member } = await db.from('team_members').select('role').eq('user_id', data.user.id).maybeSingle();
  if (!member) throw new HttpError(403, 'Ekip üyesi değilsiniz', 'PERMISSION_DENIED');
  if (minRole === 'admin' && member.role !== 'admin') throw new HttpError(403, 'Bu işlem yönetici yetkisi gerektirir', 'PERMISSION_DENIED');
  return { userId: data.user.id, role: member.role as string };
}

function apiCtx(db: Db, userId: string, role: string): EngineCtx {
  return { db, runId: null, task: null, bot: null, skill: null, agent: null, actorId: userId, actorRole: role, approvalsCreated: [], outputs: {},
    log: async (level, message, data) => { console.log(level, message, data ?? ''); }, tokens: { in: 0, out: 0 } };
}

// ── Worker ───────────────────────────────────────────────────────────────────
async function runWorker(db: Db, workerId: string) {
  const { data: tasks, error } = await db.rpc('claim_due_tasks', { p_worker: workerId, p_limit: 3, p_lease_seconds: 300 });
  if (error) throw error;
  const taskResults = [];
  for (const t of (tasks || []) as TaskRow[]) {
    try { taskResults.push(await executeTask(db, t, { trigger: t.attempt > 1 ? 'retry' : 'schedule', workerId })); }
    catch (e) { taskResults.push({ task_id: t.id, error: String(e) }); await db.from('automation_tasks').update({ status: 'scheduled', locked_by: null, locked_until: null, last_error: String(e).slice(0, 500) }).eq('id', t.id); }
  }
  const approvals = await processDueApprovals(db, workerId, 5);
  // Otopilot: kapalıysa yayın ve içerik üretimi durur; açıkken yayınlar yalnızca mesai penceresinde (ör. 08:00–18:00) çıkar.
  const { data: ap } = await db.rpc('autopilot_state');
  const autopilot = (ap ?? { enabled: true, active: true }) as { enabled: boolean; active: boolean };
  const content = autopilot.active ? await publishDueContent(db, workerId) : { skipped: autopilot.enabled ? 'mesai dışı' : 'otopilot kapalı' };
  const metrics = await syncMetrics(db, 3);
  const factory = autopilot.enabled ? await factoryTick(db, background).catch((e) => ({ error: String(e).slice(0, 200) })) : { skipped: 'otopilot kapalı' };
  const drive = await driveTick(db, background).catch((e) => ({ error: String(e).slice(0, 200) }));
  const plan = await planTick(db).catch((e) => ({ error: String(e).slice(0, 200) }));
  // Yorum botu: kendi gönderilerimize gelen sorular (10 dk'da bir) — mesai dışında da çalışır, müşteri beklemez
  const inbox = await inboxTick(db).catch((e) => ({ error: String(e).slice(0, 200) }));
  // Büyüme botu: günlük kitle radarı (resmi etiket araması), gerçek takipçi ölçümü, eski başarılı gönderileri havuza alma
  const radar = await radarTick(db).catch((e) => ({ error: String(e).slice(0, 200) }));
  const growth = await growthTick(db).catch((e) => ({ error: String(e).slice(0, 200) }));
  const archive = await archiveTick(db).catch((e) => ({ error: String(e).slice(0, 200) }));
  const digest = await radarDigest(db).catch((e) => ({ error: String(e).slice(0, 200) }));
  return { tasks: taskResults, approvals, content, metrics, factory, drive, plan, inbox, radar, growth, archive, digest, autopilot };
}

/** Uzun işleri (içerik fabrikası) isteği bekletmeden arka planda sürdürür. */
function background(p: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p); else p.catch(() => undefined);
}

/** Onaylı + zamanı gelmiş içerikleri, hesabı gerçekten bağlı platformlarda yayınlar. Bağlı değilse dokunmaz. */
async function publishDueContent(db: Db, workerId: string) {
  // Yalnızca hesabı bağlı platformlar ve arşivlenmemiş taslaklar (bağlı olmayan platformların eski taslakları sırayı tıkamasın)
  const { data: accs } = await db.from('social_accounts').select('connector_key,platform').eq('connection_status', 'connected');
  const live = [...new Set((accs || []).flatMap((a) => [a.connector_key, a.platform]).filter(Boolean))] as string[];
  if (!live.length) return [];
  const { data: drafts } = await db.from('social_drafts').select('id,primary_platform,platform_targets,approved_by,created_by,scheduled_at,format,design_provider,video_url')
    .in('workflow_status', ['approved', 'scheduled']).is('archived_at', null).in('primary_platform', live).lte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(10);
  const out = [];
  for (const d of drafts || []) {
    // Ham (editsiz) Reels yayınlanmaz: otomatik montaj bağlanana kadar bekler
    // Editsiz video ASLA yayınlanmaz (Reels, kısa video veya videolu gönderi): önce otomatik montaj (müzik + geçiş + logo) bağlanmalı
      if ((d.video_url || d.format === 'reel' || d.format === 'short') && d.design_provider !== 'embay_montage') continue;
    const platform = d.primary_platform || d.platform_targets?.[0];
    const def = connectorByKey(platform);
    if (!def?.publish) continue;
    const { data: acc } = await db.from('social_accounts').select('connection_status,token_expires_at').or(`connector_key.eq.${platform},platform.eq.${platform}`).eq('connection_status', 'connected').limit(1).maybeSingle();
    if (resolveStatus(def, acc) !== 'connected') continue;
    const { data: claimed } = await db.from('social_drafts').update({ workflow_status: 'processing' }).eq('id', d.id).in('workflow_status', ['approved', 'scheduled']).select('id').maybeSingle();
    if (!claimed) continue;
    try { out.push(await publishContent(apiCtx(db, d.approved_by || d.created_by, 'admin'), { content_id: d.id, platform, approved_by: d.approved_by, scheduled_at: d.scheduled_at })); }
    catch (e) {
      await db.from('social_drafts').update({ workflow_status: 'failed', error: String((e as Error).message).slice(0, 500) }).eq('id', d.id).eq('workflow_status', 'processing');
      out.push({ content_id: d.id, error: String((e as Error).message), worker: workerId });
    }
  }
  return out;
}

// ── Durum (secret değerleri ASLA döndürülmez; yalnızca var/yok) ─────────────
async function status(db: Db) {
  const [{ data: accounts }, { data: lastRun }, { data: canva }] = await Promise.all([
    db.from('social_accounts').select('id,platform,connector_key,connection_status,external_account_name,token_expires_at,last_verified_at,last_error'),
    db.from('social_bot_runs').select('created_at,worker_id').not('worker_id', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('social_accounts').select('id').eq('connector_key', 'canva').eq('connection_status', 'connected').limit(1),
  ]);
  const connectors = CONNECTORS.map((def) => {
    const own = (accounts || []).filter((a) => a.connector_key === def.key);
    const best = own.find((a) => a.connection_status === 'connected') ?? own[0] ?? null;
    return { ...publicConnectorInfo(def), status: resolveStatus(def, best), missing_env: def.requiredEnv.filter((k) => !secret(k)), accounts: own };
  });
  return { ai: await providerAvailability(), connectors, worker_last_seen: lastRun?.created_at ?? null, canva_connected: Boolean(canva?.length), redirect_uri: REDIRECT_URI() };
}

// ── Uygulama giriş bilgilerinin canlı doğrulaması: Meta / Google'a gerçekten sorulur (secret döndürülmez) ──
async function verifyApp(provider: 'meta' | 'google'): Promise<Check[]> {
  const out: Check[] = [];
  const host = new URL(REDIRECT_URI()).hostname;
  if (provider === 'meta') {
    const id = secret('META_APP_ID'); const sec = secret('META_APP_SECRET');
    if (!id || !sec) return [{ key: 'verify:meta', group: 'Uygulamalar', label: 'Meta uygulama bilgileri (canlı test)', state: 'warn', detail: 'Uygulama Kimliği / Gizli Anahtar girilmemiş', fix: 'Uygulamalar → Giriş bilgileri → Meta' }];
    try {
      const r = await fetch(`https://graph.facebook.com/${graphVersion()}/oauth/access_token?grant_type=client_credentials&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(sec)}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.access_token) {
        out.push({ key: 'verify:meta', group: 'Uygulamalar', label: 'Meta Uygulama Kimliği + Gizli Anahtar', state: 'fail', detail: `Facebook reddetti: ${d.error?.message ?? `HTTP ${r.status}`}`, fix: 'developers.facebook.com → Uygulama Ayarları → Temel → “Uygulama Gizli Anahtarı”nı “Göster” ile açıp tamamını (32 karakter) kopyalayın' });
        return out;
      }
      out.push({ key: 'verify:meta', group: 'Uygulamalar', label: 'Meta Uygulama Kimliği + Gizli Anahtar', state: 'ok', detail: 'Facebook doğruladı' });
      const a = await fetch(`https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(id)}?fields=name,app_domains,website_url&access_token=${encodeURIComponent(d.access_token)}`);
      const app = await a.json().catch(() => ({}));
      const domains: string[] = app.app_domains ?? [];
      const okDomain = domains.some((x) => x.replace(/^https?:\/\//, '').replace(/\/.*$/, '') === host);
      out.push({ key: 'verify:meta:domain', group: 'Uygulamalar', label: `Meta uygulama alan adı${app.name ? ` (${app.name})` : ''}`, state: okDomain ? 'ok' : 'fail',
        detail: okDomain ? `${host} ekli` : `“Uygulama Alan Adları”nda ${host} yok (şu an: ${domains.join(', ') || 'boş'}). Facebook “URL Yüklenemedi” hatası bundan çıkar.`,
        fix: okDomain ? undefined : 'Uygulamalar sayfasının altındaki kutudan adresleri kopyalayıp Meta ayarlarına yapıştırın' });
    } catch (e) { out.push({ key: 'verify:meta', group: 'Uygulamalar', label: 'Meta (canlı test)', state: 'warn', detail: `Bağlantı hatası: ${String(e).slice(0, 120)}` }); }
    return out;
  }
  const cid = secret('GOOGLE_CLIENT_ID'); const csec = secret('GOOGLE_CLIENT_SECRET');
  if (!cid || !csec) return [{ key: 'verify:google', group: 'Uygulamalar', label: 'Google uygulama bilgileri (canlı test)', state: 'warn', detail: 'İstemci kimliği / gizli anahtar girilmemiş', fix: 'Uygulamalar → Giriş bilgileri → Google' }];
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ code: 'embay-dogrulama', client_id: cid, client_secret: csec, redirect_uri: REDIRECT_URI(), grant_type: 'authorization_code' }) });
    const d = await r.json().catch(() => ({}));
    const credOk = d.error === 'invalid_grant';
    out.push({ key: 'verify:google', group: 'Uygulamalar', label: 'Google istemci kimliği + gizli anahtar', state: credOk ? 'ok' : 'fail',
      detail: credOk ? 'Google doğruladı' : `Google reddetti: ${d.error_description ?? d.error ?? `HTTP ${r.status}`}`,
      fix: credOk ? undefined : 'Google Cloud → Kimlik bilgileri → OAuth istemcisi: “İstemci gizli anahtarı” GOCSPX- ile başlar; istemci kimliği ile karıştırmayın' });
    const u = new URL(googleAuthorizeUrl('embay-dogrulama', REDIRECT_URI()));
    const a = await fetch(u, { redirect: 'manual' });
    const loc = a.headers.get('location') ?? '';
    let mismatch = false;
    if (loc.includes('/signin/oauth/error')) {
      const raw = new URL(loc).searchParams.get('authError') ?? '';
      try { mismatch = atob(raw.replace(/-/g, '+').replace(/_/g, '/')).includes('redirect_uri_mismatch'); } catch { mismatch = true; }
    }
    const bad = loc.includes('/signin/oauth/error');
    out.push({ key: 'verify:google:redirect', group: 'Uygulamalar', label: 'Google yönlendirme adresi', state: bad ? 'fail' : 'ok',
      detail: bad ? (mismatch ? 'Google Cloud’da “Yetkili yönlendirme URI’leri”ne bizim adres eklenmemiş (redirect_uri_mismatch)' : 'Google giriş ekranı hata veriyor') : 'Google giriş ekranı açılıyor',
      fix: bad ? 'Uygulamalar sayfasının altındaki kutudan adresi kopyalayıp Google Cloud → OAuth istemcisi → Yetkili yönlendirme URI’lerine ekleyin' : undefined });
  } catch (e) { out.push({ key: 'verify:google', group: 'Uygulamalar', label: 'Google (canlı test)', state: 'warn', detail: `Bağlantı hatası: ${String(e).slice(0, 120)}` }); }
  return out;
}

// ── Kayıtlı anahtarlar raporu: her anahtar maskeli (yalnız son 4 hane) + nereden geldiği + canlı test sonucu ──
type KeyRow = { group: string; name: string; label: string; source: 'panel' | 'sunucu' | null; masked: string | null; saved_at: string | null; state: 'ok' | 'fail' | 'warn' | 'missing'; detail: string; can_clear: boolean };
const mask = (v?: string | null) => (v ? `••••••${v.slice(-4)}` : null);
const APP_KEYS: Array<{ group: string; name: string; label: string }> = [
  { group: 'Instagram', name: 'INSTAGRAM_APP_ID', label: 'Instagram uygulama kimliği' }, { group: 'Instagram', name: 'INSTAGRAM_APP_SECRET', label: 'Instagram gizli anahtarı' },
  { group: 'Meta (Facebook)', name: 'META_APP_ID', label: 'Facebook uygulama kimliği' }, { group: 'Meta (Facebook)', name: 'META_APP_SECRET', label: 'Facebook gizli anahtarı' },
  { group: 'Google (YouTube)', name: 'GOOGLE_CLIENT_ID', label: 'Google istemci kimliği' }, { group: 'Google (YouTube)', name: 'GOOGLE_CLIENT_SECRET', label: 'Google gizli anahtarı' },
  { group: 'Telegram', name: 'TELEGRAM_BOT_TOKEN', label: 'Telegram bot anahtarı' }, { group: 'Telegram', name: 'TELEGRAM_CHAT_ID', label: 'Telegram sohbet kimliği' },
  { group: 'E-posta', name: 'RESEND_API_KEY', label: 'Resend anahtarı' }, { group: 'E-posta', name: 'EMAIL_FROM', label: 'Gönderen adres' },
  { group: 'WhatsApp', name: 'WHATSAPP_TOKEN', label: 'WhatsApp erişim anahtarı' }, { group: 'WhatsApp', name: 'WHATSAPP_PHONE_NUMBER_ID', label: 'WhatsApp numara kimliği' },
  { group: 'Canva', name: 'CANVA_CLIENT_ID', label: 'Canva istemci kimliği' }, { group: 'Canva', name: 'CANVA_CLIENT_SECRET', label: 'Canva gizli anahtarı' },
  { group: 'Web araması (Tavily)', name: 'TAVILY_API_KEY', label: 'Tavily arama anahtarı' },
];

async function credentialsReport(db: Db) {
  const rows: KeyRow[] = [];
  // 1) Yapay zekâ anahtarları (botların beyni)
  const { data: aiRows } = await db.from('ai_provider_keys').select('provider,updated_at');
  const ENVN = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY', github: 'GITHUB_MODELS_TOKEN', cerebras: 'CEREBRAS_API_KEY', mistral: 'MISTRAL_API_KEY' } as const;
  const AIL = { anthropic: 'Claude (Anthropic)', gemini: 'Gemini (Google)', openai: 'OpenAI (ChatGPT)', groq: 'Groq (ücretsiz)', openrouter: 'OpenRouter (ücretsiz)', github: 'GitHub Models (ücretsiz)', cerebras: 'Cerebras (ücretsiz)', mistral: 'Mistral (ücretsiz)' } as const;
  for (const p of ['anthropic', 'gemini', 'openai', 'groq', 'openrouter', 'github', 'cerebras', 'mistral'] as const) {
    const key = await getAiKey(p);
    const panelRow = (aiRows || []).find((r: { provider: string }) => r.provider === p) as { updated_at: string } | undefined;
    const source = panelRow ? 'panel' : Deno.env.get(ENVN[p]) ? 'sunucu' : null;
    if (!key) { rows.push({ group: 'Yapay zekâ (botlar)', name: `ai:${p}`, label: AIL[p], source: null, masked: null, saved_at: null, state: 'missing', detail: 'Girilmemiş', can_clear: false }); continue; }
    const t = await liveKeyTest(p, key);
    rows.push({ group: 'Yapay zekâ (botlar)', name: `ai:${p}`, label: AIL[p], source, masked: mask(key), saved_at: panelRow?.updated_at ?? null, state: t.ok ? 'ok' : 'fail',
      detail: t.ok ? t.detail : `${t.detail}${source === 'sunucu' ? ' · Bu eski sunucu anahtarı; panelden yeni anahtar girince otomatik devre dışı kalır.' : ''}`, can_clear: source === 'panel' });
  }
  // 2) Uygulama giriş bilgileri
  const { data: saved } = await db.from('app_credentials').select('name,updated_at');
  const savedAt = new Map<string, string>((saved || []).map((r: { name: string; updated_at: string }) => [r.name, r.updated_at]));
  const live: Record<string, Check[]> = {};
  if (secret('META_APP_ID') && secret('META_APP_SECRET')) live.meta = await verifyApp('meta');
  if (secret('GOOGLE_CLIENT_ID') && secret('GOOGLE_CLIENT_SECRET')) live.google = await verifyApp('google');
  for (const k of APP_KEYS) {
    const v = secret(k.name);
    if (!v) { rows.push({ group: k.group, name: k.name, label: k.label, source: null, masked: null, saved_at: null, state: 'missing', detail: 'Girilmemiş', can_clear: false }); continue; }
    const { data: fmtRaw } = await db.rpc('app_credential_format_error', { p_name: k.name, p_value: v }); const fmt = (fmtRaw as string | null) ?? null;
    let state: KeyRow['state'] = fmt ? 'fail' : 'ok'; let detail = fmt ? `Biçim hatalı: ${fmt}` : 'Biçim doğru';
    const credCheck = (arr?: Check[]) => arr?.find((c) => c.key === 'verify:meta' || c.key === 'verify:google');
    if (!fmt && k.group === 'Meta (Facebook)' && live.meta) { const c = credCheck(live.meta); if (c) { state = c.state === 'ok' ? 'ok' : 'fail'; detail = c.state === 'ok' ? 'Facebook kabul etti' : c.detail; } }
    if (!fmt && k.group === 'Google (YouTube)' && live.google) { const c = credCheck(live.google); if (c) { state = c.state === 'ok' ? 'ok' : 'fail'; detail = c.state === 'ok' ? 'Google kabul etti' : c.detail; } }
    if (!fmt && k.name === 'TELEGRAM_BOT_TOKEN') { const r = await fetch(`https://api.telegram.org/bot${v}/getMe`).catch(() => null); state = r?.ok ? 'ok' : 'fail'; detail = r?.ok ? 'Telegram kabul etti' : 'Telegram reddetti'; }
    if (!fmt && k.name === 'RESEND_API_KEY') { const r = await fetch('https://api.resend.com/domains', { headers: { authorization: `Bearer ${v}` } }).catch(() => null); state = r?.ok ? 'ok' : 'fail'; detail = r?.ok ? 'Resend kabul etti' : 'Resend reddetti'; }
    if (!fmt && k.name === 'TAVILY_API_KEY') { const r = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${v}` }, body: JSON.stringify({ query: 'kentsel dönüşüm İstanbul', max_results: 1 }) }).catch(() => null); state = r?.ok ? 'ok' : 'fail'; detail = r?.ok ? 'Tavily kabul etti (gerçek arama yapıldı)' : `Tavily reddetti${r ? ` (HTTP ${r.status})` : ''}`; }
    if (!fmt && k.group === 'Instagram') detail = 'Biçim doğru · asıl test “Instagram ile giriş yap” sırasında yapılır';
    const secretLike = /SECRET|TOKEN|API_KEY/.test(k.name);
    rows.push({ group: k.group, name: k.name, label: k.label, source: secretSource(k.name), masked: secretLike ? mask(v) : v, saved_at: savedAt.get(k.name) ?? null, state, detail, can_clear: secretSource(k.name) === 'panel' });
  }
  // Uygulama ayar uyarıları (alan adı / yönlendirme adresi) ayrı satır olarak
  const extras = [...(live.meta ?? []), ...(live.google ?? [])].filter((c) => c.key.includes(':domain') || c.key.includes(':redirect'));
  return { checked_at: new Date().toISOString(), rows, settings: extras };
}

// ── Meta webhook: GET doğrulama (hub.challenge) + POST olay kaydı (imza doğrulamalı) ──
async function metaWebhook(db: Db, req: Request, url: URL): Promise<Response> {
  if (req.method === 'GET') {
    const { data: token } = await db.rpc('webhook_verify_token');
    if (url.searchParams.get('hub.mode') === 'subscribe' && token && url.searchParams.get('hub.verify_token') === token)
      return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
    return new Response('forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const raw = await req.text();
  const sig = (req.headers.get('x-hub-signature-256') || '').replace(/^sha256=/, '');
  let signatureOk = false;
  for (const name of ['META_APP_SECRET', 'INSTAGRAM_APP_SECRET']) {
    const sec = secret(name); if (!sec || !sig) continue;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(sec), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))).map((b) => b.toString(16).padStart(2, '0')).join('');
    if (mac === sig) { signatureOk = true; break; }
  }
  // İmzası doğrulanamayan istek kaydedilmez (sahte olay engeli); Meta'ya yine 200 dönülür ki tekrar göndermesin
  if (!signatureOk) { await logActivity(db, { connector_key: 'facebook', action: 'webhook', status: 'failed', error: 'İmza doğrulanamadı — olay kaydedilmedi' }); return new Response('ok'); }
  // deno-lint-ignore no-explicit-any
  let body: any = {}; try { body = JSON.parse(raw); } catch { /* boş */ }
  const connector = body.object === 'instagram' ? 'instagram' : 'facebook';
  let n = 0;
  for (const entry of body.entry ?? []) {
    const changes = [...(entry.changes ?? []).map((c: { field?: string; value?: unknown }) => ({ type: c.field ?? 'change', value: c.value })),
      ...(entry.messaging ?? []).map((m: unknown) => ({ type: 'messages', value: m }))];
    for (const ch of changes) {
      await db.from('connector_events').insert({ connector_key: connector, event_type: String(ch.type).slice(0, 60), external_account_id: String(entry.id ?? ''),
        // deno-lint-ignore no-explicit-any
        external_id: String((ch.value as any)?.id ?? (ch.value as any)?.comment_id ?? (ch.value as any)?.message?.mid ?? ''), payload: ch.value ?? {}, signature_ok: true });
      n++;
    }
  }
  await logActivity(db, { connector_key: connector, action: 'webhook', status: 'ok', summary: `${n} gelen olay kaydedildi`, data: { object: body.object, count: n } });
  return new Response('ok');
}

// ── Sistem kontrolü: her parça gerçekten çalışıyor mu? (secret değerleri döndürülmez) ──
type Check = { key: string; group: string; label: string; state: 'ok' | 'warn' | 'fail' | 'off'; detail: string; fix?: string; route?: string };
async function systemCheck(db: Db) {
  const checks: Check[] = [];
  const ago = (iso: string | null) => (iso ? Math.round((Date.now() - new Date(iso).getTime()) / 60000) : null);

  // 1) Zamanlanmış işler (bot motorları)
  const { data: jobs, error: je } = await db.rpc('ops_worker_health');
  const JOB_LABEL: Record<string, string> = { 'embay-ops-worker': 'Yayın + bot motoru (her dakika)', 'embay-missions-worker': 'Araştırma görevleri (her dakika)', 'embay-portfolio-reminders': 'Firma hatırlatmaları (her sabah 09:00)',
    'embay-mission-schedules': 'Zamanlı bot görevleri (10 dakikada bir)', 'embay-newest-first': 'Takvimi toparla (her gece 00:30)', 'embay-stale-drafts-archive': 'Süresi geçen taslakları arşivle (her gece 00:45)',
    'outreach-gunluk': 'Günlük takip mesajı önerileri', 'lead-imha-gunluk': 'KVKK: süresi dolan başvuruları temizle' };
  if (je) checks.push({ key: 'cron', group: 'Motor', label: 'Zamanlanmış işler', state: 'fail', detail: je.message });
  for (const j of (jobs || []) as Array<{ job: string; schedule: string; active: boolean; last_ok: string | null; last_status: string | null }>) {
    const everyMinute = j.schedule === '* * * * *'; const m = ago(j.last_ok);
    const ok = j.active && m !== null && m <= (everyMinute ? 3 : 26 * 60);
    checks.push({ key: `cron:${j.job}`, group: 'Motor', label: JOB_LABEL[j.job] ?? j.job, state: ok ? 'ok' : !everyMinute && m === null ? 'ok' : 'fail',
      detail: m === null ? 'Yeni eklendi — ilk çalışma saatini bekliyor' : `Son başarılı çalışma ${m} dk önce${j.last_status && j.last_status !== 'succeeded' ? ` · son durum: ${j.last_status}` : ''}` });
  }

  // 2) AI anahtarları — sağlayıcıdan gerçek (1 kelimelik) cevap istenerek canlı doğrulama
  // Yedek sağlayıcı son 24 saatte başarılı üretim yaptıysa tek bir anahtarın sorunu "hata" değil "uyarı"dır (sistem çalışmaya devam eder)
  const { data: okGen } = await db.from('ai_generations').select('provider').eq('status', 'succeeded').gte('created_at', new Date(Date.now() - 86400_000).toISOString()).limit(50);
  const workingProviders = [...new Set((okGen || []).map((r: { provider: string }) => r.provider))];
  checks.push({ key: 'ai:any', group: 'Yapay zekâ', label: 'İçerik/metin üretimi (son 24 saat)', state: workingProviders.length ? 'ok' : 'fail',
    detail: workingProviders.length ? `Çalışıyor · ${workingProviders.join(', ')}` : 'Son 24 saatte başarılı üretim yok', fix: workingProviders.length ? undefined : 'Ayarlar → AI anahtarı', route: workingProviders.length ? undefined : 'settings' });
  for (const p of ['anthropic', 'gemini'] as const) {
    const key = await getAiKey(p); const label = p === 'anthropic' ? 'Claude (Anthropic) AI anahtarı' : 'Gemini AI anahtarı';
    if (!key) { checks.push({ key: `ai:${p}`, group: 'Yapay zekâ', label, state: 'off', detail: 'Tanımlı değil (isteğe bağlı)' }); continue; }
    const t = await liveKeyTest(p, key);
    checks.push({ key: `ai:${p}`, group: 'Yapay zekâ', label, state: t.ok ? 'ok' : workingProviders.length ? 'warn' : 'fail',
      detail: t.ok ? `${t.detail} (…${key.slice(-4)})` : `${t.detail}${workingProviders.length ? ' — yedek sağlayıcı çalıştığı için sistem durmadı' : ''}`, fix: t.ok ? undefined : 'Ayarlar → AI anahtarı (kredi/anahtar)', route: t.ok ? undefined : 'settings' });
  }

  // 3) Son araştırma görevi
  const { data: lastMission } = await db.from('bot_missions').select('title,status,finish_reason,error_kind,finished_at,created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
  checks.push(lastMission
    ? { key: 'mission:last', group: 'Yapay zekâ', label: 'Son bot görevi', state: lastMission.status === 'failed' ? 'fail' : 'ok', detail: `${lastMission.title} · ${lastMission.status}${lastMission.error_kind ? ` (${lastMission.error_kind})` : ''}` }
    : { key: 'mission:last', group: 'Yapay zekâ', label: 'Son bot görevi', state: 'warn', detail: 'Henüz görev çalıştırılmadı', fix: 'Bot Merkezi → Görev ver' });

  // 4) Medya deposu (telefon yüklemeleri)
  const { data: bucket, error: be } = await db.storage.getBucket('media-uploads');
  checks.push({ key: 'storage', group: 'Motor', label: 'Medya deposu (görsel/video)', state: bucket && !be ? 'ok' : 'fail', detail: bucket ? `Hazır · en fazla ${Math.round((bucket.file_size_limit ?? 0) / 1048576)} MB` : be?.message ?? 'Bulunamadı' });

  // 5) Uygulamalar: giriş bilgisi + hesap bağlantısı
  const { data: accounts } = await db.from('social_accounts').select('connector_key,platform,connection_status,external_account_name,token_expires_at,last_verified_at,last_error');
  const OPTIONAL = new Set(['youtube', 'whatsapp', 'email']);
  for (const k of ['instagram', 'facebook', 'telegram', 'canva', 'youtube', 'whatsapp', 'email']) {
    const def = connectorByKey(k); if (!def) continue;
    const missing = def.requiredEnv.filter((e) => !secret(e));
    const acc = (accounts || []).find((a) => (a.connector_key === k || a.platform === k) && a.connection_status === 'connected');
    const st = resolveStatus(def, acc ?? null);
    const needsAccount = def.authType === 'oauth';
    let state: Check['state'] = 'ok'; let detail = ''; let fix: string | undefined;
    if (OPTIONAL.has(k) && !acc && (missing.length || needsAccount)) { checks.push({ key: `app:${k}`, group: 'İsteğe bağlı', label: def.name, state: 'off', detail: 'Kullanılmıyor — gerekirse Uygulamalar ekranından bağlanır' }); continue; }
    if (missing.length) { state = 'warn'; detail = `Uygulama giriş bilgisi eksik: ${missing.join(', ')}`; fix = 'Uygulamalar → Giriş bilgileri'; }
    else if (needsAccount && !acc) { state = 'warn'; detail = 'Giriş bilgisi hazır · hesap henüz bağlanmadı'; fix = 'Uygulamalar → Bağla'; }
    else if (st !== 'connected') { state = 'fail'; detail = `Durum: ${st}`; fix = 'Yeniden bağlayın'; }
    else {
      const exp = acc?.token_expires_at ? new Date(acc.token_expires_at).getTime() : null;
      detail = `Bağlı${acc?.external_account_name ? ` · ${acc.external_account_name}` : ''}${exp ? ` · oturum ${Math.max(0, Math.round((exp - Date.now()) / 86400000))} gün geçerli` : ''}`;
      if (exp && exp - Date.now() < 7 * 86400000) { state = 'warn'; fix = 'Oturum süresi yakında doluyor — yeniden bağlayın'; }
    }
    checks.push({ key: `app:${k}`, group: 'Uygulamalar', label: def.name, state, detail, fix, route: state === 'ok' ? undefined : 'connections' });
  }
  // Meta izinleri: hesap "bağlı" olsa da yorum/istatistik izni eksik olabilir → Meta'ya sorulur (debug_token), sonuç hesaba yazılır
  const fbAcc = (accounts || []).find((a) => a.connector_key === 'facebook' && a.connection_status === 'connected');
  if (fbAcc && secret('META_APP_ID') && secret('META_APP_SECRET')) {
    try {
      const { data: full } = await db.from('social_accounts').select('*').eq('connector_key', 'facebook').eq('connection_status', 'connected').limit(1).maybeSingle();
      const tok = await tokenFor(db, full as never);
      const r = await fetch(`https://graph.facebook.com/${graphVersion()}/debug_token?input_token=${encodeURIComponent(tok)}&access_token=${encodeURIComponent(`${secret('META_APP_ID')}|${secret('META_APP_SECRET')}`)}`);
      const dj = await r.json().catch(() => ({}));
      const scopes: string[] = dj?.data?.scopes ?? [];
      if (scopes.length) {
        await db.from('social_accounts').update({ scopes, last_verified_at: new Date().toISOString() }).in('connector_key', ['facebook', 'instagram']).eq('connection_status', 'connected');
        const NEED: Record<string, string> = { instagram_manage_comments: 'Instagram yorumlarını okuma/cevaplama', pages_read_user_content: 'Facebook yorumlarını okuma', instagram_manage_insights: 'Instagram istatistikleri', read_insights: 'Facebook istatistikleri', instagram_content_publish: 'Instagram’a paylaşım', pages_manage_posts: 'Facebook’a paylaşım' };
        const missingP = Object.keys(NEED).filter((x) => !scopes.includes(x));
        checks.push({ key: 'meta:perms', group: 'Uygulamalar', label: 'Meta izinleri', state: missingP.length ? 'fail' : 'ok',
          detail: missingP.length ? `Eksik: ${missingP.map((x) => NEED[x]).join(', ')}` : `Tüm gerekli izinler verilmiş (${scopes.length} izin)`,
          fix: missingP.length ? 'Uygulamalar → Facebook → Yeniden bağla → açılan Meta ekranında TÜM izinleri onaylayın' : undefined, route: missingP.length ? 'connections' : undefined });
      } else checks.push({ key: 'meta:perms', group: 'Uygulamalar', label: 'Meta izinleri', state: 'warn', detail: `Meta izin listesi okunamadı${dj?.error?.message ? `: ${dj.error.message}` : ''}`, route: 'connections' });
    } catch (e) { checks.push({ key: 'meta:perms', group: 'Uygulamalar', label: 'Meta izinleri', state: 'warn', detail: `Kontrol edilemedi: ${String((e as Error).message).slice(0, 120)}` }); }
  }
  // Telegram: bot anahtarı canlı test (getMe)
  if (secret('TELEGRAM_BOT_TOKEN')) {
    const t = await fetch(`https://api.telegram.org/bot${secret('TELEGRAM_BOT_TOKEN')}/getMe`).then((r) => r.json()).catch(() => ({ ok: false }));
    checks.push({ key: 'telegram:live', group: 'Uygulamalar', label: 'Telegram botu (canlı test)', state: t.ok ? 'ok' : 'fail', detail: t.ok ? `@${t.result?.username} yanıt veriyor${secret('TELEGRAM_CHAT_ID') ? '' : ' · sohbet kimliği eksik'}` : 'Bot yanıt vermiyor — anahtarı kontrol edin', route: t.ok ? undefined : 'system' });
  }
  if (secret('META_APP_ID') || secret('META_APP_SECRET')) checks.push(...await verifyApp('meta'));
  if (secret('GOOGLE_CLIENT_ID') || secret('GOOGLE_CLIENT_SECRET')) checks.push(...await verifyApp('google'));
  const summary = { ok: checks.filter((c) => c.state === 'ok').length, warn: checks.filter((c) => c.state === 'warn').length, fail: checks.filter((c) => c.state === 'fail').length, off: checks.filter((c) => c.state === 'off').length };
  return { checked_at: new Date().toISOString(), summary, checks, redirect_uri: REDIRECT_URI() };
}

// ── OAuth ───────────────────────────────────────────────────────────────────
/** Bağlantı sonrası dönülecek panel adresi: yalnızca bizim panel adreslerimize izin verilir (açık yönlendirme yok). */
function safeReturnTo(raw: unknown): string | null {
  try {
    const u = new URL(String(raw || ''));
    const host = u.hostname;
    const ok = (u.protocol === 'https:' && (host === 'embay-panel.vercel.app' || /^(embay-panel|sahin-manitou-kiralama)(-[a-z0-9-]+)?\.vercel\.app$/.test(host) || host === new URL(PANEL_URL()).hostname))
      || (u.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1'));
    return ok ? `${u.origin}${u.pathname}` : null;
  } catch { return null; }
}

async function oauthStart(db: Db, userId: string, provider: string, returnTo?: unknown, switchAccount = false, withInstagram = false) {
  const def = connectorByKey(provider === 'meta' || provider === 'facebook' ? 'facebook' : provider === 'google' ? 'youtube' : provider);
  if (!def) throw new HttpError(400, 'Bilinmeyen sağlayıcı');
  const missing = def.requiredEnv.filter((k) => !secret(k));
  if (missing.length) throw new HttpError(409, `Yapılandırma gerekli: ${missing.join(', ')}`, 'CONFIGURATION_REQUIRED');
  const state = crypto.randomUUID().replace(/-/g, '');
  const return_to = safeReturnTo(returnTo);
  if (provider === 'instagram') {
    await db.from('oauth_states').insert({ state, provider: 'instagram', user_id: userId, return_to });
    return { url: instagramLoginUrl(state, REDIRECT_URI()) };
  }
  if (provider === 'meta' || provider === 'facebook') {
    await db.from('oauth_states').insert({ state, provider: 'meta', user_id: userId, return_to });
    return { url: metaAuthorizeUrl(state, REDIRECT_URI(), switchAccount, withInstagram) };
  }
  if (provider === 'canva') {
    const verifier = pkceVerifier();
    await db.from('oauth_states').insert({ state, provider: 'canva', user_id: userId, code_verifier: verifier, return_to });
    return { url: await canvaAuthorizeUrl(state, verifier, REDIRECT_URI()) };
  }
  if (provider === 'google' || provider === 'youtube') {
    await db.from('oauth_states').insert({ state, provider: 'google', user_id: userId, return_to });
    return { url: googleAuthorizeUrl(state, REDIRECT_URI()) };
  }
  throw new HttpError(409, `${def.name} için OAuth akışı henüz uygulanmadı (ENTEGRASYON BEKLİYOR)`, 'NOT_IMPLEMENTED');
}

async function upsertAccount(db: Db, userId: string, row: Record<string, unknown>, secret: string) {
  const { data: existing } = await db.from('social_accounts').select('id,credential_secret_id').eq('connector_key', row.connector_key).eq('external_account_id', row.external_account_id).maybeSingle();
  const { data: secretId, error: se } = await db.rpc('store_connector_secret', { p_name: `${row.connector_key}_${row.external_account_id}`, p_secret: secret, p_existing: existing?.credential_secret_id ?? null });
  if (se) throw se;
  const payload = { ...row, credential_secret_id: secretId, connection_status: 'connected', last_verified_at: new Date().toISOString(), last_error: null, status: 'profile_ready', owner_id: userId };
  if (existing) await db.from('social_accounts').update(payload).eq('id', existing.id);
  else await db.from('social_accounts').insert(payload);
}

async function oauthCallback(db: Db, url: URL) {
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code');
  const { data: st } = await db.from('oauth_states').select('*').eq('state', state).maybeSingle();
  // Kullanıcıyı bağlantıyı başlattığı panel adresine geri gönder (oturumu orada); yoksa varsayılan panel
  const base = safeReturnTo(st?.return_to) ?? `${PANEL_URL()}/`;
  const back = (q: string) => Response.redirect(`${base}?ops=connections&${q}`, 302);
  if (!st || new Date(st.expires_at).getTime() < Date.now()) return back('oauth_error=' + encodeURIComponent('Geçersiz veya süresi dolmuş istek'));
  await db.from('oauth_states').delete().eq('state', state);
  if (!code) return back('oauth_error=' + encodeURIComponent(url.searchParams.get('error_description') || 'İzin verilmedi'));
  try {
    if (st.provider === 'meta') {
      const { pages, userName, granted, declined } = await metaExchange(code, REDIRECT_URI());
      if (!pages.length) {
        const why = declined.some((p) => p.startsWith('pages_')) || !granted.includes('pages_show_list')
          ? 'Facebook izin ekranında sayfa izni verilmedi veya hiçbir sayfa seçilmedi. Tekrar “Hesabımla bağla” → açılan ekranda “Ayarları düzenle” → Embay sayfasını işaretleyip tüm izinleri açın.'
          : `“${userName ?? 'Bu hesap'}” hesabının yönetici olduğu bir Facebook Sayfası yok (kişisel profil sayfa sayılmaz). Önce facebook.com/pages/create ile firma sayfası açın ya da sayfada bu hesaba yönetici yetkisi verin.`;
        await logActivity(db, { connector_key: 'facebook', action: 'connect', status: 'failed', actor: st.user_id, summary: `Facebook bağlanamadı: sayfa yok (${userName ?? '?'})`, data: { granted, declined } });
        return back('oauth_error=' + encodeURIComponent(why));
      }
      for (const p of pages) {
        await upsertAccount(db, st.user_id, { platform: 'facebook', connector_key: 'facebook', account_name: p.pageName, external_account_id: p.pageId, external_account_name: p.pageName,
          profile_url: `https://facebook.com/${p.pageId}`, scopes: [], capabilities: { publish: true, metrics: true } }, p.pageToken);
        if (p.igId) await upsertAccount(db, st.user_id, { platform: 'instagram', connector_key: 'instagram', account_name: p.igUsername, handle: p.igUsername ? `@${p.igUsername}` : null,
          external_account_id: p.igId, external_account_name: p.igUsername, profile_url: p.igUsername ? `https://instagram.com/${p.igUsername}` : null, metadata: { page_id: p.pageId }, capabilities: { publish: true, metrics: true } }, p.pageToken);
      }
      const igCount = pages.filter((p) => p.igId).length;
      // Bu girişte izin verilmeyen eski sayfa/IG hesapları artık kullanılamaz: "bağlı değil" yap (kayıt arşivde kalır)
      const keepIds = [...pages.map((p) => p.pageId), ...pages.filter((p) => p.igId).map((p) => p.igId as string)];
      await db.from('social_accounts').update({ connection_status: 'not_connected', credential_secret_id: null }).in('connector_key', ['facebook', 'instagram']).eq('connection_status', 'connected').or('metadata->>login.is.null,metadata->>login.neq.instagram').not('external_account_id', 'in', `(${keepIds.map((i) => `"${i}"`).join(',')})`);
      await logActivity(db, { connector_key: 'facebook', action: 'connect', status: 'ok', actor: st.user_id, summary: `Facebook bağlandı: ${pages.map((p) => p.pageName).join(', ')}`, data: { pages: pages.length, instagram: igCount } });
      if (igCount) await logActivity(db, { connector_key: 'instagram', action: 'connect', status: 'ok', actor: st.user_id, summary: `Instagram (sayfa üzerinden) bağlandı: ${pages.filter((p) => p.igUsername).map((p) => '@' + p.igUsername).join(', ')}` });
      await db.rpc('write_audit_service', { p_actor: st.user_id, p_action: 'connect', p_entity_type: 'social_accounts', p_entity_id: 'meta', p_summary: `Bağlandı: Facebook ${pages.map((p) => p.pageName).join(', ')}${igCount ? ` · Instagram ${pages.filter((p) => p.igUsername).map((p) => '@' + p.igUsername).join(', ')}` : ''}` });
      await db.from('automation_bots').update({ status: 'active' }).eq('connector_key', 'facebook').eq('status', 'waiting_connection');
      if (igCount) await db.from('automation_bots').update({ status: 'active' }).eq('connector_key', 'instagram').eq('status', 'waiting_connection');
      return back(`connected=meta&pages=${pages.length}&ig=${igCount}`);
    }
    if (st.provider === 'instagram') {
      const ig = await instagramLoginExchange(code, REDIRECT_URI());
      if (ig.accountType && !['BUSINESS', 'MEDIA_CREATOR', 'CREATOR'].includes(ig.accountType)) return back('oauth_error=' + encodeURIComponent('Bu Instagram hesabı kişisel hesap. Instagram → Ayarlar → Hesap türü → Profesyonel hesaba geçip tekrar deneyin.'));
      await upsertAccount(db, st.user_id, { platform: 'instagram', connector_key: 'instagram', account_name: ig.username, handle: `@${ig.username}`, external_account_id: ig.igId, external_account_name: ig.username,
        profile_url: `https://instagram.com/${ig.username}`, token_expires_at: new Date(Date.now() + ig.expiresIn * 1000).toISOString(), metadata: { login: 'instagram', account_type: ig.accountType },
        scopes: ['instagram_business_basic', 'instagram_business_content_publish', 'instagram_business_manage_insights'], capabilities: { publish: true, metrics: true } }, ig.token);
      // Başka bir Instagram hesabına geçildiyse eskisi "çıkış yapıldı" olur (arşivde kalır)
      await db.from('social_accounts').update({ connection_status: 'not_connected', credential_secret_id: null }).eq('connector_key', 'instagram').eq('connection_status', 'connected').neq('external_account_id', ig.igId);
      await db.from('automation_bots').update({ status: 'active' }).eq('connector_key', 'instagram').eq('status', 'waiting_connection');
      await logActivity(db, { connector_key: 'instagram', action: 'connect', status: 'ok', actor: st.user_id, external_id: ig.igId, summary: `Instagram @${ig.username} bağlandı (doğrudan giriş, 60 gün)` });
      await db.rpc('write_audit_service', { p_actor: st.user_id, p_action: 'connect', p_entity_type: 'social_accounts', p_entity_id: ig.igId, p_summary: `Bağlandı: Instagram @${ig.username}` });
      return back(`connected=instagram&ig_user=${encodeURIComponent(ig.username)}`);
    }
    if (st.provider === 'canva') {
      const tokens = await canvaExchange(code, st.code_verifier, REDIRECT_URI());
      const profile = await canvaProfile(tokens.access_token).catch(() => ({ profile: { display_name: 'Canva' } }));
      await upsertAccount(db, st.user_id, { platform: 'canva', connector_key: 'canva', account_name: profile.profile?.display_name ?? 'Canva', external_account_id: 'canva-user', external_account_name: profile.profile?.display_name ?? null,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(), scopes: (tokens.scope || '').split(' ').filter(Boolean), capabilities: { design: true } },
        JSON.stringify({ access_token: tokens.access_token, refresh_token: tokens.refresh_token }));
      await logActivity(db, { connector_key: 'canva', action: 'connect', status: 'ok', actor: st.user_id, summary: `Canva bağlandı` });
      await db.rpc('write_audit_service', { p_actor: st.user_id, p_action: 'connect', p_entity_type: 'social_accounts', p_entity_id: 'canva', p_summary: `Bağlandı: Canva ${profile.profile?.display_name ?? ''}` });
      return back('connected=canva');
    }
    if (st.provider === 'google') {
      const yt = await googleExchange(code, REDIRECT_URI());
      await upsertAccount(db, st.user_id, { platform: 'youtube', connector_key: 'youtube', account_name: yt.channelTitle, external_account_id: yt.channelId, external_account_name: yt.channelTitle,
        handle: yt.customUrl ?? null, profile_url: `https://www.youtube.com/channel/${yt.channelId}`, capabilities: { publish: true } }, JSON.stringify({ refresh_token: yt.refreshToken }));
      await db.from('automation_bots').update({ status: 'active' }).eq('connector_key', 'youtube').eq('status', 'waiting_connection');
      await logActivity(db, { connector_key: 'youtube', action: 'connect', status: 'ok', actor: st.user_id, external_id: yt.channelId, summary: `YouTube kanalı bağlandı: ${yt.channelTitle}` });
      await db.rpc('write_audit_service', { p_actor: st.user_id, p_action: 'connect', p_entity_type: 'social_accounts', p_entity_id: yt.channelId, p_summary: `Bağlandı: YouTube ${yt.channelTitle}` });
      return back('connected=youtube');
    }
    return back('oauth_error=unknown_provider');
  } catch (e) {
    await logActivity(db, { connector_key: st.provider === 'meta' ? 'facebook' : st.provider === 'google' ? 'youtube' : st.provider, action: 'connect', status: 'failed', actor: st.user_id, error: String((e as Error).message) });
    await db.rpc('write_audit_service', { p_actor: st.user_id, p_action: 'connect_failed', p_entity_type: 'social_accounts', p_entity_id: st.provider, p_summary: `Bağlantı hatası (${st.provider}): ${String((e as Error).message).slice(0, 160)}` });
    return back('oauth_error=' + encodeURIComponent(String((e as Error).message).slice(0, 200)));
  }
}

async function canvaToken(db: Db) {
  const { data: acc } = await db.from('social_accounts').select('*').eq('connector_key', 'canva').eq('connection_status', 'connected').limit(1).maybeSingle();
  if (!acc) throw new HttpError(409, 'Canva bağlı değil — CANVA BAĞLA', 'OAUTH_REQUIRED');
  const { data: raw } = await db.rpc('read_connector_secret', { p_id: acc.credential_secret_id });
  let tokens = JSON.parse(raw as string);
  if (acc.token_expires_at && new Date(acc.token_expires_at).getTime() - Date.now() < 120_000) {
    const fresh = await canvaRefresh(tokens.refresh_token);
    tokens = { access_token: fresh.access_token, refresh_token: fresh.refresh_token };
    await db.rpc('store_connector_secret', { p_name: 'canva_canva-user', p_secret: JSON.stringify(tokens), p_existing: acc.credential_secret_id });
    await db.from('social_accounts').update({ token_expires_at: new Date(Date.now() + fresh.expires_in * 1000).toISOString() }).eq('id', acc.id);
  }
  return tokens.access_token as string;
}

// ── Panel API ───────────────────────────────────────────────────────────────
async function api(db: Db, req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  switch (action) {
    case 'status': { await requireUser(db, req); return status(db); }
    case 'inbox_reply': { await requireUser(db, req); return inboxReply(db, String(body.id || ''), String(body.message || '')); }
    case 'inbox_sync': { await requireUser(db, req); return inboxTick(db, true); }
    case 'radar_sync': { await requireUser(db, req); return radarTick(db, true); }
    case 'growth_sync': { await requireUser(db, req); return growthTick(db, true); }

    case 'run_task': {
      const u = await requireUser(db, req);
      const { data: claimed } = await db.rpc('claim_task_now', { p_task_id: body.task_id, p_worker: `manual:${u.userId.slice(0, 8)}`, p_lease_seconds: 300 });
      const task = (claimed || [])[0] as TaskRow | undefined;
      if (!task) throw new HttpError(409, 'Görev şu anda çalışıyor veya bulunamadı', 'LOCKED');
      await db.rpc('write_audit_service', { p_actor: u.userId, p_action: 'run_task', p_entity_type: 'automation_tasks', p_entity_id: task.id, p_summary: 'Görev elle çalıştırıldı' });
      return executeTask(db, task, { trigger: 'manual', workerId: `manual:${u.userId.slice(0, 8)}`, actorId: u.userId, actorRole: u.role });
    }

    case 'generate_post': {
      const u = await requireUser(db, req);
      const ctx = apiCtx(db, u.userId, u.role);
      ctx.agent = await loadAgent(db, null, 'content-writer');
      return generateContent(ctx, body.input || {});
    }

    case 'design_suggestion': {
      const u = await requireUser(db, req);
      const ctx = apiCtx(db, u.userId, u.role);
      ctx.agent = await loadAgent(db, null, 'content-writer');
      const { json } = await aiComplete(ctx, 'design_suggestion', `Tasarım isteği: ${String(body.prompt || '')}\nFormat: ${String(body.format || 'instagram_post')}\nMarka renkleri ve logo kullanılacak. Yerleşim, başlık, alt başlık, CTA ve görsel yerleşimi öner.`, {
        type: 'object', additionalProperties: false, required: ['layout', 'headline', 'subtitle', 'cta', 'image_placement', 'image_idea', 'background'],
        properties: { layout: { type: 'string', enum: ['hero', 'split', 'story', 'corporate', 'bold', 'listing'] }, headline: { type: 'string' }, subtitle: { type: 'string' }, cta: { type: 'string' },
          image_placement: { type: 'string', enum: ['full_bleed', 'left', 'right', 'top', 'none'] }, image_idea: { type: 'string' }, background: { type: 'string', enum: ['primary', 'secondary', 'dark', 'light', 'image'] } },
      });
      return json;
    }

    case 'plan_month': {
      const u = await requireUser(db, req);
      const month = String(body.month || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, 'Ay YYYY-MM olmalı');
      const { data: bot } = await db.from('automation_bots').select('id').eq('slug', 'content-bot').single();
      const { data: skill } = await db.from('automation_skills').select('id').eq('skill_key', 'campaign_planner').single();
      if (!bot || !skill) throw new HttpError(500, 'content-bot / campaign_planner kaydı bulunamadı');
      const { data: camp, error: ce } = await db.from('content_campaigns').insert({ name: body.name || `${month} içerik planı`, month: `${month}-01`, goal: body.goal || null, platforms: body.platforms || ['instagram', 'facebook'], created_by: u.userId }).select('id').single();
      if (ce) throw ce;
      const { data: task, error: te } = await db.from('automation_tasks').insert({ bot_id: bot.id, skill_id: skill.id, task_type: 'campaign_planner', title: `${month} aylık plan (30 gün)`, schedule_type: 'once', run_at: new Date().toISOString(),
        status: 'scheduled', next_run_at: new Date().toISOString(), timeout_seconds: 280, approval_state: 'approval_required', created_by: u.userId,
        input_config: { campaign_id: camp.id, month: `${month}-01`, week_index: 0, platforms: body.platforms || ['instagram', 'facebook'], goal: body.goal || null, posts_per_day: 1 } }).select('id').single();
      if (te) throw te;
      return { campaign_id: camp.id, task_id: task.id, note: 'Plan haftalık parçalar halinde worker tarafından üretilecek.' };
    }

    case 'publish_content': {
      const u = await requireUser(db, req, 'admin');
      const { data: d } = await db.from('social_drafts').select('workflow_status,primary_platform,platform_targets').eq('id', body.content_id).maybeSingle();
      if (!d || !['approved', 'scheduled', 'failed'].includes(d.workflow_status)) throw new HttpError(409, 'Yalnızca onaylı içerik yayınlanabilir');
      return publishContent(apiCtx(db, u.userId, u.role), { content_id: body.content_id, platform: body.platform || d.primary_platform || d.platform_targets?.[0], approved_by: u.userId });
    }

    case 'execute_approval': {
      await requireUser(db, req, 'admin');
      return processDueApprovals(db, 'manual', 1, body.approval_id);
    }

    case 'sync_metrics': { await requireUser(db, req); return syncMetrics(db, 5, body.publication_id); }

    case 'oauth_start': { const u = await requireUser(db, req, 'admin'); return oauthStart(db, u.userId, String(body.provider), body.return_to, body.switch_account === true, body.with_instagram === true); }

    case 'disconnect': {
      const u = await requireUser(db, req, 'admin');
      const { data: acc } = await db.from('social_accounts').select('id,connector_key,credential_secret_id,external_account_name').eq('id', body.account_id).maybeSingle();
      if (!acc) throw new HttpError(404, 'Hesap bulunamadı');
      // Token'ı Vault'ta geçersiz kıl, hesabı "bağlı değil" yap
      if (acc.credential_secret_id) await db.rpc('store_connector_secret', { p_name: `${acc.connector_key}_revoked`, p_secret: 'revoked', p_existing: acc.credential_secret_id });
      const { error } = await db.from('social_accounts').update({ connection_status: 'not_connected', credential_secret_id: null, token_expires_at: null }).eq('id', acc.id);
      if (error) throw error;
      // Bu uygulamada bağlı başka hesap kalmadıysa ilgili botlar "bağlantı bekliyor"a döner; sıradaki paylaşımlar bekler
      const { count } = await db.from('social_accounts').select('id', { count: 'exact', head: true }).eq('connector_key', acc.connector_key).eq('connection_status', 'connected');
      if (!count) await db.from('automation_bots').update({ status: 'waiting_connection' }).eq('connector_key', acc.connector_key).eq('status', 'active');
      await logActivity(db, { connector_key: acc.connector_key, action: 'disconnect', status: 'ok', account_id: acc.id, actor: u.userId, summary: `Çıkış yapıldı: ${acc.external_account_name ?? ''}` });
      await db.rpc('write_audit_service', { p_actor: u.userId, p_action: 'disconnect', p_entity_type: 'social_accounts', p_entity_id: acc.id, p_summary: `Çıkış yapıldı: ${acc.connector_key} ${acc.external_account_name ?? ''}` });
      return { ok: true, bots_waiting: !count };
    }

    // Takip listesindeki Instagram işletme hesaplarının herkese açık metrikleri (resmi Business Discovery). Meta (Facebook Girişi) bağlantısı gerekir.
    case 'ig_benchmark': {
      await requireUser(db, req, 'admin');
      const { data: accs } = await db.from('social_accounts').select('*').eq('connector_key', 'instagram').eq('connection_status', 'connected');
      // deno-lint-ignore no-explicit-any
      const acc = (accs || []).find((a: any) => a.metadata?.login !== 'instagram');
      if (!acc) throw new HttpError(409, 'Rakip analizi için Instagram işletme hesabının “Facebook sayfası üzerinden” bağlanması gerekir (Meta bağlantısı tamamlanınca otomatik çalışır).', 'META_REQUIRED');
      const token = await tokenFor(db, acc);
      const { data: list } = await db.from('social_prospects').select('id,handle').eq('platform', 'instagram').not('handle', 'is', null)
        .order('last_benchmarked_at', { ascending: true, nullsFirst: true }).limit(Math.min(25, Number(body.limit) || 15));
      let ok = 0; const failed: string[] = [];
      for (const p of list || []) {
        try {
          const m = await businessDiscovery(acc.external_account_id, token, p.handle);
          await db.from('social_prospects').update({ followers: m.followers ?? null, media_count: m.media_count ?? null, avg_engagement: m.avg_engagement, engagement_rate: m.engagement_rate,
            metrics: { posts_per_week: m.posts_per_week, by_type: m.by_type, top_posts: m.top_posts, name: m.name }, last_benchmarked_at: new Date().toISOString() }).eq('id', p.id);
          ok++;
        } catch (e) { failed.push(`${p.handle}: ${String((e as Error).message).slice(0, 80)}`); await db.from('social_prospects').update({ last_benchmarked_at: new Date().toISOString() }).eq('id', p.id); }
      }
      await logActivity(db, { connector_key: 'instagram', action: 'metrics_sync', status: failed.length && !ok ? 'failed' : 'ok', summary: `Rakip analizi: ${ok} hesap ölçüldü${failed.length ? `, ${failed.length} hata` : ''}` });
      return { measured: ok, failed };
    }
    // İçerik Fabrikası: bugünün eksik içeriklerini şimdi üret (yönetici). Kota dolu platformlar atlanır.
    // Banner havuzu: şablondan yeni banner çiz veya mevcut banner'ı düzenleyip yeniden çiz
    case 'banner_render': {
      const u = await requireUser(db, req);
      const t = body.template as { headline?: string } | undefined;
      if (!t?.headline || String(t.headline).trim().length < 2) throw new HttpError(400, 'Banner başlığı gerekli');
      return await renderBannerToPool(db, { id: (body.id as string) || null, title: body.title as string | undefined, platform: body.platform as string | undefined, template: t as never }, u.userId);
    }
    case 'content_factory_run': {
      await requireUser(db, req, 'admin');
      const { label: day } = istanbulDayRange();
      await db.from('content_factory_days').upsert({ day }, { onConflict: 'day', ignoreDuplicates: true });
      background(runContentFactory(db));
      return { started: true, day };
    }
    // Google Drive klasörü (herkese açık link) → Video / Fotoğraf havuzu. Klasör kaydedilir, her sabah otomatik eşitlenir.
    case 'drive_sync': {
      const u = await requireUser(db, req, 'admin');
      let src: { id: string; folder_id: string; created_by: string | null } | null = null;
      if (body.url) {
        const folderId = parseFolderId(String(body.url));
        if (!folderId) throw new HttpError(400, 'Geçerli bir Google Drive klasör linki girin (…/drive/folders/…)');
        const { data, error } = await db.from('drive_sources').upsert({ folder_id: folderId, url: String(body.url).trim(), enabled: true, archived_at: null, created_by: u.userId }, { onConflict: 'folder_id' }).select('id,folder_id,created_by').single();
        if (error) throw error;
        src = data;
      } else if (body.id) {
        const { data } = await db.from('drive_sources').select('id,folder_id,created_by').eq('id', body.id).single();
        src = data;
      }
      if (!src) throw new HttpError(400, 'Klasör linki gerekli');
      await db.from('drive_sources').update({ last_synced_at: new Date().toISOString(), last_result: { running: true, started_at: new Date().toISOString() } }).eq('id', src.id);
      background(syncDriveFolder(db, src, 110_000).catch(async (e) => { await db.from('drive_sources').update({ last_result: { error: String((e as Error).message || e).slice(0, 300) } }).eq('id', src!.id); }));
      return { started: true, id: src.id };
    }
    case 'test_telegram': { await requireUser(db, req, 'admin'); return telegramSend('Embay Ops Center test mesajı ✅'); }

    case 'canva_create_design': {
      const u = await requireUser(db, req);
      const token = await canvaToken(db);
      const { data: d } = await db.from('designs').select('*').eq('id', body.design_id).single();
      const assetId = d.export_url ? await canvaUploadFromUrl(token, d.name, d.export_url) : undefined;
      const c = await canvaCreateDesign(token, d.name, d.width, d.height, assetId);
      await db.from('designs').update({ provider: 'canva', canva_design_id: c.id, canva_edit_url: c.editUrl, canva_view_url: c.viewUrl, status: 'synced', last_synced_at: new Date().toISOString() }).eq('id', d.id);
      return { ...c, raw: undefined, user: u.userId };
    }

    case 'canva_export': {
      await requireUser(db, req);
      const token = await canvaToken(db);
      const { data: d } = await db.from('designs').select('*').eq('id', body.design_id).single();
      if (!d.canva_design_id) throw new HttpError(409, 'Tasarım Canva’da değil');
      const urls = await canvaExportPng(token, d.canva_design_id);
      if (!urls.length) throw new HttpError(502, 'Canva dışa aktarım URL’si dönmedi');
      const png = new Uint8Array(await (await fetch(urls[0])).arrayBuffer());
      const path = `canva/${d.id}-${Date.now()}.png`;
      const up = await db.storage.from('design-exports').upload(path, png, { contentType: 'image/png', upsert: true });
      if (up.error) throw up.error;
      const publicUrl = db.storage.from('design-exports').getPublicUrl(path).data.publicUrl;
      await db.from('designs').update({ export_url: publicUrl, export_path: path, thumbnail_url: publicUrl, status: 'exported', last_synced_at: new Date().toISOString() }).eq('id', d.id);
      if (d.content_id) await db.from('social_drafts').update({ media_urls: [publicUrl] }).eq('id', d.content_id);
      return { export_url: publicUrl };
    }

    // Panelden giriş bilgisi girildikten sonra önbelleği yeniler
    case 'reload_secrets': { await requireUser(db, req, 'admin'); resetAppSecrets(); await loadAppSecrets(db); return { ok: true }; }

    case 'credentials_report': { await requireUser(db, req, 'admin'); resetAppSecrets(); await loadAppSecrets(db); return credentialsReport(db); }

    case 'verify_app': {
      const u = await requireUser(db, req, 'admin'); resetAppSecrets(); await loadAppSecrets(db);
      const prov = body.provider === 'google' ? 'google' : 'meta';
      const checks = await verifyApp(prov);
      const bad = checks.filter((c) => c.state !== 'ok');
      await logActivity(db, { connector_key: prov === 'google' ? 'youtube' : 'facebook', action: 'verify', status: bad.length ? 'failed' : 'ok', actor: u.userId,
        summary: bad.length ? undefined : 'Uygulama bilgileri canlı testten geçti', error: bad.length ? bad.map((c) => `${c.label}: ${c.detail}`).join(' · ') : undefined });
      return { checks };
    }

    case 'system_check': { await requireUser(db, req); resetAppSecrets(); await loadAppSecrets(db); return systemCheck(db); }

    default: throw new HttpError(400, `Bilinmeyen işlem: ${action}`);
  }
}

// ── Otomatik Reels montajı ───────────────────────────────────────────────────
const REEL_HOST = 'https://embay-panel.vercel.app';
async function reelQueue(db: Db) {
  const from = new Date(Date.now() - 24 * 3600_000).toISOString(); const to = new Date(Date.now() + 72 * 3600_000).toISOString();
  const { data } = await db.from('social_drafts').select('id,video_url,media_urls,headline,content_pillar,primary_platform,design_provider,format')
    .is('archived_at', null).in('workflow_status', ['pending_approval', 'scheduled', 'approved']).or('video_url.not.is.null,format.eq.reel')
    .gte('scheduled_at', from).lte('scheduled_at', to).order('scheduled_at').limit(12);
  const pub = (u?: string | null) => /\/storage\/v1\/object\/public\//.test(u || '');
  const rows = (data || []).filter((d) => d.design_provider !== 'embay_montage' && !/manitou|kiralama/i.test(d.headline ?? '')
    && (pub(d.video_url) || (!d.video_url && (d.media_urls || []).filter(pub).length >= 4)));
  const { data: pool } = await db.from('media_library').select('url,edit').eq('kind', 'video').is('archived_at', null).neq('source', 'montage').limit(300);
  const ok = (pool || []).filter((v) => (v.edit as { codec?: string } | null)?.codec !== 'hevc' && /\/storage\/v1\/object\/public\//.test(v.url || '')).map((v) => v.url as string);
  const pick = (not: string) => ok.filter((u) => u !== not).sort(() => Math.random() - 0.5).slice(0, 3);
  // Sahneler kendi videosunun farklı bölümlerinden kesilir; havuz videoları yalnızca kaynak video çok kısaysa yedek olarak kullanılır
  return { items: rows.map((d) => ({ id: d.id, video: d.video_url, photos: d.video_url ? [] : (d.media_urls || []).filter(pub).slice(0, 12), extras: d.video_url ? ((d.media_urls || []).filter((u: string) => pub(u) && u !== d.video_url).slice(0, 4).length ? (d.media_urls || []).filter((u: string) => pub(u) && u !== d.video_url).slice(0, 4) : pick(d.video_url)) : [], headline: d.headline ?? '', pillar: d.content_pillar ?? '', platform: d.primary_platform ?? '', style: parseInt(d.id.slice(0, 2), 16) % 4 })) };
}
async function reelAttach(db: Db, body: { id?: string }) {
  const id = String(body.id || '');
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(400, 'Geçersiz id');
  const { data: d } = await db.from('social_drafts').select('id,design_provider,design_url').eq('id', id).maybeSingle();
  if (!d) throw new HttpError(404, 'Taslak yok');
  if (d.design_provider === 'embay_montage') return { id, attached: false, reason: 'zaten editli' };
  const url = `${REEL_HOST}/reels/${id}.mp4`; const cover = `${REEL_HOST}/reels/${id}.jpg`;
  const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
  if (!head?.ok || !/video\/mp4/.test(head.headers.get('content-type') || '')) return { id, attached: false, reason: `video henüz yayında değil (${head?.status ?? 'bağlantı yok'})` };
  const ch = await fetch(cover, { method: 'HEAD' }).catch(() => null);
  await db.from('social_drafts').update({ video_url: url, media_urls: [url], design_url: ch?.ok ? cover : d.design_url, design_provider: 'embay_montage' }).eq('id', id);
  return { id, attached: true, url };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/ops/, '') || '/';
  const db = serviceClient();
  initKeyStore(db);
  try {
    await loadAppSecrets(db);
    if (path.startsWith('/oauth/callback')) return await oauthCallback(db, url);
    if (path.startsWith('/worker') && req.method === 'POST') {
      const { data: ok } = await db.rpc('verify_worker_secret', { p_secret: req.headers.get('x-worker-secret') || '' });
      if (!ok) return json({ error: 'forbidden' }, 403);
      return json(await runWorker(db, `cron:${crypto.randomUUID().slice(0, 8)}`));
    }
    // Sunucu içi anahtar sağlık testi (yalnızca iç gizli anahtarla): her AI sağlayıcısı için gerçek cevap testi; anahtarın kendisi döndürülmez
    if (path.startsWith('/key-health') && req.method === 'POST') {
      const { data: ok } = await db.rpc('verify_worker_secret', { p_secret: req.headers.get('x-worker-secret') || '' });
      if (!ok) return json({ error: 'forbidden' }, 403);
      const { data: panelRows } = await db.from('ai_provider_keys').select('provider');
      const panel = new Set((panelRows || []).map((r: { provider: string }) => r.provider));
      const out: Record<string, unknown> = {};
      for (const p of ['anthropic', 'gemini', 'openai', 'groq', 'openrouter', 'github', 'cerebras', 'mistral'] as const) {
        const key = await getAiKey(p);
        if (!key) { out[p] = { source: null }; continue; }
        const body = await req.clone().json().catch(() => ({}));
        const models: string[] = Array.isArray(body?.models?.[p]) ? body.models[p].slice(0, 6) : [];
        out[p] = { source: panel.has(p) ? 'panel' : 'sunucu', last4: key.slice(-4), ...(await liveKeyTest(p, key)),
          ...(models.length ? { models: Object.fromEntries(await Promise.all(models.map(async (m) => [m, (await liveKeyTest(p, key, m)).detail]))) } : {}) };
      }
      return json(out);
    }
    // Otomatik Reels montajı (GitHub Actions): montaj bekleyen Reels kuyruğu ve üretilen videoyu taslağa bağlama.
    // Gizli anahtar gerekmez: kuyruk yalnızca zaten herkese açık video adreslerini verir; bağlama yalnızca kendi panel alan adımızdaki dosyayı kabul eder.
    // Tasarım önizleme (yalnızca iç gizli anahtarla): yapay zekâ görselli lüks banner'ı base64 JPEG döndürür — yayın yapmaz, kayıt tutmaz
    if (path.startsWith('/design-preview') && req.method === 'POST') {
      const { data: ok } = await db.rpc('verify_worker_secret', { p_secret: req.headers.get('x-worker-secret') || '' });
      if (!ok) return json({ error: 'forbidden' }, 403);
      const b = await req.json().catch(() => ({})) as { prompt?: string; headline?: string; subtitle?: string; badge?: string; w?: number; h?: number; seed?: number };
      const w = b.w ?? 1080; const h = b.h ?? 1350;
      const photo = await aiImage(String(b.prompt || 'modern detached house, photorealistic, no text'), w, h, b.seed ?? 1);
      const jpg = await renderBanner({ w, h, brand: { phone: '0531 436 29 04', website: 'www.embayyapi.com.tr' }, brandName: 'Embay Yapı', badge: b.badge || 'EV YAPIMI', headline: b.headline || 'Hayalinizdeki Ev', subtitle: b.subtitle || '', cta: 'Ücretsiz keşif', photo, photoMime: photo && photo[0] === 0x89 ? 'image/png' : 'image/jpeg' });
      let bin = ''; for (let i = 0; i < jpg.length; i += 0x8000) bin += String.fromCharCode(...jpg.subarray(i, i + 0x8000));
      return json({ ai: Boolean(photo), bytes: jpg.length, b64: btoa(bin) });
    }
    // Seri görseli (yalnızca iç gizli anahtarla): yapay zekâ görselini üretir, havuza "temsilî" notuyla kaydeder, herkese açık adresini döndürür.
    // Örn. "Ev Tarzları" kaydırmalı serisi; slaytlar GitHub Actions'ta bu adreslerden çizilir. Aynı yol varsa yeniden üretmez.
    if (path.startsWith('/ai-image') && req.method === 'POST') {
      const { data: ok } = await db.rpc('verify_worker_secret', { p_secret: req.headers.get('x-worker-secret') || '' });
      if (!ok) return json({ error: 'forbidden' }, 403);
      const b = await req.json().catch(() => ({})) as { prompt?: string; key?: string; title?: string; pillar?: string; w?: number; h?: number };
      const key = String(b.key || '').replace(/[^a-z0-9/_-]/gi, '').slice(0, 80);
      if (!key || !b.prompt) throw new HttpError(400, 'key ve prompt gerekli');
      const path2 = `series/${key}.png`;
      const pub = db.storage.from('media-uploads').getPublicUrl(path2).data.publicUrl;
      const { data: had } = await db.from('media_library').select('id,url').eq('url', pub).maybeSingle();
      if (had) return json({ ...had, cached: true });
      const img = await aiImage(`${b.prompt}, photorealistic, high detail, professional architectural photography, no text, no watermark, no logo, no people`, b.w ?? 1080, b.h ?? 1350, 1);
      if (!img) throw new HttpError(502, 'görsel üretilemedi (Gemini)');
      const ct = img[0] === 0x89 ? 'image/png' : 'image/jpeg';
      const up = await db.storage.from('media-uploads').upload(path2, img, { contentType: ct, upsert: true });
      if (up.error) throw up.error;
      const { data: row, error } = await db.from('media_library').insert({ kind: 'image', source: 'ai', title: (b.title || 'Yapay zekâ konsept görseli').slice(0, 120), url: pub, mime: ct, pillar: b.pillar ?? null, status: 'pool', notes: 'Yapay zekâ ile üretildi (Gemini) — temsilî görsel' }).select('id,url').single();
      if (error) throw error;
      return json(row);
    }
    // Dış görseli (ör. Canva'da üretilen yapay zekâ görseli dışa aktarımı) havuza alır — yalnızca iç gizli anahtarla; yalnızca Canva indirme alan adları
    if (path.startsWith('/media/import-url') && req.method === 'POST') {
      const { data: ok } = await db.rpc('verify_worker_secret', { p_secret: req.headers.get('x-worker-secret') || '' });
      if (!ok) return json({ error: 'forbidden' }, 403);
      const b = await req.json().catch(() => ({})) as { url?: string; title?: string; pillar?: string; tags?: string[] };
      const u = new URL(String(b.url || ''));
      if (!/(^|\.)canva\.com$|(^|\.)canva-export\.com$|(^|\.)canva\.cn$/.test(u.hostname) && !/amazonaws\.com$/.test(u.hostname)) throw new HttpError(400, 'izin verilmeyen alan adı');
      const r = await fetch(u.toString()); const ct = r.headers.get('content-type') || '';
      if (!r.ok || !/image\/(jpeg|png)/.test(ct)) throw new HttpError(400, `görsel alınamadı (${r.status} ${ct})`);
      const bytes = new Uint8Array(await r.arrayBuffer()); const ext = ct.includes('png') ? 'png' : 'jpg';
      const path2 = `ai/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const up = await db.storage.from('media-uploads').upload(path2, bytes, { contentType: ct, upsert: false });
      if (up.error) throw up.error;
      const pub = db.storage.from('media-uploads').getPublicUrl(path2).data.publicUrl;
      const { data: row, error } = await db.from('media_library').insert({ kind: 'image', source: 'ai', title: (b.title || 'Yapay zekâ konsept görseli').slice(0, 120), url: pub, mime: ct, pillar: b.pillar ?? null, status: 'pool', notes: 'Yapay zekâ ile üretildi (Canva) — temsilî görsel' }).select('id,url').single();
      if (error) throw error;
      return json(row);
    }
    if (path.startsWith('/reels/queue') && req.method === 'GET') return json(await reelQueue(db));
    if (path.startsWith('/reels/attach') && req.method === 'POST') return json(await reelAttach(db, await req.json().catch(() => ({}))));
    // Meta (Facebook/Instagram) gelen olaylar: yorum, mesaj, bahsetme. Doğrulama belirteci Vault'ta; imza uygulama gizli anahtarıyla kontrol edilir.
    if (path.startsWith('/webhook/meta')) return await metaWebhook(db, req, url);
    if (path.startsWith('/api') && req.method === 'POST') return json(await api(db, req));
    return json({ error: 'not found' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
    const err = e as Error & { code?: string };
    const code = e instanceof ConnectorError ? e.code : err.code || 'ERROR';
    const statusCode = code === 'CONFIGURATION_REQUIRED' ? 409 : 500;
    return json({ error: String(err.message || e), code }, statusCode);
  }
});
