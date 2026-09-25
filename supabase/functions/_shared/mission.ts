// EMBAY BOT GÖREVLERİ (mission): amaç + hedef link + aranacak şey + süre + bitiş koşulu → adım adım gerçek araştırma → rapor.
// Kurallar: sonuç asla rastgele üretilmez; her bulgu bir kaynak URL'ye dayanır; kaynağı doğrulanamayan AI bulgusu atılır.
import Anthropic from 'npm:@anthropic-ai/sdk@0.127.0';
import { budgetBlock, recordUsage } from './ai/budget.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';
import { ConfigurationRequiredError, extractJson } from './ai/types.ts';
import { COMPAT, getAiKey, GROQ_URL } from './ai/keys.ts';
import { telegramSend } from './connectors/messaging.ts';
import { loadAppSecrets, secret as appSecret } from './secrets.ts';
import { logActivity } from './activity.ts';
import { tavilySearch, type WebResult } from './search.ts';

type Db = SupabaseClient;

export interface MissionRow {
  id: string; bot_id: string | null; title: string; goal: string; target_url: string | null; search_for: string | null; report_spec: string | null;
  stop_condition: string | null; duration_minutes: number; status: string; finish_reason: string | null; started_at: string; deadline_at: string;
  finished_at: string | null; step_count: number; max_steps: number; provider: string | null; model: string | null; error_count?: number; error_kind?: string | null; schedule_id?: string | null;
  findings: Finding[]; sources: Source[]; visited: string[]; summary: string | null; tokens_in: number; tokens_out: number; created_by: string | null; cost_usd?: number; web_searches?: number;
  skill_ids?: string[]; purpose?: string; audit?: MissionAudit | null; coach_note?: string | null;
}
export interface Finding {
  title: string; detail: string; url: string; evidence?: string; at: string; step: number;
  // Liste/ilan görevlerinde yapılandırılmış alanlar (yalnızca kurumun kendi yayınladığı bilgiler)
  company?: string; location?: string; posted?: string; phone?: string; email?: string; website?: string;
  relevance?: number; fit?: string;
  verdict?: 'verified' | 'suspicious' | 'rejected'; verdict_reason?: string; summary?: string;
}
export interface MissionAudit { total: number; verified: number; suspicious: number; rejected: number; accuracy: number; checked_at: string; rejected_items?: Array<{ title: string; url: string; reason: string }> }
interface Source { url: string; title?: string }

const UA = 'Mozilla/5.0 (compatible; EmbayResearchBot/1.0; +https://embay-panel.vercel.app)';
// Kullanım koşullarında otomatik veri toplamayı yasaklayan / giriş gerektiren platformlar: doğrudan sayfa okunmaz,
// yalnızca arama motorlarında herkese açık görünen başlık/özet ve ilan linki kullanılır.
export const NO_SCRAPE_HOSTS = ['sahibinden.com', 'armut.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'tiktok.com'];
const noScrape = (u: string) => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return NO_SCRAPE_HOSTS.find((d) => h === d || h.endsWith('.' + d)) ?? null; } catch { return null; } };
export const COMPLIANCE_RULES = [
  'VERİ TOPLAMA KURALLARI (KVKK ve site kullanım koşullarına uygun, resmi prosedür):',
  '- Yalnızca herkese açık ve kurumların KENDİ yayınladığı kurumsal bilgileri kullan: firma adı, web sitesi, kurumsal telefon/e-posta, adres, faaliyet alanı, ilan başlığı/açıklaması.',
  '- Bireylerin kişisel verilerini (kişisel cep telefonu, kişisel e-posta, TC no, özel hesaplar, ev adresi) toplama. Bir ilanda yalnızca bireyin kişisel numarası varsa numarayı yazma; ilan linkini ver.',
  `- Giriş gerektiren sayfaları ve otomatik veri toplamayı kullanım koşullarında yasaklayan platformları (${NO_SCRAPE_HOSTS.join(', ')}) doğrudan kazıma; bu platformlar için yalnızca arama sonuçlarında herkese açık görünen başlık/özet ve linki ver.`,
  '- Her bilgiyi kaynak URL ile ver. Kaynağı olmayan bilgiyi yazma, uydurma. Bulamazsan boş liste döndür.',
].join('\n');

/** Tüm botlar için alaka kuralları: yalnızca görevin amacına doğrudan hizmet eden, üzerine iş yapılabilecek kayıtlar. */
export const RELEVANCE_RULES = [
  'ALAKA KURALLARI (tüm botlar için zorunlu):',
  '- Yalnızca GÖREVİN AMACINA DOĞRUDAN hizmet eden kayıtları bulgu yap. Konu, sektör ve bölge görevdekiyle birebir örtüşmeli.',
  '- Her bulgu somut ve üzerine iş yapılabilir olmalı: belirli bir proje, ihale, ilan, talep, firma veya duyuru. Genel haber, yorum, köşe yazısı, istatistik, fiyat endeksi, borsa/ekonomi haberi, siyaset, magazin, reklam, başka sektör veya görev bölgesi dışı kayıt BULGU DEĞİLDİR.',
  '- Her bulguya "relevance" (0-10) ve "fit" (tek cümle: bu kayıt görevdeki hangi ihtiyaca neden uyuyor) yaz. Emin değilsen veya 7\'nin altındaysa o kaydı hiç yazma.',
  '- Aynı olayın farklı haberlerini tek bulgu say. Az ama doğru bulgu, çok ama alakasız bulgudan iyidir; uygun kayıt yoksa boş liste döndür.',
].join('\n');
const MIN_RELEVANCE = 7;
const STOP = new Set(['icin', 'veya', 'olan', 'gibi', 'daha', 'kadar', 'yeni', 'ilan', 'ilani', 'proje', 'projesi', 'istanbul', 'turkiye']);
/** Görevin anahtar kelimeleri (ARANACAK + başlık): bulgunun metninde en az biri geçmeli (deterministik ikinci kontrol). */
export function anchorWords(m: Pick<MissionRow, 'search_for' | 'title'>): string[] {
  const words = `${m.search_for || ''} ${m.title}`.split(/[^\p{L}\p{N}]+/u).map((w) => norm(w)).filter((w) => w.length >= 4 && !STOP.has(w));
  return [...new Set(words.map((w) => w.slice(0, Math.max(4, w.length - 3))))]; // kök: ek farklarına dayanıklı (dönüşüm/dönüşümü)
}

async function robotsAllows(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`${u.origin}/robots.txt`, { signal: ctrl.signal, headers: { 'user-agent': UA } }); clearTimeout(t);
    if (!r.ok) return true;
    const txt = (await r.text()).slice(0, 100_000);
    let applies = false; const dis: string[] = []; const allow: string[] = [];
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.replace(/#.*/, '').trim(); if (!line) continue;
      const [k, ...rest] = line.split(':'); const v = rest.join(':').trim(); const key = k.trim().toLowerCase();
      if (key === 'user-agent') applies = v === '*' || /embay/i.test(v);
      else if (applies && key === 'disallow' && v) dis.push(v);
      else if (applies && key === 'allow' && v) allow.push(v);
    }
    const path = u.pathname + u.search;
    const longest = (arr: string[]) => arr.filter((p) => path.startsWith(p)).reduce((a, p) => Math.max(a, p.length), -1);
    return longest(allow) >= longest(dis);
  } catch { return true; }
}
const STEP_INTERVAL_MS = 55_000;
/** Uzun görevlerde adımlar seyrekleşir (ör. 60 dk → 3 dk'da bir): aynı süre, daha az AI kredisi. */
export const stepIntervalMs = (m: Pick<MissionRow, 'duration_minutes' | 'max_steps'>) =>
  Math.max(STEP_INTERVAL_MS, Math.floor((m.duration_minutes * 60_000) / Math.max(1, m.max_steps)) - 5_000);

