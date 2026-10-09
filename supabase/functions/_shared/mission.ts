// EMBAY BOT GÖREVLERİ (mission): amaç + hedef link + aranacak şey + süre + bitiş koşulu → adım adım gerçek araştırma → rapor.
// Kurallar: sonuç asla rastgele üretilmez; her bulgu bir kaynak URL'ye dayanır; kaynağı doğrulanamayan AI bulgusu atılır.
import Anthropic from 'npm:@anthropic-ai/sdk@0.127.0';
import { budgetBlock, recordUsage } from './ai/budget.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';
import { ConfigurationRequiredError, extractJson } from './ai/types.ts';
import { COMPAT, getAiKey, GROQ_URL } from './ai/keys.ts';
import { telegramSend } from './connectors/messaging.ts';
import { connectorByKey } from './connectors/registry.ts';
import { resolveStatus } from './connectors/types.ts';
import { loadAppSecrets, secret as appSecret } from './secrets.ts';
import { logActivity } from './activity.ts';
import { tavilySearchDetailed, type WebResult } from './search.ts';
import { isSearchUnavailable, searchScopeStatus } from './pure/search.ts';
import { isStaleFinding, RECENCY_RULES, requiresRecentEvidence, recencyWindow } from './recency.ts';
import { classifyFinishReason, verifiedFindings } from './pure/outcome.ts';
import { findingDateIssue, makePublicationEvidence, publicationFromHtml, sourceSupportsTitle, trustedPublication, type PublicationEvidence } from './pure/publication.ts';
import { missionPolicy, RESEARCH_RELEVANCE_RULES, type MissionPolicy } from './pure/policy.ts';
import { researchReportSummary } from './pure/research-report.ts';
import { searchBackedSocialProfile } from './pure/social-profile.ts';
import { routeSkills } from './pure/skill-router.ts';
import { classifyFindingType, FINDING_TYPE_LABEL, type FindingType } from './pure/finding-taxonomy.ts';
import { runSeoAudit, seoAuditDetail } from './pure/seo-audit.ts';
import { academyOutputEvidence, academyTestStatus } from './pure/capability-registry.ts';
import { connectorHealthState, missionCapabilitySnapshot } from './pure/capability-audit.ts';
import { registeredHandlerKeys } from './tools/registry.ts';
import { routeForModel } from './pure/model-routing.ts';
import { buildMissionScope, canonicalizeTenantBrand, evaluateScopeCandidate, filterScopeQueries, scopePrompt, type MissionScopeContract } from './pure/mission-scope.ts';

type Db = SupabaseClient;

export interface MissionRow {
  id: string; bot_id: string | null; title: string; goal: string; target_url: string | null; search_for: string | null; report_spec: string | null;
  stop_condition: string | null; duration_minutes: number; status: string; finish_reason: string | null; started_at: string; deadline_at: string;
  finished_at: string | null; step_count: number; max_steps: number; provider: string | null; model: string | null; error_count?: number; error_kind?: string | null; schedule_id?: string | null;
  findings: Finding[]; sources: Source[]; visited: string[]; summary: string | null; error?: string | null; tokens_in: number; tokens_out: number; created_by: string | null; cost_usd?: number; web_searches?: number;
  skill_ids?: string[]; purpose?: string; audit?: MissionAudit | null; coach_note?: string | null;
}
export interface Finding {
  title: string; detail: string; url: string; evidence?: string; at: string; step: number;
  // Liste/ilan görevlerinde yapılandırılmış alanlar (yalnızca kurumun kendi yayınladığı bilgiler)
  company?: string; location?: string; posted?: string; phone?: string; email?: string; website?: string;
  relevance?: number; fit?: string;
  verdict?: 'verified' | 'suspicious' | 'rejected'; verdict_reason?: string; summary?: string;
  finding_type?: FindingType;
  verification?: 'technical_http';
  publication?: PublicationEvidence;
}
export interface MissionAudit {
  total: number; verified: number; suspicious: number; rejected: number; accuracy: number; checked_at: string;
  type_counts?: Partial<Record<FindingType, number>>;
  verified_customer_leads?: number; verified_target_accounts?: number;
  rejected_items?: Array<{ title: string; url: string; reason: string }>;
  scope_guard?: { enabled: boolean; canonical_brand: string | null; allowed_topics: string[]; allowed_geos: string[]; excluded_terms: string[] };
}
interface Source { url: string; title?: string; publication?: PublicationEvidence }

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
  'ALAKA VE HEDEF KİTLE KURALLARI (tüm iş bulucu ve müşteri avcısı botlar için zorunlu ve bağlayıcıdır):',
  '- KESİNLİKLE RAKİP FİRMALARI BULGU YAPMA! (Diğer müteahhitlik şirketleri, inşaat taahhüt firmaları, vinç kiralama firmaları veya onların tanıtım sayfaları kesinlikle BULGU DEĞİLDİR). Bize rakip değil, doğrudan BİZE İŞ VERECEK MÜŞTERİ ve İŞ FIRSATI bul.',
  '- GENEL İNŞAAT VE MÜŞTERİ BULMA BİLİNCİ (ZORUNLU TERİMLER VE ODAK):',
  '  1) KALFALIK & USTA EKİBİ TALEPLERİ: Kalıp-demir kalfası, kaba inşaat kalfalığı, şantiye taşeronluğu, usta ekibi arayan yap-sat müteahhitleri.',
  '  2) YAP-SAT VE BİNA YAPIMI: İstanbul ve Trakya hattında temelden çatıya bina yapımı, arsa karşılığı / kat karşılığı konut projeleri, villa taahhüdü.',
  '  3) KABA VE İNCE İNŞAAT: Radye temel, kolon-kiriş donatı, kalıp ve beton dökümü (kaba inşaat) ile şap, sıva, mantolama ve ince işçilik taşeronlukları.',
  '  4) GÖTÜRÜ İŞLER: Metrekare bazlı veya götürü usulü kaba/ince inşaat yaptırmak isteyen müteahhitler, kooperatifler ve arsa sahipleri.',
  '  5) KENTSEL DÖNÜŞÜM: 10-20 daireli riskli binalarını yeniletmek için güvenilir yerel müteahhit arayan bina yöneticileri ve kat malikleri.',
  '- İŞ MAKİNESİ (MANİTOU) ALANINDA ARANACAK ŞEYLER: Sektördeki tek uzman botumuz ilan sitelerine, iş ilanlarına ve şantiyelere bakar. Yalnızca teleskopik yükleyici (Manitou/telehandler) kiralamak isteyen, şantiyesine yüksekte malzeme taşıma/montaj için vinç/forklift arayan veya telehandler operatörü arayan müşterileri bulur. Kiralık manitou reklamı veren rakipleri ASLA listeleme.',
  '- Her bulgu somut ve üzerine teklif verilebilir olmalı: belirli bir talep, iş ilanı, ihale, arsa sahibi duyurusu veya taşeron arayışı. Genel haber, makale, reklam veya başka bölge kayıtları BULGU DEĞİLDİR.',
  '- Her bulguya "relevance" (0-10) ve "fit" (tek cümle: bu iş/talep Embay Yapı veya Şahin Manitou için neden bir iş fırsatı) yaz. 7\'nin altındaki veya rakip kokan kayıtları derhal ele.',
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
const POS = [
  'kalfalik', 'kalfa', 'kalfa araniyor', 'kalfasi', 'usta araniyor', 'yap sat', 'yapsat',
  'bina yapimi', 'bina insaati', 'kaba insaat', 'ince insaat', 'kaba ve ince', 'kaba siva',
  'goturu', 'goturu is', 'taseron', 'taseron araniyor', 'taseronluk', 'muteahhit', 'muteahhitlik',
  'kalip demir', 'demir baglama', 'beton dokumu', 'insaat yapimi', 'villa yapimi', 'cati yapimi',
  'temeli atil', 'temel atma', 'insaati basla', 'insaatina basla', 'aranıyor', 'araniyor', 'ariyor', 'arıyor',
  'kat karsilig', 'arsa karsiligi', 'bosaltil', 'yikim', 'yikil', 'riskli yapi', 'yapilacak', 'insa edilecek', 'talep', 'ihale', 'proje'
];
const TARGET_REGION = ['istanbul', 'kocaeli', 'tekirdag', 'gebze', 'tuzla', 'pendik', 'kartal', 'esenyurt', 'basaksehir', 'arnavutkoy', 'silivri', 'catalca', 'buyukcekmece', 'beylikduzu', 'sancaktepe', 'cekmekoy', 'umraniye', 'atasehir', 'kadikoy', 'uskudar', 'beykoz', 'sile', 'sultanbeyli', 'eyup', 'kagithane', 'sariyer', 'bagcilar', 'kucukcekmece', 'esenler', 'gungoren', 'zeytinburnu', 'bahcelievler', 'avcilar', 'hadimkoy', 'corlu', 'cerkezkoy', 'izmit', 'darica', 'dilovasi', 'cayirova'];
const OTHER_CITIES = ['ankara', 'izmir', 'bursa', 'iznik', 'antalya', 'adana', 'konya', 'mersin', 'gaziantep', 'kayseri', 'samsun', 'trabzon', 'eskisehir', 'diyarbakir', 'sakarya', 'yalova', 'bolu', 'duzce', 'manisa', 'balikesir', 'canakkale', 'edirne', 'kirklareli', 'malatya', 'erzurum', 'van', 'hatay', 'denizli', 'aydin', 'mugla', 'afyon', 'sivas', 'tokat', 'ordu', 'rize', 'zonguldak', 'karabuk', 'kastamonu', 'corum', 'yozgat', 'nevsehir', 'aksaray', 'nigde', 'karaman', 'isparta', 'burdur', 'usak', 'kutahya', 'bilecik', 'elazig', 'batman', 'mardin', 'sanliurfa', 'adiyaman', 'kahramanmaras', 'osmaniye', 'kilis'];
// Rakip/hizmet tanıtım sayfaları ve alakasız iş ilanları elenir (eski liste + yeni meslek dışı ilanlar)
const NEG = ['is ilanlari', 'ilanlari', 'hizmetleri', 'guclendirme hizmet', 'tadilat firmasi', 'tadilat hizmet', 'dekorasyon', 'en iyi', 'nasil', 'rehber', 'nedir', 'fiyat', 'firmasi', 'firmalari', 'sozluk', 'kac ', 'milyon kisi', 'soru', 'yorum', 'kampanya', 'indirim', 'satilik', 'kiralik daire', 'temizlik personeli', 'garson', 'kurye', 'sofor', 'cagri merkezi', 'guvenlik gorevlisi', 'muhasebe', 'kasiyer'];
export function ruleFindings(results: WebResult[], m: Pick<MissionRow, 'search_for' | 'title' | 'goal' | 'report_spec'>, policy: MissionPolicy = 'lead'): Array<Omit<Finding, 'at' | 'step'>> {
  const anchors = anchorWords(m);
  const out: Array<Omit<Finding, 'at' | 'step'>> = [];
  for (const r of results) {
    const publication = makePublicationEvidence(r.posted, 'search_metadata', r.url);
    if (findingDateIssue(publication, r.url, m)) continue;
    const prof = socialProfile(r.url);
    if (prof) { // sektör hesap keşfi: işletme profil sayfası (gönderi/hashtag/grup değil)
      out.push({ title: r.title.slice(0, 200), detail: (r.snippet || r.title).slice(0, 600), url: r.url, evidence: r.snippet?.slice(0, 300) || r.title,
        website: r.url, posted: publication?.posted, publication, relevance: 6, fit: `Kural tabanlı ön eleme: ${prof.platform} işletme profili — denetimde doğrulanacak` });
      if (out.length >= 8) break;
      continue;
    }
    const t = norm(`${r.title} ${r.snippet}`); const ti = t.replace(/ı/g, 'i');
    if (policy !== 'lead') {
      if (!anchors.length || !anchors.some((a) => ti.includes(a.replace(/ı/g, 'i')))) continue;
      out.push({ title: r.title.slice(0, 200), detail: (r.snippet || r.title).slice(0, 600), url: r.url, evidence: r.snippet?.slice(0, 300) || r.title,
        posted: publication?.posted, publication, relevance: 6, fit: 'Görev kelimeleriyle eşleşen araştırma adayı — içerik denetiminde doğrulanacak, müşteri talebi değildir' });
      if (out.length >= 8) break;
      continue;
    }
    const pos = POS.find((p) => ti.includes(p.replace(/ı/g, 'i')));
    if (!pos || NEG.some((n) => norm(r.title).replace(/ı/g, 'i').includes(n)) || (anchors.length && !anchors.some((a) => ti.includes(a.replace(/ı/g, 'i'))))) continue;
    // Bölge: hedef bölge dışındaki il geçiyor ve hedef bölge geçmiyorsa ele
    if (OTHER_CITIES.some((c) => ti.includes(c)) && !TARGET_REGION.some((c) => ti.includes(c))) continue;
    out.push({ title: r.title.slice(0, 200), detail: (r.snippet || r.title).slice(0, 600), url: r.url, evidence: r.snippet ? r.snippet.slice(0, 300) : r.title,
      posted: publication?.posted, publication, relevance: 6, fit: `Kural tabanlı ön eleme: “${pos.trim()}” işareti var — denetimde doğrulanacak` });
    if (out.length >= 6) break;
  }
  return out;
}

