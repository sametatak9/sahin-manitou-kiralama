// İÇERİK FABRİKASI: her gün 5 platform × 3 içerik (1 kısa video + 2 banner/kampanya) taslağı üretir → onay kuyruğu.
// Kurallar: gerçek hizmetlerimiz, uydurma müşteri/rakam/proje yok; platform uzunluk/hashtag kuralları; paylaşım insan onayından sonra.
// Banner PNG sunucuda üretilir (SVG → PNG, resvg-wasm). Video: Video Havuzu'ndan gerçek video seçilir; yoksa çekim senaryosuyla "video gerekli" taslağı.
import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm@2.6.2';
import { aiComplete, defaultBrand, istanbulDayRange, type Db } from './context.ts';
import { telegramSend } from './connectors/messaging.ts';
import { loadAppSecrets, secret as appSecret } from './secrets.ts';

type Platform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'x';
interface Quota { platform: Platform; enabled: boolean; video_per_day: number; image_per_day: number; slot_times: string[]; width: number; height: number }
interface Item { format: 'reel' | 'banner'; title: string; headline: string; subtitle: string; badge: string; caption: string; hashtags: string[]; cta: string; video_script?: string; brand: 'Embay Yapı' | 'Şahin Manitou' }

const PLATFORM_RULES: Record<Platform, string> = {
  instagram: 'Instagram: açıklama 80-150 kelime, ilk satır kanca, 8-12 hashtag (yerel: #çatalca #silivri #istanbul + sektör), konum ve WhatsApp çağrısı. Reels 15-30 sn.',
  tiktok: 'TikTok: açıklama en fazla 150 karakter, 3-5 hashtag (#inşaat #manitou #şantiye gibi), eğlenceli ama profesyonel; video 15-30 sn, ilk 2 saniye güçlü kanca.',
  youtube: 'YouTube Shorts: başlık en fazla 70 karakter + açıklama 2-3 cümle, 3 hashtag ve #shorts. Banner içerikleri Topluluk gönderisi olarak.',
  facebook: 'Facebook: 40-90 kelime, yerel ve güven veren dil, 2-4 hashtag, telefon ve WhatsApp çağrısı.',
  x: 'X (Twitter): toplam en fazla 260 karakter, 1-2 hashtag, net teklif/haber dili.',
};

// İçerik direkleri (her gün kaydırılır → tekrar yok)
const PILLARS = [
  { key: 'manitou', brand: 'Şahin Manitou', topic: 'Operatörlü Manitou (teleskopik yükleyici) kiralama: şantiyede yüksekte malzeme taşıma, montaj, günlük/aylık kiralama', badge: 'KİRALIK MANİTOU' },
  { key: 'villa', brand: 'Embay Yapı', topic: 'Çatalca ve çevresinde villa / müstakil ev yapımı: projelendirme, ruhsat, anahtar teslim', badge: 'VİLLA İNŞAATI' },
  { key: 'donusum', brand: 'Embay Yapı', topic: 'Kentsel dönüşüm ve kat karşılığı: süreç, haklar, güvenli müteahhit seçimi', badge: 'KENTSEL DÖNÜŞÜM' },
  { key: 'tadilat', brand: 'Embay Yapı', topic: 'Tadilat, çatı, dış cephe mantolama, güçlendirme ve ek kat işleri', badge: 'TADİLAT & TAMİRAT' },
  { key: 'santiye', brand: 'İkisi', topic: 'Şantiyeden gerçek iş: kaba inşaat, temel, çelik montaj ve manitou ile malzeme taşıma anları', badge: 'ŞANTİYEDEN' },
  { key: 'ipucu', brand: 'Embay Yapı', topic: 'Ev/villa yaptıracaklara bilgi: maliyeti etkileyen 5 kalem, betonarme mi prefabrik mi, zemin etüdü', badge: 'BİLGİ' },
  { key: 'kampanya', brand: 'Şahin Manitou', topic: 'Kampanya/hatırlatma: bu ay manitou kiralamada ücretsiz keşif, hızlı teklif, 7/24 destek', badge: 'KAMPANYA' },
] as const;

