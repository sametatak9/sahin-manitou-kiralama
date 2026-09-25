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
5. Telegram'a kısa "Claude denetim özeti" gönderir (panelde kayıtlı TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID ile, `net.http_post`).

Kurallar: DROP/DELETE yok; yalnızca yasal, herkese açık kaynaklar; anahtar/secret asla yazdırılmaz.
