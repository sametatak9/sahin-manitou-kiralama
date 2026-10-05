// EV VİTRİNİ EDİTÖR BOTU: sitedeki (/evler) ev modelleri için editör gibi çalışır.
// 1) Ön yazı: başlığı/fotoğrafı girilmiş ama yazısı eksik evlere kısa slogan + "Proje hakkında" metni yazar (yalnızca panelde girilen bilgilerden; m², fiyat, süre, konum UYDURMAZ).
//    Bot yazdığı metni "taslak" evlere doğrudan yazar; yayındaki eve yazmaz (öneri olarak ai_note'a bırakır). Yayına alma kararı ekiptedir.
// 2) Duyuru: bir ev "yayında" olunca Instagram + Facebook kaydırmalı paylaşımını (gerçek fotoğraflar + açıklama + site linki) havuza koyar; Telegram'a haber verir.
import type { Db } from './context.ts';
import { aiComplete, loadAgent } from './context.ts';
import { loadAppSecrets, secret as appSecret } from './secrets.ts';
import { telegramSend } from './connectors/messaging.ts';

const SITE = 'https://embay-panel.vercel.app';
const PHONE = '0531 436 29 04';
const SYSTEM: Record<string, string> = { celik: 'çelik yapı', hafif_celik: 'hafif çelik', betonarme: 'betonarme', prefabrik: 'prefabrik', diger: '' };
const DELIVERY: Record<string, string> = { anahtar_teslim: 'anahtar teslim', ileri_kaba: 'ileri kaba', kaba: 'kaba inşaat' };
// Konum girilmemişse ilçe/semt etiketi kullanılmaz (uydurma konum olmasın)
const PLACES = /(güngören|tozkoparan|çatalca|catalca|silivri|büyükçekmece|arnavutköy|esenyurt|beylikdüzü|başakşehir|avcılar|küçükçekmece|bahçelievler|bağcılar|esenler|sultangazi|eyüp|sarıyer|beşiktaş|kadıköy|üsküdar|ataşehir|maltepe|kartal|pendik|tuzla|şile|beykoz|ümraniye|sancaktepe|çekmeköy|sultanbeyli|zeytinburnu|fatih|bayrampaşa|gaziosmanpaşa|kağıthane|şişli|beyoğlu|adalar|hadımköy|kocaeli|gebze|tekirdağ|çorlu|çerkezköy|ankara|izmir|bursa|antalya)/i;
const BASE_TAGS = ['#embayyapı', '#villa', '#müstakilev', '#anahtarteslim', '#evyaptırmak', '#hayalimdekiev', '#villaprojesi', '#modernev', '#evmodelleri', '#istanbul', '#keşfet'];

interface Model {
  id: string; slug: string; client_id: string | null; title: string; subtitle: string | null; code: string | null; system: string; floors: number | null; area_m2: number | null; rooms: string | null;
  room_breakdown: Array<{ label: string; count?: number | null; m2?: number | null }> | null; price: number | null; price_note: string | null; delivery: string; delivery_days: number | null; location: string | null;
  is_real_project: boolean; includes: string[]; excludes: string[]; description: string | null; cover_url: string | null; gallery: string[]; status: string;
  ai_written_at: string | null; ai_requested_at: string | null; ai_note: string | null; announced_at: string | null; social_caption: string | null;
}

/** Bota verilecek GERÇEK bilgiler (boş olanlar hiç yazılmaz → model uyduramaz). */
function facts(m: Model) {
  const f: string[] = [`Başlık: ${m.title}`];
  if (m.code) f.push(`Model kodu: ${m.code}`);
  if (m.is_real_project) f.push(`Bu, Embay Yapı'nın tamamlayıp teslim ettiği GERÇEK bir proje${m.location ? ` (${m.location})` : ''}.`);
  else f.push('Bu, katalogdaki bir ev modeli (müşteriye göre uyarlanabilir).');
  if (SYSTEM[m.system]) f.push(`Yapı sistemi: ${SYSTEM[m.system]}`);
  if (m.floors) f.push(`Kat: ${m.floors === 1 ? 'tek kat' : `${m.floors} kat`}`);
  if (m.area_m2) f.push(`Yapı boyutu: ${m.area_m2} m²`);
  if (m.rooms) f.push(`Oda sayısı: ${m.rooms}`);
  const rb = (m.room_breakdown ?? []).filter((r) => r.label).map((r) => `${r.count ? `${r.count} ` : ''}${r.label}${r.m2 ? ` ${r.m2} m²` : ''}`);
  if (rb.length) f.push(`Oda dağılımı: ${rb.join(', ')}`);
  f.push(`Teslim tipi: ${DELIVERY[m.delivery] ?? m.delivery}`);
  if (m.delivery_days) f.push(`Tahmini teslim: ${m.delivery_days} gün`);
  if (m.price) f.push(`Fiyat: ${m.price.toLocaleString('tr-TR')}₺${m.price_note ? ` (${m.price_note})` : ''}`);
  else if (m.price_note) f.push(`Fiyat notu: ${m.price_note}`);
  if (m.includes.length) f.push(`Fiyata dahil: ${m.includes.join(', ')}`);
  if (m.excludes.length) f.push(`Fiyata dahil değil: ${m.excludes.join(', ')}`);
  f.push(`Fotoğraf sayısı: ${new Set([m.cover_url, ...m.gallery].filter(Boolean)).size}`);
  if (m.subtitle) f.push(`Mevcut slogan: ${m.subtitle}`);
  if (m.description) f.push(`Mevcut açıklama: ${m.description}`);
  return f.join('\n');
}

