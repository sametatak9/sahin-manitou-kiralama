import assert from 'node:assert/strict';
import { chooseEditorialStyles, isEmbayOffScope, validateEditorialCandidate } from '../supabase/functions/_shared/pure/editorial.ts';

const styles = chooseEditorialStyles([], 13, 3);
assert.equal(styles.length, 13);
assert.equal(new Set(styles.slice(0, 13).map((style) => style.key)).size, 13, 'one full style cycle avoids duplicate angles');

const oldCaption = 'Hafif çelik eviniz için proje sürecini adım adım konuşalım. Gerçek görüntüleri inceleyin ve arsanıza uygun sorularınızı bize iletin.';
const repeated = validateEditorialCandidate({
  title: 'Hafif çelik proje süreci',
  headline: 'Hafif çelik proje süreci',
  caption: oldCaption,
}, [{ headline: 'Hafif çelik proje süreci', caption: oldCaption, tone: 'Merak uyandıran soru' }]);
assert.deepEqual(repeated, { ok: false, reason: 'duplicate_headline' });

const fresh = validateEditorialCandidate({
  headline: 'Arsanız için ilk hangi soruyu sorardınız?',
  caption: 'Arsanızı değerlendirirken ilk adım doğru soruları toplamaktır. Hafif çelik ev planınızı konuşmadan önce kullanım ihtiyacınızı ve yerel koşulları netleştirin.',
  hashtags: ['#hafifçelik', '#evtasarımı'],
}, [{ headline: 'Şantiyede bugün', caption: 'Betonarme taşıyıcı sistemimiz ve ağır çelik kirişlerimizle güçlü yapılar kuruyoruz.' }]);
assert.equal(fresh.ok, true, 'unrelated old heavy-steel content does not block a fresh light-steel draft');

for (const text of [
  'Ağır çelik taşıyıcı sistem hakkında bilgi alın.',
  'Betonarme bina ve kentsel dönüşüm projeleri.',
  'Manitou kiralama hizmetimiz.',
  'Tadilat ve tamirat çözümleri.',
]) assert.equal(isEmbayOffScope(text), true, `${text} is out of Embay Yapı light-steel scope`);
assert.equal(isEmbayOffScope('Hafif çelik evlerde duvar paneli ve yalıtım detayları.'), false);
assert.equal(isEmbayOffScope('Çelik ev projeleri için bilgi alın.'), true, 'unqualified steel-home claims are outside the light-steel-only scope');
assert.equal(isEmbayOffScope('Hafif çelik ev projeleri için bilgi alın.'), false, 'explicit light-steel qualification is allowed');
assert.equal(isEmbayOffScope('#çelikev'), true, 'ambiguous shorthand hashtags are blocked');
assert.equal(isEmbayOffScope('#hafifçelikev'), false, 'qualified light-steel hashtags are allowed');
assert.deepEqual(validateEditorialCandidate({ headline: 'Güçlü bina', caption: 'Ağır çelik ile hızlı dönüşüm projeleri.' }, []), { ok: false, reason: 'light_steel_scope' });

console.log('editorial: style rotation, repetition and light-steel scope checks passed');
