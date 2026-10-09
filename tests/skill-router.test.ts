import assert from 'node:assert/strict';
import { routeSkills } from '../supabase/functions/_shared/pure/skill-router.ts';

let checks = 0;
const equal = (a: unknown, b: unknown) => { assert.deepEqual(a, b); checks++; };

const skills = [
  { id: 'growth', name: 'Hedef Kitle ve Instagram Büyüme', version: 1, category: 'social', instructions: 'Instagram Facebook organik etkileşim ve hedef işletme hesabı keşfi', search_terms: ['Instagram işletme hesabı', 'hedef kitle'], sources: ['instagram.com'] },
  { id: 'seo', name: 'Teknik SEO Denetimi', version: 1, category: 'seo', instructions: 'Google arama görünürlüğü, sitemap ve canonical kontrolü', search_terms: ['SEO', 'Google'], sources: ['google.com'] },
  { id: 'content', name: 'Reels İçerik Fikri', version: 2, category: 'content', instructions: 'Reels hook, caption ve hashtag önerileri', search_terms: ['Reels', 'içerik'], sources: [] },
  { id: 'lead', name: 'Müşteri Lead Keşfi', version: 1, category: 'crm', instructions: 'Kaynaklı işletme adayı ve müşteri talebi bul', search_terms: ['müşteri talebi'], sources: [] },
];

const growth = routeSkills(skills, 'Instagram Facebook Reels içerik ve organik takipçi etkileşimi', 2);
equal(growth.selectedIds, ['growth', 'content']);
equal(growth.deferredIds, ['seo', 'lead']);
equal(growth.all.map((s) => s.id), ['growth', 'seo', 'content', 'lead']);

equal(routeSkills(skills, 'Google SEO sitemap ve Search Console', 1).selectedIds, ['seo']);
equal(routeSkills(skills, '', 2).selectedIds, ['growth', 'seo']);

equal(routeSkills([{ ...skills[0], id: 'growth' }, { ...skills[0], id: 'growth' }], 'Instagram', 8).all.map((s) => s.id), ['growth']);
equal(routeSkills(skills, 'Instagram Facebook Reels içerik ve organik takipçi etkileşimi', 2).selectedIds,
  routeSkills(skills, 'Instagram Facebook Reels içerik ve organik takipçi etkileşimi', 2).selectedIds);

console.log(`skill router contract: ${checks} assertions passed`);
