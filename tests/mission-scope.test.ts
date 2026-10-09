import assert from 'node:assert/strict';
import {
  buildMissionScope,
  canonicalizeTenantBrand,
  evaluateScopeCandidate,
  evaluateScopeQuery,
  extractExplicitExcludedTerms,
  filterScopeQueries,
  normalizeScopeText,
} from '../supabase/functions/_shared/pure/mission-scope.ts';

let checks = 0;
const equal = (actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected); checks++; };
const ok = (value: unknown, message: string) => { assert.ok(value, message); checks++; };

const goal = 'Embay Yapı için yalnızca gerçek işletme profilleri araştır. Kişisel hesap, kamu kurumu, Şahin Manitou ve iş arayan ilanlarını dışla.';
const scope = buildMissionScope({
  title: 'Embay Yapı profil keşfi',
  goal,
  canonicalBrand: 'Embay Yapı',
  allowedTopics: ['çelik yapı', 'villa', 'prefabrik'],
  allowedGeos: ['İstanbul', 'Silivri'],
});

ok(scope.enabled, 'explicit scope should activate the guard');
ok(scope.excludedTerms.includes('sahin manitou'), 'explicit brand exclusion should be normalized');
ok(scope.excludedTerms.includes('manitou'), 'proper-name exclusion should cover the short brand query');
equal(normalizeScopeText('ŞAHİN-ManİTOU / Çelik Yapı'), 'sahin manitou celik yapi');

const blockedQuery = evaluateScopeQuery('instagram ŞAHİN-Manitou kiralama', scope);
ok(!blockedQuery.allowed, 'diacritic/case/punctuation variants must be blocked');
ok(blockedQuery.reason?.includes('manitou'), 'blocked query must expose a deterministic reason');
const allowedQuery = evaluateScopeQuery('instagram prefabrik ev firması İstanbul', scope);
ok(allowedQuery.allowed, 'allowed sector query must remain searchable');
const filtered = filterScopeQueries(['instagram manitou kiralama', 'instagram prefabrik ev firması'], scope);
equal(filtered.allowed, ['instagram prefabrik ev firması']);
equal(filtered.blocked.map((x) => x.query), ['instagram manitou kiralama']);

const candidate = evaluateScopeCandidate({ title: 'Manitou kiralama profili', detail: 'Şahin Manitou hizmeti', url: 'https://example.com/manitou' }, scope);
ok(!candidate.allowed, 'off-scope candidate must be rejected before audit verification');
ok(candidate.reason?.startsWith('Kapsam guard adayı reddetti'), 'candidate rejection must explain the scope rule');
const allowedCandidate = evaluateScopeCandidate({ title: 'Çelik villa firması', detail: 'Silivri prefabrik ve villa projeleri', location: 'Silivri', url: 'https://example.com/villa' }, scope);
ok(allowedCandidate.allowed, 'allowed topic and geo should pass');
const wrongGeo = evaluateScopeCandidate({ title: 'Çelik villa firması', detail: 'Villa projesi', location: 'Ankara', url: 'https://example.com/villa' }, scope);
ok(!wrongGeo.allowed, 'explicit location policy should reject a mismatched geo when present');

const brandText = canonicalizeTenantBrand('Embey Yapı için hazırlanan öneri', 'Embay Yapı');
equal(brandText, 'Embay Yapı için hazırlanan öneri');
equal(canonicalizeTenantBrand('EMBAY YAPI projesi', 'Embay Yapı'), 'Embay Yapı projesi');
equal(extractExplicitExcludedTerms(goal), ['kisisel hesap', 'kamu kurumu', 'sahin manitou', 'is arayan ilanlarini']);

const generic = buildMissionScope({ title: 'SaaS pazar araştırması', goal: 'Genel SaaS kaynaklarını incele' });
ok(!generic.enabled, 'generic research without explicit policy must remain unguarded');
ok(evaluateScopeQuery('manitou kiralama', generic).allowed, 'inactive guard must not invent an exclusion');

console.log(`mission scope contract: ${checks} assertions passed`);
