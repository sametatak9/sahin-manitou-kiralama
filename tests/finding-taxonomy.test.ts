import assert from 'node:assert/strict';
import { classifyFindingType, FINDING_TYPE_LABEL, isSocialProfileUrl, isTargetAccountType } from '../supabase/functions/_shared/pure/finding-taxonomy.ts';

let checks = 0;
const equal = (actual: unknown, expected: unknown) => { assert.equal(actual, expected); checks++; };

// Public bodies remain separate from both leads and manual target accounts.
equal(classifyFindingType({
  title: 'T.C. Çatalca Belediyesi',
  detail: 'Resmî belediye Instagram işletme profili ve yerel duyurular',
  url: 'https://www.instagram.com/catalcabld',
}), 'public_institution');

equal(classifyFindingType({
  title: 'Çatalca Belediyesi yapım ihalesi',
  detail: 'Kamu kurumu açık ihale / teklif çağrısı',
}), 'public_opportunity');

// Direct demand still outranks generic construction/business profile signals.
equal(classifyFindingType({
  title: 'Çatalca’da villa yaptırmak isteyen arsa sahibi',
  detail: 'Çelik yapı için hizmet arıyor ve fiyat teklifi talep ediyor',
}), 'customer_lead');

equal(classifyFindingType({
  title: 'Çatalca Arsa Ofisi',
  detail: 'Arsa ve villa odaklı emlak işletmesi; yönlendirme için iş ortağı olabilir',
  url: 'https://www.instagram.com/catalca_arsa_ofisi',
}), 'business_or_partner');

equal(classifyFindingType({
  title: 'Eren Prefabrik',
  detail: 'Prefabrik ve çelik yapı üreticisi, proje tanıtım hesabı',
  url: 'https://www.instagram.com/eren.prefabrik',
}), 'competitor_or_reference');

// Regression: Turkish-locale lowercasing of ASCII I and missing business labels
// previously misclassified Instagram/İşletme and Instagram/Business accounts.
equal(classifyFindingType({
  title: 'Instagram İşletme Hesabı',
  detail: 'Çatalca’da aktif işletme profili',
}), 'business_or_partner');
equal(classifyFindingType({
  title: 'INSTAGRAM BUSINESS ACCOUNT',
  detail: 'Active profile for a local company',
}), 'business_or_partner');
equal(classifyFindingType({
  title: 'Instagram competitor profile',
  detail: 'Rival construction company',
}), 'competitor_or_reference');
equal(classifyFindingType({
  title: 'Instagram sektör medyası hesabı',
  detail: 'Construction news media profile',
}), 'market_reference');
equal(classifyFindingType({
  title: 'Instagram personal account',
  detail: 'Individual profile',
}), 'excluded');

// Manual targets include verified business/competitor sites and social media
// references; customer leads and public bodies stay on separate counters.
equal(isTargetAccountType('business_or_partner'), true);
equal(isTargetAccountType('competitor_or_reference'), true);
equal(isTargetAccountType('market_reference', true), true);
equal(isTargetAccountType('market_reference', false), false);
equal(isTargetAccountType('market_reference', isSocialProfileUrl('https://www.instagram.com/sektorhaberleri')), true);
equal(isTargetAccountType('customer_lead'), false);
equal(isTargetAccountType('public_institution', true), false);
equal(isSocialProfileUrl('https://www.instagram.com/sektorhaberleri'), true);
equal(isSocialProfileUrl('https://www.facebook.com/istanbul.insaat'), true);
equal(isSocialProfileUrl('https://www.instagram.com/reel/DeKZ0zRssU_'), false);

equal(FINDING_TYPE_LABEL.technical_seo, 'Teknik SEO');
equal(classifyFindingType({ title: 'İstanbul yapı sektörü haberleri', detail: 'Sektör medyası ve pazar yazısı' }), 'market_reference');
equal(classifyFindingType({}), 'excluded');

console.log(`finding taxonomy contract: ${checks} assertions passed`);