// ── Haber/duyuru araması (herkese açık Google Haberler RSS) ───────────────────
// Tavily genel web ana kaynaktır; başarısız/boş olduğunda Google News RSS dar kapsamlı tarihli yedektir.
// Araştırma logları arama sağlayıcısının durumunu ayrı kaydeder; AI yalnızca gerçek kaynaklardan bulgu üretir.
export interface NewsItem { title: string; url: string; posted: string | null; source: string | null }
export interface NewsSearchAttempt { status: 'ok' | 'network_error' | 'http_error' | 'invalid_response'; http_status: number | null; results: NewsItem[]; detail: string }
export async function newsSearchDetailed(q: string, limit = 15, days = 7): Promise<NewsSearchAttempt> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${days}d`)}&hl=tr&gl=TR&ceid=TR:tr`;
  const res = await fetch(url, { headers: { 'user-agent': 'EmbayOpsBot/1.0 (+https://embay-panel.vercel.app)' }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res) return { status: 'network_error', http_status: null, results: [], detail: 'Google News bağlantısı başarısız veya zaman aşımına uğradı' };
  if (!res.ok) return { status: 'http_error', http_status: res.status, results: [], detail: `Google News HTTP ${res.status}` };
  const xml = await res.text().catch(() => '');
  if (!/<(?:rss|feed|item)\b/i.test(xml)) return { status: 'invalid_response', http_status: res.status, results: [], detail: 'Google News yanıtı RSS biçiminde değil' };
  const tag = (block: string, t: string) => decode((block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').trim());
  const results = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit).map((mm) => {
    const b = mm[1];
    const pub = tag(b, 'pubDate');
    const d = pub ? new Date(pub) : null;
    return { title: tag(b, 'title'), url: tag(b, 'link'), source: tag(b, 'source') || null,
      posted: d && !isNaN(d.getTime()) ? d.toISOString() : null };
  }).filter((n) => n.title && /^https?:\/\//.test(n.url));
  return { status: 'ok', http_status: res.status, results, detail: `Google News RSS yanıt verdi (${results.length} sonuç)` };
}
export async function newsSearch(q: string, limit = 15, days = 7): Promise<NewsItem[]> {
  const attempt = await newsSearchDetailed(q, limit, days);
  return attempt.status === 'ok' ? attempt.results : [];
}

// ── Sayfa çekme (gerçek HTTP) ───────────────────────────────────────────────
export interface PageFacts {
  ok: boolean; status: number; url: string; title: string | null; description: string | null; og: Record<string, string>;
  headings: string[]; text: string; links: Array<{ url: string; text: string }>; jsonld: string[]; error?: string;
  publication?: PublicationEvidence;
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
    return { ok: res.ok, status: res.status, url: res.url, title: title ? decode(title.replace(/\s+/g, ' ').trim()) : null, description: meta('description'), og, headings, text, links, jsonld,
      publication: res.ok ? publicationFromHtml(html, res.url) : undefined };
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
  search_unavailable: 'Canlı genel web araması kullanılamadı — Tavily anahtarı/kotası ve AI arama yetkisi kontrol edilmeli',
  budget: 'Harcama sınırı doldu — Ayarlar → Harcama sınırı',
  repeated_error: 'Üst üste 3 adım hata verdi',
  timeout: 'Adım zaman aşımına uğradı',
};

// ── AI sağlayıcı seçimi: botun ajanı → anahtar yoksa tanımlı başka sağlayıcı ──
type CompatResearch = 'openai' | 'openrouter' | 'github' | 'cerebras' | 'mistral';
interface AiChoice { provider: 'anthropic' | 'gemini' | 'groq' | CompatResearch; model: string; system: string; key: string }
const AI_PROVIDERS = ['anthropic', 'gemini', 'groq', 'openai', 'openrouter', 'github', 'cerebras', 'mistral'] as const;
const isAiProvider = (value: string): value is AiChoice['provider'] => (AI_PROVIDERS as readonly string[]).includes(value);
async function chooseAi(db: Db, botId: string | null, preferred?: string | null, preferredProvider?: string | null): Promise<AiChoice | null> {
  let agent: { provider: string; model: string; system_prompt: string } | null = null;
  if (botId) {
    const { data } = await db.from('automation_bots').select('ai_agents(provider,model,system_prompt)').eq('id', botId).maybeSingle();
    // deno-lint-ignore no-explicit-any
    const a = (data as any)?.ai_agents; agent = Array.isArray(a) ? a[0] : a;
  }
  const base = agent?.system_prompt || 'Sen Embay Yapı ve Şahin Manitou Kiralama için çalışan titiz bir araştırma botusun. Türkçe yaz. Asla bilgi uydurma.';
  const requested = routeForModel(preferred);
  // Mission DB’sinde provider/model birlikte tutulur. Fallback sonrası örneğin
  // Cerebras/gpt-oss-120b kaydı sonraki worker adımında OpenAI gpt-oss sanılmamalı.
  const pinnedProvider = isAiProvider(String(preferredProvider || '').trim())
    ? String(preferredProvider).trim() as AiChoice['provider']
    : requested?.provider;
  if (pinnedProvider) {
    const ok = await getAiKey(pinnedProvider);
    if (ok) {
      const model = preferred && routeForModel(preferred)?.provider === pinnedProvider ? preferred : defaultModel(pinnedProvider);
      return { provider: pinnedProvider, model, system: base, key: ok };
    }
  }
  const ak = await getAiKey('anthropic');
  if (ak) return { provider: 'anthropic', model: preferred?.startsWith('claude-') ? preferred : agent?.provider === 'anthropic' ? agent.model : 'claude-sonnet-5', system: base, key: ak };
  const gk = await getAiKey('gemini');
  if (gk) return { provider: 'gemini', model: Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest', system: base, key: gk };
  const qk = await getAiKey('groq');
  if (qk) return { provider: 'groq', model: GROQ_RESEARCH_MODEL(), system: base, key: qk };
  for (const p of ['cerebras', 'mistral', 'openrouter', 'github'] as const) { const k = await getAiKey(p); if (k) return { provider: p, model: COMPAT[p].agentModel, system: base, key: k }; }
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
/** GitHub Models ücretsiz katmanı ~8K token girdi kabul eder: uzun istem baştan ve sondan kırpılır. */
const clip = (t: string, max: number) => (t.length > max ? `${t.slice(0, Math.round(max * 0.22))}\n…\n${t.slice(-Math.round(max * 0.78))}` : t);
async function compatResearch(provider: CompatResearch, key: string, model: string, system: string, prompt: string): Promise<AiResult> {
  const tokenLimit = provider === 'openai' ? { max_completion_tokens: 3000 } : { max_tokens: 3000 };
  const res = await fetch(COMPAT[provider].url, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, ...tokenLimit, messages: [{ role: 'system', content: `${system}\n\nNOT: Bu modelin internette arama yetkisi yok. Yalnızca istemde verilen sayfa içeriği ve bilgilerle çalış; kaynak adresi istemde geçmeyen hiçbir bulgu yazma.` }, { role: 'user', content: clip(prompt, provider === 'github' ? 12000 : 18000) }] }),
  });
  const data = await res.json().catch(() => ({}));
  const label = AI_LABEL[provider] ?? provider;
  if (!res.ok) {
    const detail = JSON.stringify(data).slice(0, 300);
    if (res.status === 401 || res.status === 403) throw new AiFatalError('ai_auth', `${label} anahtarı reddedildi (${res.status})`);
    if (res.status === 429 || res.status === 402) throw new AiFatalError('ai_credit', `${label} ücretsiz kullanım sınırı doldu — daha sonra tekrar dener`);
    throw new Error(`${label} ${res.status}: ${detail}`);
  }
  return { text: String(data.choices?.[0]?.message?.content ?? ''), sources: [], tokensIn: data.usage?.prompt_tokens ?? 0, tokensOut: data.usage?.completion_tokens ?? 0, searches: 0, model, provider };
}

const AI_LABEL: Record<string, string> = { anthropic: 'Claude', gemini: 'Gemini', openai: 'OpenAI', groq: 'Groq', openrouter: 'OpenRouter', github: 'GitHub Models', cerebras: 'Cerebras', mistral: 'Mistral' };
function research(provider: string, key: string, model: string, system: string, prompt: string) {
  if (provider === 'anthropic') return anthropicResearch(key, model, system, prompt);
  if (provider === 'gemini') return geminiResearch(key, model, system, prompt);
  if (['openai', 'openrouter', 'github', 'cerebras', 'mistral'].includes(provider)) return compatResearch(provider as CompatResearch, key, model, system, prompt);
  return groqResearch(key, model, system, prompt);
}
const defaultModel = (p: string) => (p === 'anthropic' ? 'claude-sonnet-5' : p === 'gemini' ? (Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest')
  : ['openai', 'openrouter', 'github', 'cerebras', 'mistral'].includes(p) ? COMPAT[p as CompatResearch].agentModel : GROQ_RESEARCH_MODEL());

/** Sırayla dener: seçilen sağlayıcı → diğerleri (Claude, Gemini, Groq). Kredi/anahtar/limit hatasında bir sonrakine geçer. */
async function aiCall(c: AiChoice, prompt: string, onFailover?: (msg: string) => Promise<void> | void): Promise<AiResult> {
  const chain = [c.provider, ...['anthropic', 'gemini', 'groq', 'openai', 'cerebras', 'mistral', 'openrouter', 'github'].filter((p) => p !== c.provider)];
  const errors: string[] = [];
  let firstErr: unknown = null; let lastErr: unknown = null; let prev: string = c.provider;
  for (const p of chain) {
    const key = p === c.provider ? c.key : await getAiKey(p as 'anthropic' | 'gemini' | 'groq' | CompatResearch);
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
  // Model adı/endpoint artık geçerli değilse de güvenli başka sağlayıcı denenebilir.
  // Aksi halde tek bir eski provider modeli görevi gereksiz yere düşürür.
  return /credit|balance|quota|rate_limit|too_many_requests|429|overloaded|billing|model_not_found|model not found|not found|unavailable|\b404\b/i.test(s);
}

// ── Yardımcılar ─────────────────────────────────────────────────────────────
async function logStep(db: Db, m: MissionRow, step: number, action: string, message: string, target?: string | null, data?: unknown, started?: number) {
  await db.from('bot_mission_steps').insert({ mission_id: m.id, step_no: step, action, target: target ?? null, message: message.slice(0, 2000), data: data ?? null,
    duration_ms: started ? Date.now() - started : null });
}
async function logSkillsLoadedOnce(db: Db, m: MissionRow, skills: Array<{ id: string; name: string; version: number }>, selected: Array<{ id: string; name: string; version: number }> = [], capability?: { summary: unknown; skills: unknown[]; warning?: string | null }) {
  if (m.step_count !== 0) return;
  const safe = skills.map((s) => ({ id: s.id, name: s.name.slice(0, 120), version: Number(s.version) || 1 }));
  const selectedSafe = selected.map((s) => ({ id: s.id, name: s.name.slice(0, 120), version: Number(s.version) || 1 }));
  const capabilitySummary = capability?.summary && typeof capability.summary === 'object' ? capability.summary as Record<string, unknown> : { total_skills: safe.length };
  const handlerPart = typeof capabilitySummary.handlers_registered === 'number' && typeof capabilitySummary.handlers_missing === 'number'
    ? ` · handler ${capabilitySummary.handlers_registered}/${capabilitySummary.handlers_registered + capabilitySummary.handlers_missing}` : '';
  const connectorPart = typeof capabilitySummary.connector_backed === 'number' ? ` · connector ${capabilitySummary.connector_backed}` : '';
  const { error } = await db.from('bot_mission_steps').insert({ mission_id: m.id, step_no: 0, action: 'skills_loaded', target: null,
    message: `${safe.length} uygun yetenek snapshot'ı · ${selectedSafe.length} ayrıntılı yüklendi${handlerPart}${connectorPart}`, data: {
      count: safe.length, detailed_count: selectedSafe.length, skills: safe, detailed_skills: selectedSafe,
      capability_summary: capabilitySummary, capability_skills: capability?.skills ?? [], capability_warning: capability?.warning ?? null,
    }, duration_ms: null });
  // The partial unique index makes this safe if two leased workers race. A duplicate
  // audit event is expected and harmless; every other database error must surface.
  if (error && error.code !== '23505') throw error;
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
interface SkillRow { id: string; skill_key: string; display_name: string; instructions: string | null; enabled: boolean; lifecycle: string; category: string | null; search_terms: string[] | null; sources: string[] | null; good_examples: string | null; bad_examples: string | null; version: number; capability_kind: string | null; handler_key: string | null; connector_key: string | null; capability_test_status: string | null }
const SKILL_COLS = 'id,skill_key,display_name,instructions,enabled,lifecycle,category,search_terms,sources,good_examples,bad_examples,version,capability_kind,handler_key,connector_key,capability_test_status';

async function missionCapabilityAudit(db: Db, skills: SkillRow[]) {
  const empty = missionCapabilitySnapshot([], new Set(registeredHandlerKeys()));
  if (!skills.length) return { ...empty, warning: null as string | null };
  const skillIds = skills.map((skill) => skill.id);
  const connectorKeys = [...new Set(skills.map((skill) => skill.connector_key).filter((key): key is string => Boolean(key)))];
  const [linkQuery, toolQuery, accountQuery, healthQuery] = await Promise.all([
    db.from('automation_skill_tools').select('skill_id,tool_id').in('skill_id', skillIds).limit(500),
    db.from('automation_tools').select('id,tool_key,handler,platform,active').limit(500),
    connectorKeys.length ? db.from('social_accounts').select('connector_key,connection_status,token_expires_at').in('connector_key', connectorKeys).limit(500) : Promise.resolve({ data: [], error: null }),
    connectorKeys.length ? db.from('connector_health').select('connector_key,last_ok_at,last_failed_at,failed_24h').in('connector_key', connectorKeys).limit(100) : Promise.resolve({ data: [], error: null }),
  ]);
  const errors = [linkQuery.error, toolQuery.error, accountQuery.error, healthQuery.error].filter(Boolean);
  const toolById = new Map((toolQuery.data || []).map((tool: { id: string; tool_key: string; handler: string | null; platform: string | null; active: boolean }) => [tool.id, tool]));
  const linksBySkill = new Map<string, Array<{ tool_key: string; handler: string | null; platform: string | null; active: boolean }>>();
  for (const link of (linkQuery.data || []) as Array<{ skill_id: string; tool_id: string }>) {
    const tool = toolById.get(link.tool_id); if (!tool) continue;
    const current = linksBySkill.get(link.skill_id) || [];
    current.push({ tool_key: tool.tool_key, handler: tool.handler, platform: tool.platform, active: tool.active });
    linksBySkill.set(link.skill_id, current);
  }
  const accountByConnector = new Map<string, { connection_status: string; token_expires_at: string | null }>();
  for (const account of (accountQuery.data || []) as Array<{ connector_key: string; connection_status: string; token_expires_at: string | null }>) accountByConnector.set(account.connector_key, account);
  const healthByConnector = new Map<string, { last_ok_at: string | null; last_failed_at: string | null; failed_24h: number }>();
  for (const health of (healthQuery.data || []) as Array<{ connector_key: string; last_ok_at: string | null; last_failed_at: string | null; failed_24h: number }>) healthByConnector.set(health.connector_key, health);
  const connectorFor = (key: string | null) => {
    if (!key) return null;
    const def = connectorByKey(key); if (!def) return null;
    const account = accountByConnector.get(key); const recent = healthByConnector.get(key);
    const status = resolveStatus(def, account ? { connection_status: account.connection_status, token_expires_at: account.token_expires_at } : null);
    return { key, implemented: def.implemented, status, health_state: connectorHealthState({ registered: true, implemented: def.implemented, status,
      last_ok_at: recent?.last_ok_at ?? null, failed_24h: recent?.failed_24h ?? 0 }), last_ok_at: recent?.last_ok_at ?? null,
      last_failed_at: recent?.last_failed_at ?? null, failed_24h: recent?.failed_24h ?? 0 };
  };
  const snapshot = missionCapabilitySnapshot(skills.map((skill) => ({ id: skill.id, skill_key: skill.skill_key, display_name: skill.display_name,
    version: skill.version, capability_kind: skill.capability_kind, handler_key: skill.handler_key, connector_key: skill.connector_key,
    capability_test_status: skill.capability_test_status, tools: linksBySkill.get(skill.id) || [], connector: connectorFor(skill.connector_key) })), new Set(registeredHandlerKeys()));
  return { ...snapshot, warning: errors.length ? 'Capability audit metadata sorgusu kısmen tamamlanamadı; çalışma promptu etkilenmedi.' : null };
}
/** Bot profili + kullanılacak yetenekler. Kural: görevlerde YALNIZCA Akademi'de onaylanmış (approved) yetenekler kullanılır;
 * yetenek testi (purpose=skill_test) görevinde test edilen yetenek onaysız olabilir. */
async function botContext(db: Db, botId: string | null, m?: Pick<MissionRow, 'skill_ids' | 'purpose' | 'title' | 'goal' | 'search_for' | 'report_spec' | 'step_count'>) {
  const isTest = m?.purpose === 'skill_test';
  let skills: SkillRow[] = [];
  let bot: { name?: string; instructions?: string; description?: string; slug?: string; bot_type?: string; client_id?: string | null } | null = null;
  if (m?.skill_ids?.length) {
    const { data } = await db.from('automation_skills').select(SKILL_COLS).in('id', m.skill_ids);
    const snapshotOrder = new Map(m.skill_ids.map((id, index) => [id, index]));
    skills = ((data || []) as SkillRow[]).sort((a, b) => (snapshotOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (snapshotOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  } else if (botId) {
    const { data } = await db.from('automation_bot_skills').select(`skill_id,position,automation_skills(${SKILL_COLS})`).eq('bot_id', botId).order('position', { ascending: true });
    // deno-lint-ignore no-explicit-any
    skills = (data || []).map((r: any) => (Array.isArray(r.automation_skills) ? r.automation_skills[0] : r.automation_skills)).filter(Boolean);
  }
  if (botId) ({ data: bot } = await db.from('automation_bots').select('name,instructions,description,slug,bot_type,client_id').eq('id', botId).maybeSingle());
  let brandName: string | null = null;
  if (bot?.client_id) {
    const { data: kit } = await db.from('brand_kits').select('company_name').eq('client_id', bot.client_id).order('is_default', { ascending: false }).limit(1).maybeSingle();
    brandName = typeof kit?.company_name === 'string' ? kit.company_name : null;
  }
  if (!brandName) {
    const { data: kit } = await db.from('brand_kits').select('company_name').order('is_default', { ascending: false }).limit(1).maybeSingle();
    brandName = typeof kit?.company_name === 'string' ? kit.company_name : null;
  }
  skills = skills.filter((s) => s.enabled && (isTest || s.lifecycle === 'approved'));
  const capability = m?.step_count === 0
    ? await missionCapabilityAudit(db, skills)
    : { ...missionCapabilitySnapshot([], new Set(registeredHandlerKeys())), warning: null as string | null };
  const route = routeSkills(skills.map((s) => ({ id: s.id, name: s.display_name, version: s.version, category: s.category, instructions: s.instructions, search_terms: s.search_terms, sources: s.sources })),
    [m?.title, m?.goal, m?.search_for, m?.report_spec].filter(Boolean).join('\n'), 8);
  const selectedIds = new Set(route.selectedIds);
  const selected = skills.filter((s) => selectedIds.has(s.id));
  const withText = selected.filter((s) => s.instructions);
  const metadata = (items: SkillRow[]) => items.map((s) => ({ id: s.id, name: s.display_name, version: s.version }));
  return {
    name: bot?.name ?? 'Bot',
    slug: bot?.slug, bot_type: bot?.bot_type,
    brand_name: brandName,
    skills: metadata(skills),
    selectedSkills: metadata(selected),
    deferredSkills: metadata(skills.filter((s) => !selectedIds.has(s.id))),
    terms: [...new Set(selected.flatMap((s) => s.search_terms || []))],
    sources: [...new Set(selected.flatMap((s) => s.sources || []))],
    capability_summary: capability.summary,
    capability_skills: capability.skills,
    capability_warning: capability.warning,
    text: [bot?.description, bot?.instructions ? `Bot talimatı: ${bot.instructions}` : '',
      `YETENEK KATALOĞU: ${selected.length}/${skills.length} yetenek bu görevin amacına göre ayrıntılı yüklendi. Snapshot'taki diğer yetenekler bağlıdır ancak bu görevde ayrıntılı talimat olarak kullanılmadı.`,
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
  const recentRequired = requiresRecentEvidence(m);
  let tokensIn = m.tokens_in, tokensOut = m.tokens_out;
  let stopMet = false; let stopReason = '';
  const ctx = await botContext(db, m.bot_id, m);
  await logSkillsLoadedOnce(db, m, ctx.skills, ctx.selectedSkills, { summary: ctx.capability_summary, skills: ctx.capability_skills, warning: ctx.capability_warning });
  const policy = missionPolicy(ctx, m);
  const scope = buildMissionScope({ title: m.title, goal: m.goal, searchFor: m.search_for, reportSpec: m.report_spec,
    canonicalBrand: ctx.brand_name, allowedTopics: searchTerms(m.search_for) });
  const rawTerms = [...new Set([...searchTerms(m.search_for), ...ctx.terms])].slice(0, 20);
  const termFilter = filterScopeQueries(rawTerms, scope);
  const terms = termFilter.allowed;
  const seoMission = Boolean(m.target_url && (ctx.slug === 'seo-bot' || /technical seo|teknik seo|robots\.txt|sitemap\.xml|canonical|json-ld/i.test(`${m.title} ${m.goal} ${m.search_for ?? ''}`)));
  let seoAudit: Awaited<ReturnType<typeof runSeoAudit>> | null = null;
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
    if (findingDateIssue(f.publication, f.url, m)) return false;
    if (seenBefore.has(canonical(f.url)) && f.verification !== 'technical_http') return false;
    if (policy === 'lead' && f.verification !== 'technical_http' && isStaleFinding(f)) return false; // güncel fırsat kuralları kalıcı sektör araştırmasına uygulanmaz
    if (findings.some((x) => canonical(x.url) === canonical(f.url) && x.title === f.title)) return false;
    findings.push({ ...f, finding_type: f.finding_type ?? classifyFindingType(f), at: new Date().toISOString(), step }); return true;
  };
  async function failSearchUnavailable(details: string) {
    const error = `Canlı genel web araması yapılamadı; görev yeni AI adımları ve gereksiz harcama oluşmaması için durduruldu. ${details}`.slice(0, 500);
    m.error_kind = 'search_unavailable'; m.error = error;
    await db.from('bot_missions').update({ error_kind: 'search_unavailable', error, web_searches: m.web_searches ?? 0 }).eq('id', m.id);
    await logStep(db, m, step, 'error', error);
    await persist();
    return await finalizeMission(db, { ...m, findings, sources, visited: [...visited], step_count: step, tokens_in: tokensIn, tokens_out: tokensOut, error_kind: 'search_unavailable', error }, 'error');
  }

  try {
    let pageNote = '';
    if (m.target_url && !visited.has(canonical(m.target_url))) {
      const t0 = Date.now();
      if (seoMission && step === 1) {
        seoAudit = await runSeoAudit(m.target_url);
        const addSource = (url: string, title?: string) => {
          if (!sources.some((s) => canonical(s.url) === canonical(url))) sources.push({ url, title });
        };
        visited.add(canonical(seoAudit.final_url));
        addSource(seoAudit.final_url, seoAudit.title ?? undefined);
        addSource(seoAudit.robots.url, 'robots.txt');
        addSource(seoAudit.sitemap.url, 'sitemap.xml');
        const detail = seoAuditDetail(seoAudit);
        await logStep(db, m, step, 'seo_audit', `Gerçek HTTP SEO denetimi: skor %${seoAudit.score} · ${seoAudit.checks.filter((x) => x.level === 'ok').length} uygun · ${seoAudit.checks.filter((x) => x.level !== 'ok').length} uyarı/hata`, m.target_url,
          { url: seoAudit.final_url, status: seoAudit.status, response_ms: seoAudit.response_ms, html_bytes: seoAudit.html_bytes, checks: seoAudit.checks, robots: { url: seoAudit.robots.url, status: seoAudit.robots.status }, sitemap: { url: seoAudit.sitemap.url, status: seoAudit.sitemap.status, urls: seoAudit.sitemap.urls } }, t0);
        addFinding({ title: 'Teknik SEO HTTP baseline', detail: `Gerçek HTTP denetimi ${seoAudit.final_url} üzerinde tamamlandı. Skor: %${seoAudit.score}.\n${detail}`, url: seoAudit.final_url,
          evidence: detail.slice(0, 1800), fit: 'Teknik SEO ölçümü; müşteri adayı veya yayın başarısı değildir.', relevance: 10, finding_type: 'technical_seo', verification: 'technical_http' });
        pageNote = detail;
        stopMet = true;
        stopReason = 'Teknik SEO baseline gerçek HTTP ile tamamlandı';
      } else {
        const p = await fetchPage(m.target_url);
        visited.add(canonical(m.target_url)); sources.push({ url: p.url || m.target_url, title: p.title ?? undefined, publication: p.publication });
        await logStep(db, m, step, 'fetch', p.ok ? `Hedef sayfa okundu: ${p.title || p.url} (HTTP ${p.status}, ${p.text.length} karakter metin, ${p.links.length} link)`
          : `Hedef sayfa doğrudan okunmadı: ${p.error ?? `HTTP ${p.status} (site bot erişimini engelliyor olabilir)`}`, m.target_url,
          { title: p.title, description: p.description, og: p.og, headings: p.headings.slice(0, 10), links: p.links.length }, t0);
        pageNote = pageDigest(p);
        for (const h of keywordSnippets(p.text, terms)) addFinding({ title: `“${h.term}” hedef sayfada geçiyor`, detail: h.snippet, url: p.url || m.target_url, evidence: h.snippet, posted: p.publication?.posted, publication: p.publication });
        if (p.og['og:description'] && !m.search_for) addFinding({ title: 'Sayfanın kendi tanımı (meta)', detail: p.og['og:description'], url: p.url || m.target_url, evidence: p.og['og:description'], posted: p.publication?.posted, publication: p.publication });
      }
    }

    if (!seoAudit) {
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
    const ai = aiDown ? null : await chooseAi(db, m.bot_id, m.model, m.provider);
    let useScan = !ai; let lastResults: WebResult[] = [];
    if (ai) try {
      const remainingMin = Math.max(0, Math.round((new Date(m.deadline_at).getTime() - Date.now()) / 60000));
      // Her adımda önce gerçek genel web araması yapılır; başarısız/boşsa dar kapsamlı Google News RSS yedeği kullanılır.
      let newsNote = ''; let stepResults: WebResult[] = [];
      const searchProviders = new Set<string>(); const searchFailures = new Set<string>();
      let broadSearchSucceeded = false;
      if (!m.target_url && terms.length) {
        // Her adımda 2 konu. Önce gerçek web araması (Tavily, anahtar varsa), yoksa/boşsa Google Haberler yedeği.
        const rawQs = [terms[((step - 1) * 2) % terms.length], terms[((step - 1) * 2 + 1) % terms.length]].filter((x, i, a) => a.indexOf(x) === i);
        const queryFilter = filterScopeQueries(rawQs, scope);
        const qs = queryFilter.allowed;
        if (!qs.length) {
          await logStep(db, m, step, 'scope_guard', `Kapsam guard bu adımda çalıştırılabilecek güvenli sorgu bırakmadı; ${queryFilter.blocked.length} sorgu engellendi.`, null,
            { enabled: scope.enabled, blocked_queries: queryFilter.blocked.map((x) => ({ query: x.query, reason: x.decision.reason })), excluded_terms: scope.excludedTerms });
          await persist();
          return await finalizeMission(db, { ...m, findings, sources, visited: [...visited], step_count: step, tokens_in: tokensIn, tokens_out: tokensOut }, 'max_steps');
        }
        const results: WebResult[] = []; const counts: string[] = [];
        for (const q of qs) {
          const qq = policy !== 'lead' || /stanbul|kocaeli|tekirda|türkiye/i.test(q) ? q : `${q} İstanbul`;
          let got: WebResult[] = [];
          const web = await tavilySearchDetailed(qq, { max: 8, domains: ctx.sources.length && step % 2 === 0 ? ctx.sources : undefined });
          if (web.status === 'ok') { searchProviders.add('Tavily'); broadSearchSucceeded = true; got = web.results; m.web_searches = (m.web_searches ?? 0) + 1; }
          else searchFailures.add(web.detail);
          if (!got.length) {
            const newsAttempt = await newsSearchDetailed(qq, 12);
            if (newsAttempt.status === 'ok') {
              searchProviders.add('Google News RSS'); m.web_searches = (m.web_searches ?? 0) + 1;
              let news = newsAttempt.results;
              if (news.length < 3) {
                const widerNews = await newsSearchDetailed(q, 12, 14);
                if (widerNews.status === 'ok') { searchProviders.add('Google News RSS'); m.web_searches = (m.web_searches ?? 0) + 1; news = [...news, ...widerNews.results]; }
                else searchFailures.add(widerNews.detail);
              }
              got = news.map((n) => ({ title: n.title, url: n.url, snippet: '', posted: n.posted, source: n.source }));
            } else searchFailures.add(newsAttempt.detail);
          }
          let n = 0;
          for (const g of got) if (!results.some((x) => x.url === g.url || x.title === g.title)) { results.push(g); n++; }
          counts.push(`“${q}” → ${n}`);
        }
        results.splice(24); stepResults = results; lastResults = results;
        for (const n of results) {
          const publication = makePublicationEvidence(n.posted, 'search_metadata', n.url);
          const existing = sources.find((x) => canonical(x.url) === canonical(n.url));
          if (!existing) sources.push({ url: n.url, title: n.title, publication });
          else if (!existing.publication && publication) existing.publication = publication;
        }
        const engine = searchProviders.size ? [...searchProviders].join(' + ') : 'none';
        const searchStatus = searchScopeStatus(broadSearchSucceeded, searchProviders.has('Google News RSS'));
        await logStep(db, m, step, 'news_search', `Arama sağlayıcıları: ${engine} · ${counts.join(' · ')} · toplam ${results.length} kaynak${searchFailures.size ? ` · sorun: ${[...searchFailures].slice(0, 3).join(' | ')}` : ''}`, null,
          { engine, search_status: searchStatus, broad_search_available: broadSearchSucceeded, provider_errors: [...searchFailures].slice(0, 5), queries: qs, count: results.length, titles: results.map((n) => n.title).slice(0, 24),
            scope_guard: { enabled: scope.enabled, canonical_brand: scope.canonicalBrand, excluded_terms: scope.excludedTerms, blocked_query_count: queryFilter.blocked.length,
              blocked_queries: queryFilter.blocked.map((x) => ({ query: x.query, reason: x.decision.reason })) } });
        if (results.length) newsNote = results.map((n, i) => `${i + 1}. ${n.title}${n.source ? ` — ${n.source}` : ''}${n.posted ? ` (${n.posted})` : ''}${n.snippet ? `\n   Özet: ${n.snippet}` : ''}\n   ${n.url}`).join('\n');
        const nativeSearchCapable = ['anthropic', 'gemini', 'groq'].includes(ai.provider);
        if (!nativeSearchCapable && stepResults.length === 0 && isSearchUnavailable({ hasTargetUrl: Boolean(m.target_url), broadWebSucceeded: broadSearchSucceeded, nativeSearchSucceeded: false, findingCount: findings.length })) {
          const limited = searchProviders.has('Google News RSS') ? 'Google News RSS çalıştı fakat genel web araması sağlayıcısı değildir.' : '';
          return await failSearchUnavailable([...searchFailures, limited, `${AI_LABEL[ai.provider] ?? ai.provider} sağlayıcısında yerleşik web araması yok`].filter(Boolean).join(' · '));
        }
      }
      const prompt = [
        `GÖREV: ${m.title}`, `AMAÇ / AÇIKLAMA: ${m.goal}`,
        m.target_url ? `HEDEF LİNK: ${m.target_url}` : '', m.search_for ? `ARANACAK: ${m.search_for}` : '',
        m.report_spec ? `RAPORDA OLMASI GEREKEN: ${m.report_spec}` : '', m.stop_condition ? `ERKEN BİTİŞ KOŞULU: ${m.stop_condition}` : '',
        ctx.text ? `BOT PROFİLİ VE YETENEKLERİ:\n${ctx.text}` : '',
        `Adım ${step} / en fazla ${m.max_steps}. Kalan süre ≈ ${remainingMin} dk.`,
        recentRequired ? `GEÇERLİ YAYIN TARİHİ ARALIĞI: ${recencyWindow(m).from}–${recencyWindow(m).to}. Yayın tarihi sunucu metadata'sıyla kontrol edilir.` : '',
        pageNote ? `HEDEF SAYFANIN GERÇEK İÇERİĞİ (sunucu tarafında çekildi):\n${pageNote}` : '',
        seenBefore.size ? `DAHA ÖNCEKİ GÜNLERDE RAPORLANMIŞ KAYITLAR (bunları tekrar verme, yalnızca YENİ olanları bul):\n${[...seenBefore].slice(0, 60).join('\n')}` : '',
        findings.length ? `ŞU ANA KADARKİ BULGULAR (tekrarlama):\n${findings.map((f) => `- ${f.title} (${f.url})`).join('\n').slice(0, 3000)}` : 'Henüz bulgu yok.',
        visited.size ? `İNCELENEN ADRESLER: ${[...visited].slice(-15).join(', ')}` : '',
        COMPLIANCE_RULES,
        policy === 'lead' ? RELEVANCE_RULES : RESEARCH_RELEVANCE_RULES,
        RECENCY_RULES,
        recentRequired ? 'TARİH KAPISI (ZORUNLU): Bu görev güncel bir zaman penceresi istiyor. Her bulguda posted alanı arama sonucunun gerçek yayın tarihiyle doldurulmalı; kaynakta tarih yoksa bulguyu yazma. “2 saat önce”, “bugün” veya benzeri göreli tarihleri kendin çıkarma ya da uydurma.' : '',
        scopePrompt(scope),
        newsNote ? 'BU ADIMIN İŞİ: Arama sunucu tarafında yapıldı ve sonuçları aşağıda. Görevin AMACINA uyan somut, kaynak destekli kayıtları değerlendir; o sonucun linkini AYNEN kullan. Başlık tek başına müşteri talebi kanıtı değildir. Uygun kayıt yoksa boş liste döndür.' :
        'Bu adımda göreve en çok katkı verecek araştırmayı yap (en fazla 3 web araması ve 2 sayfa okuma hakkın var; aramaları AYNI ANDA değil TEK TEK yap — önce bir arama, sonucu değerlendir, sonra gerekirse bir sonrakini; bir araç hata verirse tekrar deneme, elindeki sonuçlarla devam et). Yalnızca gerçekten gördüğün, kaynağı olan bilgileri yaz; asla uydurma.',
        'ÖNEMLİ: Bir arama sonucunun başlığı ve özeti (snippet) geçerli bir kaynaktır. Arama sonuçlarında gördüğün her uygun ilan / duyuru / ihale / firma kaydını, o sonucun linkiyle birlikte bulgu olarak yaz; bilinmeyen alanları boş bırak. Yalnızca kategori/liste sayfası olan sonuçları (tek bir ilana değil) bulgu sayma. Bu adımda hiç uygun kayıt görmediysen boş liste döndür.',
        'Adım başına EN FAZLA 8 bulgu ver; detail en fazla 2 kısa cümle, evidence en fazla 1 cümle olsun (yanıt kesilmesin). Görev bir liste istiyorsa (ör. "en güncel 20 ilan"), her liste öğesini AYRI bir bulgu olarak ver: title = ilan/firma adı, detail = açıklama + (varsa) kurumsal iletişim + tarih, url = ilanın/sayfanın kendi linki. Daha önce verilmiş öğeleri tekrarlama.',
        newsNote ? `GERÇEK ARAMA SONUÇLARI (Tavily genel web ve/veya Google News RSS; tarih varsa gösterilir; başlık — kaynak + link):\n${newsNote}` : '',
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
      // Native AI araçlarının tarih iddiası değil, en fazla 3 izinli sayfanın yayın metadata'sı kullanılır.
      const undated = [...new Set((j?.new_findings ?? []).map((f) => f.url).filter((url): url is string => Boolean(url && allowed.has(canonical(url)) && !sources.find((s) => canonical(s.url) === canonical(url))?.publication)))].slice(0, 3);
      if (recentRequired) await Promise.all(undated.map(async (url) => {
        const p = await fetchPage(url).catch(() => null);
        if (!p?.ok || !p.publication || canonical(p.url) !== canonical(url)) return;
        const source = sources.find((s) => canonical(s.url) === canonical(url));
        if (source) source.publication = p.publication;
      }));
      let added = 0, dropped = 0, offTopic = 0, dateDropped = 0, scopeRejected = 0;
      const anchors = anchorWords(m);
      for (const f of j?.new_findings ?? []) {
        if (!f.url || !allowed.has(canonical(f.url))) { dropped++; continue; }
        const url = String(f.url);
        const publication = trustedPublication(sources.find((s) => canonical(s.url) === canonical(url))?.publication, url);
        const posted = publication?.posted;
        if (findingDateIssue(publication, url, m)) { dateDropped++; continue; }
        const rel = Number(f.relevance);
        const text = norm(`${f.title ?? ''} ${f.detail ?? ''} ${f.evidence ?? ''} ${f.fit ?? ''}`);
        const opt = (v: unknown, n = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : undefined);
        const candidate = { title: canonicalizeTenantBrand(String(f.title || '').slice(0, 200), ctx.brand_name) || String(f.title || '').slice(0, 200),
          detail: canonicalizeTenantBrand(String(f.detail || '').slice(0, 1500), ctx.brand_name) || String(f.detail || '').slice(0, 1500), url,
          evidence: opt(f.evidence, 500), company: canonicalizeTenantBrand(opt(f.company), ctx.brand_name), location: canonicalizeTenantBrand(opt(f.location), ctx.brand_name), posted, publication,
          phone: opt(f.phone, 40), email: opt(f.email, 120), website: opt(f.website, 300), relevance: Math.min(10, Math.round(rel)), fit: canonicalizeTenantBrand(opt(f.fit, 300), ctx.brand_name) };
        const scopeDecision = evaluateScopeCandidate(candidate, scope);
        if (!scopeDecision.allowed) {
          if (addFinding({ ...candidate, finding_type: 'excluded', verdict: 'rejected', verdict_reason: scopeDecision.reason || 'Kapsam guard adayı reddetti',
            fit: `Kapsam guard: ${scopeDecision.reason || 'explicit görev kısıtı'}` })) scopeRejected++;
          continue;
        }
        // Alaka kapısı: AI puanı ≥ 7 + gerekçe + görevin anahtar kelimelerinden en az biri metinde geçmeli
        if (!(rel >= MIN_RELEVANCE) || !String(f.fit ?? '').trim() || (anchors.length && !anchors.some((a) => text.includes(a)))) { offTopic++; continue; }
        if (addFinding(candidate)) added++;
      }
      // AI cevap veremediyse (boş/okunamaz) veri akışı durmasın: kural tabanlı ön eleme, denetçi sonra doğrular
      let ruleAdded = 0;
      if ((!j || !r.text.trim()) && stepResults.length) { for (const f of ruleFindings(stepResults, m, policy)) if (addFinding(f)) ruleAdded++; }
      if (ruleAdded) await logStep(db, m, step, 'rule_filter', `Yapay zekâ bu adımda sonuç okuyamadı → kural tabanlı ön eleme ${ruleAdded} aday buldu (denetimde doğrulanacak)`);
      stopMet = Boolean(m.stop_condition && j?.stop_condition_met); stopReason = j?.stop_reason || '';
      const safeNextFocus = j?.next_focus && evaluateScopeCandidate({ detail: j.next_focus }, scope).allowed
        ? canonicalizeTenantBrand(j.next_focus, ctx.brand_name)
        : j?.next_focus ? 'Kapsam guard: sonraki adım yalnızca izinli konu ve bölgelerle sınırlı.' : null;
      if (stopReason && !evaluateScopeCandidate({ detail: stopReason }, scope).allowed) stopReason = 'Kapsam guard nedeniyle modelin kapsam dışı bitiş açıklaması kullanılmadı.';
      await logStep(db, m, step, 'ai_research', `${AI_LABEL[r.provider ?? ai.provider] ?? ai.provider} / ${r.model ?? ai.model}: ${r.searches} web araması, ${r.sources.length} kaynak · ${added} yeni bulgu${dropped ? ` · ${dropped} kaynaksız bulgu atıldı` : ''}${dateDropped ? ` · ${dateDropped} tarih kanıtsız/aralık dışı aday elendi` : ''}${offTopic ? ` · ${offTopic} alakasız kayıt elendi` : ''}${scopeRejected ? ` · ${scopeRejected} kapsam dışı aday reddedildi` : ''}${safeNextFocus ? ` · sonraki odak: ${safeNextFocus}` : ''}`,
        null, { searches: r.searches, sources: r.sources.slice(0, 20), added, source_dropped: dropped, date_dropped: dateDropped, off_topic: offTopic, scope_rejected: scopeRejected,
          scope_guard: { enabled: scope.enabled, excluded_terms: scope.excludedTerms, canonical_brand: scope.canonicalBrand }, stop_condition_met: stopMet, stop_reason: stopReason, parsed: Boolean(j), tool_errors: r.toolErrors ?? [], text_tail: canonicalizeTenantBrand(r.text.slice(-1500), ctx.brand_name) || r.text.slice(-1500) }, t0);
      await db.from('bot_missions').update({ provider: r.provider ?? ai.provider, model: r.model ?? ai.model }).eq('id', m.id);
      const aiSearchSucceeded = r.searches > 0 || r.sources.length > 0;
      if (isSearchUnavailable({ hasTargetUrl: Boolean(m.target_url), broadWebSucceeded: broadSearchSucceeded, nativeSearchSucceeded: aiSearchSucceeded, findingCount: findings.length })) {
        const limited = searchProviders.has('Google News RSS') ? 'Google News RSS çalıştı fakat genel web araması sağlayıcısı değildir.' : '';
        return await failSearchUnavailable([...searchFailures, limited, ...(r.toolErrors ?? []).slice(0, 3)].filter(Boolean).join(' · ') || 'Tavily, RSS ve yerleşik AI araması sonuç üretmedi');
      }
    } catch (e) {
      if (e instanceof AiFatalError && !m.target_url && lastResults.length) {
        let n = 0; for (const f of ruleFindings(lastResults, m, policy)) if (addFinding(f)) n++;
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
        const p = await fetchPage(nextUrl); visited.add(canonical(nextUrl)); sources.push({ url: p.url || nextUrl, title: p.title ?? undefined, publication: p.publication });
        let added = 0;
        for (const h of keywordSnippets(p.text, terms)) if (addFinding({ title: `“${h.term}” — ${p.title || 'sayfa'}`, detail: h.snippet, url: p.url || nextUrl, evidence: h.snippet, posted: p.publication?.posted, publication: p.publication })) added++;
        await logStep(db, m, step, 'fetch', `AI'sız sayfa taraması: ${p.title || nextUrl} (HTTP ${p.status}) · ${added} eşleşme`, nextUrl, null, t0);
      } else {
        await logStep(db, m, step, 'analyze', 'Taranacak yeni sayfa kalmadı. Web araması için çalışan bir AI anahtarı/bakiyesi gerekir (Ayarlar → AI anahtarı).', null, null, t0);
        if (!m.target_url || step > 1) { await persist(); return await finalizeMission(db, { ...m, findings, sources, visited: [...visited], step_count: step, tokens_in: tokensIn, tokens_out: tokensOut }, 'no_ai'); }
      }
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
    await db.from('bot_missions').update({ step_count: step, findings, sources: sources.slice(0, 200), visited: [...visited].slice(0, 200), tokens_in: tokensIn, tokens_out: tokensOut, web_searches: m.web_searches ?? 0, ...(stepFailed ? {} : { error_count: 0 }),
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
  const parts = [f.finding_type && `<span>🏷 ${esc(FINDING_TYPE_LABEL[f.finding_type])}</span>`, f.fit && `<span>🎯 ${esc(f.fit)}</span>`, f.company && `<span>🏢 ${esc(f.company)}</span>`, f.location && `<span>📍 ${esc(f.location)}</span>`, f.posted && `<span>🗓 ${esc(f.posted)}</span>`,
    f.phone && `<a href="${telHref(f.phone)}">📞 ${esc(f.phone)}</a>`, f.email && `<a href="mailto:${esc(f.email)}">✉️ ${esc(f.email)}</a>`, f.website && `<a href="${safeHref(f.website)}" target="_blank" rel="noopener">🌐 web</a>`].filter(Boolean);
  return parts.length ? `<div class="facts">${parts.join('')}</div>` : '';
}
const REASON: Record<string, string> = { deadline: 'Süre doldu', stop_condition: 'Bitiş koşulu sağlandı', admin_stop: 'Yönetici durdurdu', max_steps: 'Adım sınırına ulaşıldı', completed_no_findings: 'Tamamlandı — gerçek sıfır bulgu', error: 'Hata', no_ai: 'AI kullanılamadı — yalnızca sayfa taraması yapıldı', budget: 'Harcama sınırı doldu' };
const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—');

export async function finalizeMission(db: Db, m: MissionRow, reason: string) {
  const { data: fresh } = await db.from('bot_missions').select('*').eq('id', m.id).maybeSingle();
  const cur = (fresh ?? m) as MissionRow;
  if (['completed', 'stopped', 'failed'].includes(cur.status)) return { mission_id: m.id, already: cur.status };
  const allFindings = cur.findings || []; const sources = cur.sources || [];
  const [{ data: steps }, ctx] = await Promise.all([
    db.from('bot_mission_steps').select('step_no,action,target,message,data,created_at').eq('mission_id', m.id).order('step_no').order('created_at'),
    botContext(db, cur.bot_id, cur),
  ]);

  let summary = '';
  let tokensIn = cur.tokens_in, tokensOut = cur.tokens_out;
  const ai = reason === 'error' || reason === 'budget' || cur.error_kind === 'ai_credit' || cur.error_kind === 'ai_auth' || (await budgetBlock(db)) ? null : await chooseAi(db, cur.bot_id, cur.model, cur.provider);
  const policy = missionPolicy(ctx, cur);
  const scope = buildMissionScope({ title: cur.title, goal: cur.goal, searchFor: cur.search_for, reportSpec: cur.report_spec,
    canonicalBrand: ctx.brand_name, allowedTopics: searchTerms(cur.search_for) });
  // DENETİM: her bulgu kaynağında kontrol edilir; "elendi" olanlar rapora girmez (denetim kaydında gerekçesiyle durur)
  const audit = allFindings.length ? await auditFindings(db, cur, ai, allFindings, sources, policy, scope) : null;
  if (audit) audit.scope_guard = { enabled: scope.enabled, canonical_brand: scope.canonicalBrand, allowed_topics: scope.allowedTopics, allowed_geos: scope.allowedGeos, excluded_terms: scope.excludedTerms };
  const findings = verifiedFindings(allFindings);
  const pending = allFindings.filter((f) => f.verdict !== 'verified' && f.verdict !== 'rejected');
  const classifiedReason = classifyFinishReason(reason, findings.length, cur.error_kind);
  if (policy === 'research' && findings.length) summary = researchReportSummary(findings);
  if (ai && findings.length && policy !== 'research') {
    try {
      const r = await aiCall(ai, [
        `Aşağıdaki bot görevinin sonuç raporunu Türkçe yaz. YALNIZCA verilen bulguları kullan, yeni bilgi ekleme, web araması yapma.`,
        'MARKA: Kaynak firmaya ait tecrübe yılı, fiyat, sertifika veya başarı iddiasını müşterinin/ajansın kendi özelliği olarak yazma. Kazanılmış müşteri, yeni takipçi veya yorum iddiası yalnız gerçek ölçümle verilir.',
        `Görev: ${cur.title}\nAmaç: ${cur.goal}${cur.search_for ? `\nAranan: ${cur.search_for}` : ''}${cur.report_spec ? `\nRaporda olması gereken: ${cur.report_spec}` : ''}`,
        `Bulgular:\n${findings.map((f, i) => `${i + 1}. ${f.title} — ${f.detail}${f.fit ? ` [neden uygun: ${f.fit}]` : ''} (${f.url})`).join('\n').slice(0, 8000)}`,
        'Biçim: 1) 3-6 cümlelik yönetici özeti 2) madde madde sonuçlar 3) önerilen sonraki adım. Markdown başlık kullanma; düz paragraflar ve "- " maddeleri kullan.',
      ].join('\n\n'), async (msg) => { await logStep(db, cur, cur.step_count + 1, 'ai_failover', msg); });
      summary = canonicalizeTenantBrand(r.text.trim(), ctx.brand_name) || r.text.trim(); tokensIn += r.tokensIn; tokensOut += r.tokensOut;
      const c = await recordUsage(db, { source: 'mission', ref_id: cur.id, provider: r.provider ?? ai.provider, model: r.model ?? ai.model, tokens_in: r.tokensIn, tokens_out: r.tokensOut, searches: r.searches });
      await db.from('bot_missions').update({ cost_usd: Math.round(((Number(cur.cost_usd) || 0) + c) * 10000) / 10000 }).eq('id', cur.id);
    } catch (e) { summary = ''; await logStep(db, cur, cur.step_count + 1, 'error', `Özet yazılamadı: ${String((e as Error).message).slice(0, 300)}`); }
  }
  if (!summary && classifiedReason === 'error') {
    summary = `Görev hata ile bitti: ${ERROR_KIND[cur.error_kind ?? ''] ?? 'bilinmeyen hata'}.${cur.error ? ` Ayrıntı: ${cur.error}` : ''}${findings.length ? ` Hata öncesi ${findings.length} kaynaklı bulgu toplanmıştı.` : ''}`;
  }
  if (!summary) {
    summary = findings.length
      ? `${findings.length} kaynaklı bulgu toplandı. ${findings.slice(0, 5).map((f) => `- ${f.title}`).join('\n')}`
      : classifiedReason === 'completed_no_findings'
        ? `Görev tamamlandı ancak doğrulanmış bir bulgu bulunamadı. ${cur.step_count} adımda ${sources.length} kaynak incelendi; ${pending.length} aday inceleme bekliyor. Bu sonuç başarılı müşteri/lead çıktısı olarak değerlendirilmemelidir.`
        : `Veri bulunamadı. ${cur.step_count} adımda ${sources.length} kaynak incelendi; görevin aradığı bilgiye dair doğrulanabilir bir bulgu çıkmadı.`;
  }

  // KOÇ: raporu ve günlüğü inceleyip yeteneği iyileştirme önerisi çıkarır (Akademi'de onayınıza düşer)
  const coachNoteRaw = ai && classifiedReason !== 'admin_stop' ? await coachMission(db, cur, ai, ctx, audit, (steps || []) as Array<{ action: string; message: string }>, scope) : null;
  const coachNote = coachNoteRaw ? canonicalizeTenantBrand(coachNoteRaw, ctx.brand_name) : null;
  if (cur.purpose === 'skill_test' && cur.skill_ids?.length) {
    const { data: sk } = await db.from('automation_skills').select('lifecycle,capability_kind,handler_key,connector_key,academy_output_kind').eq('id', cur.skill_ids[0]).maybeSingle();
    if (sk) {
      const testedAt = new Date().toISOString();
      const outputEvidence = academyOutputEvidence(sk.academy_output_kind, (steps || []) as Array<{ action?: string | null; message?: string | null; data?: unknown }>);
      const testScore = outputEvidence.score ?? audit?.accuracy ?? 0;
      const capabilityTestStatus = academyTestStatus({ capability_kind: sk.capability_kind, handler_key: sk.handler_key, connector_key: sk.connector_key, academy_output_kind: sk.academy_output_kind, test_score: testScore, test_output_count: outputEvidence.count });
      await db.from('automation_skills').update({ test_score: testScore, test_findings: audit?.verified ?? 0, capability_test_output_count: outputEvidence.count, last_tested_at: testedAt,
        last_test_mission_id: cur.id, capability_test_status: capabilityTestStatus, capability_test_mission_id: cur.id, capability_tested_at: testedAt,
        ...(sk.lifecycle === 'draft' ? { lifecycle: 'testing' } : {}) }).eq('id', cur.skill_ids[0]);
    }
  }

  const status = classifiedReason === 'admin_stop' ? 'stopped' : classifiedReason === 'error' ? 'failed' : 'completed';
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
  <body><main><div class="brand">${LOGO_SVG}<div><b>Embay Yapı & Şahin Manitou</b><small>Bot görev raporu · 0531 436 29 04 · sahin-manitou-kiralama.vercel.app</small></div></div><h1>${esc(cur.title)}</h1><span class="badge">${esc(REASON[classifiedReason] ?? classifiedReason)}${classifiedReason === 'error' && cur.error_kind ? ` — ${esc(ERROR_KIND[cur.error_kind] ?? cur.error_kind)}` : ''}</span>
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

  await db.from('bot_missions').update({ status, finish_reason: classifiedReason, finished_at: finishedAt, summary, report_html: html, tokens_in: tokensIn, tokens_out: tokensOut, locked_until: null,
    ...(audit ? { audit, findings: allFindings } : {}), ...(coachNote ? { coach_note: coachNote } : {}) }).eq('id', m.id);
  await logStep(db, cur, cur.step_count + 1, 'finalize', `Rapor hazırlandı · ${REASON[classifiedReason] ?? classifiedReason} · ${findings.length} bulgu${audit ? ` · denetim: %${audit.accuracy} doğruluk (✅${audit.verified} ⚠️${audit.suspicious} ❌${audit.rejected})` : ''}`);
  if (missionPolicy(ctx, cur) === 'growth') await saveSocialProspects(db, cur, findings);
  if (missionPolicy(ctx, cur) === 'lead') await savePortfolio(db, cur, findings);
  await sendMissionTelegram(db, cur, classifiedReason, summary, findings, audit);
  return { mission_id: m.id, finalized: true, reason: classifiedReason, findings: findings.length };
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
  const rows = findings.map((f) => ({ f, type: f.finding_type ?? classifyFindingType(f), p: socialProfile(f.url) || (f.website ? socialProfile(f.website) : null) })).filter((x) => x.p);
  // Yalnızca işletme/kurum hesabı: başlık veya kullanıcı adında işletme işareti olmalı; kişi profili (ad.soyad, telefonlu), okul/resmi kurum elenir (KVKK)
  const BIZ = /insaat|yapi|yapı|mimar|muhendis|mühendis|makine|makina|kiralama|manitou|forklift|vinc|vinç|hafriyat|beton|demir|celik|çelik|iskele|prefabrik|group|grup|ltd|a\.s|a\.ş|san\.|tic\.|kentsel|donusum|dönüşüm|emlak|gayrimenkul|tadilat|cati|çatı|dekorasyon|haber|burada|medya|dergi|construction|build/i;
  const NOT_BIZ = /lisesi|okulu|universitesi|üniversitesi|kaymakaml|valilig|muhtarl|cami/i;
  let n = 0;
  let skipped = 0;
  for (const { f, type, p } of rows) {
    // Sosyal profil keşfi müşteri lead’i üretmez. Resmî kurumlar ve kamu
    // fırsatları da takip listesine otomatik yazılmaz; ayrı sınıf olarak kalır.
    if (type === 'customer_lead' || type === 'public_institution' || type === 'public_opportunity' || type === 'excluded') { skipped++; continue; }
    const label = `${f.title} ${p!.handle}`;
    if (!BIZ.test(label) || NOT_BIZ.test(label) || /\d{7,}/.test(p!.handle)) continue;
    const t = norm(`${f.title} ${f.detail} ${f.fit ?? ''}`);
    const kind = type === 'competitor_or_reference' ? 'competitor' : /tedarik|malzeme|beton|demir|iskele|bayi|uretic/.test(t) ? 'supplier' : /haber|medya|dergi|gazete/.test(t) ? 'industry_media' : type === 'business_or_partner' ? 'partner' : 'local_business';
    const { error } = await db.from('social_prospects').upsert({ platform: p!.platform, handle: p!.handle, profile_name: f.company || f.title.slice(0, 120), profile_url: `https://www.${p!.platform}.com/${p!.handle}`,
      source_url: f.url, source_type: 'bot_mission', engagement_type: 'business_profile', relevance_score: Math.min(100, (f.relevance ?? 6) * 10), consent_status: 'not_required_public_note',
      notes: (f.fit || f.detail || '').slice(0, 500), account_kind: kind, bot_mission_id: cur.id, owner_id: cur.created_by }, { onConflict: 'platform,handle', ignoreDuplicates: true });
    if (!error) n++; else console.error('prospect', error.message);
  }
  if (n || skipped) await logStep(db, cur, cur.step_count + 1, 'prospects', `${n} işletme hesabı takip listesine eklendi${skipped ? ` · ${skipped} müşteri/kamu adayı takip listesine alınmadı` : ''} (Raporlar → Takip listesi)`);
}

// İstanbul ilçeleri (portföyde bölge filtresi için)
const ILCELER = ['Çatalca', 'Silivri', 'Büyükçekmece', 'Küçükçekmece', 'Arnavutköy', 'Başakşehir', 'Esenyurt', 'Beylikdüzü', 'Avcılar', 'Bahçelievler', 'Bağcılar', 'Güngören', 'Esenler',
  'Bayrampaşa', 'Zeytinburnu', 'Bakırköy', 'Eyüpsultan', 'Sultangazi', 'Gaziosmanpaşa', 'Fatih', 'Beyoğlu', 'Şişli', 'Kağıthane', 'Sarıyer', 'Beşiktaş', 'Üsküdar', 'Kadıköy', 'Ataşehir',
  'Ümraniye', 'Maltepe', 'Kartal', 'Pendik', 'Tuzla', 'Sultanbeyli', 'Sancaktepe', 'Çekmeköy', 'Beykoz', 'Şile', 'Adalar'];
const ILLER = ['İstanbul', 'Kocaeli', 'Tekirdağ', 'Kırklareli', 'Edirne', 'Sakarya', 'Bursa', 'Yalova', 'Ankara', 'İzmir'];
// Önce konum alanı, sonra başlık, en son açıklama; metinde ilk geçen ilçe alınır (liste sırası değil)
function placeOf(...parts: Array<string | null | undefined>) {
  for (const part of parts) {
    const t = norm(part ?? '');
    if (!t) continue;
    if (/havaliman[ıi]|havaalan[ıi]/.test(t) && /istanbul/.test(t)) return { il: 'İstanbul', ilce: 'Arnavutköy' };
    const hits = ILCELER.map((i) => ({ i, at: t.search(new RegExp(`(^|[^\\p{L}])${norm(i)}([^\\p{L}]|$)`, 'u')) })).filter((h) => h.at >= 0).sort((a, b) => a.at - b.at);
    if (hits.length) return { il: 'İstanbul', ilce: hits[0].i };
    const il = ILLER.find((i) => t.includes(norm(i)));
    if (il) return { il, ilce: null };
  }
  return { il: null, ilce: null };
}
function projectType(text: string) {
  const t = norm(text);
  if (/kentsel donusum|kat karsiligi|riskli yapi/.test(t)) return 'kentsel_donusum';
  if (/villa|mustakil|konut|daire|apartman|prefabrik|betonarme ev|site/.test(t)) return 'konut';
  if (/lojistik|depo|antrepo/.test(t)) return 'depo_lojistik';
  if (/fabrika|sanayi|tesis|uretim/.test(t)) return 'fabrika';
  if (/avm|otel|ofis|plaza|ticari|magaza/.test(t)) return 'ticari';
  if (/yol|kopru|tunel|altyapi|metro|dsi/.test(t)) return 'altyapi';
  if (/belediye|okul|hastane|toki|kamu/.test(t)) return 'kamu';
  return 'diger';
}
function projectStage(text: string) {
  const t = norm(text);
  if (/temel atma|temeli atil|kazi|hafriyat/.test(t)) return 'kazi';
  if (/kaba insaat|karkas|beton dokum/.test(t)) return 'kaba_insaat';
  if (/ince insaat|tadilat|dis cephe|mantolama/.test(t)) return 'ince_insaat';
  if (/ihale/.test(t)) return 'ihale';
  if (/ruhsat|proje onay/.test(t)) return 'ruhsat';
  if (/yikim/.test(t)) return 'yikim';
  if (/planlan|yapilacak|baslayacak|talep|ariyor/.test(t)) return 'planlama';
  if (/tamamlandi|teslim edildi/.test(t)) return 'tamamlandi';
  return 'bilinmiyor';
}

/** PORTFÖY: yalnızca denetimde doğrulanan bulgular Firma Portföyü'ne proje + firma olarak işlenir.
 *  Aynı proje/firma tekrar gelirse birleştirilir (RPC içinde tekilleştirme). Elenen, sosyal profil ve eğitim-testi bulguları alınmaz. Yalnızca kurumsal, herkese açık bilgi. */
async function savePortfolio(db: Db, cur: MissionRow, findings: Finding[]) {
  if (cur.purpose === 'skill_test') return;
  let projects = 0, companies = 0;
  for (const f of findings) {
    if (f.verdict !== 'verified' || (f.finding_type ?? classifyFindingType(f)) !== 'customer_lead' || !/^https?:\/\//i.test(f.url || '') || socialProfile(f.url) || findingDateIssue(f.publication, f.url, cur)) continue;
    const text = `${f.title} ${f.detail} ${f.location ?? ''} ${f.fit ?? ''}`;
    const { il, ilce } = placeOf(f.location, f.title, f.detail);
    const note = ['✅ Denetimde doğrulandı.', f.summary || f.detail, f.fit ? `Uygunluk: ${f.fit}` : '', f.posted ? `Tarih: ${f.posted}` : '', `Görev: ${cur.title}`]
      .filter(Boolean).join('\n').slice(0, 1500);
    const score = Math.max(70, (f.relevance ?? 7) * 10);
    let projectId: string | null = null;
    try {
      const { data, error } = await db.rpc('portfolio_upsert_project', { p: { name: f.title.slice(0, 200), project_type: projectType(text), stage: projectStage(text), il, ilce, address: f.location ?? null,
        estimated_need: /manitou|telehandler|teleskop|forklift|vinc/.test(norm(`${cur.title} ${cur.search_for ?? ''}`)) ? 'Manitou / malzeme kaldırma ihtiyacı olabilir' : null,
        source_url: f.url, source_title: f.title.slice(0, 200), ai_notes: note, priority_score: score, priority_reasons: [f.verdict ?? 'unverified', ...(f.fit ? [f.fit.slice(0, 120)] : [])], source: 'bot_mission' }, p_bot_id: cur.bot_id, p_run_id: null, p_finding_id: null });
      if (error) throw error;
      projectId = (data as { id?: string; project_id?: string } | null)?.id ?? (data as { project_id?: string } | null)?.project_id ?? null;
      projects++;
    } catch (e) { console.error('portfolio project', String((e as Error).message)); }
    if (f.company && f.company.trim().length >= 2) {
      try {
        const { data, error } = await db.rpc('portfolio_upsert_company', { p: { firm_name: f.company.slice(0, 160), website: f.website ?? null, public_phone: f.phone ?? null, public_email: f.email ?? null,
          il, ilce, address: f.location ?? null, need: cur.search_for ?? null, project: f.title.slice(0, 200), ai_notes: note, priority_score: score, source_url: f.url, source: 'bot_mission' }, p_bot_id: cur.bot_id, p_run_id: null, p_finding_id: null });
        if (error) throw error;
        companies++;
        const companyId = (data as { id?: string; company_id?: string } | null)?.id ?? (data as { company_id?: string } | null)?.company_id ?? null;
        if (projectId && companyId) await db.rpc('portfolio_link', { p_project_id: projectId, p_company_id: companyId, p_role: 'diger', p_source_url: f.url });
      } catch (e) { console.error('portfolio company', String((e as Error).message)); }
    }
  }
  if (projects || companies) await logStep(db, cur, cur.step_count + 1, 'portfolio', `Firma Portföyü: ${projects} proje, ${companies} firma işlendi (yeni veya mevcut kayıtla birleştirildi)`);
}

const VERDICT: Record<string, string> = { verified: '✅ Doğrulandı', suspicious: '⚠️ Şüpheli', rejected: '❌ Elendi' };

/** DENETİM: her bulgunun kaynağı açılır, içerik bulguyla karşılaştırılır; ardından ayrı bir AI "hakem" gerçeklik + güncellik + amaca uygunluk kararı verir.
 *  verified = kaynak bulguyu doğruluyor, somut ve güncel · suspicious = gerçek ama belirsiz/eski/dolaylı · rejected = uydurma, kaynakla çelişen veya amaç dışı. */
export async function auditFindings(db: Db, cur: MissionRow, ai: AiChoice | null, findings: Finding[], sources: Source[], policy: MissionPolicy = 'lead', scope?: MissionScopeContract): Promise<MissionAudit> {
  const scopeRejected = new WeakSet(findings.filter((f) => f.verdict === 'rejected' && /^Kapsam guard/i.test(f.verdict_reason || '')));
  for (const f of findings) {
    f.finding_type ??= classifyFindingType(f);
    if (scopeRejected.has(f)) f.finding_type = 'excluded';
    if (scope?.canonicalBrand) {
      f.title = canonicalizeTenantBrand(f.title, scope.canonicalBrand) || f.title;
      f.detail = canonicalizeTenantBrand(f.detail, scope.canonicalBrand) || f.detail;
      f.company = canonicalizeTenantBrand(f.company, scope.canonicalBrand);
      f.fit = canonicalizeTenantBrand(f.fit, scope.canonicalBrand);
      f.summary = canonicalizeTenantBrand(f.summary, scope.canonicalBrand);
    }
  }
  const srcTitle = new Map(sources.map((s) => [canonical(s.url), s.title || '']));
  const srcPublication = new Map(sources.map((s) => [canonical(s.url), trustedPublication(s.publication, s.url)]));
  const checks = await Promise.all(findings.slice(0, 20).map(async (f) => {
    if (scopeRejected.has(f)) return { f, reachable: false, excerpt: f.verdict_reason || 'Kapsam guard tarafından önceden reddedildi', match: false, desc: '', searchBacked: false, searchBackedReason: undefined };
    const inSources = srcTitle.has(canonical(f.url));
    const publication = srcPublication.get(canonical(f.url));
    f.publication = publication; f.posted = publication?.posted;
    if (f.verification === 'technical_http') {
      return { f, reachable: inSources, excerpt: f.evidence || f.detail, match: inSources, desc: '', searchBacked: false, searchBackedReason: undefined };
    }
    let host = ''; try { host = new URL(f.url).hostname; } catch { /* */ }
    const searchBacked = policy === 'growth' ? searchBackedSocialProfile({ url: f.url, findingTitle: f.title, sourceTitle: srcTitle.get(canonical(f.url)), detail: f.detail, evidence: f.evidence, fit: f.fit, sourceUrlPresent: inSources }) : null;
    if (searchBacked?.ok) return { f, reachable: true, excerpt: `Herkese açık arama sonucu profil başlığı/özeti: ${srcTitle.get(canonical(f.url)) || f.title}\n${f.evidence || f.detail || ''}`, match: true, desc: '', searchBacked: true, searchBackedReason: searchBacked.reason };
    if (/news\.google\.com$/.test(host)) return { f, reachable: inSources, excerpt: `Haber başlığı (Google Haberler akışından): ${srcTitle.get(canonical(f.url)) || ''}`, match: inSources && sourceSupportsTitle(f.title, srcTitle.get(canonical(f.url)) || ''), desc: '', searchBacked: false, searchBackedReason: undefined };
    const p = await fetchPage(f.url).catch(() => null);
    // Sayfanın yayın metadata'sı, arama indeks tarihinden önceliklidir; AI posted alanı hiç kullanılmaz.
    if (p?.ok && p.publication && canonical(p.url) === canonical(f.url)) { f.publication = p.publication; f.posted = p.publication.posted; }
    const text = p?.text || '';
    const words = norm(f.title).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 5).slice(0, 8);
    const idx = words.length ? norm(text).indexOf(words[0].slice(0, 5)) : -1;
    const excerpt = text ? text.slice(Math.max(0, idx - 200), Math.max(0, idx - 200) + 900) : (p?.error ?? `HTTP ${p?.status ?? '?'}`);
    return { f, reachable: Boolean(p?.ok), excerpt, match: sourceSupportsTitle(f.title, text), desc: String(p?.description || p?.og?.['og:description'] || '').trim(), searchBacked: false, searchBackedReason: undefined };
  }));
  const verdicts = new Map<number, { v: Finding['verdict']; r: string }>();
  if (ai && checks.length) {
    try {
      const r = await aiCall(ai, [
        'Sen bir DENETÇİSİN. Bir botun topladığı bulguları kaynaklarıyla karşılaştırıp gerçek ve kullanılabilir olup olmadığına karar ver. Kendi bilginle bulgu uydurma veya düzeltme.',
        `GÖREVİN AMACI: ${cur.goal}`,
        'Karar ölçütleri: "verified" = kaynak metni bulguyu açıkça doğruluyor, görevin istediği çıktı türüne doğrudan uyuyor ve tarih şartını karşılıyor; "suspicious" = gerçek görünüyor ama kanıt zayıf, dolaylı veya sayfa okunamadı; "rejected" = kaynakla çelişiyor, uydurma ya da görevin amacına uymuyor. Pazar/SEO/içerik araştırması ise görevle ilgili sektör kaynağı, açıkça müşteri talebi olmadığı belirtilerek geçerli olabilir.',
        'BULGU TÜRÜ KURALI: İşletme profili, rakip/tedarikçi tanıtımı veya belediye/devlet kurumu kaydı müşteri lead’i değildir. Müşteri lead’i yalnız açık hizmet/iş talebi kanıtı olan kayıttır; kamu ihalesi ayrı kamu fırsatıdır. Tür metadata’sını değiştirme veya olmayan talep icat etme.',
        ...(policy === 'growth' ? ['GROWTH PROFİL KURALI: Instagram/Facebook profil sayfaları kullanım koşulları nedeniyle doğrudan açılmaz. Exact profil URL’si arama kaynaklarında mevcutsa ve başlık/özet işletme sinyaliyle eşleşiyorsa bu, hesap keşfi görevi için gerçek ve kullanılabilir kanıttır; doğrudan sayfa açılmadı diye otomatik olarak suspicious verme.'] : []),
        checks.map((c, i) => `#${i} BAŞLIK: ${c.f.title}\nTÜR: ${c.f.finding_type ?? 'belirsiz'}\nDETAY: ${c.f.detail}\nNEDEN UYGUN (bot): ${c.f.fit ?? '-'}\nLINK: ${c.f.url}\nSUNUCU YAYIN KANITI: ${c.f.publication ? `${c.f.publication.posted} (${c.f.publication.origin})` : 'yok'}\nSAYFA AÇILDI: ${c.reachable ? 'evet' : 'hayır'} · BAŞLIK SAYFADA GEÇİYOR: ${c.match ? 'evet' : 'hayır'}\nKAYNAKTAN KESİT: ${c.excerpt.slice(0, 700)}`).join('\n\n'),
        'Her bulgu için ayrıca kaynağa dayanan 2-3 cümlelik TÜRKÇE ÖZET yaz: ne, kim, nerede, ne zaman, büyüklük; ve bizim için ne anlama geldiği. Kaynakta olmayan bilgi ekleme.',
        'YALNIZCA şu JSON\'u döndür: {"items":[{"i":0,"verdict":"verified|suspicious|rejected","reason":"tek kısa cümle","summary":"2-3 cümle özet"}]}',
      ].join('\n\n'));
      const j = extractJson(r.text) as { items?: Array<{ i: number; verdict: string; reason?: string; summary?: string }> } | null;
      for (const it of j?.items ?? []) {
        if (['verified', 'suspicious', 'rejected'].includes(it.verdict)) verdicts.set(Number(it.i), { v: it.verdict as Finding['verdict'], r: String(it.reason || '').slice(0, 240) });
        const c = checks[Number(it.i)]; if (c && it.summary && String(it.summary).trim().length > 20) c.f.summary = canonicalizeTenantBrand(String(it.summary).trim().slice(0, 700), scope?.canonicalBrand) || String(it.summary).trim().slice(0, 700);
      }
      await recordUsage(db, { source: 'mission', ref_id: cur.id, provider: r.provider ?? ai.provider, model: r.model ?? ai.model, tokens_in: r.tokensIn, tokens_out: r.tokensOut, searches: 0 });
    } catch (e) { await logStep(db, cur, cur.step_count + 1, 'error', `Denetim AI hakemi çalışmadı, kural tabanlı denetim yapıldı: ${String((e as Error).message).slice(0, 200)}`); }
  }
  checks.forEach((c, i) => {
    if (scopeRejected.has(c.f)) {
      c.f.finding_type = 'excluded'; c.f.verdict = 'rejected'; c.f.summary = undefined;
      c.f.verdict_reason = c.f.verdict_reason || 'Kapsam guard adayı explicit görev kısıtı nedeniyle reddetti';
      return;
    }
    if (c.f.verification === 'technical_http') {
      c.f.verdict = 'verified';
      c.f.verdict_reason = 'Deterministik gerçek HTTP SEO audit çıktısı ve aynı görevde kaydedilmiş kaynak URL ile doğrulandı';
      c.f.summary = `Teknik HTTP denetimi gerçek sayfa yanıtından üretildi; skor ve her kontrol adım günlüğünde saklandı.`;
      return;
    }
    const dateIssue = findingDateIssue(c.f.publication, c.f.url, cur) || (policy === 'lead' ? isStaleFinding(c.f) : null);
    if (dateIssue) {
      c.f.verdict = 'rejected';
      c.f.verdict_reason = dateIssue; c.f.summary = undefined;
      return;
    }
    // AI hakemi yoksa normal web bulgusu doğrulanmaz; Growth profil istisnasında exact arama kaynağı + işletme sinyali yeterli kanıttır.
    const v = verdicts.get(i) ?? (c.searchBacked ? { v: 'verified' as const, r: c.searchBackedReason || 'Exact sosyal profil URL’si ve işletme sinyali gerçek arama kaynağıyla eşleşti' }
      : c.reachable && c.match ? { v: 'suspicious' as const, r: 'Kaynak var ve başlık kaynakta geçiyor; AI hakemi çalışmadığı için amaca uygunluk doğrulanmadı' }
      : c.reachable ? { v: 'suspicious' as const, r: 'Kaynak açıldı ama bulgu metinde net görülmedi (kural tabanlı)' } : { v: 'suspicious' as const, r: 'Kaynak sayfası okunamadı (kural tabanlı)' });
    // Güvenlik: kaynağı açılamayan ve toplanan kaynaklarda da olmayan bulgu "doğrulandı" sayılmaz
    c.f.verdict = (!c.reachable || !c.match) && v.v === 'verified' ? 'suspicious' : v.v;
    c.f.verdict_reason = c.f.verdict !== v.v ? 'Kaynak erişimi veya içerik eşleşmesi doğrulanamadı; AI kararı tek başına yeterli değil' : v.r;
    // AI özeti yoksa: sayfanın kendi açıklaması veya kaynaktan ilgili kesit (uydurma yok)
    if (!c.f.summary) {
      const src = (c.desc && c.desc.length > 40 ? c.desc : c.reachable ? c.excerpt.replace(/\s+/g, ' ').trim() : '') || '';
      if (src.length > 40) c.f.summary = `Kaynaktan: ${src.slice(0, 420)}${src.length > 420 ? '…' : ''}`;
    }
  });
  for (const f of findings.slice(20)) {
    if (scopeRejected.has(f)) { f.finding_type = 'excluded'; f.verdict = 'rejected'; f.summary = undefined; continue; }
    f.publication = srcPublication.get(canonical(f.url)); f.posted = f.publication?.posted;
    const issue = findingDateIssue(f.publication, f.url, cur) || (policy === 'lead' ? isStaleFinding(f) : null);
    f.verdict = issue ? 'rejected' : 'suspicious'; f.verdict_reason = issue || 'İçerik denetim sınırı (ilk 20 bulgu) dışında kaldı — doğrulanmış müşteri değildir';
    if (issue) f.summary = undefined;
  }
  const count = (v: string) => findings.filter((f) => f.verdict === v).length;
  const type_counts = findings.reduce<Partial<Record<FindingType, number>>>((acc, f) => {
    const type = f.finding_type ?? classifyFindingType(f); acc[type] = (acc[type] ?? 0) + 1; return acc;
  }, {});
  const verified_customer_leads = findings.filter((f) => f.verdict === 'verified' && f.finding_type === 'customer_lead').length;
  const verified_target_accounts = findings.filter((f) => f.verdict === 'verified' && ['business_or_partner', 'competitor_or_reference'].includes(f.finding_type ?? '')).length;
  const audit: MissionAudit = { total: findings.length, verified: count('verified'), suspicious: count('suspicious'), rejected: count('rejected'),
    accuracy: findings.length ? Math.round((count('verified') / findings.length) * 100) : 0, checked_at: new Date().toISOString(), type_counts, verified_customer_leads, verified_target_accounts,
    rejected_items: findings.filter((f) => f.verdict === 'rejected').map((f) => ({ title: f.title, url: f.url, reason: f.verdict_reason ?? '' })).slice(0, 20) };
  if (scope) audit.scope_guard = { enabled: scope.enabled, canonical_brand: scope.canonicalBrand, allowed_topics: scope.allowedTopics, allowed_geos: scope.allowedGeos, excluded_terms: scope.excludedTerms };
  await logStep(db, cur, cur.step_count + 1, 'audit', `Denetim: ${audit.total} bulgu kontrol edildi · ✅${audit.verified} doğrulandı · ⚠️${audit.suspicious} şüpheli · ❌${audit.rejected} elendi · doğruluk %${audit.accuracy}`, null, audit);
  return audit;
}

/** KOÇ: görevin günlüğü + denetim sonucuna bakıp yeteneğin eksiğini teşhis eder, somut iyileştirme önerir (Akademi'de onaya düşer). */
async function coachMission(db: Db, cur: MissionRow, ai: AiChoice, ctx: { skills: Array<{ id: string; name: string }>; terms: string[]; text: string }, audit: MissionAudit | null, steps: Array<{ action: string; message: string }>, scope?: MissionScopeContract) {
  try {
    const log = steps.filter((s) => ['news_search', 'ai_research', 'audit', 'error'].includes(s.action)).map((s) => `[${s.action}] ${s.message}`).join('\n').slice(0, 5000);
    const r = await aiCall(ai, [
      'Sen bir bot KOÇUSUN. Aşağıdaki araştırma görevinin günlüğünü ve denetim sonucunu incele; botun neden az/alakasız/doğrulanamayan bulgu getirdiğini teşhis et ve yeteneğini iyileştirecek SOMUT öneriler ver.',
      `GÖREV: ${cur.title}\nAMAÇ: ${cur.goal}\nKULLANILAN YETENEKLER: ${ctx.skills.map((s) => s.name).join(', ') || '(yok)'}\nMEVCUT ARAMA TERİMLERİ: ${ctx.terms.join(', ') || cur.search_for || '-'}`,
      audit ? `DENETİM: ${audit.total} bulgu · doğrulandı ${audit.verified} · şüpheli ${audit.suspicious} · elendi ${audit.rejected} · doğruluk %${audit.accuracy}\nELENENLER: ${(audit.rejected_items || []).map((x) => `${x.title} (${x.reason})`).join(' | ').slice(0, 1500)}` : 'DENETİM: hiç bulgu yok.',
      `GÜNLÜK:\n${log}`,
      scope ? scopePrompt(scope) : '',
      'Kurallar: yalnızca yasal, herkese açık kaynaklar (KVKK); giriş gerektiren veya kazımayı yasaklayan platformları önerme. Arama terimleri Türkçe, kısa ve gerçek insanların/firmaların yazacağı ifadeler olsun (ör. "villa yaptırmak istiyorum", "kat karşılığı müteahhit aranıyor", "çelik yapı firması arıyor").',
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
