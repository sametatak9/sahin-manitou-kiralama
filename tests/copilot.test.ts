import { buildCopilotPrompt, classifyCopilotIntent, normalizeCopilotResponse } from '../supabase/functions/_shared/pure/copilot.ts';

let assertions = 0;
function assert(condition: unknown, message: string) {
  assertions++;
  if (!condition) throw new Error(message);
}

const read = classifyCopilotIntent('Embay Yapı için bugün hangi riskler görünüyor?');
assert(read.mode === 'read_only', 'Bağlam sorusu read_only olmalı');

const blocked = classifyCopilotIntent('Instagram gönderisini yayınla ve takipçilere DM gönder');
assert(blocked.mode === 'blocked_action', 'Harici eylem blocked_action olmalı');
assert(blocked.reason.includes('dış eylem'), 'Block gerekçesi görünür olmalı');

const source = classifyCopilotIntent('İstanbul’da güncel müşteri adaylarını internetten bul');
assert(source.mode === 'needs_source', 'Canlı kaynak isteyen istek needs_source olmalı');

const context = {
  client: { name: 'Embay Yapı', sector: 'insaat', region: 'İstanbul Avrupa Yakası', services: ['çelik yapı'], audience: 'arsa sahibi', content_pillars: ['saha'] },
  recent_missions: [], governed_skills: [], active_models: [],
};
const prompt = buildCopilotPrompt('Bu hafta neye dikkat etmeliyiz?', context);
assert(prompt.includes('Embay Yapı'), 'Prompt canonical tenant context içermeli');
assert(prompt.includes('salt-okunurdur'), 'Prompt read-only guard içermeli');

const normalized = normalizeCopilotResponse({ kind: 'answer', answer: 'Veri yeterli.', facts: [{ label: 'Durum', value: 'Hazır' }], next_steps: [], evidence: [] });
assert(normalized.answer === 'Veri yeterli.', 'Structured answer korunmalı');
assert(normalized.facts.length === 1, 'Structured facts normalize edilmeli');
assert(normalizeCopilotResponse(null).answer.length > 0, 'Boş AI çıktısı güvenli fallback vermeli');

console.log(`copilot contract: ${assertions} assertions passed`);
