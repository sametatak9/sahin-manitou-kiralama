// EMBAY OPS edge function — tek giriş noktası:
//   POST /ops/worker            → pg_cron (x-worker-secret) : due task + onaylı işlemler + zamanı gelen yayınlar + metrikler
//   POST /ops/api {action,...}  → panel (kullanıcı JWT + ekip rolü)
//   GET  /ops/oauth/callback    → Meta / Canva OAuth dönüşü
import { initKeyStore, providerAvailability } from '../_shared/ai/index.ts';
import { getAiKey } from '../_shared/ai/keys.ts';
import { loadAppSecrets, resetAppSecrets, secret } from '../_shared/secrets.ts';
import { googleAuthorizeUrl, googleExchange } from '../_shared/connectors/youtube.ts';
import { aiComplete, loadAgent, serviceClient, type Db, type EngineCtx, type TaskRow } from '../_shared/context.ts';
import { executeTask } from '../_shared/engine.ts';
import { CONNECTORS, connectorByKey, publicConnectorInfo } from '../_shared/connectors/registry.ts';
import { ConnectorError, resolveStatus } from '../_shared/connectors/types.ts';
import { graphVersion, metaAuthorizeUrl, metaExchange } from '../_shared/connectors/meta.ts';
import { canvaAuthorizeUrl, canvaCreateDesign, canvaExchange, canvaExportPng, canvaProfile, canvaRefresh, canvaUploadFromUrl, pkceVerifier } from '../_shared/connectors/canva.ts';
import { telegramSend } from '../_shared/connectors/messaging.ts';
import { processDueApprovals, publishContent, syncMetrics } from '../_shared/publisher.ts';
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
  const content = await publishDueContent(db, workerId);
  const metrics = await syncMetrics(db, 3);
  return { tasks: taskResults, approvals, content, metrics };
}