const CONTENT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['items'], properties: {
    items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['format', 'title', 'headline', 'subtitle', 'caption', 'hashtags', 'cta'], properties: {
      format: { type: 'string', enum: ['reel', 'banner'] }, title: { type: 'string' }, headline: { type: 'string' }, subtitle: { type: 'string' },
      caption: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, cta: { type: 'string' }, video_script: { type: 'string' },
    } } },
  },
};

// ── Banner çizimi (SVG → PNG) ────────────────────────────────────────────────
let wasmReady: Promise<void> | null = null;
let fonts: Uint8Array[] | null = null;
async function ensureRenderer() {
  wasmReady ??= (async () => { await initWasm(await fetch('https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm')); })();
  await wasmReady;
  if (!fonts) {
    const get = async (f: string) => new Uint8Array(await (await fetch(`https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/${f}`)).arrayBuffer());
    fonts = await Promise.all([get('DejaVuSans-Bold.ttf'), get('DejaVuSans.ttf')]);
  }
}
function b64(bytes: Uint8Array) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function wrap(text: string, maxChars: number, maxLines: number) {
  const words = text.trim().split(/\s+/); const lines: string[] = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  return lines;
}

export async function renderBanner(o: { w: number; h: number; brand: Record<string, string> | null; brandName: string; badge: string; headline: string; subtitle: string; cta: string; photo?: Uint8Array | null; photoMime?: string }) {
  await ensureRenderer();
  const p = o.brandName === 'Şahin Manitou' ? { bg1: '#1F2933', bg2: '#111827', acc: '#F5B301', txt: '#FFFFFF' } : { bg1: '#115A31', bg2: '#0B3D22', acc: '#F5B301', txt: '#FFFFFF' };
  const { w, h } = o; const wide = w / h > 1.3; const u = Math.min(w, h);
  const pad = Math.round(u * 0.075); const logo = Math.round(u * 0.085);
  const hSize = Math.round(u * (wide ? 0.1 : 0.085)); const sSize = Math.round(u * (wide ? 0.042 : 0.036));
  const hLines = wrap(o.headline.toLocaleUpperCase('tr-TR'), Math.floor((w - pad * 2) / (hSize * 0.64)), wide ? 2 : 3);
  const sLines = wrap(o.subtitle, Math.floor((w - pad * 2) / (sSize * 0.56)), wide ? 2 : 3);
  const barH = Math.round(u * 0.13);
  const photoH = o.photo ? (wide ? h : Math.round(h * 0.42)) : 0;
  const photo = o.photo ? `<image href="data:${o.photoMime || 'image/jpeg'};base64,${b64(o.photo)}" x="0" y="0" width="${w}" height="${photoH}" preserveAspectRatio="xMidYMid slice"/><rect x="0" y="0" width="${w}" height="${photoH}" fill="url(#fade)"/>` : '';
  const tall = h / w > 1.5;
  const badgeY = o.photo && !wide ? photoH - Math.round(sSize * 2.2) : pad + logo + Math.round(u * 0.07) + (tall ? Math.round(h * 0.16) : 0);
  const textTop = badgeY + Math.round(sSize * 1.7) + Math.round(hSize * 1.05);
  const phone = o.brand?.phone || '0531 436 29 04'; const site = o.brand?.website || 'sahin-manitou-kiralama.vercel.app';
  const ctaSize = Math.round(sSize * 1.05); const phoneW = (phone.length + 2) * ctaSize * 0.64;
  const ctaMax = Math.floor((w - pad * 2 - phoneW - pad * 0.6) / (ctaSize * 0.54));
  // CTA sığmıyorsa önce yazıyı küçült (en fazla %25), yine sığmazsa kelime sınırından kısalt
  const ctaFont = o.cta.length > ctaMax ? Math.max(Math.round(ctaSize * 0.75), Math.floor((w - pad * 2 - phoneW - pad * 0.6) / (o.cta.length * 0.54))) : ctaSize;
  const ctaMax2 = Math.floor((w - pad * 2 - phoneW - pad * 0.6) / (ctaFont * 0.54));
  const cta = o.cta.length > ctaMax2 ? o.cta.slice(0, Math.max(0, ctaMax2 - 1)).replace(/\s+\S*$/, '') + '…' : o.cta;
  const longBrand = o.brandName === 'İkisi';
  const chips = ['Ücretsiz keşif', 'Hızlı teklif', 'Güvenilir ekip'];
  const chipsY = h - barH - Math.round(u * 0.1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.35" stop-color="${p.bg2}" stop-opacity="${wide ? 0.55 : 0}"/><stop offset="1" stop-color="${p.bg2}" stop-opacity="0.95"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<circle cx="${w * 0.95}" cy="${h * 0.05}" r="${u * 0.35}" fill="${p.acc}" opacity="0.09"/><circle cx="${w * 0.03}" cy="${h * 0.97}" r="${u * 0.28}" fill="#3DAA5C" opacity="0.10"/>
${photo}
<rect x="${pad}" y="${pad}" width="${logo}" height="${logo}" rx="${Math.round(logo * 0.22)}" fill="${p.acc}"/>
<text x="${pad + logo / 2}" y="${pad + logo * 0.72}" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="${Math.round(logo * 0.62)}" fill="${p.bg2}">${o.brandName === 'Şahin Manitou' ? 'Ş' : 'E'}</text>
<text x="${pad + logo + u * 0.025}" y="${pad + logo * (longBrand && !wide ? 0.48 : 0.66)}" font-family="DejaVu Sans" font-weight="700" font-size="${Math.round(u * 0.036)}" fill="${p.txt}">${x(longBrand ? 'Embay Yapı · Şahin Manitou' : o.brandName)}</text>
${longBrand && !wide ? `<text x="${pad + logo + u * 0.025}" y="${pad + logo * 0.9}" font-family="DejaVu Sans" font-size="${Math.round(u * 0.024)}" fill="#CFE8D8">${x(site)}</text>` : `<text x="${w - pad}" y="${pad + logo * 0.66}" text-anchor="end" font-family="DejaVu Sans" font-size="${Math.round(u * 0.024)}" fill="#CFE8D8">${x(site)}</text>`}
<rect x="${pad}" y="${badgeY}" width="${Math.round(o.badge.length * sSize * 0.74 + sSize * 1.6)}" height="${Math.round(sSize * 1.7)}" rx="${Math.round(sSize * 0.85)}" fill="${p.acc}"/>
<text x="${pad + sSize * 0.8}" y="${badgeY + sSize * 1.2}" font-family="DejaVu Sans" font-weight="700" font-size="${sSize}" fill="${p.bg2}">${x(o.badge)}</text>
${hLines.map((l, i) => `<text x="${pad}" y="${textTop + i * hSize * 1.1}" font-family="DejaVu Sans" font-weight="700" font-size="${hSize}" fill="${p.txt}">${x(l)}</text>`).join('')}
${sLines.map((l, i) => `<text x="${pad}" y="${textTop + (hLines.length - 1) * hSize * 1.1 + sSize * 2.1 + i * sSize * 1.35}" font-family="DejaVu Sans" font-size="${sSize}" fill="#E5F3EA">${x(l)}</text>`).join('')}
${wide ? '' : chips.map((c, i) => { const cw = Math.round((w - pad * 2 - u * 0.04) / 3); return `<rect x="${pad + i * (cw + u * 0.02)}" y="${chipsY}" width="${cw}" height="${Math.round(sSize * 1.9)}" rx="${Math.round(sSize * 0.95)}" fill="#FFFFFF" opacity="0.12"/><text x="${pad + i * (cw + u * 0.02) + cw / 2}" y="${chipsY + sSize * 1.28}" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="${Math.round(sSize * 0.85)}" fill="#FFFFFF">✓ ${x(c)}</text>`; }).join('')}
<rect x="0" y="${h - barH}" width="${w}" height="${barH}" fill="${p.acc}"/>
<text x="${pad}" y="${h - barH / 2 + ctaSize * 0.36}" font-family="DejaVu Sans" font-weight="700" font-size="${ctaFont}" fill="${p.bg2}">${x(cta)}</text>
<text x="${w - pad}" y="${h - barH / 2 + ctaSize * 0.36}" text-anchor="end" font-family="DejaVu Sans" font-weight="700" font-size="${ctaSize}" fill="${p.bg2}">☎ ${x(phone)}</text>
</svg>`;
  const r = new Resvg(svg, { font: { fontBuffers: fonts!, defaultFontFamily: 'DejaVu Sans' }, fitTo: { mode: 'original' } });
  return r.render().asPng();
}

// ── Günlük üretim ────────────────────────────────────────────────────────────
function slotIso(day: string, hhmm: string) { return new Date(`${day}T${hhmm}:00+03:00`).toISOString(); }
function dayIndex(day: string) { return Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 86400000); }

function fallbackItems(p: Platform, pillars: typeof PILLARS[number][]): Item[] {
  // AI yoksa: marka bilgisiyle hazır, uydurma içermeyen kısa metinler (yine onaya düşer)
  return pillars.map((pl, i) => ({
    format: i === 0 ? 'reel' : 'banner', brand: pl.brand as Item['brand'], title: `${pl.badge} · ${p}`, badge: pl.badge,
    headline: pl.key === 'manitou' ? 'Operatörlü Manitou Kiralama' : pl.key === 'villa' ? 'Çatalca’da Villa & Müstakil Ev' : pl.key === 'donusum' ? 'Kentsel Dönüşümde Güvenilir Çözüm' : pl.key === 'tadilat' ? 'Tadilat · Çatı · Dış Cephe' : pl.key === 'kampanya' ? 'Ücretsiz Keşif · Hızlı Teklif' : 'Şantiyeden Gerçek İş',
    subtitle: pl.topic, caption: `${pl.topic}. Keşif ve teklif için bize yazın: 0531 436 29 04`,
    hashtags: p === 'x' ? ['#inşaat', '#istanbul'] : ['#inşaat', '#istanbul', '#çatalca', '#manitou', '#şantiye'].slice(0, p === 'tiktok' ? 4 : 5),
    cta: 'WhatsApp: 0531 436 29 04', video_script: i === 0 ? '0-2 sn: şantiyeden güçlü görüntü (manitou kaldırırken) · 3-10 sn: işin yapılışı · 11-20 sn: bitmiş iş/önce-sonra · son 3 sn: logo + telefon' : undefined,
  }));
}

export async function runContentFactory(db: Db, opts: { force?: boolean } = {}) {
  const { label: day } = istanbulDayRange();
  const { data: quotas } = await db.from('content_quota').select('*').eq('enabled', true);
  const brand = await defaultBrand(db);
  const { data: bot } = await db.from('automation_bots').select('id').eq('slug', 'icerik-fabrikasi').maybeSingle();
  const { data: admin } = await db.from('team_members').select('user_id').eq('role', 'admin').order('created_at').limit(1).maybeSingle();
  const { data: videos } = await db.from('media_library').select('id,url,cover_url,title').eq('kind', 'video').is('archived_at', null).order('queued_at', { ascending: true, nullsFirst: true }).limit(20);
  const { data: photos } = await db.from('media_library').select('id,url,mime').eq('kind', 'image').is('archived_at', null).limit(30);
  const { data: existing } = await db.rpc('content_quota_today');
  const have = new Map(((existing || []) as Array<{ platform: string; videos: number; banners: number }>).map((r) => [r.platform, r]));
  const di = dayIndex(day); let created = 0; const errors: string[] = []; let vIdx = 0;
  const actx = { db, runId: null, actorId: admin?.user_id ?? null, tokens: { in: 0, out: 0 }, agent: null } as unknown as Parameters<typeof aiComplete>[0];

  for (const q of (quotas || []) as Quota[]) {
    const h = have.get(q.platform); const needV = Math.max(0, q.video_per_day - (h?.videos ?? 0)); const needB = Math.max(0, q.image_per_day - (h?.banners ?? 0));
    if (!needV && !needB && !opts.force) continue;
    const pillars = [0, 1, 2].map((i) => PILLARS[(di * 3 + i + ['instagram', 'tiktok', 'youtube', 'facebook', 'x'].indexOf(q.platform)) % PILLARS.length]);
    let items: Item[] = [];
    try {
      const { json } = await aiComplete(actx, 'content_factory', [
        `Embay Yapı (villa, müstakil ev, kentsel dönüşüm, tadilat — Çatalca/İstanbul) ve Şahin Manitou (operatörlü teleskopik yükleyici kiralama) için ${q.platform.toUpperCase()} platformunda BUGÜN paylaşılacak 3 içerik yaz.`,
        `1. içerik format=reel (kısa dikey video: kanca + çekim senaryosu video_script'e), 2. ve 3. içerik format=banner (görsel üzerinde büyük başlık "headline" en fazla 5 kelime, "subtitle" en fazla 14 kelime).`,
        `Konular sırasıyla: ${pillars.map((p, i) => `${i + 1}) ${p.topic} [marka: ${p.brand}]`).join(' · ')}`,
        PLATFORM_RULES[q.platform],
        `"cta" en fazla 24 karakter. İletişim: ${brand?.phone ?? '0531 436 29 04'} · WhatsApp · ${brand?.website ?? ''}. Uydurma müşteri adı, rakam, fiyat, proje YAZMA. Türkçe, doğal, satış baskısı olmayan ama harekete geçiren dil. Hashtag'ler # ile.`,
      ].join('\n'), CONTENT_SCHEMA);
      // deno-lint-ignore no-explicit-any
      items = ((json?.items ?? []) as any[]).slice(0, 3).map((it, i) => ({ ...it, format: i === 0 ? 'reel' : 'banner', badge: pillars[i].badge, brand: pillars[i].brand as Item['brand'],
        hashtags: (Array.isArray(it.hashtags) ? it.hashtags : []).map((t: string) => (String(t).startsWith('#') ? String(t) : `#${t}`)).slice(0, q.platform === 'x' ? 2 : q.platform === 'tiktok' ? 5 : 12) }));
    } catch (e) { errors.push(`${q.platform}: AI — ${String((e as Error).message).slice(0, 120)} (hazır metin kullanıldı)`); }
    if (items.length < 3) items = fallbackItems(q.platform, pillars);

    const plan = [...(needV ? [items[0]] : []), ...items.slice(1).slice(0, needB)];
    for (const [i, it] of plan.entries()) {
      try {
        const slot = q.slot_times[Math.min(i + (3 - plan.length), q.slot_times.length - 1)] ?? '12:00';
        let media: string[] = []; let video_url: string | null = null; let note = '';
        if (it.format === 'banner') {
          const ph = photos?.length ? photos[(di + i + created) % photos.length] : null;
          const photo = ph ? new Uint8Array(await (await fetch(ph.url)).arrayBuffer()).slice(0) : null;
          const png = await renderBanner({ w: q.width, h: q.height, brand, brandName: it.brand, badge: it.badge, headline: it.headline, subtitle: it.subtitle, cta: it.cta, photo: photo && photo.length < 4_000_000 ? photo : null, photoMime: ph?.mime });
          const path = `factory/${day}/${q.platform}-${Date.now()}-${i}.png`;
          const up = await db.storage.from('design-exports').upload(path, png, { contentType: 'image/png', upsert: true });
          if (up.error) throw up.error;
          media = [db.storage.from('design-exports').getPublicUrl(path).data.publicUrl];
          await db.from('media_library').insert({ kind: 'banner', title: it.headline.slice(0, 120), url: media[0], mime: 'image/png', width: q.width, height: q.height, targets: [q.platform],
            caption: it.caption, hashtags: it.hashtags, status: 'queued', platform: q.platform, pillar: it.badge, source: 'factory', created_by: admin?.user_id ?? null,
            template: { headline: it.headline, subtitle: it.subtitle, badge: it.badge, cta: it.cta, brand: it.brand, width: q.width, height: q.height, photo_url: ph?.url ?? null } });
        } else {
          const v = videos?.[vIdx++ % Math.max(1, videos?.length ?? 0)];
          if (v) { video_url = v.url; media = [v.url]; }
          else note = 'VİDEO GEREKLİ: Video Havuzu’na şantiye/manitou videosu yükleyin; aşağıdaki senaryoya göre çekin.';
        }
        const body = `${it.caption}\n\n${it.hashtags.join(' ')}`;
        const { error } = await db.from('social_drafts').insert({
          brand: it.brand, title: `${q.platform.toUpperCase()} · ${it.format === 'reel' ? 'Kısa video' : 'Banner'} · ${it.headline}`.slice(0, 200), body,
          caption: it.caption, headline: it.headline, hashtags: it.hashtags, cta: it.cta, format: it.format, networks: [q.platform], platform_targets: [q.platform], primary_platform: q.platform,
          media_urls: media, video_url, design_url: it.format === 'banner' ? media[0] : null, design_brief: it.video_script ? `Çekim senaryosu: ${it.video_script}` : null,
          image_brief: note || null, scheduled_at: slotIso(day, slot), status: 'onay_bekliyor', workflow_status: 'pending_approval', archive_status: 'active',
          bot_id: bot?.id ?? null, content_pillar: it.badge, campaign_name: `Günlük içerik ${day}`, created_by: admin?.user_id ?? null,
          kvkk_basis: 'İçerik Fabrikası taslağı; yayın öncesi insan onayı zorunlu.',
        });
        if (error) throw error;
        await db.from('post_templates').insert({ title: it.headline.slice(0, 200), platform: q.platform, brand: it.brand, pillar: it.badge, headline: it.headline, caption: it.caption,
          hashtags: it.hashtags, cta: it.cta, source: 'factory', created_by: admin?.user_id ?? null });
        created++;
      } catch (e) { errors.push(`${q.platform}/${it.format}: ${String((e as Error).message).slice(0, 160)}`); }
    }
  }
  await db.from('content_factory_days').update({ finished_at: new Date().toISOString(), created, errors }).eq('day', day);
  return { day, created, errors };
}

