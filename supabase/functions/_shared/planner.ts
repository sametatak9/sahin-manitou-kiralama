// Aylık içerik planı: her koşuda bir hafta üretilir, kalan haftalar görev kuyruğu ile devam eder.
import { aiComplete, brandForContext, type EngineCtx, type TaskRow } from './context.ts';
import { chooseEditorialStyles, editorialPrompt, validateEditorialCandidate, type EditorialHistory } from './pure/editorial.ts';

type Invoke = (toolKey: string, input: Record<string, unknown>) => Promise<{ ok: boolean; content: unknown }>;

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['date', 'time', 'platform', 'pillar', 'title', 'headline', 'caption', 'hashtags', 'cta', 'image_idea'],
        properties: {
          date: { type: 'string' }, time: { type: 'string' }, platform: { type: 'string' }, pillar: { type: 'string' },
          title: { type: 'string' }, headline: { type: 'string' }, caption: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } }, cta: { type: 'string' }, image_idea: { type: 'string' },
        },
      },
    },
  },
};

export async function planWeek(ctx: EngineCtx, task: TaskRow, invoke: Invoke) {
  const cfg = task.input_config as { campaign_id: string; month: string; week_index?: number; platforms?: string[]; goal?: string; posts_per_day?: number };
  const week = cfg.week_index ?? 0;
  const [y, m] = cfg.month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = week * 7 + 1;
  const to = Math.min(from + 6, daysInMonth);
  const platforms = cfg.platforms?.length ? cfg.platforms : ['instagram', 'facebook'];
  const brand = await brandForContext(ctx);
  const isEmbay = /embay/i.test(brand?.company_name ?? '') || ctx.bot?.slug === 'content-bot';
  const clientId = ctx.bot?.client_id ?? brand?.client_id ?? null;
  let history: EditorialHistory[] = [];
  if (isEmbay && clientId) {
    const { data } = await ctx.db.from('social_drafts').select('headline,caption,tone,content_pillar').eq('client_id', clientId)
      .neq('workflow_status', 'cancelled').order('created_at', { ascending: false }).limit(36);
    history = (data ?? []) as EditorialHistory[];
  }
  const dates = Array.from({ length: to - from + 1 }, (_, i) => `${cfg.month.slice(0, 7)}-${String(from + i).padStart(2, '0')}`);
  const targetCount = Math.min(dates.length * (cfg.posts_per_day ?? 1), 30);
  const styles = isEmbay ? chooseEditorialStyles(history, targetCount, week + y + m) : [];

  const prompt = [
    `Ay: ${cfg.month.slice(0, 7)} · Hafta ${week + 1} · Günler: ${dates.join(', ')}`,
    `Platformlar: ${platforms.join(', ')} · Günde ${cfg.posts_per_day ?? 1} içerik`,
    cfg.goal && !isEmbay ? `Aylık hedef: ${cfg.goal}` : '',
    brand ? `Marka: ${brand.company_name} · ${brand.phone} · ${brand.website}` : '',
    isEmbay
      ? `YALNIZ HAFİF ÇELİK: ağır çelik, betonarme, kentsel dönüşüm, kat karşılığı, tadilat/tamirat, istinat/taş duvar, Manitou veya kiralama konusu üretme. Her tarih için sıradaki özgün formatı kullan:\n${styles.map((style, i) => `${i + 1}. ${editorialPrompt(style)}`).join('\n')}`
      : 'İçerik sütunlarını tenant marka kiti ve doğrulanmış hizmetlere göre dengele; marka dışı ürün veya hizmet ekleme.',
    isEmbay ? 'Son paylaşımlardaki aynı açılış, başlık, paragraf kalıbı veya CTA’yı tekrarlama. Görselde olmayan proje, tarih, m², fiyat, süre, teknik/performans/güvenlik iddiası uydurma.' : '',
    'Her gün için belirtilen tarih ve HH:MM saat ver (Europe/Istanbul). Uydurma müşteri/proje/rakam yok.',
  ].filter(Boolean).join('\n');

  const { json } = await aiComplete(ctx, 'monthly_plan_week', prompt, PLAN_SCHEMA);
  const items = ((json?.items as Array<Record<string, unknown>>) || []).slice(0, targetCount);
  let created = 0; let skipped = 0;
  const accepted: EditorialHistory[] = [];
  for (const [index, it] of items.entries()) {
    const date = String(it.date || '');
    if (!dates.includes(date)) continue;
    const time = /^\d{2}:\d{2}$/.test(String(it.time)) ? String(it.time) : '10:00';
    const platform = platforms.includes(String(it.platform)) ? String(it.platform) : platforms[0];
    const style = styles[index];
    if (isEmbay) {
      const candidate = { title: it.title, headline: it.headline, caption: it.caption, pillar: it.pillar, hashtags: it.hashtags as string[], cta: it.cta, image_idea: it.image_idea };
      const quality = validateEditorialCandidate(candidate, [...history, ...accepted]);
      if (!quality.ok) { skipped++; await ctx.log('warn', `Hafif çelik kampanya taslağı reddedildi: ${quality.reason}`); continue; }
      accepted.push({ headline: String(it.headline ?? ''), caption: String(it.caption ?? ''), tone: style?.label ?? null, content_pillar: `hafif_celik_${style?.key ?? 'genel'}` });
    }
    const saved = await invoke('save_draft', {
      title: it.title, headline: it.headline, caption: it.caption, hashtags: it.hashtags, cta: it.cta, image_brief: it.image_idea,
      ...(isEmbay ? { pillar: `hafif_celik_${style?.key ?? 'genel'}`, tone: style?.label ?? 'Özgün hafif çelik içeriği' } : { pillar: it.pillar }),
      platform, scheduled_at: `${date}T${time}:00+03:00`, campaign_id: cfg.campaign_id,
    });
    const contentId = (saved.content as { content_id?: string })?.content_id;
    if (!saved.ok || !contentId) continue;
    await invoke('submit_approval', { entity_type: 'content', entity_id: contentId, title: String(it.title || 'Plan içeriği'), summary: `${date} ${time} · ${platform} · ${it.pillar}`, scheduled_for: `${date}T${time}:00+03:00` });
    created++;
  }
  await ctx.log('info', `Hafta ${week + 1}: ${created} içerik taslağı onaya gönderildi${skipped ? ` · ${skipped} tekrar/kapsam dışı taslak engellendi` : ''}`);

  const done = to >= daysInMonth;
  if (done) await ctx.db.from('content_campaigns').update({ status: 'active' }).eq('id', cfg.campaign_id);
  return {
    summary: `Aylık plan hafta ${week + 1}: ${created} içerik${skipped ? ` · ${skipped} taslak kapsam/tekrar filtresinde engellendi` : ''}${done ? ' · plan tamamlandı' : ''}`,
    continuation: done ? null : { ...cfg, week_index: week + 1 },
  };
}
