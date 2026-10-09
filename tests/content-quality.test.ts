import assert from 'node:assert/strict';
import { inspectSitePost } from '../supabase/functions/_shared/pure/content-quality.ts';

let checks = 0;
const equal = (a: unknown, b: unknown) => { assert.deepEqual(a, b); checks++; };
const ok = (value: unknown) => { assert.equal(value, true); checks++; };

const valid = {
  slug: 'sile-mustakil-ev-rehberi',
  kind: 'ilce',
  title: 'Şile’de Müstakil Ev Yaptırmak İçin Yol Haritası',
  excerpt: 'Şile’de müstakil ev veya villa yaptırmadan önce imar, proje, ruhsat ve uygulama adımlarını anlaşılır biçimde inceleyin.',
  body: 'Embay Yapı için hazırlanan bu rehber, arsa ve ev yapımı sürecini genel bilgilerle anlatır. '.repeat(8),
  cover_url: 'https://cdn.example.com/sile.jpg',
  images: [],
  district: 'Şile',
  district_slug: 'sile',
  seo_title: 'Şile’de Müstakil Ev Yaptırma Rehberi',
  seo_description: 'Şile’de müstakil ev yaptırma sürecinde imar, proje, ruhsat ve anahtar teslim uygulama adımlarını öğrenin.',
};

const accepted = inspectSitePost(valid, 'Embay Yapı');
ok(accepted.ok);
equal(accepted.blocking.length, 0);
equal(accepted.warnings.length, 0);

const missing = inspectSitePost({ ...valid, body: '', cover_url: null, images: [], seo_description: null });
ok(!missing.ok);
equal(missing.blocking.map((x) => x.key), ['body', 'media', 'seo_description']);

const districtMissing = inspectSitePost({ ...valid, district: null, district_slug: null });
ok(!districtMissing.ok);
ok(districtMissing.blocking.some((x) => x.key === 'district'));

const claim = inspectSitePost({ ...valid, title: 'Türkiye’nin 1 numarası garanti ev çözümü' });
ok(claim.ok);
ok(claim.warnings.some((x) => x.key === 'claims'));

const brandMissing = inspectSitePost({ ...valid, title: 'Şile’de Ev Yaptırma Süreci İçin Yol Haritası', body: 'Bu rehber genel bilgiler verir. '.repeat(20) }, 'Embay Yapı');
ok(brandMissing.ok);
ok(brandMissing.warnings.some((x) => x.key === 'brand_context'));

console.log(`content-quality: ${checks} checks passed`);