const RULES = `Embay Yapı'nın ev vitrini editörüsün. Türkçe, sıcak, sade ve kurumsal yaz (ince ve naif ton; abartı, ünlem yağmuru yok).
KESİN KURALLAR: Yalnızca verilen bilgileri kullan. Verilmeyen m², oda, fiyat, süre, konum, malzeme markası, garanti, müşteri adı, tarih YAZMA; tahmin etme.
"En iyi", "Türkiye'nin 1 numarası" gibi kanıtsız iddia yok. Konum verilmediyse hiçbir ilçe/şehir adı (metinde de hashtag'de de) yazma. Telefon: ${PHONE}. Emojiyi sadece sosyal medya metninde, az kullan.`;

const SCHEMA = {
  type: 'object',
  properties: {
    subtitle: { type: 'string', description: 'Kartta görünen tek satır slogan, en fazla 70 karakter' },
    description: { type: 'string', description: '"Proje hakkında" ön yazısı: 2 kısa paragraf, toplam 350-600 karakter' },
    social_caption: { type: 'string', description: 'Instagram/Facebook açıklaması: 3-5 kısa satır, sonda "Detaylar ve teklif için DM atın veya arayın" çağrısı; hashtag YOK' },
  },
  required: ['subtitle', 'description', 'social_caption'],
};

/** Hashtag'ler yapay zekâya bırakılmaz (yazım hatası / uydurma konum olmasın): evin bilgilerinden sabit liste. */
function tagsFor(m: Model) {
  const t = ['#embayyapı'];
  if (m.is_real_project) t.push('#teslimettik', '#gerçekproje');
  if (m.floors === 1) t.push('#tekkatlıev', '#tekkatlıvilla'); else if ((m.floors ?? 0) >= 2) t.push('#dubleksvilla', '#ikikatlıev');
  const sys: Record<string, string[]> = { celik: ['#çelikev', '#çelikyapı'], hafif_celik: ['#hafifçelik', '#hafifçelikev'], betonarme: ['#betonarme'], prefabrik: ['#prefabrikev'] };
  t.push(...(sys[m.system] ?? []));
  if (m.delivery === 'anahtar_teslim') t.push('#anahtarteslim');
  if (m.location && !/\s/.test(m.location.trim())) t.push(`#${m.location.trim().toLocaleLowerCase('tr-TR')}`);
  t.push(...BASE_TAGS);
  return [...new Set(t)].slice(0, 20);
}

/** Tek bir ev için metin üret (kaydetmez). */
export async function writeShowroomTexts(db: Db, m: Model, actorId: string | null = null) {
  const agent = await loadAgent(db, null);
  const r = await aiComplete({ db, runId: null, actorId: actorId as string, tokens: { in: 0, out: 0 }, agent }, 'showroom_editor',
    `Aşağıdaki ev için site ve sosyal medya metinlerini yaz.\n\n${facts(m)}`, SCHEMA, RULES);
  const j = r.json as { subtitle?: string; description?: string; social_caption?: string };
  const clean = (s: unknown, n: number) => String(s ?? '').replace(/\s+\n/g, '\n').trim().slice(0, n);
  return {
    subtitle: clean(j.subtitle, 90), description: clean(j.description, 1200), social_caption: clean(j.social_caption, 1200),
    hashtags: tagsFor(m),
  };
}

const COLS = 'id,slug,client_id,title,subtitle,code,system,floors,area_m2,rooms,room_breakdown,price,price_note,delivery,delivery_days,location,is_real_project,includes,excludes,description,cover_url,gallery,status,ai_written_at,ai_requested_at,ai_note,announced_at,social_caption';

