import assert from 'node:assert/strict';
import { buildTavilyRequest, isSearchUnavailable, searchScopeStatus } from '../supabase/functions/_shared/pure/search.ts';

const now = new Date('2026-10-08T12:00:00.000Z');
const general = buildTavilyRequest('çelik yapı taşeron İstanbul', { max: 8, domains: ['sahibinden.com', 'armut.com'] }, now);
assert.equal(general.topic, 'general');
assert.equal(general.country, 'turkey');
assert.equal(general.max_results, 8);
assert.equal(general.include_domains_mode, 'prefer');
assert.ok(!('days' in general));

const recentNews = buildTavilyRequest('çelik yapı ihale', { days: 14, max: 8 }, now);
assert.equal(recentNews.topic, 'news');
assert.equal(recentNews.start_date, '2026-09-24');
assert.equal(recentNews.include_published_date, true);
assert.ok(!('country' in recentNews));
assert.ok(!('days' in recentNews));
assert.equal(buildTavilyRequest('x', { max: 100 }, now).max_results, 20);
assert.equal(buildTavilyRequest('x', { max: 0 }, now).max_results, 1);

assert.equal(searchScopeStatus(true, true), 'broad_web');
assert.equal(searchScopeStatus(false, true), 'news_only');
assert.equal(searchScopeStatus(false, false), 'unavailable');
assert.equal(isSearchUnavailable({ hasTargetUrl: false, broadWebSucceeded: false, nativeSearchSucceeded: false, findingCount: 0 }), true);
assert.equal(isSearchUnavailable({ hasTargetUrl: false, broadWebSucceeded: true, nativeSearchSucceeded: false, findingCount: 0 }), false, 'a real web query with no matches is a valid empty result');
assert.equal(isSearchUnavailable({ hasTargetUrl: false, broadWebSucceeded: false, nativeSearchSucceeded: true, findingCount: 0 }), false);
assert.equal(isSearchUnavailable({ hasTargetUrl: false, broadWebSucceeded: false, nativeSearchSucceeded: false, findingCount: 1 }), false);
assert.equal(isSearchUnavailable({ hasTargetUrl: true, broadWebSucceeded: false, nativeSearchSucceeded: false, findingCount: 0 }), false);

console.log('search-contract: 20 assertions passed');
