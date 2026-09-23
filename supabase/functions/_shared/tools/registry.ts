// Tool registry handler'ları. Botlar yalnızca buradaki fonksiyonları çağırabilir (sınırsız kod yok).
// "propose" = bot çalışırken; "execute" = insan onayından sonra (approval executor).
import { aiComplete, defaultBrand, istanbulDayRange, type EngineCtx } from '../context.ts';
import { resendEmail, telegramSend, waMeLink, whatsappCloudSend } from '../connectors/messaging.ts';
import { normalizeDomain } from '../pure/rules.ts';
import { publishContent } from '../publisher.ts';
import { secret as appSecret } from '../secrets.ts';

export type ToolHandler = (ctx: EngineCtx, input: Record<string, unknown>) => Promise<unknown>;

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : v == null ? fallback : String(v));
const ALLOWED_NETWORKS = ['instagram', 'facebook', 'tiktok', 'youtube', 'gmb', 'google_business', 'linkedin', 'threads', 'pinterest', 'twitter', 'x', 'bluesky', 'whatsapp', 'telegram', 'sahibinden', 'armut'];

const CONTENT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title', 'headline', 'caption', 'hashtags', 'cta', 'image_idea', 'design_brief'],
  properties: {
    title: { type: 'string' }, headline: { type: 'string' }, caption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } }, cta: { type: 'string' },
    image_idea: { type: 'string' }, design_brief: { type: 'string' },
  },
};

async function brandLine(ctx: EngineCtx) {
  const b = await defaultBrand(ctx.db);
  return b ? `Marka: ${b.company_name}. Telefon: ${b.phone}. Web: ${b.website}. Instagram: ${b.instagram}. Adres: ${b.address}. Varsayılan CTA: ${b.default_cta}.` : '';
}

export async function generateContent(ctx: EngineCtx, input: Record<string, unknown>) {
  const prompt = [
    `Platform: ${str(input.platform, 'instagram')}`,
    `Konu: ${str(input.topic, 'Manitou kiralama ve şantiye hizmetleri')}`,
    input.objective ? `Amaç: ${str(input.objective)}` : '',
    input.audience ? `Hedef kitle: ${str(input.audience)}` : '',
    input.tone ? `Ton: ${str(input.tone)}` : '',
    input.cta ? `İstenen CTA: ${str(input.cta)}` : '',
    await brandLine(ctx),
    'Platformun karakter ve format kurallarına uy. Hashtag’leri # olmadan değil, # ile yaz. Uydurma rakam/müşteri/proje kullanma.',
  ].filter(Boolean).join('\n');
  const { json, generationId } = await aiComplete(ctx, 'create_content', prompt, CONTENT_SCHEMA);
  return { ...json, ai_generation_id: generationId };
}