/** Yanıt yarıda kesildiyse (uzun JSON) tamamlanmış bulgu nesnelerini tek tek kurtarır. */
export function salvageFindings(text: string): { new_findings: Record<string, unknown>[] } | null {
  const out: Record<string, unknown>[] = [];
  for (const mm of text.matchAll(/\{[^{}]*"url"\s*:\s*"[^"]+"[^{}]*\}/g)) { try { out.push(JSON.parse(mm[0])); } catch { /* yarım nesne */ } }
  return out.length ? { new_findings: out } : null;
}

/** instagram.com/<kullanıcı> veya facebook.com/<sayfa> profil linki mi? (gönderi, reel, hashtag, grup, arama sayfaları hariç) */
export function socialProfile(url: string): { platform: 'instagram' | 'facebook'; handle: string } | null {
  try {
    const u = new URL(url); const host = u.hostname.replace(/^(www\.|m\.|tr-tr\.|tr\.)/, '');
    const seg = u.pathname.split('/').filter(Boolean);
    if (!seg.length) return null;
    const bad = ['popular', 'p', 'reel', 'reels', 'explore', 'stories', 'tv', 'groups', 'events', 'hashtag', 'watch', 'search', 'share', 'photo', 'photos', 'videos', 'posts', 'people', 'pages', 'profile.php', 'marketplace', 'login'];
    if (bad.includes(seg[0].toLowerCase())) return null;
    if (host === 'instagram.com' && /^[A-Za-z0-9._]{2,30}$/.test(seg[0])) return { platform: 'instagram', handle: seg[0].toLowerCase() };
    if (host === 'facebook.com' && /^[A-Za-z0-9.\-]{2,60}$/.test(seg[0])) return { platform: 'facebook', handle: seg[0].toLowerCase() };
  } catch { /* */ }
  return null;
}

/** Kural tabanlı ön eleme (AI yokken): güçlü iş sinyali olan, rehber/liste/fiyat sayfası olmayan ve görev kelimesi geçen arama sonuçları. */
const POS = ['temeli atil', 'temel atma', 'insaati basla', 'insaatina basla', 'aranıyor', 'araniyor', 'ariyor', 'arıyor', 'kat karsilig', 'bosaltil', 'yikim', 'yikil', 'riskli yapi', 'ced ', 'ced olumlu', 'yapilacak', 'insa edilecek', 'talep', 'ihale', 'proje'];
const TARGET_REGION = ['istanbul', 'kocaeli', 'tekirdag', 'gebze', 'tuzla', 'pendik', 'kartal', 'esenyurt', 'basaksehir', 'arnavutkoy', 'silivri', 'catalca', 'buyukcekmece', 'beylikduzu', 'sancaktepe', 'cekmekoy', 'umraniye', 'atasehir', 'kadikoy', 'uskudar', 'beykoz', 'sile', 'sultanbeyli', 'eyup', 'kagithane', 'sariyer', 'bagcilar', 'kucukcekmece', 'esenler', 'gungoren', 'zeytinburnu', 'bahcelievler', 'avcilar', 'hadimkoy', 'corlu', 'cerkezkoy', 'izmit', 'darica', 'dilovasi', 'cayirova'];
const OTHER_CITIES = ['ankara', 'izmir', 'bursa', 'iznik', 'antalya', 'adana', 'konya', 'mersin', 'gaziantep', 'kayseri', 'samsun', 'trabzon', 'eskisehir', 'diyarbakir', 'sakarya', 'yalova', 'bolu', 'duzce', 'manisa', 'balikesir', 'canakkale', 'edirne', 'kirklareli', 'malatya', 'erzurum', 'van', 'hatay', 'denizli', 'aydin', 'mugla', 'afyon', 'sivas', 'tokat', 'ordu', 'rize', 'zonguldak', 'karabuk', 'kastamonu', 'corum', 'yozgat', 'nevsehir', 'aksaray', 'nigde', 'karaman', 'isparta', 'burdur', 'usak', 'kutahya', 'bilecik', 'elazig', 'batman', 'mardin', 'sanliurfa', 'adiyaman', 'kahramanmaras', 'osmaniye', 'kilis'];
const NEG = ['is ilanlari', 'ilanlari', 'hizmetleri', 'guclendirme hizmet', 'tadilat firmasi', 'tadilat hizmet', 'dekorasyon', 'en iyi', 'nasil', 'rehber', 'nedir', 'fiyat', 'firmasi', 'firmalari', 'sozluk', 'kac ', 'milyon kisi', 'soru', 'yorum', 'kampanya', 'indirim', 'satilik', 'kiralik daire'];
export function ruleFindings(results: WebResult[], m: Pick<MissionRow, 'search_for' | 'title'>): Array<Omit<Finding, 'at' | 'step'>> {
  const anchors = anchorWords(m);
  const out: Array<Omit<Finding, 'at' | 'step'>> = [];
  for (const r of results) {
    const prof = socialProfile(r.url);
    if (prof) { // sektör hesap keşfi: işletme profil sayfası (gönderi/hashtag/grup değil)
      out.push({ title: r.title.slice(0, 200), detail: (r.snippet || r.title).slice(0, 600), url: r.url, evidence: r.snippet?.slice(0, 300) || r.title,
        website: r.url, relevance: 6, fit: `Kural tabanlı ön eleme: ${prof.platform} işletme profili — denetimde doğrulanacak` });
      if (out.length >= 8) break;
      continue;
    }
    const t = norm(`${r.title} ${r.snippet}`); const ti = t.replace(/ı/g, 'i');
    const pos = POS.find((p) => ti.includes(p.replace(/ı/g, 'i')));
    if (!pos || NEG.some((n) => norm(r.title).replace(/ı/g, 'i').includes(n)) || (anchors.length && !anchors.some((a) => ti.includes(a.replace(/ı/g, 'i'))))) continue;
    // Bölge: hedef bölge dışındaki il geçiyor ve hedef bölge geçmiyorsa ele
    if (OTHER_CITIES.some((c) => ti.includes(c)) && !TARGET_REGION.some((c) => ti.includes(c))) continue;
    out.push({ title: r.title.slice(0, 200), detail: (r.snippet || r.title).slice(0, 600), url: r.url, evidence: r.snippet ? r.snippet.slice(0, 300) : r.title,
      posted: r.posted ?? undefined, relevance: 6, fit: `Kural tabanlı ön eleme: “${pos.trim()}” işareti var — denetimde doğrulanacak` });
    if (out.length >= 6) break;
  }
  return out;
}

// ── Haber/duyuru araması (herkese açık Google Haberler RSS) ───────────────────
// Ücretsiz AI modellerinde internet araması yok: her adımda bir arama terimi için son 7 günün haber/duyuru
// başlıkları (gerçek link + yayın tarihi + kaynak) çekilir ve AI'a yalnızca bunlardan seçmesi söylenir.
export interface NewsItem { title: string; url: string; posted: string | null; source: string | null }
export async function newsSearch(q: string, limit = 15, days = 7): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${days}d`)}&hl=tr&gl=TR&ceid=TR:tr`;
  const res = await fetch(url, { headers: { 'user-agent': 'EmbayOpsBot/1.0 (+https://embay-panel.vercel.app)' }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res?.ok) return [];
  const xml = await res.text();
  const tag = (block: string, t: string) => decode((block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').trim());
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit).map((mm) => {
    const b = mm[1];
    const pub = tag(b, 'pubDate');
    const d = pub ? new Date(pub) : null;
    return { title: tag(b, 'title'), url: tag(b, 'link'), source: tag(b, 'source') || null,
      posted: d && !isNaN(d.getTime()) ? new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium' }).format(d) : null };
  }).filter((n) => n.title && /^https?:\/\//.test(n.url));
}

// ── Sayfa çekme (gerçek HTTP) ───────────────────────────────────────────────
export interface PageFacts {
  ok: boolean; status: number; url: string; title: string | null; description: string | null; og: Record<string, string>;
  headings: string[]; text: string; links: Array<{ url: string; text: string }>; jsonld: string[]; error?: string;
}
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

export async function fetchPage(url: string): Promise<PageFacts> {
  const empty: PageFacts = { ok: false, status: 0, url, title: null, description: null, og: {}, headings: [], text: '', links: [], jsonld: [] };
  const blocked = noScrape(url);
  if (blocked) return { ...empty, error: `${blocked} otomatik sayfa okumayı kullanım koşullarında yasaklıyor / giriş istiyor — doğrudan okunmadı, yalnızca herkese açık arama sonuçları kullanılır` };
  if (!(await robotsAllows(url))) return { ...empty, error: 'robots.txt bu sayfanın botlarca okunmasına izin vermiyor — okunmadı' };
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA, 'accept-language': 'tr-TR,tr;q=0.9,en;q=0.7' } });
    clearTimeout(t);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) return { ...empty, status: res.status, url: res.url, error: `İçerik türü desteklenmiyor (${ct || 'bilinmiyor'})` };
    const html = (await res.text()).slice(0, 1_500_000);
    const meta = (name: string) => {
      const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i');
      const m = re.exec(html); return m ? decode((m[1] ?? m[2] ?? '').trim()) : null;
    };
    const og: Record<string, string> = {};
    for (const k of ['og:title', 'og:description', 'og:type', 'og:site_name', 'og:url', 'twitter:title', 'twitter:description', 'profile:username']) { const v = meta(k); if (v) og[k] = v; }
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
    const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())).filter(Boolean).slice(0, 25);
    const jsonld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim().slice(0, 1500)).slice(0, 4);
    const text = decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 12_000);
    const base = new URL(res.url);
    const links: Array<{ url: string; text: string }> = [];
    const seen = new Set<string>();
    for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      try {
        const u = new URL(decode(m[1]), base); if (!/^https?:$/.test(u.protocol)) continue;
        u.hash = ''; const key = u.toString(); if (seen.has(key)) continue; seen.add(key);
        links.push({ url: key, text: decode(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 120) });
      } catch { /* geçersiz link */ }
      if (links.length >= 80) break;
    }
    return { ok: res.ok, status: res.status, url: res.url, title: title ? decode(title.replace(/\s+/g, ' ').trim()) : null, description: meta('description'), og, headings, text, links, jsonld };
  } catch (e) {
    return { ...empty, error: String((e as Error).message || e) };
  }
}

const norm = (s: string) => s.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
export function searchTerms(searchFor: string | null): string[] {
  return (searchFor || '').split(/[,;\n]|\sve\s/).map((t) => t.trim()).filter((t) => t.length >= 2).slice(0, 12);
}
/** Metinde aranan terimleri geçen cümleleri bulur (AI'sız, deterministik). */
export function keywordSnippets(text: string, terms: string[], max = 6): Array<{ term: string; snippet: string }> {
  if (!terms.length || !text) return [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out: Array<{ term: string; snippet: string }> = [];
  for (const term of terms) {
    const nt = norm(term);
    const hit = sentences.find((s) => norm(s).includes(nt));
    if (hit) out.push({ term, snippet: hit.slice(0, 280) });
    if (out.length >= max) break;
  }
  return out;
}

/** Görevi durduran AI hataları: kredi bitti, anahtar geçersiz. Tekrar denemek anlamsız. */
export class AiFatalError extends Error {
  constructor(public kind: 'ai_credit' | 'ai_auth', message: string) { super(message); }
}
export const ERROR_KIND: Record<string, string> = {
  ai_credit: 'AI kredisi / bakiyesi bitti — sağlayıcı hesabına bakiye yüklenmeli',
  ai_auth: 'AI anahtarı geçersiz veya yetkisiz — anahtar yenilenmeli',
  budget: 'Harcama sınırı doldu — Ayarlar → Harcama sınırı',
  repeated_error: 'Üst üste 3 adım hata verdi',
  timeout: 'Adım zaman aşımına uğradı',
};

// ── AI sağlayıcı seçimi: botun ajanı → anahtar yoksa tanımlı başka sağlayıcı ──
interface AiChoice { provider: 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'github'; model: string; system: string; key: string }
async function chooseAi(db: Db, botId: string | null, preferred?: string | null): Promise<AiChoice | null> {
  let agent: { provider: string; model: string; system_prompt: string } | null = null;
  if (botId) {
    const { data } = await db.from('automation_bots').select('ai_agents(provider,model,system_prompt)').eq('id', botId).maybeSingle();
    // deno-lint-ignore no-explicit-any
    const a = (data as any)?.ai_agents; agent = Array.isArray(a) ? a[0] : a;
  }
  const base = agent?.system_prompt || 'Sen Embay Yapı ve Şahin Manitou Kiralama için çalışan titiz bir araştırma botusun. Türkçe yaz. Asla bilgi uydurma.';
  const ak = await getAiKey('anthropic');
  if (ak) return { provider: 'anthropic', model: preferred?.startsWith('claude-') ? preferred : agent?.provider === 'anthropic' ? agent.model : 'claude-sonnet-5', system: base, key: ak };
  const gk = await getAiKey('gemini');
  if (gk) return { provider: 'gemini', model: Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest', system: base, key: gk };
  const qk = await getAiKey('groq');
  if (qk) return { provider: 'groq', model: GROQ_RESEARCH_MODEL(), system: base, key: qk };
  for (const p of ['openrouter', 'github'] as const) { const k = await getAiKey(p); if (k) return { provider: p, model: COMPAT[p].agentModel, system: base, key: k }; }
  return null;
}

interface AiResult { text: string; sources: Source[]; tokensIn: number; tokensOut: number; searches: number; toolErrors?: string[]; model?: string; provider?: string }

async function anthropicResearch(key: string, model: string, system: string, prompt: string): Promise<AiResult> {
  if (!key) throw new ConfigurationRequiredError('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 100_000 });
  const tools = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 3, user_location: { type: 'approximate', country: 'TR', city: 'Istanbul', timezone: 'Europe/Istanbul' } },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 2, blocked_domains: NO_SCRAPE_HOSTS, max_content_tokens: 4000 },
  ];
  // deno-lint-ignore no-explicit-any
  const messages: any[] = [{ role: 'user', content: prompt }];
  const sources: Source[] = []; let text = ''; let tokensIn = 0; let tokensOut = 0; let searches = 0; const toolErrors: string[] = [];
  for (let i = 0; i < 3; i++) {
    // deno-lint-ignore no-explicit-any
    let res: any;
    try {
      res = await client.beta.messages.create({ model, max_tokens: 4000, system, tools, messages, output_config: { effort: 'medium' },
        ...(model.startsWith('claude-opus-5') ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}) } as any);
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiFatalError('ai_auth', `Anthropic anahtarı reddedildi (${e.status})`);
      // deno-lint-ignore no-explicit-any
      if (e instanceof Anthropic.APIError && (e.status === 402 || (e as any).type === 'billing_error' || (e.status === 400 && /credit balance/i.test(e.message))))
        throw new AiFatalError('ai_credit', 'Anthropic hesabında kredi/bakiye yetersiz');
      throw e;
    }
    tokensIn += res.usage?.input_tokens ?? 0; tokensOut += res.usage?.output_tokens ?? 0;
    searches += res.usage?.server_tool_use?.web_search_requests ?? 0;
    if (res.stop_reason === 'refusal') throw new Error('Model isteği güvenlik nedeniyle reddetti');
    for (const b of res.content || []) {
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const r of b.content) if (r.url) sources.push({ url: r.url, title: r.title });
      // Sunucu aracı hataları HTTP 200 içinde gelir (ör. too_many_requests, max_uses_exceeded) — kayda geçir
      if ((b.type === 'web_search_tool_result' || b.type === 'web_fetch_tool_result') && b.content && !Array.isArray(b.content) && b.content.error_code) toolErrors.push(`${b.type === 'web_search_tool_result' ? 'arama' : 'sayfa'}: ${b.content.error_code}`);
      if (b.type === 'web_fetch_tool_result' && b.content?.url) sources.push({ url: b.content.url, title: b.content?.content?.title });
      if (b.type === 'text') { text += b.text; for (const c of b.citations || []) if (c.url) sources.push({ url: c.url, title: c.title }); }
    }
    if (res.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: res.content });
  }
  return { text, sources, tokensIn, tokensOut, searches, toolErrors, model, provider: 'anthropic' };
}