/** Worker her dakika çağırır: 06:30'da günlük üretim, 08:00 sabah özeti, 18:30 eksik/paylaşılmamış hatırlatması (Telegram). */
export async function factoryTick(db: Db, background: (p: Promise<unknown>) => void) {
  const { label: day } = istanbulDayRange();
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  if (hm >= '06:30') {
    const { data: ins } = await db.from('content_factory_days').upsert({ day }, { onConflict: 'day', ignoreDuplicates: true }).select('day');
    if (ins?.length) { background(runContentFactory(db).catch((e) => db.from('content_factory_days').update({ errors: [String(e).slice(0, 300)] }).eq('day', day))); return { factory: 'started' }; }
  }
  const { data: row } = await db.from('content_factory_days').select('*').eq('day', day).maybeSingle();
  if (!row) return null;
  await loadAppSecrets(db);
  if (!appSecret('TELEGRAM_BOT_TOKEN') || !appSecret('TELEGRAM_CHAT_ID')) return null;
  const quota = async () => ((await db.rpc('content_quota_today')).data || []) as Array<{ platform: string; target: number; drafted: number; approved: number; published: number }>;
  const NAME: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', x: 'X' };
  if (hm >= '08:00' && row.finished_at && !row.morning_sent_at) {
    const { data: claimed } = await db.from('content_factory_days').update({ morning_sent_at: new Date().toISOString() }).eq('day', day).is('morning_sent_at', null).select('day');
    if (claimed?.length) {
      const q = await quota();
      await telegramSend([`🏭 İçerik Fabrikası — ${day}`, `Bugün için ${row.created} yeni içerik taslağı hazır (her platformda 1 kısa video + 2 banner).`, '',
        ...q.map((r) => `${NAME[r.platform] ?? r.platform}: ${r.drafted}/${r.target} hazır · ${r.approved} onaylı`), '',
        'Onay: https://embay-panel.vercel.app → Yayın Kuyruğu → "Onayla". Bağlı olmayan platformlarda "Telefondan paylaş".'].join('\n')).catch(() => null);
    }
  }
  if (hm >= '18:30' && !row.evening_sent_at) {
    const { data: claimed } = await db.from('content_factory_days').update({ evening_sent_at: new Date().toISOString() }).eq('day', day).is('evening_sent_at', null).select('day');
    if (claimed?.length) {
      const q = await quota(); const behind = q.filter((r) => r.published < r.target);
      await telegramSend(behind.length ? [`⏰ Hatırlatma — günlük paylaşım hedefi (${day})`, 'Günde her platformda 3 paylaşım zorunluluğu:', '',
        ...behind.map((r) => `${NAME[r.platform] ?? r.platform}: ${r.published}/${r.target} paylaşıldı${r.approved > r.published ? ` (${r.approved - r.published} onaylı bekliyor)` : ''}`), '',
        'Kalanları şimdi paylaşın: Yayın Kuyruğu → "Telefondan paylaş" / "Şimdi yayınla".'].join('\n') : `✅ Bugünün paylaşım hedefi tamam (${day}). Tebrikler!`).catch(() => null);
    }
  }
  return null;
}