const handlers: Record<string, ToolHandler> = {
  create_content: generateContent,

  async generate_caption(ctx, input) {
    const { json } = await aiComplete(ctx, 'generate_caption', `Platform: ${str(input.platform)}\nKonu: ${str(input.topic)}\nTon: ${str(input.tone, 'kurumsal ve samimi')}\n${await brandLine(ctx)}`,
      { type: 'object', additionalProperties: false, required: ['caption'], properties: { caption: { type: 'string' } } });
    return json;
  },

  async generate_hashtags(ctx, input) {
    const { json } = await aiComplete(ctx, 'generate_hashtags', `Konu: ${str(input.topic)}\nLokasyon: ${str(input.location, 'İstanbul Güngören')}\nAdet: ${Number(input.count) || 12}`,
      { type: 'object', additionalProperties: false, required: ['hashtags'], properties: { hashtags: { type: 'array', items: { type: 'string' } } } });
    return json;
  },

  async generate_image_prompt(ctx, input) {
    const { json } = await aiComplete(ctx, 'generate_image_prompt', `Konu: ${str(input.topic)}\nFormat: ${str(input.format, 'instagram_post')}\n${await brandLine(ctx)}\nGörsel fikri, tasarım brief'i ve yerleşim öner.`,
      { type: 'object', additionalProperties: false, required: ['image_idea', 'design_brief', 'layout', 'headline', 'subtitle', 'cta'], properties: {
        image_idea: { type: 'string' }, design_brief: { type: 'string' }, layout: { type: 'string', enum: ['hero', 'split', 'story', 'corporate', 'bold', 'listing'] },
        headline: { type: 'string' }, subtitle: { type: 'string' }, cta: { type: 'string' } } });
    return json;
  },

  async create_design(ctx, input) {
    const format = str(input.format_key, 'instagram_post');
    const { data: tpl } = await ctx.db.from('design_templates').select('id,width,height,layout,format_key').eq('format_key', format).eq('active', true).order('template_key').limit(1).maybeSingle();
    if (!tpl) throw new Error(`Şablon bulunamadı: ${format}`);
    const brand = await defaultBrand(ctx.db);
    const layers = {
      variant: (tpl.layout as { variant?: string })?.variant ?? 'hero',
      headline: str(input.headline), subtitle: str(input.subtitle), cta: str(input.cta, brand?.default_cta ?? ''),
      image_url: str(input.image_url) || null, show_logo: true, show_phone: true,
    };
    const { data, error } = await ctx.db.from('designs').insert({
      content_id: input.content_id || null, template_id: tpl.id, brand_kit_id: brand?.id ?? null, provider: 'embay_studio',
      name: str(input.headline, 'Tasarım').slice(0, 80), format_key: format, width: tpl.width, height: tpl.height, layers, created_by: ctx.actorId,
    }).select('id').single();
    if (error) throw error;
    if (input.content_id) await ctx.db.from('social_drafts').update({ design_id: data.id }).eq('id', input.content_id);
    return { design_id: data.id, note: 'Design Studio taslağı oluşturuldu; PNG dışa aktarımı panelden yapılır.' };
  },

  async save_draft(ctx, input) {
    const platform = str(input.platform, 'instagram');
    const hashtags = Array.isArray(input.hashtags) ? input.hashtags.map(String) : [];
    const caption = str(input.caption);
    const body = hashtags.length ? `${caption}\n\n${hashtags.join(' ')}` : caption;
    const scheduled = input.scheduled_at ? new Date(str(input.scheduled_at)) : null;
    const { data, error } = await ctx.db.from('social_drafts').insert({
      brand: 'İkisi', title: str(input.title, 'Bot taslağı').slice(0, 200), body: body || '(boş)', caption, headline: str(input.headline) || null,
      hashtags, cta: str(input.cta) || null, image_brief: str(input.image_brief) || null, design_brief: str(input.design_brief) || null,
      networks: ALLOWED_NETWORKS.includes(platform) ? [platform] : [], platform_targets: [platform], primary_platform: platform,
      scheduled_at: scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled.toISOString() : null,
      status: 'taslak', workflow_status: 'draft', archive_status: 'active', bot_id: ctx.bot?.id ?? null, skill_id: ctx.skill?.id ?? null,
      task_id: ctx.task?.id ?? null, campaign_id: input.campaign_id || null, content_pillar: str(input.pillar) || null,
      ai_generation_id: input.ai_generation_id || null, created_by: ctx.actorId,
      kvkk_basis: 'Bot taslağı; yayın öncesi insan onayı zorunlu.',
    }).select('id').single();
    if (error) throw error;
    return { content_id: data.id };
  },

  async submit_approval(ctx, input) {
    const entityType = str(input.entity_type, 'content');
    const { data, error } = await ctx.db.from('approval_requests').insert({
      entity_type: entityType, entity_id: input.entity_id || null, title: str(input.title, 'Onay isteği').slice(0, 200), summary: str(input.summary) || null,
      bot_id: ctx.bot?.id ?? null, task_id: ctx.task?.id ?? null, run_id: ctx.runId, platform: str(input.platform) || ctx.task?.platform || null,
      payload: input.payload ?? {}, status: 'pending_approval', requested_by: ctx.actorId, scheduled_for: input.scheduled_for || null,
    }).select('id').single();
    if (error) throw error;
    ctx.approvalsCreated.push(data.id);
    if (entityType === 'content' && input.entity_id) {
      await ctx.db.from('social_drafts').update({ workflow_status: 'pending_approval', status: 'onay_bekliyor', approval_request_id: data.id }).eq('id', input.entity_id);
    }
    return { approval_id: data.id, status: 'pending_approval' };
  },

  // Yalnızca onaydan sonra çalışır (approval_required = true)
  async publish_post(ctx, input) {
    return await publishContent(ctx, input);
  },

  async fetch_metrics(ctx, input) {
    const days = Math.min(Math.max(Number(input.days) || 7, 1), 90);
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const [pubs, metrics, reports] = await Promise.all([
      ctx.db.from('social_publications').select('id,platform,status,published_at').gte('created_at', since),
      ctx.db.from('social_post_metrics').select('publication_id,reach,likes,comments,shares,saves,fetched_at').gte('fetched_at', since).order('fetched_at', { ascending: false }),
      ctx.db.from('social_platform_reports').select('platform,period_type,period_start,reach,engagements,leads').gte('period_start', since.slice(0, 10)),
    ]);
    const latest = new Map<string, Record<string, number | null>>();
    for (const m of metrics.data || []) if (!latest.has(m.publication_id)) latest.set(m.publication_id, m);
    const sum = (k: string) => [...latest.values()].reduce((a, m) => a + (Number(m[k]) || 0), 0);
    const published = (pubs.data || []).filter((p) => p.status === 'published');
    return {
      period_days: days, publications_total: pubs.data?.length ?? 0, published: published.length,
      failed: (pubs.data || []).filter((p) => p.status === 'failed').length,
      api_metrics_available: latest.size, reach: latest.size ? sum('reach') : null, likes: latest.size ? sum('likes') : null,
      comments: latest.size ? sum('comments') : null, manual_reports: reports.data?.length ?? 0,
      note: latest.size ? 'Metrikler resmi API yanıtlarından.' : 'Bu dönemde API metriği yok (bağlı hesap / yayın yok).',
    };
  },

  async create_lead(ctx, input) {
    // Girdi varsa: kişisel veri içermeyen B2B firma adayı (kaynak zorunlu), domain ile tekrar kontrolü
    if (input.firm_name) {
      if (!input.source_url) throw new Error('Kaynak URL zorunlu (izinli kaynak kanıtı)');
      const domain = normalizeDomain(str(input.website));
      if (domain) {
        const { data: dup } = await ctx.db.from('companies').select('id,firm_name').eq('domain_norm', domain).maybeSingle();
        if (dup) return { duplicate: true, company_id: dup.id, firm_name: dup.firm_name };
      }
      const { data, error } = await ctx.db.from('companies').insert({
        firm_name: str(input.firm_name).slice(0, 160), website: str(input.website) || null, public_phone: str(input.public_phone) || null,
        ilce: str(input.ilce) || null, source_url: str(input.source_url), need: str(input.need) || null, project: str(input.project) || null,
        source: 'bot_research', bot_id: ctx.bot?.id ?? null, status: 'aday',
      }).select('id').single();
      if (error) throw error;
      return { duplicate: false, company_id: data.id };
    }
    // Girdi yoksa: web formundan gelen yeni başvuruları tara → dönüştürme onayı aç
    const { data: inbox } = await ctx.db.from('lead_inbox').select('id,full_name,phone,email,ilce,demand,note,created_at').eq('status', 'yeni').order('created_at', { ascending: false }).limit(25);
    const suggestions = [];
    for (const row of inbox || []) {
      const [{ data: rc }, { data: cc }, { data: open }] = await Promise.all([
        ctx.db.from('rental_customers').select('id').eq('lead_inbox_id', row.id).limit(1),
        ctx.db.from('construction_customers').select('id').eq('lead_inbox_id', row.id).limit(1),
        ctx.db.from('approval_requests').select('id').eq('entity_type', 'lead').eq('entity_id', row.id).in('status', ['pending_approval', 'approved', 'scheduled']).limit(1),
      ]);
      if (rc?.length || cc?.length || open?.length) continue;
      const { data: dups } = await ctx.db.rpc('find_customer_duplicates', { p_phone: row.phone, p_email: row.email, p_website: null, p_name: null });
      const module = row.demand === 'manitou_kiralama' ? 'rental' : 'construction';
      const { data: ap } = await ctx.db.from('approval_requests').insert({
        entity_type: 'lead', entity_id: row.id, title: `Web başvurusu → ${module === 'rental' ? 'Makine kiralama' : 'İnşaat'} müşterisi`,
        summary: `${row.ilce || 'İlçe yok'} · ${row.demand}${dups?.length ? ` · OLASI TEKRAR: ${dups.map((d: { label: string }) => d.label).join(', ')}` : ''}`,
        bot_id: ctx.bot?.id ?? null, task_id: ctx.task?.id ?? null, run_id: ctx.runId, tool_key: 'create_lead',
        payload: { lead_inbox_id: row.id, module, duplicates: dups || [] }, status: 'pending_approval', requested_by: ctx.actorId,
      }).select('id').single();
      if (ap) { ctx.approvalsCreated.push(ap.id); suggestions.push({ lead_inbox_id: row.id, module, duplicates: dups?.length ?? 0 }); }
    }
    const { count: prospects } = await ctx.db.from('social_prospects').select('id', { count: 'exact', head: true }).eq('outreach_status', 'approval_pending');
    return { scanned_web_requests: inbox?.length ?? 0, conversion_suggestions: suggestions, social_prospects_waiting: prospects ?? 0 };
  },

  async update_crm(ctx, input) {
    if (input.customer_id && input.module) {
      const module = str(input.module) === 'rental' ? 'rental' : 'construction';
      if (input.note) await ctx.db.from('customer_activities').insert({ customer_module: module, customer_id: input.customer_id, activity_type: 'not', body: str(input.note).slice(0, 2000), created_by: ctx.actorId });
      if (input.next_action_at) await ctx.db.from(module === 'rental' ? 'rental_customers' : 'construction_customers').update({ next_action_at: input.next_action_at }).eq('id', input.customer_id);
      return { updated: true };
    }
    const now = new Date().toISOString();
    const stale = new Date(Date.now() - 3 * 86400_000).toISOString();
    const q = async (table: string) => {
      const [overdue, staleNew, noContact] = await Promise.all([
        ctx.db.from(table).select('id', { count: 'exact', head: true }).is('archived_at', null).lt('next_action_at', now).not('status', 'in', '(kazanildi,kaybedildi,tamamlandi)'),
        ctx.db.from(table).select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'yeni').lt('created_at', stale),
        ctx.db.from(table).select('id', { count: 'exact', head: true }).is('archived_at', null).is('phone', null).is('email', null),
      ]);
      return { overdue_followups: overdue.count ?? 0, stale_new_over_3_days: staleNew.count ?? 0, missing_contact: noContact.count ?? 0 };
    };
    return { construction: await q('construction_customers'), rental: await q('rental_customers') };
  },

  async send_email(ctx, input) {
    const r = await resendEmail(str(input.to), str(input.subject), str(input.body));
    await ctx.log('info', 'E-posta Resend API ile gönderildi', { id: r.messageId });
    return { sent: true, external_id: r.messageId };
  },

  async prepare_whatsapp_message(ctx, input) {
    let phone = str(input.phone);
    if (!phone && input.customer_id) {
      const table = str(input.customer_module) === 'rental' ? 'rental_customers' : 'construction_customers';
      const { data } = await ctx.db.from(table).select('phone,kvkk_consent,ticari_ileti_izni').eq('id', input.customer_id).maybeSingle();
      if (!data?.phone) throw new Error('Müşterinin telefonu yok');
      if (!data.kvkk_consent) throw new Error('KVKK rızası olmayan kişiye mesaj gönderilemez');
      phone = data.phone;
    }
    if (!phone) throw new Error('Telefon gerekli');
    const message = str(input.message);
    if (appSecret('WHATSAPP_TOKEN') && appSecret('WHATSAPP_PHONE_NUMBER_ID')) {
      const r = await whatsappCloudSend(phone, message);
      return { sent: true, mode: 'whatsapp_cloud_api', external_id: r.messageId };
    }
    return { sent: false, mode: 'manual', wa_link: waMeLink(phone, message), note: 'WhatsApp Cloud API bağlı değil; bağlantıdan manuel gönderin.' };
  },

  async create_listing(_ctx, input) {
    return { sent: false, mode: 'manual', platform: str(input.platform), title: str(input.title), description: str(input.description), note: 'Resmi API yok; ilanı platformda manuel yayınlayın ve bağlantısını kayda ekleyin.' };
  },

  async seo_audit(ctx, input) {
    const url = str(input.url, Deno.env.get('PUBLIC_SITE_URL') || 'https://sahin-manitou-kiralama.vercel.app/');
    const started = Date.now();
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'EmbaySEOBot/1.0 (+panel)' } });
    const html = await res.text();
    const ms = Date.now() - started;
    const pick = (re: RegExp) => re.exec(html)?.[1]?.trim() ?? null;
    const origin = new URL(res.url).origin;
    const [robots, sitemap] = await Promise.all([
      fetch(`${origin}/robots.txt`).then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 500) })).catch((e) => ({ status: 0, body: String(e) })),
      fetch(`${origin}/sitemap.xml`).then(async (r) => ({ status: r.status, urls: ((await r.text()).match(/<loc>/g) || []).length })).catch(() => ({ status: 0, urls: 0 })),
    ]);
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    const h1 = (html.match(/<h1[\s>]/gi) || []).length;
    const findings: Array<{ level: 'error' | 'warn' | 'ok'; message: string }> = [];
    const add = (cond: boolean, level: 'error' | 'warn', bad: string, good: string) => findings.push(cond ? { level: 'ok', message: good } : { level, message: bad });
    add(res.status === 200, 'error', `HTTP ${res.status}`, 'HTTP 200');
    add(Boolean(title) && title!.length >= 20 && title!.length <= 65, 'warn', `Title uzunluğu uygun değil (${title?.length ?? 0})`, `Title uygun (${title?.length})`);
    add(Boolean(description) && description!.length >= 70 && description!.length <= 165, 'warn', `Meta description uygun değil (${description?.length ?? 0})`, 'Meta description uygun');
    add(/<link[^>]+rel=["']canonical["']/i.test(html), 'warn', 'Canonical etiketi yok', 'Canonical var');
    add(/<html[^>]+lang=["']tr/i.test(html), 'warn', 'html lang="tr" yok', 'lang="tr" var');
    add(/application\/ld\+json/i.test(html), 'warn', 'JSON-LD yapısal veri yok', 'JSON-LD var');
    add(/<meta[^>]+property=["']og:title/i.test(html), 'warn', 'Open Graph etiketleri yok', 'Open Graph var');
    add(!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html), 'error', 'Sayfa noindex!', 'Indexlenebilir');
    add(h1 > 0, 'warn', 'Sunucu HTML’inde H1 yok (SPA: içerik JS ile render ediliyor olabilir)', `H1 sayısı: ${h1}`);
    add(robots.status === 200, 'warn', `robots.txt ${robots.status}`, 'robots.txt var');
    add(sitemap.status === 200 && sitemap.urls > 0, 'warn', `sitemap.xml ${sitemap.status}`, `sitemap.xml ${sitemap.urls} URL`);
    add(ms < 1500, 'warn', `Yanıt süresi yavaş (${ms} ms)`, `Yanıt süresi ${ms} ms`);
    return { url: res.url, status: res.status, response_ms: ms, title, description, h1_count: h1, html_bytes: html.length, robots_status: robots.status, sitemap, findings,
      score: Math.round((findings.filter((f) => f.level === 'ok').length / findings.length) * 100) };
  },

  async create_report(ctx, input) {
    const day = istanbulDayRange();
    const c = async (table: string, build: (q: ReturnType<typeof ctx.db.from>) => unknown) => {
      // deno-lint-ignore no-explicit-any
      const { count } = await (build(ctx.db.from(table)) as any);
      return count ?? 0;
    };
    const head = { count: 'exact' as const, head: true };
    const metrics = {
      date: day.label,
      new_construction_customers: await c('construction_customers', (q) => q.select('id', head).gte('created_at', day.start).lt('created_at', day.end)),
      new_rental_customers: await c('rental_customers', (q) => q.select('id', head).gte('created_at', day.start).lt('created_at', day.end)),
      new_web_requests: await c('lead_inbox', (q) => q.select('id', head).gte('created_at', day.start).lt('created_at', day.end)),
      pending_approvals: await c('approval_requests', (q) => q.select('id', head).eq('status', 'pending_approval')),
      drafts_created_today: await c('social_drafts', (q) => q.select('id', head).gte('created_at', day.start).lt('created_at', day.end)),
      published_today: await c('social_publications', (q) => q.select('id', head).eq('status', 'published').gte('published_at', day.start).lt('published_at', day.end)),
      bot_runs_today: await c('social_bot_runs', (q) => q.select('id', head).gte('created_at', day.start).lt('created_at', day.end)),
      failed_runs_today: await c('social_bot_runs', (q) => q.select('id', head).in('status', ['failed', 'timeout']).gte('created_at', day.start).lt('created_at', day.end)),
      overdue_followups: (await c('construction_customers', (q) => q.select('id', head).is('archived_at', null).lt('next_action_at', new Date().toISOString()).not('status', 'in', '(kazanildi,kaybedildi)')))
        + (await c('rental_customers', (q) => q.select('id', head).is('archived_at', null).lt('next_action_at', new Date().toISOString()).not('status', 'in', '(tamamlandi,kaybedildi)'))),
    };
    const previous = Object.entries(ctx.outputs).filter(([k]) => k !== 'create_report').map(([k, v]) => ({ tool: k, result: v }));
    const title = str(input.title, `${ctx.bot?.name ?? 'Operasyon'} raporu · ${day.label}`);
    const lines = [
      title,
      `Yeni inşaat müşterisi: ${metrics.new_construction_customers} · Yeni kiralama müşterisi: ${metrics.new_rental_customers} · Web başvurusu: ${metrics.new_web_requests}`,
      `Onay bekleyen: ${metrics.pending_approvals} · Bugün taslak: ${metrics.drafts_created_today} · Bugün yayın: ${metrics.published_today}`,
      `Bot koşusu: ${metrics.bot_runs_today} (hata: ${metrics.failed_runs_today}) · Geciken takip: ${metrics.overdue_followups}`,
      input.body ? `\n${str(input.body)}` : '',
    ].filter(Boolean);
    const report = { title, scope: str(input.scope, 'daily'), metrics, body: lines.join('\n'), previous_steps: previous };
    // Gün sonu raporu: Telegram yapılandırılmışsa yöneticiye gerçek gönderim
    if (ctx.bot?.slug === 'manager-assistant' && appSecret('TELEGRAM_BOT_TOKEN') && appSecret('TELEGRAM_CHAT_ID')) {
      try { const t = await telegramSend(report.body); await ctx.log('info', 'Rapor Telegram’a gönderildi', t); Object.assign(report, { telegram: 'sent' }); }
      catch (e) { await ctx.log('warn', 'Telegram gönderimi başarısız', String(e)); Object.assign(report, { telegram: 'failed' }); }
    } else Object.assign(report, { telegram: 'not_configured' });
    return report;
  },
};

export function getHandler(key: string): ToolHandler | undefined {
  return handlers[key];
}
