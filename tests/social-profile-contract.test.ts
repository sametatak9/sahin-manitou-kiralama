import assert from 'node:assert/strict';
import { searchBackedSocialProfile } from '../supabase/functions/_shared/pure/social-profile.ts';

let checks = 0;
const ok = (value: unknown) => { assert.equal(value, true); checks++; };
const no = (value: unknown) => { assert.equal(value, false); checks++; };

ok(searchBackedSocialProfile({
  url: 'https://www.instagram.com/catalca_arsa_ofisi',
  findingTitle: 'Çatalca Arsa Ofisi (@catalca_arsa_ofisi)',
  sourceTitle: 'Çatalca Arsa Ofisi (@catalca_arsa_ofisi)',
  evidence: 'Çatalca Kestanelik mahallesinde arsa satışı ve villa fırsatları',
  fit: 'Kural tabanlı ön eleme: instagram işletme profili — denetimde doğrulanacak',
  sourceUrlPresent: true,
}).ok);

ok(searchBackedSocialProfile({
  url: 'https://www.facebook.com/istanbul.insaat',
  findingTitle: 'İstanbul İnşaat (@istanbul.insaat)',
  sourceTitle: 'İstanbul İnşaat',
  evidence: 'İstanbul genelinde şantiye ve inşaat projeleri paylaşan işletme sayfası',
  fit: 'Kural tabanlı ön eleme: facebook işletme profili — denetimde doğrulanacak',
  sourceUrlPresent: true,
}).ok);

no(searchBackedSocialProfile({
  url: 'https://www.instagram.com/reel/DeKZ0zRssU_',
  findingTitle: 'Çatalca villa paylaşımı',
  evidence: 'Villa ve arsa paylaşımı',
  fit: 'Kural tabanlı ön eleme: instagram işletme profili',
  sourceUrlPresent: true,
}).ok);

no(searchBackedSocialProfile({
  url: 'https://www.instagram.com/serhat.mitanyaglobal',
  findingTitle: 'Serhat Tok (@serhat.mitanyaglobal)',
  sourceTitle: 'Serhat Tok',
  evidence: 'Bugün güzel bir manzara paylaşımı',
  sourceUrlPresent: true,
}).ok);

no(searchBackedSocialProfile({
  url: 'https://www.instagram.com/catalca_arsa_ofisi',
  findingTitle: 'Çatalca Arsa Ofisi (@catalca_arsa_ofisi)',
  evidence: 'Çatalca arsa ofisi',
  fit: 'Kural tabanlı ön eleme: instagram işletme profili',
  sourceUrlPresent: false,
}).ok);

console.log(`social profile contract: ${checks} assertions passed`);
