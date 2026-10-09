import assert from 'node:assert/strict';
import { classifyFindingType } from '../supabase/functions/_shared/pure/finding-taxonomy.ts';

let checks = 0;
const equal = (actual: unknown, expected: unknown) => { assert.equal(actual, expected); checks++; };

equal(classifyFindingType({
  title: 'T.C. Çatalca Belediyesi',
  detail: 'Resmî belediye Instagram işletme profili ve yerel duyurular',
  url: 'https://www.instagram.com/catalcabld',
}), 'public_institution');

equal(classifyFindingType({
  title: 'Çatalca Belediyesi yapım ihalesi',
  detail: 'Kamu kurumu açık ihale / teklif çağrısı',
}), 'public_opportunity');

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

equal(classifyFindingType({ title: 'İstanbul yapı sektörü haberleri', detail: 'Sektör medyası ve pazar yazısı' }), 'market_reference');
equal(classifyFindingType({}), 'excluded');

console.log(`finding taxonomy contract: ${checks} assertions passed`);
