// Onaylı işlemlerin yürütülmesi ve gerçek platform yayını. Başarı yalnızca API yanıtıyla yazılır.
import { makeLogger, serviceClient, type Db, type EngineCtx } from './context.ts';
import { connectorByKey } from './connectors/registry.ts';
import { ConnectorError, resolveStatus, type AccountRow } from './connectors/types.ts';
import { getHandler } from './tools/registry.ts';

async function tokenFor(db: Db, account: AccountRow) {
  if (!account.credential_secret_id) throw new ConnectorError('Hesap token’ı yok — yeniden bağlanın', 'OAUTH_REQUIRED');
  const { data, error } = await db.rpc('read_connector_secret', { p_id: account.credential_secret_id });
  if (error || !data) throw new ConnectorError('Token okunamadı — yeniden bağlanın', 'OAUTH_REQUIRED');
  return data as string;
}

export async function publishContent(ctx: EngineCtx, input: Record<string, unknown>) {
  const platform = String(input.platform || '');
  const def = connectorByKey(platform);
  if (!def) throw new ConnectorError(`Bilinmeyen platform: ${platform}`, 'UNKNOWN_PLATFORM');
  if (!def.publish) throw new ConnectorError(`${def.name}: ${def.officialApi ? 'yayın connector’ı henüz yapılandırılmadı' : 'resmi API yok, manuel yayın'}`, def.officialApi ? 'CONFIGURATION_REQUIRED' : 'MANUAL_ONLY');

  const { data: draft } = await ctx.db.from('social_drafts').select('id,title,headline,format,body,caption,hashtags,media_urls,design_id,workflow_status').eq('id', input.content_id).maybeSingle();
  if (!draft) throw new Error('İçerik bulunamadı');
  let media: string[] = Array.isArray(input.media_urls) && input.media_urls.length ? (input.media_urls as string[]) : (draft.media_urls || []);
  if (!media.length && draft.design_id) {
    const { data: design } = await ctx.db.from('designs').select('export_url').eq('id', draft.design_id).maybeSingle();
    if (design?.export_url) media = [design.export_url];
  }
  const caption = draft.caption ? `${draft.caption}${draft.hashtags?.length ? `\n\n${draft.hashtags.join(' ')}` : ''}` : draft.body;

  const { data: accounts } = await ctx.db.from('social_accounts').select('*').or(`connector_key.eq.${platform},platform.eq.${platform}`).eq('connection_status', 'connected');
  const account = (accounts || [])[0] as AccountRow | undefined;
  const status = resolveStatus(def, account ?? null);
  if (!account || status !== 'connected') throw new ConnectorError(`${def.name} hesabı bağlı değil (${status})`, status.toUpperCase());

  const { data: pub, error } = await ctx.db.from('social_publications').insert({
    content_id: draft.id, design_id: draft.design_id, approval_request_id: input.approval_request_id ?? null, platform, account_id: account.id,
    caption, media_urls: media, scheduled_at: input.scheduled_at ?? null, status: 'processing', attempt: 1, created_by: ctx.actorId, approved_by: input.approved_by ?? null,
  }).select('id').single();
  if (error) throw error;
  await ctx.db.from('social_drafts').update({ workflow_status: 'processing' }).eq('id', draft.id);

  try {
    const token = await tokenFor(ctx.db, account);
    const out = await def.publish(account, token, { caption, mediaUrls: media, format: (input.format as string) || draft.format || null, title: draft.headline || draft.title || null });
    await ctx.db.from('social_publications').update({ status: 'published', published_at: new Date().toISOString(), external_post_id: out.externalPostId, external_url: out.externalUrl, api_response: out.raw }).eq('id', pub.id);
    await ctx.db.from('social_drafts').update({ workflow_status: 'published', status: 'yayinda' }).eq('id', draft.id);
    await ctx.log('info', `${def.name} yayını API ile doğrulandı`, { external_post_id: out.externalPostId });
    return { published: true, publication_id: pub.id, external_post_id: out.externalPostId, external_url: out.externalUrl };
  } catch (e) {
    const raw = e instanceof ConnectorError ? e.raw : null;
    await ctx.db.from('social_publications').update({ status: 'failed', error: String((e as Error).message).slice(0, 1000), api_response: raw ?? null }).eq('id', pub.id);
    await ctx.db.from('social_drafts').update({ workflow_status: 'failed', status: 'hata', error: String((e as Error).message).slice(0, 500) }).eq('id', draft.id);
    throw e;
  }
}

/** Web başvurusunu (lead_inbox) onaylı olarak ilgili müşteri modülüne dönüştürür. */
async function convertLead(db: Db, payload: Record<string, unknown>, actorId: string) {
  const { data: row } = await db.from('lead_inbox').select('*').eq('id', payload.lead_inbox_id).maybeSingle();
  if (!row) throw new Error('Başvuru bulunamadı');
  const common = { phone: row.phone, email: row.email, ilce: row.ilce, notes: row.note, source: 'website', kvkk_consent: row.kvkk_aydinlatma_onay, kvkk_consent_at: row.created_at,
    ticari_ileti_izni: row.ticari_ileti_izni, ticari_ileti_izin_tarihi: row.ticari_ileti_izni ? row.created_at : null, lead_inbox_id: row.id, created_by: actorId };
  const res = payload.module === 'rental'
    ? await db.from('rental_customers').insert({ ...common, contact_name: row.full_name || 'Web başvurusu', site_address: row.address }).select('id').single()
    : await db.from('construction_customers').insert({ ...common, full_name: row.full_name || 'Web başvurusu', mahalle: row.mahalle, address: row.address, budget_range: row.budget_range, timeline: row.timeline,
        project_type: row.demand === 'konut_insaati' ? 'konut' : row.demand === 'kentsel_donusum' ? 'kentsel_donusum' : 'diger' }).select('id').single();
  if (res.error) {
    if (res.error.code === '23505') throw new Error('Aynı telefon/e-posta ile müşteri zaten var (duplicate)');
    throw res.error;
  }
  await db.from('lead_inbox').update({ offer_match: `${row.offer_match ?? ''} · CRM’e aktarıldı (${payload.module})`.trim() }).eq('id', row.id);
  return { converted: true, module: payload.module, customer_id: res.data.id };
}

