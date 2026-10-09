// deno test --node-modules-dir=auto --no-lock tests/mission-audit.integration.test.ts
// Hiçbir gerçek API/DB çağrısı yapılmaz; AI hakemi null, fetch ve DB tamamen mock.
import { auditFindings, ruleFindings, type Finding, type MissionRow } from '../supabase/functions/_shared/mission.ts';
import { missionPolicy } from '../supabase/functions/_shared/pure/policy.ts';
import { makePublicationEvidence } from '../supabase/functions/_shared/pure/publication.ts';
import { findingCounts, verifiedFindings, classifyFinishReason } from '../supabase/functions/_shared/pure/outcome.ts';
import { buildMissionScope } from '../supabase/functions/_shared/pure/mission-scope.ts';
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`); }
const mission = { id: 'test-only', title: 'Güncel müşteri talebi', goal: 'Son 30 gün içinde müşteri talebi bul', step_count: 1 } as MissionRow;
const db = { from: () => ({ insert: async () => ({ error: null }) }) } as unknown as Parameters<typeof auditFindings>[0];
const finding = (i: number, url = `https://news.google.com/articles/test-${i}`): Finding => ({ title: `Konut talebi ${i}`, detail: 'Sahte ağ testi', url, posted: '2 saat önce', relevance: 9, at: new Date().toISOString(), step: 1 });

Deno.test('21 tarihsiz adayın tamamı reddedilir; 21. aday sınırdan kaçamaz', async () => {
  const findings = Array.from({ length: 21 }, (_, i) => finding(i));
  const sources = findings.map((f) => ({ url: f.url, title: f.title }));
  const audit = await auditFindings(db, mission, null, findings, sources);
  equal([audit.total, audit.verified, audit.suspicious, audit.rejected], [21, 0, 0, 21]);
  equal(verifiedFindings(findings).length, 0);
  equal(classifyFinishReason('deadline', findingCounts(findings).verified), 'completed_no_findings');
});
Deno.test('Parse edilebilir AI ISO iddiası kaynak metadata yoksa kabul edilmez', async () => {
  const f = finding(0); f.posted = new Date().toISOString().slice(0, 10);
  const audit = await auditFindings(db, mission, null, [f], [{ url: f.url, title: f.title }]);
  equal(audit.rejected, 1); equal(f.posted, undefined); equal(f.verdict, 'rejected');
});
Deno.test('Kaynak tarihi olan aday AI hakemi yoksa verified değildir', async () => {
  const f = finding(0);
  const publication = makePublicationEvidence(new Date().toISOString().slice(0, 10), 'search_metadata', f.url)!;
  const audit = await auditFindings(db, mission, null, [f], [{ url: f.url, title: f.title, publication }]);
  equal([audit.verified, audit.suspicious, audit.rejected], [0, 1, 0]);
  equal(verifiedFindings([f]).length, 0);
});
Deno.test('Sayfadaki eski datePublished arama indeksinin yeni tarihinden önceliklidir', async () => {
  const f = finding(0, 'https://example.com/eski-forum');
  const publication = makePublicationEvidence(new Date().toISOString().slice(0, 10), 'search_metadata', f.url)!;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL) => Promise.resolve(new Response(String(input).endsWith('/robots.txt') ? 'User-agent: *\nAllow: /' : '<html><head><meta property="article:published_time" content="2018-08-27"></head><body>Konut talebi</body></html>', { status: 200, headers: { 'content-type': 'text/html' } }))) as typeof fetch;
  // Response.url yerel mock'ta boştur; gerçek fetch davranışını sahte URL ile yeniden üret.
  const fakeFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { const res = await fakeFetch(input, init); Object.defineProperty(res, 'url', { value: String(input) }); return res; }) as typeof fetch;
  try {
    const audit = await auditFindings(db, mission, null, [f], [{ url: f.url, title: f.title, publication }]);
    equal(audit.rejected, 1); equal(f.posted, '2018-08-27');
  } finally { globalThis.fetch = originalFetch; }
});
Deno.test('Genel SaaS pazar görevi inşaat kelimesi gerektirmez; lead politikası ayrıdır', () => {
  const m = { title: 'SaaS pazar araştırması', goal: 'SaaS pazar kaynaklarını incele', search_for: 'SaaS pazar', report_spec: null };
  const result = { title: 'SaaS pazar analizi', snippet: 'Kurumsal yazılım kullanımı', url: 'https://example.com/saas', posted: null, source: null };
  equal(missionPolicy({ slug: 'market-intel-bot', bot_type: 'research' }, m), 'research');
  equal(ruleFindings([result], m, 'research').length, 1);
  equal(ruleFindings([result], m, 'lead').length, 0);
  equal(missionPolicy({ slug: 'insaat-is-bulucu', bot_type: 'research' }, m), 'lead');
  equal(missionPolicy({ slug: 'sosyal-buyume', bot_type: 'research' }, m), 'growth');
});