/** Ücretsiz Gemini planında Google arama kotası 0 olabilir: bir kez 429 alınca 1 saat aramasız çalışılır (boşa istek atılmaz). */
let geminiSearchOffUntil = 0;
const GEMINI_LITE = 'gemini-flash-lite-latest';

async function geminiOnce(key: string, model: string, system: string, prompt: string, withSearch: boolean) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: withSearch ? system : `${system}\n\nNOT: Bu adımda internet araması kullanılamıyor. Yalnızca istemde verilen sayfa içeriği ve bilgilerle çalış; kaynak adresi istemde geçmeyen bulgu yazma.` }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }], ...(withSearch ? { tools: [{ google_search: {} }] } : {}), generationConfig: { maxOutputTokens: 8000 } }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data, detail: JSON.stringify(data).slice(0, 300) };
}

async function geminiResearch(key: string, model: string, system: string, prompt: string): Promise<AiResult> {
  if (!key) throw new ConfigurationRequiredError('GEMINI_API_KEY');
  let withSearch = Date.now() > geminiSearchOffUntil;
  let m = model;
  let r = await geminiOnce(key, m, system, prompt, withSearch);
  for (let i = 0; i < 3 && !r.res.ok; i++) {
    if (r.res.status === 503 && m !== GEMINI_LITE) { m = GEMINI_LITE; }                     // ana model yoğun → hafif model
    else if (r.res.status === 429 && withSearch) { withSearch = false; geminiSearchOffUntil = Date.now() + 3600_000; } // arama kotası yok → aramasız
    else break;
    r = await geminiOnce(key, m, system, prompt, withSearch);
  }
  const { res, data, detail } = r;
  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || /API_KEY_INVALID|API key not valid/i.test(detail)) {
      const why = /leaked/i.test(detail) ? 'anahtar sızdırılmış olarak işaretlenmiş — yeni anahtar alın'
        : /denied access/i.test(detail) ? 'Google bu anahtarın projesini engellemiş — farklı Gmail ile yeni anahtar alın'
        : /SERVICE_DISABLED|has not been used|is disabled/i.test(detail) ? 'projede Generative Language API kapalı'
        : /API_KEY_INVALID|not valid/i.test(detail) ? 'anahtar geçersiz' : /referer|referrer|ip address|restrict/i.test(detail) ? 'anahtara kısıtlama konmuş (web sitesi/IP)' : detail.slice(0, 120);
      throw new AiFatalError('ai_auth', `Gemini anahtarı reddedildi (${res.status}: ${why})`);
    }
    if (res.status === 429) throw new AiFatalError('ai_credit', 'Gemini ücretsiz günlük/dakikalık kotası doldu — biraz sonra tekrar dener');
    if (res.status === 503) throw new Error('Gemini şu an yoğun (503) — sonraki adımda tekrar denenecek');
    throw new Error(`Gemini ${res.status}: ${detail}`);
  }
  const cand = data.candidates?.[0];
  // deno-lint-ignore no-explicit-any
  const text = (cand?.content?.parts || []).map((p: any) => p.text || '').join('');
  // deno-lint-ignore no-explicit-any
  const sources: Source[] = (cand?.groundingMetadata?.groundingChunks || []).map((c: any) => ({ url: c.web?.uri, title: c.web?.title })).filter((s: Source) => s.url);
  return { text, sources, tokensIn: data.usageMetadata?.promptTokenCount ?? 0, tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
    searches: cand?.groundingMetadata?.webSearchQueries?.length ?? 0, model: m, provider: 'gemini', toolErrors: withSearch ? [] : ['arama: ücretsiz Gemini planında Google arama kotası yok — aramasız çalışıldı'] };
}

const GROQ_RESEARCH_MODEL = () => Deno.env.get('GROQ_MODEL') || 'groq/compound';

/** Groq (ücretsiz katman): compound modeli web aramasını kendi içinde yapar; kaynak adresleri çalıştırılan araç çıktılarından alınır. */
async function groqResearch(key: string, model: string, system: string, prompt: string): Promise<AiResult> {
  if (!key) throw new ConfigurationRequiredError('GROQ_API_KEY');
  const res = await fetch(GROQ_URL, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], max_completion_tokens: 3000 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = JSON.stringify(data).slice(0, 300);
    if (res.status === 401 || res.status === 403) throw new AiFatalError('ai_auth', `Groq anahtarı reddedildi (${res.status})`);
    if (res.status === 429) throw new AiFatalError('ai_credit', 'Groq ücretsiz kullanım sınırı doldu (rate_limit) — biraz sonra tekrar dener');
    throw new Error(`Groq ${res.status}: ${detail}`);
  }
  const msg = data.choices?.[0]?.message ?? {};
  const text = String(msg.content ?? '');
  // deno-lint-ignore no-explicit-any
  const tools: any[] = Array.isArray(msg.executed_tools) ? msg.executed_tools : [];
  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const u of JSON.stringify(tools).match(/https?:\/\/[^\s"'\\<>)]+/g) ?? []) { const c = u.replace(/[.,;]+$/, ''); if (!seen.has(c)) { seen.add(c); sources.push({ url: c }); } }
  return { text, sources: sources.slice(0, 40), tokensIn: data.usage?.prompt_tokens ?? 0, tokensOut: data.usage?.completion_tokens ?? 0,
    searches: tools.filter((t) => /search/i.test(String(t?.type ?? t?.name ?? ''))).length, model, provider: 'groq' };
}

/** OpenRouter / GitHub Models: web araması yoktur — yalnızca görevdeki hedef sayfa içeriği ve verilen bilgilerle çalışır. */
async function compatResearch(provider: 'openrouter' | 'github', key: string, model: string, system: string, prompt: string): Promise<AiResult> {
  const res = await fetch(COMPAT[provider].url, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, max_tokens: 3000, messages: [{ role: 'system', content: `${system}\n\nNOT: Bu modelin internette arama yetkisi yok. Yalnızca istemde verilen sayfa içeriği ve bilgilerle çalış; kaynak adresi istemde geçmeyen hiçbir bulgu yazma.` }, { role: 'user', content: prompt.length > 18000 ? `${prompt.slice(0, 4000)}\n…\n${prompt.slice(-14000)}` : prompt }] }),
  });
  const data = await res.json().catch(() => ({}));
  const label = provider === 'github' ? 'GitHub Models' : 'OpenRouter';
  if (!res.ok) {
    const detail = JSON.stringify(data).slice(0, 300);
    if (res.status === 401 || res.status === 403) throw new AiFatalError('ai_auth', `${label} anahtarı reddedildi (${res.status})`);
    if (res.status === 429 || res.status === 402) throw new AiFatalError('ai_credit', `${label} ücretsiz kullanım sınırı doldu — daha sonra tekrar dener`);
    throw new Error(`${label} ${res.status}: ${detail}`);
  }
  return { text: String(data.choices?.[0]?.message?.content ?? ''), sources: [], tokensIn: data.usage?.prompt_tokens ?? 0, tokensOut: data.usage?.completion_tokens ?? 0, searches: 0, model, provider };
}