/** Onaylanmış ve zamanı gelmiş approval isteklerini yürütür (worker her dakika çağırır). */
export async function processDueApprovals(db: Db, workerId: string, limit = 5, onlyId?: string) {
  let q = db.from('approval_requests').select('*').in('status', ['approved', 'scheduled']).is('executed_at', null).not('tool_key', 'is', null)
    .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`).order('scheduled_for', { ascending: true, nullsFirst: true }).limit(limit);
  if (onlyId) q = q.eq('id', onlyId);
  const { data: due } = await q;
  const results = [];
  for (const ap of due || []) {
    // Atomik sahiplenme: yalnızca bir worker 'processing'e çekebilir
    const { data: claimed } = await db.from('approval_requests').update({ status: 'processing' }).eq('id', ap.id).in('status', ['approved', 'scheduled']).is('executed_at', null).select('id').maybeSingle();
    if (!claimed) continue;
    const log = makeLogger(db, ap.run_id);
    const ctx: EngineCtx = { db, runId: ap.run_id, task: null, bot: null, skill: null, agent: null, actorId: ap.decided_by || ap.requested_by, actorRole: 'admin',
      approvalsCreated: [], outputs: {}, log, tokens: { in: 0, out: 0 } };
    if (ap.bot_id) { const { data } = await db.from('automation_bots').select('*').eq('id', ap.bot_id).maybeSingle(); ctx.bot = data; }
    try {
      let result: Record<string, unknown>;
      if (ap.tool_key === 'create_lead' && ap.payload?.lead_inbox_id) result = await convertLead(db, ap.payload, ctx.actorId);
      else if (ap.tool_key === 'publish_post') result = await publishContent(ctx, { ...ap.payload, approval_request_id: ap.id, approved_by: ap.decided_by, scheduled_at: ap.scheduled_for });
      else {
        const handler = getHandler(ap.tool_key);
        if (!handler) throw new Error(`Handler yok: ${ap.tool_key}`);
        result = (await handler(ctx, ap.payload || {})) as Record<string, unknown>;
      }
      // Gerçek dış gönderim yapıldıysa published; manuel mod ise onaylı kalır ve sonuç (link/metin) saklanır.
      const externallyDone = result.published === true || result.sent === true || result.converted === true;
      await db.from('approval_requests').update({ status: externallyDone ? 'published' : 'approved', executed_at: new Date().toISOString(), result, error: null }).eq('id', ap.id);
      await log('info', `Onaylı işlem yürütüldü: ${ap.tool_key}`, { worker: workerId, mode: externallyDone ? 'api' : 'manual' });
      results.push({ id: ap.id, ok: true, result });
    } catch (e) {
      const msg = String((e as Error).message).slice(0, 1000);
      await db.from('approval_requests').update({ status: 'failed', error: msg, executed_at: new Date().toISOString(), result: e instanceof ConnectorError ? { code: e.code, raw: e.raw ?? null } : null }).eq('id', ap.id);
      await log('error', `Onaylı işlem başarısız: ${ap.tool_key}`, { error: msg });
      results.push({ id: ap.id, ok: false, error: msg });
    }
  }
  return results;
}

/** Son 7 günde yayınlanmış gönderilerin resmi API metriklerini çeker (6 saatte bir). */
export async function syncMetrics(db: Db = serviceClient(), limit = 5, onlyPublicationId?: string) {
  const cols = 'id,platform,account_id,external_post_id,published_at';
  const { data: pubs } = onlyPublicationId
    ? await db.from('social_publications').select(cols).eq('id', onlyPublicationId)
    : await db.from('social_publications').select(cols).eq('status', 'published').not('external_post_id', 'is', null)
      .gte('published_at', new Date(Date.now() - 7 * 86400_000).toISOString()).limit(25);
  const out = [];
  for (const p of pubs || []) {
    if (out.length >= limit) break;
    if (!onlyPublicationId) {
      const { data: last } = await db.from('social_post_metrics').select('fetched_at').eq('publication_id', p.id).order('fetched_at', { ascending: false }).limit(1).maybeSingle();
      if (last && Date.now() - new Date(last.fetched_at).getTime() < 6 * 3600_000) continue;
    }
    const def = connectorByKey(p.platform);
    if (!def?.fetchMetrics || !p.account_id) continue;
    const { data: account } = await db.from('social_accounts').select('*').eq('id', p.account_id).maybeSingle();
    if (!account) continue;
    try {
      const token = await tokenFor(db, account as AccountRow);
      const m = await def.fetchMetrics(account as AccountRow, token, p.external_post_id);
      const { raw, ...values } = m;
      await db.from('social_post_metrics').insert({ publication_id: p.id, source: 'api', raw, ...values });
      out.push({ id: p.id, ok: true });
    } catch (e) {
      out.push({ id: p.id, ok: false, error: String((e as Error).message) });
    }
  }
  return out;
}
