import { strict as assert } from 'node:assert';
import { runSeoAudit, seoAuditDetail } from '../supabase/functions/_shared/pure/seo-audit.ts';

const home = `<!doctype html><html lang="tr"><head>
<title>Embay Yapı | Anahtar Teslim Ev ve Villa Yapımı – İstanbul</title>
<meta name="description" content="Embay Yapı: İstanbul'da müstakil ev, villa, çelik ve betonarme yapılarda anahtar teslim inşaat. Ev modellerimizi ve teslim ettiğimiz projeleri inceleyin. Teklif: 0531 436 29 04" />
<meta content="Embay Yapı | Anahtar Teslim Ev ve Villa Yapımı – İstanbul" property="og:title" />
<meta content="Embay Yapı showroom" property="og:description" />
<link href="https://embayyapi.vercel.app/" rel="canonical" />
<script type="application/ld+json">{"@type":"HomeAndConstructionBusiness"}</script>
</head><body><h1>Embay Yapı</h1></body></html>`;

const fetcher = async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nAllow: /\nSitemap: https://embayyapi.vercel.app/sitemap.xml', { status: 200 });
  if (url.endsWith('/sitemap.xml')) return new Response('<urlset><url><loc>https://embayyapi.vercel.app/</loc></url><url><loc>https://embayyapi.vercel.app/evler</loc></url></urlset>', { status: 200, headers: { 'content-type': 'application/xml' } });
  return new Response(home, { status: 200, headers: { 'content-type': 'text/html' } });
};

const audit = await runSeoAudit('https://embayyapi.vercel.app/', fetcher);
assert.equal(audit.status, 200);
assert.equal(audit.html_lang, 'tr');
assert.equal(audit.h1_count, 1);
assert.equal(audit.jsonld_count, 1);
assert.equal(audit.og_present, true);
assert.equal(audit.robots.status, 200);
assert.equal(audit.sitemap.urls, 2);
assert.equal(audit.checks.filter((x) => x.level === 'warn').length, 1);
assert.equal(audit.checks.find((x) => x.key === 'description')?.level, 'warn');
assert.equal(audit.score, 92);
assert.match(seoAuditDetail(audit), /Canonical var/);

const noindexFetcher = async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.endsWith('/robots.txt')) return new Response('', { status: 404 });
  if (url.endsWith('/sitemap.xml')) return new Response('', { status: 200 });
  return new Response('<html lang="en"><head><title>Short</title><meta name="robots" content="noindex, nofollow"></head><body></body></html>', { status: 200, headers: { 'x-robots-tag': 'noindex' } });
};
const noindex = await runSeoAudit('https://example.com/', noindexFetcher);
assert.equal(noindex.checks.find((x) => x.key === 'indexability')?.level, 'error');
assert.equal(noindex.checks.find((x) => x.key === 'robots')?.level, 'warn');
assert.equal(noindex.checks.find((x) => x.key === 'sitemap')?.level, 'warn');

console.log('seo-audit tests passed');