const AI_LABEL: Record<string, string> = { anthropic: 'Claude', gemini: 'Gemini', groq: 'Groq', openrouter: 'OpenRouter', github: 'GitHub Models' };
function research(provider: string, key: string, model: string, system: string, prompt: string) {
  if (provider === 'anthropic') return anthropicResearch(key, model, system, prompt);
  if (provider === 'gemini') return geminiResearch(key, model, system, prompt);
  if (provider === 'openrouter' || provider === 'github') return compatResearch(provider, key, model, system, prompt);
  return groqResearch(key, model, system, prompt);
}
const defaultModel = (p: string) => (p === 'anthropic' ? 'claude-sonnet-5' : p === 'gemini' ? (Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest')
  : p === 'openrouter' || p === 'github' ? COMPAT[p].agentModel : GROQ_RESEARCH_MODEL());

/** Sırayla dener: seçilen sağlayıcı → diğerleri (Claude, Gemini, Groq). Kredi/anahtar/limit hatasında bir sonrakine geçer. */
async function aiCall(c: AiChoice, prompt: string, onFailover?: (msg: string) => Promise<void> | void): Promise<AiResult> {
  const chain = [c.provider, ...['anthropic', 'gemini', 'groq', 'openrouter', 'github'].filter((p) => p !== c.provider)];
  const errors: string[] = [];
  let firstErr: unknown = null; let lastErr: unknown = null; let prev: string = c.provider;
  for (const p of chain) {
    const key = p === c.provider ? c.key : await getAiKey(p as 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'github');
    if (!key) continue;
    if (p !== c.provider) {
      if (!isQuotaOrRateLimit(firstErr)) break; // ilk hata kredi/anahtar/limit değilse yedeğe geçme
      if (onFailover) await onFailover(`${AI_LABEL[prev]} kullanılamadı (${String((lastErr as Error)?.message || lastErr).slice(0, 80)}) — yedek ${AI_LABEL[p]} ile devam ediliyor.`);
    }
    try { return await research(p, key, p === c.provider ? c.model : defaultModel(p), c.system, prompt); }
    catch (e) { errors.push(`${AI_LABEL[p]}: ${String((e as Error).message || e).slice(0, 140)}`); firstErr ??= e; lastErr = e; prev = p; }
  }
  if (errors.length <= 1 && firstErr) throw firstErr;
  throw new AiFatalError(firstErr instanceof AiFatalError ? firstErr.kind : 'ai_credit', errors.join(' · '));
}

function isQuotaOrRateLimit(err: unknown): boolean {
  if (err instanceof AiFatalError && (err.kind === 'ai_credit' || err.kind === 'ai_auth')) return true;
  const s = String((err as Error)?.message || err);
  return /credit|balance|quota|rate_limit|too_many_requests|429|overloaded|billing/i.test(s);
}

// ── Yardımcılar ─────────────────────────────────────────────────────────────
async function logStep(db: Db, m: MissionRow, step: number, action: string, message: string, target?: string | null, data?: unknown, started?: number) {
  await db.from('bot_mission_steps').insert({ mission_id: m.id, step_no: step, action, target: target ?? null, message: message.slice(0, 2000), data: data ?? null,
    duration_ms: started ? Date.now() - started : null });
}
const canonical = (u: string) => { try { const x = new URL(u); x.hash = ''; return x.toString().replace(/\/$/, ''); } catch { return u; } };
function pageDigest(p: PageFacts) {
  return [
    `URL: ${p.url} (HTTP ${p.status}${p.error ? `, hata: ${p.error}` : ''})`,
    p.title ? `Başlık: ${p.title}` : '', p.description ? `Açıklama: ${p.description}` : '',
    Object.keys(p.og).length ? `Meta/OG: ${Object.entries(p.og).map(([k, v]) => `${k}=${v}`).join(' | ')}` : '',
    p.headings.length ? `Başlıklar: ${p.headings.slice(0, 12).join(' · ')}` : '',
    p.jsonld.length ? `Yapısal veri: ${p.jsonld.join(' ').slice(0, 1200)}` : '',
    p.text ? `Metin (ilk bölüm): ${p.text.slice(0, 3500)}` : '',
  ].filter(Boolean).join('\n');
}
interface SkillRow { id: string; display_name: string; instructions: string | null; enabled: boolean; lifecycle: string; search_terms: string[] | null; sources: string[] | null; good_examples: string | null; bad_examples: string | null; version: number }
const SKILL_COLS = 'id,display_name,instructions,enabled,lifecycle,search_terms,sources,good_examples,bad_examples,version';
/** Bot profili + kullanılacak yetenekler. Kural: görevlerde YALNIZCA Akademi'de onaylanmış (approved) yetenekler kullanılır;
 *  yetenek testi (purpose=skill_test) görevinde test edilen yetenek onaysız olabilir. */
async function botContext(db: Db, botId: string | null, m?: Pick<MissionRow, 'skill_ids' | 'purpose'>) {
  const isTest = m?.purpose === 'skill_test';
  let skills: SkillRow[] = [];
  let bot: { name?: string; instructions?: string; description?: string } | null = null;
  if (m?.skill_ids?.length) {
    const { data } = await db.from('automation_skills').select(SKILL_COLS).in('id', m.skill_ids);
    skills = (data || []) as SkillRow[];
  } else if (botId) {
    const { data } = await db.from('automation_bot_skills').select(`automation_skills(${SKILL_COLS})`).eq('bot_id', botId);
    // deno-lint-ignore no-explicit-any
    skills = (data || []).map((r: any) => (Array.isArray(r.automation_skills) ? r.automation_skills[0] : r.automation_skills)).filter(Boolean);
  }
  if (botId) ({ data: bot } = await db.from('automation_bots').select('name,instructions,description').eq('id', botId).maybeSingle());
  skills = skills.filter((s) => s.enabled && (isTest || s.lifecycle === 'approved'));
  const withText = skills.filter((s) => s.instructions);
  return {
    name: bot?.name ?? 'Bot',
    skills: skills.map((s) => ({ id: s.id, name: s.display_name, version: s.version })),
    terms: [...new Set(skills.flatMap((s) => s.search_terms || []))],
    sources: [...new Set(skills.flatMap((s) => s.sources || []))],
    text: [bot?.description, bot?.instructions ? `Bot talimatı: ${bot.instructions}` : '',
      ...withText.map((s) => [`Yetenek «${s.display_name}» (sürüm ${s.version}): ${s.instructions}`,
        s.good_examples ? `  ✔ İyi bulgu örnekleri: ${s.good_examples}` : '', s.bad_examples ? `  ✘ Elenecek örnekler: ${s.bad_examples}` : ''].filter(Boolean).join('\n'))].filter(Boolean).join('\n'),
  };
}

// ── Bir adım ────────────────────────────────────────────────────────────────
export async function stepMission(db: Db, m: MissionRow) {
  const now = Date.now();
  await loadAppSecrets(db); // panelden girilen anahtarlar (ör. TAVILY_API_KEY)
  if (m.status === 'finalizing') return await finalizeMission(db, m, m.finish_reason ?? 'deadline');
  if (now >= new Date(m.deadline_at).getTime()) return await finalizeMission(db, m, 'deadline');
  if (m.step_count >= m.max_steps) return await finalizeMission(db, m, 'max_steps');

  const step = m.step_count + 1;
  const findings: Finding[] = [...(m.findings || [])];
  const sources: Source[] = [...(m.sources || [])];
  const visited = new Set((m.visited || []).map(canonical));
  let tokensIn = m.tokens_in, tokensOut = m.tokens_out;
  let stopMet = false; let stopReason = '';
  const ctx = await botContext(db, m.bot_id, m);
  const terms = [...new Set([...searchTerms(m.search_for), ...ctx.terms])].slice(0, 20);
  let stepFailed = false;
  // Otomatik (zamanlanmış) görev: önceki günlerde raporlanan kayıtları tekrar raporlama
  const seenBefore = new Set<string>();
  if (m.schedule_id) {
    const { data: prev } = await db.from('bot_missions').select('findings').eq('schedule_id', m.schedule_id).neq('id', m.id)
      .gte('created_at', new Date(Date.now() - 45 * 86400_000).toISOString()).order('created_at', { ascending: false }).limit(30);
    for (const p of prev || []) for (const f of (p.findings || []) as Finding[]) if (f.url) seenBefore.add(canonical(f.url));
  }
  const addFinding = (f: Omit<Finding, 'at' | 'step'>) => {
    if (!f.url || !f.title) return false;
    if (seenBefore.has(canonical(f.url))) return false;
    if (findings.some((x) => canonical(x.url) === canonical(f.url) && x.title === f.title)) return false;
    findings.push({ ...f, at: new Date().toISOString(), step }); return true;
  };

  try {
    let pageNote = '';
    if (m.target_url && !visited.has(canonical(m.target_url))) {
      const t0 = Date.now();
      const p = await fetchPage(m.target_url);
      visited.add(canonical(m.target_url)); sources.push({ url: p.url || m.target_url, title: p.title ?? undefined });
      await logStep(db, m, step, 'fetch', p.ok ? `Hedef sayfa okundu: ${p.title || p.url} (HTTP ${p.status}, ${p.text.length} karakter metin, ${p.links.length} link)`
        : `Hedef sayfa doğrudan okunmadı: ${p.error ?? `HTTP ${p.status} (site bot erişimini engelliyor olabilir)`}`, m.target_url,
        { title: p.title, description: p.description, og: p.og, headings: p.headings.slice(0, 10), links: p.links.length }, t0);
      pageNote = pageDigest(p);
      for (const h of keywordSnippets(p.text, terms)) addFinding({ title: `“${h.term}” hedef sayfada geçiyor`, detail: h.snippet, url: p.url || m.target_url, evidence: h.snippet });
      if (p.og['og:description'] && !m.search_for) addFinding({ title: 'Sayfanın kendi tanımı (meta)', detail: p.og['og:description'], url: p.url || m.target_url, evidence: p.og['og:description'] });
    }

    // AI kredisi/anahtarı çalışmıyorsa ve hedef link varsa görev durmaz: AI'sız sayfa taramasıyla sürer
    const aiDown = Boolean(m.target_url && (m.error_kind === 'ai_credit' || m.error_kind === 'ai_auth'));
    // Harcama freni: günlük / aylık / görev başı sınır dolduysa yeni AI çağrısı yapılmaz
    const blocked = aiDown ? null : await budgetBlock(db, Number(m.cost_usd) || 0);
    if (blocked) {
      await logStep(db, m, step, 'error', `${blocked}. Yeni yapay zekâ çağrısı yapılmadı; görev elindeki bulgularla raporlanıyor.`);
      await db.from('bot_missions').update({ error_kind: 'budget', error: blocked }).eq('id', m.id);
      await persist();
      return await finalizeMission(db, { ...m, findings, sources, visited: [...visited], step_count: step, tokens_in: tokensIn, tokens_out: tokensOut, error_kind: 'budget' }, 'budget');
    }
    const ai = aiDown ? null : await chooseAi(db, m.bot_id, m.model);
    let useScan = !ai; let lastResults: WebResult[] = [];
    if (ai) try {
      const remainingMin = Math.max(0, Math.round((new Date(m.deadline_at).getTime() - Date.now()) / 60000));
      // Her adımda (AI hangisi olursa olsun; Claude kredisi yoksa zincir aramasız modellere düşer) bu adımın terimiyle gerçek haber/duyuru sonuçları
      let newsNote = ''; let stepResults: WebResult[] = [];
      if (!m.target_url && terms.length) {
        // Her adımda 2 konu. Önce gerçek web araması (Tavily, anahtar varsa), yoksa/boşsa Google Haberler yedeği.
        const qs = [terms[((step - 1) * 2) % terms.length], terms[((step - 1) * 2 + 1) % terms.length]].filter((x, i, a) => a.indexOf(x) === i);
        const results: WebResult[] = []; const counts: string[] = []; let engine = 'haber';
        for (const q of qs) {
          const qq = /stanbul|kocaeli|tekirda|türkiye/i.test(q) ? q : `${q} İstanbul`;
          let got: WebResult[] = [];
          const web = await tavilySearch(qq, { max: 8, domains: ctx.sources.length && step % 2 === 0 ? ctx.sources : undefined });
          if (web) { engine = 'web'; got = web; m.web_searches = (m.web_searches ?? 0) + 1; }
          if (!got.length) {
            let news = await newsSearch(qq, 12);
            if (news.length < 3) news = [...news, ...(await newsSearch(q, 12, 14))];
            got = news.map((n) => ({ title: n.title, url: n.url, snippet: '', posted: n.posted, source: n.source }));
          }
          let n = 0;
          for (const g of got) if (!results.some((x) => x.url === g.url || x.title === g.title)) { results.push(g); n++; }
          counts.push(`“${q}” → ${n}`);
        }
        results.splice(24); stepResults = results; lastResults = results;
        for (const n of results) if (!sources.some((x) => canonical(x.url) === canonical(n.url))) sources.push({ url: n.url, title: n.title });
        await logStep(db, m, step, 'news_search', `${engine === 'web' ? 'Web araması' : 'Haber/duyuru araması'}: ${counts.join(' · ')} sonuç`, null, { engine, queries: qs, count: results.length, titles: results.map((n) => n.title).slice(0, 24) });
        if (results.length) newsNote = results.map((n, i) => `${i + 1}. ${n.title}${n.source ? ` — ${n.source}` : ''}${n.posted ? ` (${n.posted})` : ''}${n.snippet ? `\n   Özet: ${n.snippet}` : ''}\n   ${n.url}`).join('\n');
      }
      const prompt = [
        `GÖREV: ${m.title}`, `AMAÇ / AÇIKLAMA: ${m.goal}`,
        m.target_url ? `HEDEF LİNK: ${m.target_url}` : '', m.search_for ? `ARANACAK: ${m.search_for}` : '',
        m.report_spec ? `RAPORDA OLMASI GEREKEN: ${m.report_spec}` : '', m.stop_condition ? `ERKEN BİTİŞ KOŞULU: ${m.stop_condition}` : '',
        ctx.text ? `BOT PROFİLİ VE YETENEKLERİ:\n${ctx.text}` : '',
        `Adım ${step} / en fazla ${m.max_steps}. Kalan süre ≈ ${remainingMin} dk.`,
        pageNote ? `HEDEF SAYFANIN GERÇEK İÇERİĞİ (sunucu tarafında çekildi):\n${pageNote}` : '',
        seenBefore.size ? `DAHA ÖNCEKİ GÜNLERDE RAPORLANMIŞ KAYITLAR (bunları tekrar verme, yalnızca YENİ olanları bul):\n${[...seenBefore].slice(0, 60).join('\n')}` : '',
        findings.length ? `ŞU ANA KADARKİ BULGULAR (tekrarlama):\n${findings.map((f) => `- ${f.title} (${f.url})`).join('\n').slice(0, 3000)}` : 'Henüz bulgu yok.',
        visited.size ? `İNCELENEN ADRESLER: ${[...visited].slice(-15).join(', ')}` : '',
        COMPLIANCE_RULES,
        RELEVANCE_RULES,
        newsNote ? 'BU ADIMIN İŞİ: İnternette arama yapmana GEREK YOK — arama sunucu tarafında yapıldı ve sonuçları aşağıda. Listedeki HER sonucu tek tek oku; başlığı görevin AMACINA uyan somut kayıtları (proje, ihale, ilan, talep, firma duyurusu), o sonucun linkini AYNEN kullanarak ayrı bulgu yap. Başlık + kaynak + tarih geçerli kanıttır (evidence = başlık). "veri yok" deme: listede uygun kayıt varsa mutlaka yaz; hiçbiri uymuyorsa boş liste döndür.' :
        'Bu adımda göreve en çok katkı verecek araştırmayı yap (en fazla 3 web araması ve 2 sayfa okuma hakkın var; aramaları AYNI ANDA değil TEK TEK yap — önce bir arama, sonucu değerlendir, sonra gerekirse bir sonrakini; bir araç hata verirse tekrar deneme, elindeki sonuçlarla devam et). Yalnızca gerçekten gördüğün, kaynağı olan bilgileri yaz; asla uydurma.',
        'ÖNEMLİ: Bir arama sonucunun başlığı ve özeti (snippet) geçerli bir kaynaktır. Arama sonuçlarında gördüğün her uygun ilan / duyuru / ihale / firma kaydını, o sonucun linkiyle birlikte bulgu olarak yaz; bilinmeyen alanları boş bırak. Yalnızca kategori/liste sayfası olan sonuçları (tek bir ilana değil) bulgu sayma. Bu adımda hiç uygun kayıt görmediysen boş liste döndür.',
        'Adım başına EN FAZLA 8 bulgu ver; detail en fazla 2 kısa cümle, evidence en fazla 1 cümle olsun (yanıt kesilmesin). Görev bir liste istiyorsa (ör. "en güncel 20 ilan"), her liste öğesini AYRI bir bulgu olarak ver: title = ilan/firma adı, detail = açıklama + (varsa) kurumsal iletişim + tarih, url = ilanın/sayfanın kendi linki. Daha önce verilmiş öğeleri tekrarlama.',
        newsNote ? `GÜNCEL ARAMA SONUÇLARI (son 7 gün; başlık — kaynak (tarih) + link):\n${newsNote}` : '',
        'Yanıtının SONUNDA tek bir JSON bloğu ver: {"new_findings":[{"title":"kısa başlık","detail":"açıklama","url":"kaynak URL","evidence":"kaynaktan kısa alıntı","company":"firma (varsa)","location":"il/ilçe (varsa)","posted":"ilan/yayın tarihi (varsa)","phone":"KURUMSAL telefon (varsa)","email":"kurumsal e-posta (varsa)","website":"firma web sitesi (varsa)","relevance":8,"fit":"görevle neden ilgili (tek cümle)"}],"stop_condition_met":false,"stop_reason":"","next_focus":"sonraki adımda neye bakılmalı"}',
      ].filter(Boolean).join('\n\n');
      const t0 = Date.now();
      const r = await aiCall(ai, prompt, async (msg) => { await logStep(db, m, step, 'ai_failover', msg); });
      tokensIn += r.tokensIn; tokensOut += r.tokensOut;
      const stepCost = await recordUsage(db, { source: 'mission', ref_id: m.id, provider: r.provider ?? ai.provider, model: r.model ?? ai.model, tokens_in: r.tokensIn, tokens_out: r.tokensOut, searches: r.searches });
      m.cost_usd = Math.round(((Number(m.cost_usd) || 0) + stepCost) * 10000) / 10000; m.web_searches = (m.web_searches ?? 0) + r.searches;
      await db.from('bot_missions').update({ cost_usd: m.cost_usd, web_searches: m.web_searches }).eq('id', m.id);
      for (const s of r.sources) if (!sources.some((x) => canonical(x.url) === canonical(s.url))) sources.push(s);
      const allowed = new Set([...sources.map((s) => canonical(s.url)), ...visited]);
      const j = (extractJson(r.text.slice(r.text.lastIndexOf('{"new_findings"') >= 0 ? r.text.lastIndexOf('{"new_findings"') : 0)) ?? extractJson(r.text) ?? salvageFindings(r.text)) as
        { new_findings?: Array<{ title?: string; detail?: string; url?: string; evidence?: string; company?: string; location?: string; posted?: string; phone?: string; email?: string; website?: string; relevance?: number | string; fit?: string }>; stop_condition_met?: boolean; stop_reason?: string; next_focus?: string } | null;
      let added = 0, dropped = 0, offTopic = 0;
      const anchors = anchorWords(m);
      for (const f of j?.new_findings ?? []) {
        if (!f.url || !allowed.has(canonical(f.url))) { dropped++; continue; }
        // Alaka kapısı: AI puanı ≥ 7 + gerekçe + görevin anahtar kelimelerinden en az biri metinde geçmeli
        const rel = Number(f.relevance);
        const text = norm(`${f.title ?? ''} ${f.detail ?? ''} ${f.evidence ?? ''} ${f.fit ?? ''}`);
        if (!(rel >= MIN_RELEVANCE) || !String(f.fit ?? '').trim() || (anchors.length && !anchors.some((a) => text.includes(a)))) { offTopic++; continue; }
        const opt = (v: unknown, n = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : undefined);
        if (addFinding({ title: String(f.title || '').slice(0, 200), detail: String(f.detail || '').slice(0, 1500), url: f.url, evidence: opt(f.evidence, 500),
          company: opt(f.company), location: opt(f.location), posted: opt(f.posted, 60), phone: opt(f.phone, 40), email: opt(f.email, 120), website: opt(f.website, 300),
          relevance: Math.min(10, Math.round(rel)), fit: opt(f.fit, 300) })) added++;
      }
      // AI cevap veremediyse (boş/okunamaz) veri akışı durmasın: kural tabanlı ön eleme, denetçi sonra doğrular
      let ruleAdded = 0;
      if ((!j || !r.text.trim()) && stepResults.length) { for (const f of ruleFindings(stepResults, m)) if (addFinding(f)) ruleAdded++; }
      if (ruleAdded) await logStep(db, m, step, 'rule_filter', `Yapay zekâ bu adımda sonuç okuyamadı → kural tabanlı ön eleme ${ruleAdded} aday buldu (denetimde doğrulanacak)`);
      stopMet = Boolean(m.stop_condition && j?.stop_condition_met); stopReason = j?.stop_reason || '';
      await logStep(db, m, step, 'ai_research', `${AI_LABEL[r.provider ?? ai.provider] ?? ai.provider} / ${r.model ?? ai.model}: ${r.searches} web araması, ${r.sources.length} kaynak · ${added} yeni bulgu${dropped ? ` · ${dropped} kaynaksız bulgu atıldı` : ''}${offTopic ? ` · ${offTopic} alakasız kayıt elendi` : ''}${j?.next_focus ? ` · sonraki odak: ${j.next_focus}` : ''}`,
        null, { searches: r.searches, sources: r.sources.slice(0, 20), stop_condition_met: stopMet, stop_reason: stopReason, parsed: Boolean(j), tool_errors: r.toolErrors ?? [], text_tail: r.text.slice(-1500) }, t0);
      await db.from('bot_missions').update({ provider: r.provider ?? ai.provider, model: r.model ?? ai.model }).eq('id', m.id);
    } catch (e) {
      if (e instanceof AiFatalError && !m.target_url && lastResults.length) {
        let n = 0; for (const f of ruleFindings(lastResults, m)) if (addFinding(f)) n++;
        await logStep(db, m, step, 'rule_filter', `Yapay zekâ kullanılamadı (${String(e.message).slice(0, 120)}) → kural tabanlı ön eleme ${n} aday buldu (denetimde doğrulanacak)`);
        await persist();
        return { mission_id: m.id, step, findings: findings.length };
      }
      if (!(e instanceof AiFatalError) || !m.target_url) throw e;
      m.error_kind = e.kind;
      await db.from('bot_missions').update({ error_kind: e.kind, error: String(e.message).slice(0, 500) }).eq('id', m.id);
      await logStep(db, m, step, 'ai_failover', `Yapay zekâ kullanılamıyor (${String(e.message).slice(0, 160)}) → görev AI'sız sayfa taramasıyla sürüyor.`);
      useScan = true;
    }
    if (useScan) {
      const t0 = Date.now();
      let nextUrl: string | null = null;
      if (m.target_url) {
        const root = await fetchPage(m.target_url);
        const host = (() => { try { return new URL(root.url || m.target_url!).host; } catch { return ''; } })();
        const cands = root.links.filter((l) => { try { return new URL(l.url).host === host && !visited.has(canonical(l.url)); } catch { return false; } });
        nextUrl = (cands.find((l) => terms.some((t) => norm(l.text + ' ' + l.url).includes(norm(t)))) ?? cands[0])?.url ?? null;
      }
      if (nextUrl) {
        const p = await fetchPage(nextUrl); visited.add(canonical(nextUrl)); sources.push({ url: p.url || nextUrl, title: p.title ?? undefined });
        let added = 0;
        for (const h of keywordSnippets(p.text, terms)) if (addFinding({ title: `“${h.term}” — ${p.title || 'sayfa'}`, detail: h.snippet, url: p.url || nextUrl, evidence: h.snippet })) added++;
        await logStep(db, m, step, 'fetch', `AI'sız sayfa taraması: ${p.title || nextUrl} (HTTP ${p.status}) · ${added} eşleşme`, nextUrl, null, t0);
      } else {
        await logStep(db, m, step, 'analyze', 'Taranacak yeni sayfa kalmadı. Web araması için çalışan bir AI anahtarı/bakiyesi gerekir (Ayarlar → AI anahtarı).', null, null, t0);
        if (!m.target_url || step > 1) { await persist(); return await finalizeMission(db, { ...m, findings, sources, visited: [...visited], step_count: step, tokens_in: tokensIn, tokens_out: tokensOut }, 'no_ai'); }
      }
    }
  } catch (e) {
    const msg = String((e as Error).message || e);
    stepFailed = true;
    await logStep(db, m, step, 'error', `Adım hatası: ${msg.slice(0, 500)}`);
    if (e instanceof ConfigurationRequiredError) { await persist(); return await finalizeMission(db, { ...m, findings, sources, step_count: step }, 'no_ai'); }
    const errors = (m.error_count ?? 0) + 1;
    const kind = e instanceof AiFatalError ? e.kind : errors >= 3 ? 'repeated_error' : null;
    await db.from('bot_missions').update({ error_count: errors, error: msg.slice(0, 500), ...(kind ? { error_kind: kind } : {}) }).eq('id', m.id);
    if (kind) { await persist(); return await finalizeMission(db, { ...m, findings, sources, step_count: step, error_count: errors, error_kind: kind }, 'error'); }
  }

  async function persist() {
    await db.from('bot_missions').update({ step_count: step, findings, sources: sources.slice(0, 200), visited: [...visited].slice(0, 200), tokens_in: tokensIn, tokens_out: tokensOut, ...(stepFailed ? {} : { error_count: 0 }),
      next_step_at: new Date(Date.now() + stepIntervalMs(m)).toISOString(), locked_until: null }).eq('id', m.id);
  }
  await persist();
  const next: MissionRow = { ...m, step_count: step, findings, sources, visited: [...visited], tokens_in: tokensIn, tokens_out: tokensOut };
  if (stopMet) { await logStep(db, m, step, 'stop', `Bitiş koşulu sağlandı: ${stopReason || m.stop_condition}`); return await finalizeMission(db, next, 'stop_condition'); }
  if (Date.now() + stepIntervalMs(m) / 2 >= new Date(m.deadline_at).getTime()) return await finalizeMission(db, next, 'deadline');
  if (step >= m.max_steps) return await finalizeMission(db, next, 'max_steps');
  return { mission_id: m.id, step, findings: findings.length };
}

// ── Rapor ───────────────────────────────────────────────────────────────────
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeHref = (u: string) => (/^https?:\/\//i.test(u) ? esc(u) : '#');
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#16a34a"/><stop offset="1" stop-color="#0f766e"/></linearGradient></defs><rect width="128" height="128" rx="30" fill="url(#g)"/><path d="M28 32h54v13H43v14h32v12H43v13h39v13H28z" fill="white"/><path d="M83 28l18 18-8 8-18-18zM86 65l20 20-9 9-20-20z" fill="#dcfce7"/><circle cx="98" cy="31" r="9" fill="#f0fdf4"/><path d="M94 31h8M98 27v8" stroke="#15803d" stroke-width="3" stroke-linecap="round"/></svg>`;
const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;
/** Yapılandırılmış alanları (firma, konum, tarih, kurumsal iletişim) rapor satırına çevirir. */
function factsHtml(f: Finding) {
  const parts = [f.fit && `<span>🎯 ${esc(f.fit)}</span>`, f.company && `<span>🏢 ${esc(f.company)}</span>`, f.location && `<span>📍 ${esc(f.location)}</span>`, f.posted && `<span>🗓 ${esc(f.posted)}</span>`,
    f.phone && `<a href="${telHref(f.phone)}">📞 ${esc(f.phone)}</a>`, f.email && `<a href="mailto:${esc(f.email)}">✉️ ${esc(f.email)}</a>`, f.website && `<a href="${safeHref(f.website)}" target="_blank" rel="noopener">🌐 web</a>`].filter(Boolean);
  return parts.length ? `<div class="facts">${parts.join('')}</div>` : '';
}
const REASON: Record<string, string> = { deadline: 'Süre doldu', stop_condition: 'Bitiş koşulu sağlandı', admin_stop: 'Yönetici durdurdu', max_steps: 'Adım sınırına ulaşıldı', error: 'Hata', no_ai: 'AI kullanılamadı — yalnızca sayfa taraması yapıldı', budget: 'Harcama sınırı doldu' };
const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—');

export async function finalizeMission(db: Db, m: MissionRow, reason: string) {
  const { data: fresh } = await db.from('bot_missions').select('*').eq('id', m.id).maybeSingle();
  const cur = (fresh ?? m) as MissionRow;
  if (['completed', 'stopped', 'failed'].includes(cur.status)) return { mission_id: m.id, already: cur.status };
  const allFindings = cur.findings || []; const sources = cur.sources || [];
  const [{ data: steps }, ctx] = await Promise.all([
    db.from('bot_mission_steps').select('step_no,action,target,message,created_at').eq('mission_id', m.id).order('step_no').order('created_at'),
    botContext(db, cur.bot_id, cur),
  ]);

  let summary = '';
  let tokensIn = cur.tokens_in, tokensOut = cur.tokens_out;
  const ai = reason === 'error' || reason === 'budget' || cur.error_kind === 'ai_credit' || cur.error_kind === 'ai_auth' || (await budgetBlock(db)) ? null : await chooseAi(db, cur.bot_id, cur.model);
  // DENETİM: her bulgu kaynağında kontrol edilir; "elendi" olanlar rapora girmez (denetim kaydında gerekçesiyle durur)
  const audit = allFindings.length ? await auditFindings(db, cur, ai, allFindings, sources) : null;
  const findings = allFindings.filter((f) => f.verdict !== 'rejected');
  if (ai && findings.length) {
    try {
      const r = await aiCall(ai, [
        `Aşağıdaki bot görevinin sonuç raporunu Türkçe yaz. YALNIZCA verilen bulguları kullan, yeni bilgi ekleme, web araması yapma.`,
        `Görev: ${cur.title}\nAmaç: ${cur.goal}${cur.search_for ? `\nAranan: ${cur.search_for}` : ''}${cur.report_spec ? `\nRaporda olması gereken: ${cur.report_spec}` : ''}`,
        `Bulgular:\n${findings.map((f, i) => `${i + 1}. ${f.title} — ${f.detail}${f.fit ? ` [neden uygun: ${f.fit}]` : ''} (${f.url})`).join('\n').slice(0, 8000)}`,
        'Biçim: 1) 3-6 cümlelik yönetici özeti 2) madde madde sonuçlar 3) önerilen sonraki adım. Markdown başlık kullanma; düz paragraflar ve "- " maddeleri kullan.',
      ].join('\n\n'), async (msg) => { await logStep(db, cur, cur.step_count + 1, 'ai_failover', msg); });
      summary = r.text.trim(); tokensIn += r.tokensIn; tokensOut += r.tokensOut;
      const c = await recordUsage(db, { source: 'mission', ref_id: cur.id, provider: r.provider ?? ai.provider, model: r.model ?? ai.model, tokens_in: r.tokensIn, tokens_out: r.tokensOut, searches: r.searches });
      await db.from('bot_missions').update({ cost_usd: Math.round(((Number(cur.cost_usd) || 0) + c) * 10000) / 10000 }).eq('id', cur.id);
    } catch (e) { summary = ''; await logStep(db, cur, cur.step_count + 1, 'error', `Özet yazılamadı: ${String((e as Error).message).slice(0, 300)}`); }
  }
  if (!summary && reason === 'error') {
    summary = `Görev hata ile bitti: ${ERROR_KIND[cur.error_kind ?? ''] ?? 'bilinmeyen hata'}.${findings.length ? ` Hata öncesi ${findings.length} kaynaklı bulgu toplanmıştı.` : ''}`;
  }
  if (!summary) {
    summary = findings.length
      ? `${findings.length} kaynaklı bulgu toplandı. ${findings.slice(0, 5).map((f) => `- ${f.title}`).join('\n')}`
      : `Veri bulunamadı. ${cur.step_count} adımda ${sources.length} kaynak incelendi; görevin aradığı bilgiye dair doğrulanabilir bir bulgu çıkmadı.`;
  }

  // KOÇ: raporu ve günlüğü inceleyip yeteneği iyileştirme önerisi çıkarır (Akademi'de onayınıza düşer)
  const coachNote = ai && reason !== 'admin_stop' ? await coachMission(db, cur, ai, ctx, audit, (steps || []) as Array<{ action: string; message: string }>) : null;
  if (cur.purpose === 'skill_test' && cur.skill_ids?.length) {
    const { data: sk } = await db.from('automation_skills').select('lifecycle').eq('id', cur.skill_ids[0]).maybeSingle();
    await db.from('automation_skills').update({ test_score: audit ? audit.accuracy : 0, test_findings: audit?.verified ?? 0, last_tested_at: new Date().toISOString(),
      last_test_mission_id: cur.id, ...(sk?.lifecycle === 'draft' ? { lifecycle: 'testing' } : {}) }).eq('id', cur.skill_ids[0]);
  }

  const status = reason === 'admin_stop' ? 'stopped' : reason === 'error' ? 'failed' : 'completed';
  const finishedAt = new Date().toISOString();
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(cur.title)} — Bot Raporu</title>
<style>body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0e1e16;background:#f3f9f5;margin:0;padding:24px}main{max-width:860px;margin:0 auto;background:#fff;border:1px solid #d2e7da;border-radius:18px;padding:28px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px;color:#115a31;border-bottom:1px solid #e1f3e7;padding-bottom:4px}.k{color:#5a7266;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:13px}td{padding:4px 6px;border-bottom:1px solid #eef7f1;vertical-align:top}td:first-child{color:#5a7266;width:170px}
.f{border:1px solid #e1f3e7;border-radius:12px;padding:10px 12px;margin:8px 0}.f b{display:block}.f q{display:block;color:#3e5549;font-size:12px;margin-top:4px;font-style:italic}
a{color:#16a34a;word-break:break-all}.sum{white-space:pre-wrap;font-size:14px;line-height:1.6}.log{font-family:ui-monospace,monospace;font-size:11px;color:#3e5549}.badge{display:inline-block;background:#e1f3e7;color:#115a31;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #16a34a}.brand svg{width:44px;height:44px}.brand b{font-size:15px;display:block}.brand small{color:#5a7266;font-size:11px}
.facts{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:6px;font-size:12px}.v{display:inline-block;border-radius:999px;padding:1px 8px;font-size:10px;font-weight:700;margin-left:6px}.v-verified{background:#dcfce7;color:#166534}.v-suspicious{background:#fef3c7;color:#92400e}.v-rejected{background:#fee2e2;color:#991b1b}.sum2{background:#f3f9f5;border-left:3px solid #16a34a;border-radius:8px;padding:6px 10px;margin:6px 0;font-size:13px;line-height:1.5}.audit{display:flex;gap:10px;flex-wrap:wrap;font-size:13px}.audit div{background:#f3f9f5;border-radius:10px;padding:6px 10px}.facts span,.facts a{background:#f3f9f5;border-radius:8px;padding:2px 8px;text-decoration:none}
@media print{body{background:#fff;padding:0}main{border:0}}</style></head>
<body><main><div class="brand">${LOGO_SVG}<div><b>Embay Yapı & Şahin Manitou</b><small>Bot görev raporu · 0531 436 29 04 · sahin-manitou-kiralama.vercel.app</small></div></div><h1>${esc(cur.title)}</h1><span class="badge">${esc(REASON[reason] ?? reason)}${reason === 'error' && cur.error_kind ? ` — ${esc(ERROR_KIND[cur.error_kind] ?? cur.error_kind)}` : ''}</span>
<h2>Görev</h2><table><tr><td>Bot</td><td>${esc(ctx.name)}</td></tr><tr><td>Amaç</td><td>${esc(cur.goal)}</td></tr>
${cur.target_url ? `<tr><td>Hedef link</td><td><a href="${safeHref(cur.target_url)}">${esc(cur.target_url)}</a></td></tr>` : ''}
${cur.search_for ? `<tr><td>Aranan</td><td>${esc(cur.search_for)}</td></tr>` : ''}${cur.report_spec ? `<tr><td>Raporda istenen</td><td>${esc(cur.report_spec)}</td></tr>` : ''}
${cur.stop_condition ? `<tr><td>Bitiş koşulu</td><td>${esc(cur.stop_condition)}</td></tr>` : ''}
<tr><td>Başlangıç / bitiş</td><td>${esc(fmt(cur.started_at))} → ${esc(fmt(finishedAt))} (${cur.duration_minutes} dk süre tanımlı)</td></tr>
<tr><td>Adım · kaynak · bulgu</td><td>${cur.step_count} · ${sources.length} · ${findings.length}</td></tr>${cur.provider ? `<tr><td>AI</td><td>${esc(cur.provider)} / ${esc(cur.model)}</td></tr>` : ''}</table>
${audit ? `<h2>Denetim (doğruluk kontrolü)</h2><div class="audit"><div>Doğruluk: <b>%${audit.accuracy}</b></div><div>✅ Doğrulandı: <b>${audit.verified}</b></div><div>⚠️ Şüpheli: <b>${audit.suspicious}</b></div><div>❌ Elendi: <b>${audit.rejected}</b></div></div>${audit.rejected_items?.length ? `<ul class="k">${audit.rejected_items.map((r) => `<li>Elendi: ${esc(r.title)} — ${esc(r.reason)}</li>`).join('')}</ul>` : ''}` : ''}
${coachNote ? `<h2>Koç notu (botun eksikleri)</h2><div class="sum">${esc(coachNote)}</div>` : ''}
<h2>Özet</h2><div class="sum">${esc(summary)}</div>
<h2>Bulgular (${findings.length})</h2>${findings.length ? findings.map((f, i) => `<div class="f"><b>${i + 1}. ${esc(f.title)}${f.verdict ? `<span class="v v-${f.verdict}">${VERDICT[f.verdict]}</span>` : ''}</b>${f.summary ? `<div class="sum2">📝 ${esc(f.summary)}</div>` : ''}${f.verdict_reason ? `<div class="k">Denetim: ${esc(f.verdict_reason)}</div>` : ''}${esc(f.detail)}${factsHtml(f)}${f.evidence ? `<q>“${esc(f.evidence)}”</q>` : ''}<div class="k">Kaynak: <a href="${safeHref(f.url)}" target="_blank" rel="noopener">${esc(f.url)}</a> · adım ${f.step}</div></div>`).join('') : '<p>Veri bulunamadı.</p>'}
<h2>İncelenen kaynaklar (${sources.length})</h2><ul>${sources.slice(0, 60).map((s) => `<li><a href="${safeHref(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a></li>`).join('')}</ul>
<h2>Adım günlüğü</h2><div class="log">${(steps || []).map((s) => `<div>#${s.step_no} [${esc(s.action)}] ${esc(s.message)}</div>`).join('')}</div>
<p class="k" style="margin-top:24px">Bu rapor gerçek HTTP istekleri ve AI araştırma çağrılarından üretilmiştir; kaynağı doğrulanamayan bilgiler rapora alınmaz. Veriler yalnızca herkese açık kurumsal kaynaklardan, KVKK ve site kullanım koşullarına uygun toplanır.</p></main></body></html>`;

  await db.from('bot_missions').update({ status, finish_reason: reason, finished_at: finishedAt, summary, report_html: html, tokens_in: tokensIn, tokens_out: tokensOut, locked_until: null,
    ...(audit ? { audit, findings: allFindings } : {}), ...(coachNote ? { coach_note: coachNote } : {}) }).eq('id', m.id);
  await logStep(db, cur, cur.step_count + 1, 'finalize', `Rapor hazırlandı · ${REASON[reason] ?? reason} · ${findings.length} bulgu${audit ? ` · denetim: %${audit.accuracy} doğruluk (✅${audit.verified} ⚠️${audit.suspicious} ❌${audit.rejected})` : ''}`);
  await saveSocialProspects(db, cur, findings);
  await sendMissionTelegram(db, cur, reason, summary, findings, audit);
  return { mission_id: m.id, finalized: true, reason, findings: findings.length };
}

/** Görev bitince özet + bulgular Telegram'a (yönetici). Telegram tanımlı değilse sessizce atlanır; hata görevi bozmaz, günlüğe yazılır. */
async function sendMissionTelegram(db: Db, cur: MissionRow, reason: string, summary: string, findings: Finding[], audit: MissionAudit | null = null) {
  try {
    await loadAppSecrets(db);
    if (!appSecret('TELEGRAM_BOT_TOKEN') || !appSecret('TELEGRAM_CHAT_ID')) return;
    const list = findings.slice(0, 10).map((f, i) => {
      const facts = [f.company && `🏢 ${f.company}`, f.location && `📍 ${f.location}`, f.posted && `🗓 ${f.posted}`, f.phone && `📞 ${f.phone}`].filter(Boolean).join(' · ');
      return `${i + 1}. ${f.verdict === 'verified' ? '✅ ' : f.verdict === 'suspicious' ? '⚠️ ' : ''}${f.title}${f.summary ? `\n   📝 ${f.summary.slice(0, 260)}` : ''}${f.fit ? `\n   🎯 ${f.fit}` : ''}${facts ? `\n   ${facts}` : ''}\n   ${f.url}`;
    }).join('\n\n');
    const text = [`📋 ${cur.title}`, `Durum: ${REASON[reason] ?? reason} · ${findings.length} bulgu`,
      audit ? `Denetim: %${audit.accuracy} doğruluk · ✅${audit.verified} doğrulandı · ⚠️${audit.suspicious} şüpheli · ❌${audit.rejected} elendi` : '', '', summary.slice(0, 1400),
      findings.length ? `\n— Bulgular —\n${list}` : '', findings.length > 10 ? `\n(+${findings.length - 10} bulgu daha panelde)` : '',
      '\nTam rapor: https://embay-panel.vercel.app → Botlar → Görevler'].join('\n');
    const t = await telegramSend(text);
    await logActivity(db, { connector_key: 'telegram', action: 'message_send', status: 'ok', bot_id: cur.bot_id, ref_type: 'bot_mission', ref_id: cur.id, external_id: t.messageId, summary: `Görev raporu gönderildi: ${cur.title}` });
  } catch (e) {
    await logActivity(db, { connector_key: 'telegram', action: 'message_send', status: 'failed', bot_id: cur.bot_id, ref_type: 'bot_mission', ref_id: cur.id, error: String((e as Error).message), summary: `Görev raporu gönderilemedi: ${cur.title}` });
  }
}

/** Bulgulardaki işletme profil linklerini (Instagram/Facebook) takip listesine (social_prospects) ekler. Kişi verisi yok; yalnızca herkese açık işletme profili. */
async function saveSocialProspects(db: Db, cur: MissionRow, findings: Finding[]) {
  if (!cur.created_by) return;
  const rows = findings.map((f) => ({ f, p: socialProfile(f.url) || (f.website ? socialProfile(f.website) : null) })).filter((x) => x.p);
  // Yalnızca işletme/kurum hesabı: başlık veya kullanıcı adında işletme işareti olmalı; kişi profili (ad.soyad, telefonlu), okul/resmi kurum elenir (KVKK)
  const BIZ = /insaat|yapi|yapı|mimar|muhendis|mühendis|makine|makina|kiralama|manitou|forklift|vinc|vinç|hafriyat|beton|demir|celik|çelik|iskele|prefabrik|group|grup|ltd|a\.s|a\.ş|san\.|tic\.|kentsel|donusum|dönüşüm|emlak|gayrimenkul|tadilat|cati|çatı|dekorasyon|haber|burada|medya|dergi|construction|build/i;
  const NOT_BIZ = /lisesi|okulu|universitesi|üniversitesi|kaymakaml|valilig|muhtarl|cami/i;
  let n = 0;
  for (const { f, p } of rows) {
    const label = `${f.title} ${p!.handle}`;
    if (!BIZ.test(label) || NOT_BIZ.test(label) || /\d{7,}/.test(p!.handle)) continue;
    const t = norm(`${f.title} ${f.detail} ${f.fit ?? ''}`);
    const kind = /tedarik|malzeme|beton|demir|iskele|bayi|uretic/.test(t) ? 'supplier' : /haber|medya|dergi|gazete/.test(t) ? 'industry_media' : /catalca|silivri|yerel|belediye/.test(t) ? 'local_business' : 'competitor';
    const { error } = await db.from('social_prospects').upsert({ platform: p!.platform, handle: p!.handle, profile_name: f.company || f.title.slice(0, 120), profile_url: `https://www.${p!.platform}.com/${p!.handle}`,
      source_url: f.url, source_type: 'bot_mission', engagement_type: 'business_profile', relevance_score: Math.min(100, (f.relevance ?? 6) * 10), consent_status: 'not_required_public_note',
      notes: (f.fit || f.detail || '').slice(0, 500), account_kind: kind, bot_mission_id: cur.id, owner_id: cur.created_by }, { onConflict: 'platform,handle', ignoreDuplicates: true });
    if (!error) n++; else console.error('prospect', error.message);
  }
  if (n) await logStep(db, cur, cur.step_count + 1, 'prospects', `${n} işletme hesabı takip listesine eklendi (Raporlar → Takip listesi)`);
}

const VERDICT: Record<string, string> = { verified: '✅ Doğrulandı', suspicious: '⚠️ Şüpheli', rejected: '❌ Elendi' };

/** DENETİM: her bulgunun kaynağı açılır, içerik bulguyla karşılaştırılır; ardından ayrı bir AI "hakem" gerçeklik + güncellik + amaca uygunluk kararı verir.
 *  verified = kaynak bulguyu doğruluyor, somut ve güncel · suspicious = gerçek ama belirsiz/eski/dolaylı · rejected = uydurma, kaynakla çelişen veya amaç dışı. */
async function auditFindings(db: Db, cur: MissionRow, ai: AiChoice | null, findings: Finding[], sources: Source[]): Promise<MissionAudit> {
  const srcTitle = new Map(sources.map((s) => [canonical(s.url), s.title || '']));
  const checks = await Promise.all(findings.slice(0, 20).map(async (f) => {
    const inSources = srcTitle.has(canonical(f.url));
    let host = ''; try { host = new URL(f.url).hostname; } catch { /* */ }
    if (/news\.google\.com$/.test(host)) return { f, reachable: inSources, excerpt: `Haber başlığı (Google Haberler akışından): ${srcTitle.get(canonical(f.url)) || f.title}`, match: inSources, desc: '' };
    const p = await fetchPage(f.url).catch(() => null);
    const text = p?.text || '';
    const words = norm(f.title).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 5).slice(0, 8);
    const hits = words.filter((w) => norm(text).includes(w.slice(0, Math.max(5, w.length - 2)))).length;
    const idx = words.length ? norm(text).indexOf(words[0].slice(0, 5)) : -1;
    const excerpt = text ? text.slice(Math.max(0, idx - 200), Math.max(0, idx - 200) + 900) : (p?.error ?? `HTTP ${p?.status ?? '?'}`);
    return { f, reachable: Boolean(p?.ok), excerpt, match: hits >= Math.min(2, words.length), desc: String(p?.description || p?.og?.['og:description'] || '').trim() };
  }));
  const verdicts = new Map<number, { v: Finding['verdict']; r: string }>();
  if (ai && checks.length) {
    try {
      const r = await aiCall(ai, [
        'Sen bir DENETÇİSİN. Bir botun topladığı bulguları kaynaklarıyla karşılaştırıp gerçek ve kullanılabilir olup olmadığına karar ver. Kendi bilginle bulgu uydurma veya düzeltme.',
        `GÖREVİN AMACI: ${cur.goal}`,
        'Karar ölçütleri: "verified" = kaynak metni bulguyu açıkça doğruluyor, somut (belirli proje/talep/ihale/firma) ve güncel; "suspicious" = gerçek görünüyor ama kaynak zayıf, eski, dolaylı veya sayfa okunamadı; "rejected" = kaynakla çelişiyor, uydurma, genel haber/reklam ya da görevin amacına uymuyor.',
        checks.map((c, i) => `#${i} BAŞLIK: ${c.f.title}\nDETAY: ${c.f.detail}\nNEDEN UYGUN (bot): ${c.f.fit ?? '-'}\nLINK: ${c.f.url}\nSAYFA AÇILDI: ${c.reachable ? 'evet' : 'hayır'} · BAŞLIK SAYFADA GEÇİYOR: ${c.match ? 'evet' : 'hayır'}\nKAYNAKTAN KESİT: ${c.excerpt.slice(0, 700)}`).join('\n\n'),
        'Her bulgu için ayrıca kaynağa dayanan 2-3 cümlelik TÜRKÇE ÖZET yaz: ne, kim, nerede, ne zaman, büyüklük; ve bizim için ne anlama geldiği. Kaynakta olmayan bilgi ekleme.',
        'YALNIZCA şu JSON\'u döndür: {"items":[{"i":0,"verdict":"verified|suspicious|rejected","reason":"tek kısa cümle","summary":"2-3 cümle özet"}]}',
      ].join('\n\n'));
      const j = extractJson(r.text) as { items?: Array<{ i: number; verdict: string; reason?: string; summary?: string }> } | null;
      for (const it of j?.items ?? []) {
        if (['verified', 'suspicious', 'rejected'].includes(it.verdict)) verdicts.set(Number(it.i), { v: it.verdict as Finding['verdict'], r: String(it.reason || '').slice(0, 240) });
        const c = checks[Number(it.i)]; if (c && it.summary && String(it.summary).trim().length > 20) c.f.summary = String(it.summary).trim().slice(0, 700);
      }
      await recordUsage(db, { source: 'mission', ref_id: cur.id, provider: r.provider ?? ai.provider, model: r.model ?? ai.model, tokens_in: r.tokensIn, tokens_out: r.tokensOut, searches: 0 });
    } catch (e) { await logStep(db, cur, cur.step_count + 1, 'error', `Denetim AI hakemi çalışmadı, kural tabanlı denetim yapıldı: ${String((e as Error).message).slice(0, 200)}`); }
  }
  checks.forEach((c, i) => {
    // AI hakemi yoksa "doğrulandı" verilmez: kural yalnızca kaynağın var olduğunu gösterir, amaca uygunluğu değil
    const v = verdicts.get(i) ?? (c.reachable && c.match ? { v: 'suspicious' as const, r: 'Kaynak var ve başlık kaynakta geçiyor; AI hakemi çalışmadığı için amaca uygunluk doğrulanmadı' }
      : c.reachable ? { v: 'suspicious' as const, r: 'Kaynak açıldı ama bulgu metinde net görülmedi (kural tabanlı)' } : { v: 'suspicious' as const, r: 'Kaynak sayfası okunamadı (kural tabanlı)' });
    // Güvenlik: kaynağı açılamayan ve toplanan kaynaklarda da olmayan bulgu "doğrulandı" sayılmaz
    c.f.verdict = !c.reachable && v.v === 'verified' ? 'suspicious' : v.v; c.f.verdict_reason = v.r;
    // AI özeti yoksa: sayfanın kendi açıklaması veya kaynaktan ilgili kesit (uydurma yok)
    if (!c.f.summary) {
      const src = (c.desc && c.desc.length > 40 ? c.desc : c.reachable ? c.excerpt.replace(/\s+/g, ' ').trim() : '') || '';
      if (src.length > 40) c.f.summary = `Kaynaktan: ${src.slice(0, 420)}${src.length > 420 ? '…' : ''}`;
    }
  });
  for (const f of findings.slice(20)) { f.verdict = 'suspicious'; f.verdict_reason = 'Denetim sınırı (ilk 20 bulgu) dışında kaldı'; }
  const count = (v: string) => findings.filter((f) => f.verdict === v).length;
  const audit: MissionAudit = { total: findings.length, verified: count('verified'), suspicious: count('suspicious'), rejected: count('rejected'),
    accuracy: findings.length ? Math.round((count('verified') / findings.length) * 100) : 0, checked_at: new Date().toISOString(),
    rejected_items: findings.filter((f) => f.verdict === 'rejected').map((f) => ({ title: f.title, url: f.url, reason: f.verdict_reason ?? '' })).slice(0, 20) };
  await logStep(db, cur, cur.step_count + 1, 'audit', `Denetim: ${audit.total} bulgu kontrol edildi · ✅${audit.verified} doğrulandı · ⚠️${audit.suspicious} şüpheli · ❌${audit.rejected} elendi · doğruluk %${audit.accuracy}`, null, audit);
  return audit;
}

/** KOÇ: görevin günlüğü + denetim sonucuna bakıp yeteneğin eksiğini teşhis eder, somut iyileştirme önerir (Akademi'de onaya düşer). */
async function coachMission(db: Db, cur: MissionRow, ai: AiChoice, ctx: { skills: Array<{ id: string; name: string }>; terms: string[]; text: string }, audit: MissionAudit | null, steps: Array<{ action: string; message: string }>) {
  try {
    const log = steps.filter((s) => ['news_search', 'ai_research', 'audit', 'error'].includes(s.action)).map((s) => `[${s.action}] ${s.message}`).join('\n').slice(0, 5000);
    const r = await aiCall(ai, [
      'Sen bir bot KOÇUSUN. Aşağıdaki araştırma görevinin günlüğünü ve denetim sonucunu incele; botun neden az/alakasız/doğrulanamayan bulgu getirdiğini teşhis et ve yeteneğini iyileştirecek SOMUT öneriler ver.',
      `GÖREV: ${cur.title}\nAMAÇ: ${cur.goal}\nKULLANILAN YETENEKLER: ${ctx.skills.map((s) => s.name).join(', ') || '(yok)'}\nMEVCUT ARAMA TERİMLERİ: ${ctx.terms.join(', ') || cur.search_for || '-'}`,
      audit ? `DENETİM: ${audit.total} bulgu · doğrulandı ${audit.verified} · şüpheli ${audit.suspicious} · elendi ${audit.rejected} · doğruluk %${audit.accuracy}\nELENENLER: ${(audit.rejected_items || []).map((x) => `${x.title} (${x.reason})`).join(' | ').slice(0, 1500)}` : 'DENETİM: hiç bulgu yok.',
      `GÜNLÜK:\n${log}`,
      'Kurallar: yalnızca yasal, herkese açık kaynaklar (KVKK); giriş gerektiren veya kazımayı yasaklayan platformları önerme. Arama terimleri Türkçe, kısa ve gerçek insanların/firmaların yazacağı ifadeler olsun (ör. "villa yaptırmak istiyorum", "kat karşılığı müteahhit aranıyor", "manitou operatörü aranıyor").',
      'YALNIZCA JSON döndür: {"diagnosis":"2-4 cümle teşhis","instructions_add":"yeteneğin talimatına eklenecek 1-3 cümle kural (gerekmiyorsa boş)","search_terms_add":["..."],"search_terms_remove":["..."],"sources_add":["alanadi.com"]}',
    ].join('\n\n'));
    await recordUsage(db, { source: 'mission', ref_id: cur.id, provider: r.provider ?? ai.provider, model: r.model ?? ai.model, tokens_in: r.tokensIn, tokens_out: r.tokensOut, searches: 0 });
    const j = extractJson(r.text) as { diagnosis?: string; instructions_add?: string; search_terms_add?: string[]; search_terms_remove?: string[]; sources_add?: string[] } | null;
    if (!j?.diagnosis) { await logStep(db, cur, cur.step_count + 1, 'error', `Koç yanıtı okunamadı (${r.provider ?? ai.provider}): ${r.text.slice(0, 200)}`); return null; }
    const arr = (a: unknown, n: number) => (Array.isArray(a) ? a.map((x) => String(x).trim()).filter((x) => x.length > 1 && x.length < 80).slice(0, n) : []);
    const skillId = ctx.skills[0]?.id;
    if (skillId) {
      await db.from('skill_improvements').insert({ skill_id: skillId, mission_id: cur.id, diagnosis: String(j.diagnosis).slice(0, 2000),
        instructions_add: String(j.instructions_add || '').slice(0, 1500) || null, search_terms_add: arr(j.search_terms_add, 10),
        search_terms_remove: arr(j.search_terms_remove, 10), sources_add: arr(j.sources_add, 8).map((x) => x.replace(/^https?:\/\//, '').replace(/\/.*$/, '')) });
    }
    await logStep(db, cur, cur.step_count + 1, 'coach', `Koç: ${String(j.diagnosis).slice(0, 400)}${skillId ? ' → iyileştirme önerisi Akademi\'ye gönderildi' : ''}`);
    return String(j.diagnosis).slice(0, 2000);
  } catch (e) {
    await logStep(db, cur, cur.step_count + 1, 'error', `Koç değerlendirmesi yapılamadı: ${String((e as Error).message).slice(0, 200)}`);
    return null;
  }
}

// ── Worker girişi ───────────────────────────────────────────────────────────
export async function runDueMissions(db: Db) {
  const { data, error } = await db.rpc('claim_due_missions', { p_limit: 2, p_lease_seconds: 150 });
  if (error) return { error: error.message };
  const rows = (data || []) as MissionRow[];
  const results = await Promise.all(rows.map((m) => stepMission(db, m).catch(async (e) => {
    await db.from('bot_missions').update({ locked_until: null, error: String((e as Error).message).slice(0, 500), next_step_at: new Date(Date.now() + stepIntervalMs(m)).toISOString() }).eq('id', m.id);
    return { mission_id: m.id, error: String(e) };
  })));
  return results;
}
