# Embay Bot Vizyonu ve İş Sırası

Kullanıcının hedefi: zor bir sektörde (inşaat / operatörlü Manitou kiralama) **yasal ve resmi yollarla** müşteri bulmak, bulunan
kurumları arşivlemek, belirli aralıklarla kendimizi hatırlatmak ve sosyal medyada düzenli görünür olmak.

Değişmez kurallar:
- Veri toplama KVKK'ya ve site kullanım koşullarına uygun olur: yalnızca kurumların herkese açık, kendi yayınladığı bilgiler.
  Kişisel veri (kişisel cep, e-posta, TC no) toplanmaz; otomatik taramayı yasaklayan sitelere (sahibinden, armut, LinkedIn,
  Instagram…) doğrudan kazıma yapılmaz, yalnızca arama motorunda herkese açık görünen başlık/özet ve link kullanılır.
- Paylaşım, mesaj ve teklif insan onayı olmadan dışarı çıkmaz. Sahte veri / sahte başarı gösterilmez.
- Uygulama hesaplarına şifre ile değil resmi OAuth ile bir kez giriş yapılır; token'lar Vault'ta şifreli durur ve sistem yeniler.

## Tamamlananlar
| # | İş | Durum |
|---|----|-------|
| 1 | Bot görev sistemi: amaç, link, aranacak, rapor, süre, bitiş koşulu → canlı adımlar → HTML/PDF rapor, WhatsApp ile gönder | ✅ |
| 2 | Firma portföyü + periyodik hatırlatma (her sabah, onaylı WhatsApp mesajı, RET ile çıkış) | ✅ |
| 3 | Yayın Kuyruğu: telefondan görsel/video → Instagram gönderi/Reels/hikâye, Facebook, YouTube Shorts/video, saatinde paylaşım, her gün bir tane | ✅ |
| 4 | AI anahtarı panelden (Vault) + canlı doğrulama | ✅ |
| 5 | Sonuç kutusu: başarılı / sonuç yok / durduruldu / hata (kredi bitti, anahtar geçersiz, tekrarlanan hata) + "Onayla ve kaydet" → Onaylı sonuçlar listesi | ✅ |
| 6 | 1 dakikalık test görevi ("3 ürün seç ve isimlerini yaz"), model seçimi (Opus 5 / ekonomik Sonnet 5), görev maliyeti gösterimi | ✅ |
| 7 | Bağlantı & Sistem: uygulama giriş bilgileri bir kez girilir (Vault), sistem kontrolü (motorlar, AI, depo, her uygulama) | ✅ |

## Sıradakiler (bot hayali — başlık başlık)
1. **Facebook / Instagram botu, tasarım → paylaşım**
   - Resmi Meta API ile doğrudan paylaşım (altyapı hazır; Meta uygulama bilgileri + hesap bağlantısı bekleniyor).
   - Önizleme ekranı: tasarlanan gönderinin platformdaki görünümü (İçerik Stüdyosu önizlemesi mevcut), onay sonrası kuyruğa.
   - API kullanılamayan durumlar için "Kopyala + uygulamada aç" modu: metin panoya, görsel indirilir, uygulama yeni sekmede açılır.
2. **Planlanan gönderi takibi**: yayın sonrası erişim/etkileşim metrikleri (API), başarısız paylaşımda uyarı ve tekrar deneme.
3. **Botun kendi uygulamasında kitleye ulaşması / araştırması**: hashtag ve rakip hesap takibi (resmi API kapsamı), en iyi paylaşım saati önerisi.
4. **Sektör bilgisi ve eğilim**: botlara inşaat/kiralama sektörü bilgi tabanı (yetenek promptları), haftalık eğilim raporu.
5. **Toplu kurulum**: kullanıcının vereceği kurum listesi ve görevleriyle botların toplu tanımlanması.
6. 15 sekmeli son düzen ve içerik sekmesinin grafik tasarım estetiği (kullanıcı ertelemişti).

## Kullanıcıdan gelen ve yalnızca kullanıcının yapabileceği adımlar
- Anthropic bakiyesi (console.anthropic.com → Billing).
- Meta ve Google geliştirici uygulamalarını kendi hesabıyla oluşturup bilgileri "Bağlantı & Sistem → Giriş bilgileri"ne yapıştırmak;
  ardından "Uygulamalar → Bağla" ile bir kez giriş.
- Eski sızmış Gemini anahtarını iptal etmek.
