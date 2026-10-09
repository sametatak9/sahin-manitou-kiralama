import assert from 'node:assert/strict';
import { contentDraftErrors, normalizeContentDraft } from '../supabase/functions/_shared/pure/content.ts';

let checks = 0;
const equal = (a: unknown, b: unknown) => { assert.deepEqual(a, b); checks++; };

const draft = normalizeContentDraft({
  title: 'Çatalca’da çelik ev süreci',
  headline: 'Emekle kuruldu.',
  caption: 'Gerçek saha görüntüleriyle yapım sürecinden kısa bir kesit.',
  hashtags: ['#embayyapı', 'celikyapi', ''],
  cta: 'Teklif için bize ulaşın.',
  image_idea: 'Gerçek şantiye görüntülerinden dikey video seçkisi.',
  design_brief: 'Montserrat, sade beyaz tipografi ve EMBAY YAPI logosu.',
});
equal(draft.hashtags, ['#embayyapı', '#celikyapi']);
equal(contentDraftErrors(draft), []);

equal(contentDraftErrors(normalizeContentDraft({ caption: 'Metin var ama diğer alanlar yok' })).sort(), ['cta', 'design_brief', 'hashtags', 'headline', 'image_idea', 'title']);
equal(contentDraftErrors(normalizeContentDraft(null)).length, 7);
equal(normalizeContentDraft({ hashtags: ['  villa  ', '#çelik', 3] }).hashtags, ['#villa', '#çelik']);

equal(normalizeContentDraft({ title: '  Başlık  ' }).title, 'Başlık');
console.log(`content contract: ${checks} assertions passed`);