/** Onaylı + zamanı gelmiş içerikleri, hesabı gerçekten bağlı platformlarda yayınlar. Bağlı değilse dokunmaz. */
async function publishDueContent(db: Db, workerId: string) {
  const { data: drafts } = await db.from('social_drafts').select('id,primary_platform,platform_targets,approved_by,created_by,scheduled_at')
    .in('workflow_status', ['approved', 'scheduled']).lte('scheduled_at', new Date().toISOString()).limit(5);
  const out = [];
  for (const d of drafts || []) {
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

// ── Sistem kontrolü: her parça gerçekten çalışıyor mu? (secret değerleri döndürülmez) ──
type Check = { key: string; group: string; label: string; state: 'ok' | 'warn' | 'fail'; detail: string; fix?: string };
async function systemCheck(db: Db) {
  const checks: Check[] = [];
  const ago = (iso: string | null) => (iso ? Math.round((Date.now() - new Date(iso).getTime()) / 60000) : null);

  // 1) Zamanlanmış işler (bot motorları)
  const { data: jobs, error: je } = await db.rpc('ops_worker_health');
  const JOB_LABEL: Record<string, string> = { 'embay-ops-worker': 'Bot görev + yayın motoru (her dakika)', 'embay-missions-worker': 'Araştırma görev motoru (her dakika)', 'embay-portfolio-reminders': 'Firma hatırlatmaları (her sabah 09:00)' };
  if (je) checks.push({ key: 'cron', group: 'Motor', label: 'Zamanlanmış işler', state: 'fail', detail: je.message });
  for (const j of (jobs || []) as Array<{ job: string; schedule: string; active: boolean; last_ok: string | null; last_status: string | null }>) {
    const everyMinute = j.schedule === '* * * * *'; const m = ago(j.last_ok);
    const ok = j.active && m !== null && m <= (everyMinute ? 3 : 26 * 60);
    checks.push({ key: `cron:${j.job}`, group: 'Motor', label: JOB_LABEL[j.job] ?? j.job, state: ok ? 'ok' : !everyMinute && m === null ? 'warn' : 'fail',
      detail: m === null ? 'Henüz çalışmadı' : `Son başarılı çalışma ${m} dk önce${j.last_status && j.last_status !== 'succeeded' ? ` · son durum: ${j.last_status}` : ''}` });
  }

  // 2) AI anahtarları — sağlayıcıya ücretsiz model listesi isteğiyle canlı doğrulama
  for (const p of ['anthropic', 'gemini'] as const) {
    const key = await getAiKey(p); const label = p === 'anthropic' ? 'Claude (Anthropic) AI anahtarı' : 'Gemini AI anahtarı';
    if (!key) { checks.push({ key: `ai:${p}`, group: 'Yapay zekâ', label, state: p === 'anthropic' ? 'fail' : 'warn', detail: 'Tanımlı değil', fix: 'Ayarlar → AI anahtarı' }); continue; }
    try {
      const r = p === 'anthropic'
        ? await fetch('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } })
        : await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } });
      checks.push({ key: `ai:${p}`, group: 'Yapay zekâ', label, state: r.ok ? 'ok' : 'fail', detail: r.ok ? `Doğrulandı (…${key.slice(-4)})` : `Sağlayıcı reddetti: HTTP ${r.status}`, fix: r.ok ? undefined : 'Anahtarı yenileyin' });
    } catch (e) { checks.push({ key: `ai:${p}`, group: 'Yapay zekâ', label, state: 'warn', detail: `Bağlantı hatası: ${String(e).slice(0, 120)}` }); }
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
  for (const k of ['instagram', 'facebook', 'youtube', 'whatsapp', 'email', 'telegram', 'canva']) {
    const def = connectorByKey(k); if (!def) continue;
    const missing = def.requiredEnv.filter((e) => !secret(e));
    const acc = (accounts || []).find((a) => (a.connector_key === k || a.platform === k) && a.connection_status === 'connected');
    const st = resolveStatus(def, acc ?? null);
    const needsAccount = def.authType === 'oauth';
    let state: Check['state'] = 'ok'; let detail = ''; let fix: string | undefined;
    if (missing.length) { state = 'warn'; detail = `Uygulama giriş bilgisi eksik: ${missing.join(', ')}`; fix = 'Uygulamalar → Giriş bilgileri'; }
    else if (needsAccount && !acc) { state = 'warn'; detail = 'Giriş bilgisi hazır · hesap henüz bağlanmadı'; fix = 'Uygulamalar → Bağla'; }
    else if (st !== 'connected') { state = 'fail'; detail = `Durum: ${st}`; fix = 'Yeniden bağlayın'; }
    else {
      const exp = acc?.token_expires_at ? new Date(acc.token_expires_at).getTime() : null;
      detail = `Bağlı${acc?.external_account_name ? ` · ${acc.external_account_name}` : ''}${exp ? ` · oturum ${Math.max(0, Math.round((exp - Date.now()) / 86400000))} gün geçerli` : ''}`;
      if (exp && exp - Date.now() < 7 * 86400000) { state = 'warn'; fix = 'Oturum süresi yakında doluyor — yeniden bağlayın'; }
    }
    checks.push({ key: `app:${k}`, group: 'Uygulamalar', label: def.name, state, detail, fix });
  }
  if (secret('META_APP_ID') || secret('META_APP_SECRET')) checks.push(...await verifyApp('meta'));
  if (secret('GOOGLE_CLIENT_ID') || secret('GOOGLE_CLIENT_SECRET')) checks.push(...await verifyApp('google'));
  const summary = { ok: checks.filter((c) => c.state === 'ok').length, warn: checks.filter((c) => c.state === 'warn').length, fail: checks.filter((c) => c.state === 'fail').length };
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

async function oauthStart(db: Db, userId: string, provider: string, returnTo?: unknown, switchAccount = false) {
  const def = connectorByKey(provider === 'meta' ? 'instagram' : provider === 'google' ? 'youtube' : provider);
  if (!def) throw new HttpError(400, 'Bilinmeyen sağlayıcı');
  const missing = def.requiredEnv.filter((k) => !secret(k));
  if (missing.length) throw new HttpError(409, `Yapılandırma gerekli: ${missing.join(', ')}`, 'CONFIGURATION_REQUIRED');
  const state = crypto.randomUUID().replace(/-/g, '');
  const return_to = safeReturnTo(returnTo);
  if (provider === 'meta' || provider === 'instagram' || provider === 'facebook') {
    await db.from('oauth_states').insert({ state, provider: 'meta', user_id: userId, return_to });
    return { url: metaAuthorizeUrl(state, REDIRECT_URI(), switchAccount) };
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
      const { pages } = await metaExchange(code, REDIRECT_URI());
      if (!pages.length) return back('oauth_error=' + encodeURIComponent('Yönetici olduğunuz Facebook Sayfası bulunamadı'));
      for (const p of pages) {
        await upsertAccount(db, st.user_id, { platform: 'facebook', connector_key: 'facebook', account_name: p.pageName, external_account_id: p.pageId, external_account_name: p.pageName,
          profile_url: `https://facebook.com/${p.pageId}`, scopes: [], capabilities: { publish: true, metrics: true } }, p.pageToken);
        if (p.igId) await upsertAccount(db, st.user_id, { platform: 'instagram', connector_key: 'instagram', account_name: p.igUsername, handle: p.igUsername ? `@${p.igUsername}` : null,
          external_account_id: p.igId, external_account_name: p.igUsername, profile_url: p.igUsername ? `https://instagram.com/${p.igUsername}` : null, metadata: { page_id: p.pageId }, capabilities: { publish: true, metrics: true } }, p.pageToken);
      }
      const igCount = pages.filter((p) => p.igId).length;
      // Bu girişte izin verilmeyen eski sayfa/IG hesapları artık kullanılamaz: "bağlı değil" yap (kayıt arşivde kalır)
      const keepIds = [...pages.map((p) => p.pageId), ...pages.filter((p) => p.igId).map((p) => p.igId as string)];
      await db.from('social_accounts').update({ connection_status: 'not_connected', credential_secret_id: null }).in('connector_key', ['facebook', 'instagram']).eq('connection_status', 'connected').not('external_account_id', 'in', `(${keepIds.map((i) => `"${i}"`).join(',')})`);
      await db.rpc('write_audit_service', { p_actor: st.user_id, p_action: 'connect', p_entity_type: 'social_accounts', p_entity_id: 'meta', p_summary: `Bağlandı: Facebook ${pages.map((p) => p.pageName).join(', ')}${igCount ? ` · Instagram ${pages.filter((p) => p.igUsername).map((p) => '@' + p.igUsername).join(', ')}` : ''}` });
      await db.from('automation_bots').update({ status: 'active' }).eq('connector_key', 'facebook').eq('status', 'waiting_connection');
      if (igCount) await db.from('automation_bots').update({ status: 'active' }).eq('connector_key', 'instagram').eq('status', 'waiting_connection');
      return back(`connected=meta&pages=${pages.length}&ig=${igCount}`);
    }
    if (st.provider === 'canva') {
      const tokens = await canvaExchange(code, st.code_verifier, REDIRECT_URI());
      const profile = await canvaProfile(tokens.access_token).catch(() => ({ profile: { display_name: 'Canva' } }));
      await upsertAccount(db, st.user_id, { platform: 'canva', connector_key: 'canva', account_name: profile.profile?.display_name ?? 'Canva', external_account_id: 'canva-user', external_account_name: profile.profile?.display_name ?? null,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(), scopes: (tokens.scope || '').split(' ').filter(Boolean), capabilities: { design: true } },
        JSON.stringify({ access_token: tokens.access_token, refresh_token: tokens.refresh_token }));
      await db.rpc('write_audit_service', { p_actor: st.user_id, p_action: 'connect', p_entity_type: 'social_accounts', p_entity_id: 'canva', p_summary: `Bağlandı: Canva ${profile.profile?.display_name ?? ''}` });
      return back('connected=canva');
    }
    if (st.provider === 'google') {
      const yt = await googleExchange(code, REDIRECT_URI());
      await upsertAccount(db, st.user_id, { platform: 'youtube', connector_key: 'youtube', account_name: yt.channelTitle, external_account_id: yt.channelId, external_account_name: yt.channelTitle,
        handle: yt.customUrl ?? null, profile_url: `https://www.youtube.com/channel/${yt.channelId}`, capabilities: { publish: true } }, JSON.stringify({ refresh_token: yt.refreshToken }));
      await db.from('automation_bots').update({ status: 'active' }).eq('connector_key', 'youtube').eq('status', 'waiting_connection');
      await db.rpc('write_audit_service', { p_actor: st.user_id, p_action: 'connect', p_entity_type: 'social_accounts', p_entity_id: yt.channelId, p_summary: `Bağlandı: YouTube ${yt.channelTitle}` });
      return back('connected=youtube');
    }
    return back('oauth_error=unknown_provider');
  } catch (e) {
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

    case 'oauth_start': { const u = await requireUser(db, req, 'admin'); return oauthStart(db, u.userId, String(body.provider), body.return_to, body.switch_account === true); }

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
      await db.rpc('write_audit_service', { p_actor: u.userId, p_action: 'disconnect', p_entity_type: 'social_accounts', p_entity_id: acc.id, p_summary: `Çıkış yapıldı: ${acc.connector_key} ${acc.external_account_name ?? ''}` });
      return { ok: true, bots_waiting: !count };
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

    case 'verify_app': { await requireUser(db, req, 'admin'); resetAppSecrets(); await loadAppSecrets(db); return { checks: await verifyApp(body.provider === 'google' ? 'google' : 'meta') }; }

    case 'system_check': { await requireUser(db, req); resetAppSecrets(); await loadAppSecrets(db); return systemCheck(db); }

    default: throw new HttpError(400, `Bilinmeyen işlem: ${action}`);
  }
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