/** Worker adımı: en fazla 2 evin yazısını yazar + yeni yayına giren evleri duyurur. */
export async function showroomEditorTick(db: Db) {
  const { data: bot } = await db.from('automation_bots').select('id,status').eq('slug', 'vitrin-editoru').maybeSingle();
  if (!bot || bot.status !== 'active') return { skipped: 'bot pasif' };
  const out: Record<string, unknown> = { written: [] as string[], announced: [] as string[] };

  // 1) Ön yazı: (a) ekip "Bot yazsın" dedi, ya da (b) taslak evde açıklama/slogan boş ve bot daha önce yazmadı
  const { data: todo } = await db.from('showroom_models').select(COLS).neq('status', 'archived')
    .or('ai_requested_at.not.is.null,and(status.eq.draft,ai_written_at.is.null,or(description.is.null,subtitle.is.null))').order('updated_at').limit(2);
  for (const m of (todo ?? []) as Model[]) {
    try {
      const t = await writeShowroomTexts(db, m);
      const caption = `${t.social_caption}\n\n${t.hashtags.join(' ')}`;
      // Yayındaki eve doğrudan yazılmaz: öneri olarak bırakılır (editör onaylar)
      const patch: Record<string, unknown> = m.status === 'published'
        ? { ai_note: `ÖNERİ — Slogan: ${t.subtitle}\n\n${t.description}`, social_caption: m.social_caption || caption }
        : { subtitle: m.subtitle || t.subtitle, description: m.ai_requested_at ? t.description : (m.description || t.description), social_caption: caption,
          ai_note: 'Ön yazıyı Editör Bot yazdı — yayınlamadan önce okuyun.' };
      if (m.ai_requested_at && m.status !== 'published') patch.subtitle = t.subtitle;
      await db.from('showroom_models').update({ ...patch, ai_written_at: new Date().toISOString(), ai_requested_at: null }).eq('id', m.id);
      (out.written as string[]).push(m.title);
    } catch (e) {
      await db.from('showroom_models').update({ ai_requested_at: null, ai_note: `Bot yazamadı: ${String((e as Error).message).slice(0, 200)}` }).eq('id', m.id);
      out.error = String((e as Error).message).slice(0, 200);
    }
  }

  // 2) Duyuru: yayına giren ve henüz duyurulmamış evler → IG + FB kaydırmalı taslağı (havuz)
  const { data: fresh } = await db.from('showroom_models').select(COLS).eq('status', 'published').is('announced_at', null).order('published_at').limit(2);
  for (const m of (fresh ?? []) as Model[]) {
    const imgs = [...new Set([m.cover_url, ...m.gallery].filter(Boolean) as string[])].slice(0, 10);
    if (!imgs.length) continue;
    let caption = m.social_caption;
    if (!caption) {
      try { const t = await writeShowroomTexts(db, m); caption = `${t.social_caption}\n\n${t.hashtags.join(' ')}`; }
      catch { caption = `${m.title}${m.subtitle ? ` — ${m.subtitle}` : ''}\n\nDetaylar ve teklif için DM atın veya arayın 👇\n📞 ${PHONE}\n\n${BASE_TAGS.join(' ')}`; }
    }
    const link = `${SITE}/ev/${m.slug}`;
    const body = `${caption}\n\n🔗 Tüm detaylar: ${link}`;
    const rows = (['instagram', 'facebook'] as const).map((p) => ({
      client_id: m.client_id, bot_id: bot.id, brand: 'Embay Yapı', title: `${p.toUpperCase()} · Ev Vitrini · ${m.title}`.slice(0, 200), headline: m.title, body, caption,
      format: imgs.length > 1 ? 'carousel' : 'banner', media_urls: imgs, design_url: imgs[0], primary_platform: p, platform_targets: [p], networks: [p],
      campaign_name: 'Ev Vitrini', content_pillar: 'VİTRİN', cta: `WhatsApp: ${PHONE}`, status: 'taslak', workflow_status: 'draft',
      scheduled_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      kvkk_basis: 'Yönetici talebiyle; Embay Yapı gerçek proje / model fotoğrafları (kişisel veri yok).',
    }));
    const { error } = await db.from('social_drafts').insert(rows);
    if (error) { out.error = error.message; continue; }
    await db.from('showroom_models').update({ announced_at: new Date().toISOString() }).eq('id', m.id);
    (out.announced as string[]).push(m.title);
  }

  const written = out.written as string[]; const announced = out.announced as string[];
  if (written.length || announced.length) {
    await loadAppSecrets(db);
    if (appSecret('TELEGRAM_BOT_TOKEN') && appSecret('TELEGRAM_CHAT_ID')) {
      const lines = ['🏡 Ev Vitrini · Editör Bot'];
      for (const t of written) lines.push(`✍️ "${t}" için ön yazı hazırlandı — panelden okuyup yayınlayın.`);
      for (const t of announced) lines.push(`📣 "${t}" yayında; IG + FB kaydırmalı paylaşım Yayın Merkezi → Havuz'a kondu.`);
      lines.push(`${SITE}/?ops=showroom`);
      await telegramSend(lines.join('\n')).catch(() => null);
    }
  }
  return out;
}