Deno.test('Eski yayın tarihli kalıcı katalog araştırma adayıdır, güncel lead değildir', async () => {
  const m = { ...mission, title: 'Ürün katalogları', goal: 'Sektördeki kalıcı ürün kataloglarını incele' };
  const f = finding(0); f.title = 'Ürün katalogları';
  const publication = makePublicationEvidence('2025-04-15', 'search_metadata', f.url)!;
  const sources = [{ url: f.url, title: f.title, publication }];
  const research = await auditFindings(db, m, null, [f], sources, 'research');
  equal([research.verified,research.suspicious,research.rejected], [0,1,0]);
  const lead = await auditFindings(db, m, null, [{...f}], sources, 'lead');
  equal(lead.rejected,1);
});

Deno.test('Growth profilleri müşteri lead’i, rakip/iş ortağı ve kamu kurumu olarak ayrılır', async () => {
  const items = [
    finding(1, 'https://www.instagram.com/catalcabld'),
    finding(2, 'https://www.instagram.com/eren.prefabrik'),
    finding(3, 'https://www.instagram.com/catalca_arsa_ofisi'),
  ];
  items[0].title = 'T.C. Çatalca Belediyesi (@catalcabld)'; items[0].detail = 'Resmî belediye kurumu ve yerel duyuru profili';
  items[1].title = 'Eren Prefabrik (@eren.prefabrik)'; items[1].detail = 'Prefabrik ve çelik yapı üreticisi, proje tanıtım hesabı';
  items[2].title = 'Çatalca Arsa Ofisi (@catalca_arsa_ofisi)'; items[2].detail = 'Arsa ve villa odaklı emlak işletmesi, iş ortağı adayı';
  const sources = items.map((f) => ({ url: f.url, title: f.title }));
  const audit = await auditFindings(db, { ...mission, title: 'Growth sektör hesap keşfi', goal: 'Embay Yapı için işletme hesapları bul' }, null, items, sources, 'growth');
  equal(items.map((f) => f.finding_type), ['public_institution', 'competitor_or_reference', 'business_or_partner']);
  equal([audit.verified_customer_leads, audit.verified_target_accounts, audit.type_counts?.public_institution], [0, 2, 1]);
});

Deno.test('Scope guard reddi audit içinde excluded olarak korunur ve verified sayılmaz', async () => {
  const f: Finding = { title: 'Manitou kiralama profili', detail: 'Şahin Manitou hizmeti', url: 'https://example.com/manitou',
    finding_type: 'excluded', verdict: 'rejected', verdict_reason: 'Kapsam guard adayı reddetti: manitou', at: new Date().toISOString(), step: 1 };
  const scope = buildMissionScope({ goal: 'Şahin Manitou dışla', canonicalBrand: 'Embay Yapı' });
  const audit = await auditFindings(db, { ...mission, goal: 'Embay Yapı profilleri', title: 'Growth' }, null, [f], [{ url: f.url, title: f.title }], 'growth', scope);
  equal([audit.verified, audit.suspicious, audit.rejected, audit.type_counts?.excluded], [0, 0, 1, 1]);
  equal(f.finding_type, 'excluded');
  equal(verifiedFindings([f]).length, 0);
});
