# Günlük Claude denetimi (bot eğitim döngüsü)

Döngü: **Akademi (eğitim/test) → Görev (sabah botlar sahada) → Claude denetimi → yetenek yeni sürüm → ertesi gün daha tutarlı veri.**

Her gün (Pzt–Cmt ~10:00, İstanbul) Claude şu adımları uygular (Supabase projesi `utngxnqlcayfjkknaysx`):

1. Son 26 saatte biten görevleri okur: `bot_missions` (status completed/stopped, `claude_review is null`) — `findings`, `audit`, `coach_note`, `skill_ids`, `bot_id`, `search_for`.
2. Her görevden en fazla 8 bulguyu **kaynağını açarak** kontrol eder (WebFetch / WebSearch):
   - gerçek mi (sayfa var ve bulguyu söylüyor mu), güncel mi, görevin amacına uygun mu, KVKK'ya uygun mu (şahıs kişisel verisi yok).
3. Görevin `claude_review` alanına yazar: `{reviewed_at, checked, verified, fake, off_topic, notes}`.
4. Botun yeteneği (`automation_skills`) için somut iyileştirme çıkarır ve `skill_improvements`'a **reviewer='claude'** ile ekler;
   araştırma yetenekleri (`category='arastirma'`) için öneriyi `select public.apply_skill_improvement(id)` eşdeğeri güncelleme ile uygular (sürüm +1).
   Yetenek yaşam döngüsünü (onay) **değiştirmez** — onay yöneticidedir.
5. Her yetenek/bot için çıkarılan dersi `bot_learning_log`'a yazar (source='claude_audit', applied=true, bot_id, skill_id, client_id). Bu günlük panelde **Raporlar → Öğrenme günlüğü**'nde görünür; botların kalıcı hafızasıdır.
6. Telegram'a kısa "Claude denetim özeti" gönderir (panelde kayıtlı TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID ile, `net.http_post`).

Kurallar: DROP/DELETE yok; yalnızca yasal, herkese açık kaynaklar; anahtar/secret asla yazdırılmaz.

## Arama turu (Claude = arama motoru)
Botların web arama anahtarı (Tavily) yokken — ve varken botların kaçırdıklarını tamamlamak için — Claude her gün
`manitou_is_bulma` ve `ozel_insaat_is_bulma` yeteneklerinin arama terimleriyle kendisi web araması yapar; gerçek ve somut
fırsatları (kurumsal iletişimle) `bot_missions`'a `status='finalizing'` kaydı olarak ekler. Worker kaydı normal görev gibi
**denetler** (kaynak kontrol + AI hakem), raporlar ve Telegram'a gönderir. İlk tur: 25.09.2026 — Manitou %100 (3/3 doğrulandı), İnşaat %50.


## Ajans modeli (26.09.2026)
Panel birden çok müşteriye çalışır (`agency_clients`: Embay Yapı, Şahin Manitou; ileride ör. emlakçı). Bot, görev, içerik ve marka kiti `client_id` taşır. Yeni müşteri = yeni `agency_clients` satırı + marka kiti + sektör yetenekleri (`automation_skills.sector`) + zamanlanmış görevler. Denetimde her müşterinin sektörüne uygun kaynaklar kullanılır.