/** Havuzdaki banner'ı şablonundan (yeniden) çizer ve kaydeder. id verilirse aynı kayıt güncellenir, yoksa yeni banner eklenir. */
export async function renderBannerToPool(db: Db, input: { id?: string | null; title?: string; platform?: string; template: { headline: string; subtitle?: string; badge?: string; cta?: string; brand?: string; width?: number; height?: number; photo_url?: string | null } }, userId: string | null) {
  const t = input.template;
  const brand = await defaultBrand(db);
  const size: Record<string, [number, number]> = { instagram: [1080, 1350], facebook: [1080, 1350], tiktok: [1080, 1920], youtube: [1080, 1920], x: [1600, 900] };
  const [w, h] = t.width && t.height ? [t.width, t.height] : size[input.platform ?? 'instagram'] ?? [1080, 1350];
  let photo: Uint8Array | null = null; let photoMime: string | undefined;
  if (t.photo_url) { const r = await fetch(t.photo_url).catch(() => null); if (r?.ok) { photo = new Uint8Array(await r.arrayBuffer()); photoMime = r.headers.get('content-type') ?? undefined; if (photo.length > 4_000_000) photo = null; } }
  const brandName = (t.brand === 'Şahin Manitou' || t.brand === 'Embay Yapı') ? t.brand : 'İkisi';
  const png = await renderBanner({ w, h, brand, brandName, badge: (t.badge || 'EMBAY').slice(0, 24), headline: t.headline, subtitle: t.subtitle ?? '', cta: t.cta || brand?.default_cta || 'Hemen arayın', photo, photoMime });
  const path = `pool/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
  const up = await db.storage.from('design-exports').upload(path, png, { contentType: 'image/png', upsert: true });
  if (up.error) throw up.error;
  const url = db.storage.from('design-exports').getPublicUrl(path).data.publicUrl;
  const row = { url, mime: 'image/png', width: w, height: h, template: { ...t, width: w, height: h }, title: (input.title || t.headline).slice(0, 120), platform: input.platform ?? null, pillar: t.badge ?? null, updated_at: new Date().toISOString() };
  if (input.id) {
    const { data, error } = await db.from('media_library').update(row).eq('id', input.id).eq('kind', 'banner').select('*').single();
    if (error) throw error; return data;
  }
  const { data, error } = await db.from('media_library').insert({ ...row, kind: 'banner', status: 'pool', source: 'manual', targets: input.platform ? [input.platform] : [], created_by: userId }).select('*').single();
  if (error) throw error; return data;
}
