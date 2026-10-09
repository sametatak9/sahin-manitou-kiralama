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

// İsim/edilgen biçimler eylem veya canlı kaynak sayılmamalı (gönderi ≠ gönder, bağlantı ≠ bağla, kesildi ≠ sil)
for (const q of [
  'Son gönderilerin durumu ne?', 'Bağlantılarım hangi durumda?', 'Onaylanan içerikler hangileri?', 'Hangi görevler kesildi?',
  'Son araştırma görevlerinin özeti nedir?', 'Son görevin bulgularını özetle', 'Instagram paylaşım saatlerini açıkla',
  'Bir gönderiyi nasıl yayınlarım?', 'Bu hafta ne tür içerik oluşturalım, öner', 'Google Business bağlantısı neden kopuk?',
]) assert(classifyCopilotIntent(q).mode === 'read_only', `read_only olmalı: ${q}`);

// Türkçe harfle biten/başlayan fiiller ve rica kipleri engellenmeli (\b ş/ç/ı'yı sınır saymıyordu)
for (const q of [
  'Bunu nasıl paylaşırız, hemen paylaş', 'Instagram hesabını bağlar mısın?', 'Gönderiyi yayınlayabilir misin?',
  'Rakibi takip edin', 'Bu gönderiyi sil', 'Yeni bir görev oluştur', 'Görevi çalıştır', 'Reels videosunu yükle',
]) assert(classifyCopilotIntent(q).mode === 'blocked_action', `blocked_action olmalı: ${q}`);

for (const q of ['Rakip hesapları araştırır mısın?', 'Çatalca’da tadilat talebi bul', 'Google sıramız nedir?']) {
  assert(classifyCopilotIntent(q).mode === 'needs_source', `needs_source olmalı: ${q}`);
}

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
