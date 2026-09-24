# Uygulama Bağlantı Rehberi — Embay Yapı & Şahin Manitou Paneli

> **Nasıl kullanılır:** Bu rehberi **bilgisayarda** açın. Her bölüm sırayla yapılır. Her bölümün sonunda
> **✅ Kontrol** adımı var — orada panel size "çalışıyor" ya da "şu yüzden çalışmıyor" der. Takılırsanız o
> ekranın görüntüsünü Claude'a atın. **Gizli anahtarları asla sohbete yazmayın**, yalnızca panele yapıştırın.

---

## 0. Başlamadan önce (2 dakika)

| Gerekenler | Neden |
|---|---|
| Bilgisayar + Chrome | Geliştirici sayfaları telefonda düzgün açılmıyor |
| Facebook hesabınız (Facebook sayfanızın yöneticisi olan hesap) | Instagram + Facebook bağlantısı |
| Instagram hesabınız **Profesyonel hesap** olmalı | Instagram yalnızca profesyonel hesaplara otomatik paylaşım izni verir |
| Gmail hesabınız (YouTube kanalınızın sahibi) | YouTube bağlantısı |
| Telefonunuz yanınızda | Facebook/Google giriş onay kodu isteyebilir |

**Panelde her zaman kopyalayacağınız 4 değer** (Uygulamalar sayfasının en altında, "Uygulama ayarlarına yazılacak adresler" kutusunda **Kopyala** düğmeleriyle duruyor):

| Ad | Değer |
|---|---|
| **Yönlendirme adresi** (Redirect / OAuth URI) | `https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/oauth/callback` |
| **Uygulama alan adı** (App Domain) | `utngxnqlcayfjkknaysx.supabase.co` |
| **Site adresi** (Site URL) | `https://embay-panel.vercel.app` |
| **Gelen olay adresi** (Webhook, isteğe bağlı) | `https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/webhook/meta` |

> Webhook **doğrulama belirteci** güvenlik nedeniyle bu belgede yok — panelde aynı kutuda, yalnızca yönetici görür.

**Önerilen sıra:** 1) Facebook + Instagram → 2) YouTube → 3) Telegram → 4) E-posta → 5) WhatsApp → 6) Canva.
Her biri bağımsızdır; biri takılırsa diğerine geçebilirsiniz.

---

## 1. Facebook Sayfası + Instagram (Meta) — yaklaşık 10 dakika

**Şu anki durum:** Uygulama Kimliği doğru kayıtlı. **Gizli anahtar yarım kopyalanmış (15 karakter, olması gereken 32)** ve **alan adı ayarı eksik** ("URL Yüklenemedi" hatası bu yüzden).

### 1.1 Gizli anahtarı düzelt
1. **developers.facebook.com/apps** → uygulamanıza tıklayın.
2. Sol menü: **Uygulama Ayarları → Temel** (App Settings → Basic).
3. **Uygulama Gizli Anahtarı** (App Secret) yanındaki **Göster** → Facebook şifrenizi isterse girin.
4. Çıkan **32 karakterin tamamını** kopyalayın (çift tıklayıp seçmek bazen yarım seçer — sürükleyerek tamamını seçin).
5. Panel → **Uygulamalar → Giriş bilgileri → Meta** → "Uygulama gizli anahtarı" kutusuna yapıştırın → **Kaydet**.

### 1.2 Alan adı ve site adresi (aynı sayfada)
6. **Uygulama Alan Adları** (App Domains) kutusuna: `utngxnqlcayfjkknaysx.supabase.co`
7. Sayfanın altında **+ Platform ekle → Web sitesi** → **Site URL'si**: `https://embay-panel.vercel.app`
8. Sayfanın en altında **Değişiklikleri Kaydet**.

### 1.3 Facebook Girişi yönlendirme adresi
9. Sol menüde **Facebook Girişi** (veya "Facebook Login for Business") yoksa: **Ürün ekle → Facebook Girişi → Kur**.
10. **Facebook Girişi → Ayarlar**:
    - "İstemci OAuth Girişi" → **Evet**
    - "Web OAuth Girişi" → **Evet**
    - **Geçerli OAuth Yönlendirme URI'leri**: `https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/oauth/callback`
11. **Değişiklikleri Kaydet**.

### 1.4 İzinler (uygulama geliştirme modundaysa)
12. Sol menü **Uygulama Rolleri → Roller**: kendi Facebook hesabınız **Yönetici** olarak görünmeli (uygulamayı siz açtıysanız zaten öyledir).
13. Geliştirme modunda yalnızca bu rollerdeki kişiler bağlanabilir — sizin için yeterli.

### ✅ Kontrol
- Panelde Meta bilgilerini kaydettiğinizde ekranda **"kaydedildi ve canlı test geçti"** yazmalı.
- Sonra **Uygulamalar → Facebook Sayfası → Hesabımla bağla** → Facebook açılır → sayfanızı ve (varsa) Instagram hesabınızı **seçin** → **Devam**.
- Panele dönünce "Facebook (1 sayfa) ve Instagram (1 hesap) bağlandı" yazar; **Aktivite günlüğüne** "Bağlantı — Başarılı" düşer.

### Instagram "0 hesap" derse
Instagram hesabınız profesyonel değil ya da Facebook sayfasına bağlı değil:
- Instagram uygulaması → **Ayarlar → Hesap türü ve araçlar → Profesyonel hesaba geç** (ücretsiz).
- Facebook sayfası → **Ayarlar → Bağlı hesaplar → Instagram → Bağla**.
- Panelde **Yeniden bağla**.

### (İsteğe bağlı) Doğrudan "Instagram ile giriş" — Facebook sayfası olmadan
1. Aynı Meta uygulamasında **Ürün ekle → Instagram → Kur**.
2. **Instagram → API kurulumu (Instagram girişi ile)** sayfasında **Instagram uygulama kimliği** ve **Instagram uygulama gizli anahtarı** (Facebook'unkinden FARKLIDIR) → panelde **Giriş bilgileri → Instagram**.
3. Aynı sayfada **İşletme girişini ayarla → OAuth yönlendirme URI'leri**: yönlendirme adresini yapıştırın.
4. **Instagram test kullanıcısı ekle** → kendi Instagram hesabınız → Instagram'dan daveti kabul edin (Ayarlar → Uygulamalar ve web siteleri → Test daveti).
5. Panelde Instagram kartında **Instagram ile giriş yap**.

### (İsteğe bağlı) Yorum / mesaj bildirimleri (Webhook)
Meta uygulaması → **Webhooks** → Nesne: **Page** (ve/veya **Instagram**) → **Abone ol**:
- Geri çağırma URL'si: `https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/webhook/meta`
- Doğrulama belirteci: panelden kopyalayın
- Alanlar: `feed`, `messages` (Instagram için `comments`, `mentions`)

Gelen olaylar, uygulama detayındaki **"Son gelen olaylar"** listesine düşer. İmzası doğrulanmayan hiçbir istek kaydedilmez.

---

## 2. YouTube (Google) — yaklaşık 5 dakika

**Şu anki durum:** İstemci kimliği doğru. **Gizli anahtar kutusuna yanlışlıkla istemci kimliği yapıştırılmış** ve **yönlendirme adresi Google'a eklenmemiş** ("redirect_uri_mismatch" hatası bu yüzden).

1. **console.cloud.google.com** → üstten projenizi seçin.
2. **API'ler ve Hizmetler → Kitaplık** → "YouTube Data API v3" → **Etkinleştir** (zaten etkinse geçin).
3. **API'ler ve Hizmetler → Kimlik bilgileri** → **OAuth 2.0 İstemci Kimlikleri** altındaki istemcinize tıklayın.
4. **Yetkili yönlendirme URI'leri → URI ekle**: `https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/oauth/callback`
5. **Yetkili JavaScript kaynakları → URI ekle**: `https://embay-panel.vercel.app`
6. **Kaydet**.
7. Aynı sayfanın sağında **İstemci gizli anahtarı** (`GOCSPX-` ile başlar) → kopyalayın → Panel → **Giriş bilgileri → Google** → gizli anahtar kutusuna yapıştırın → **Kaydet**.
8. **OAuth izin ekranı** (OAuth consent screen) → **Test kullanıcıları → + Kullanıcı ekle** → YouTube kanalınızın Gmail adresi → Kaydet.

### ✅ Kontrol
- Panelde kaydedince **"Google istemci kimliği + gizli anahtar: Google doğruladı"** ve **"Google yönlendirme adresi: giriş ekranı açılıyor"** yazmalı.
- **Uygulamalar → YouTube → Hesabımla bağla** → Gmail'inizi seçin → "Google bu uygulamayı doğrulamadı" uyarısı çıkarsa **Gelişmiş → (uygulama adı)'na git** → **Devam** → izinleri onaylayın.

> YouTube'a video yükleme, uygulama "Test" modundayken **yalnızca test kullanıcısı** olarak eklenen hesaplarla çalışır — sizin için yeterli.

---

## 3. Telegram (akşam raporları telefonunuza) — yaklaşık 3 dakika — **telefondan da yapılabilir**

1. Telegram'da **@BotFather** → **/newbot** → bota bir ad verin (ör. "Embay Rapor") → kullanıcı adı verin (ör. `embay_rapor_bot`).
2. BotFather'ın verdiği **anahtarı** (`123456789:AA...`) kopyalayın.
3. Az önce oluşturduğunuz bota Telegram'da **/start** yazın (bot size mesaj atabilsin diye şart).
4. **@userinfobot**'a herhangi bir mesaj atın → size **Id** numaranızı söyler (sohbet kimliği).
5. Panel → **Giriş bilgileri → Telegram** → bot anahtarı + sohbet kimliği → **Kaydet**.

### ✅ Kontrol
**Uygulamalar → Telegram → Test mesajı** → telefonunuza "Embay Ops Center test mesajı ✅" gelmeli.

---

## 4. E-posta (Resend) — yaklaşık 10 dakika + alan adı doğrulaması

1. **resend.com** → ücretsiz hesap açın.
2. **Domains → Add Domain** → `sahinmanitou.com` → verilen DNS kayıtlarını alan adınızın yönetim paneline (alan adını aldığınız firma) ekleyin. Doğrulama birkaç saat sürebilir.
3. **API Keys → Create API Key** → `re_` ile başlayan anahtarı kopyalayın.
4. Panel → **Giriş bilgileri → E-posta** → API anahtarı + gönderen adres (ör. `Şahin Manitou <info@sahinmanitou.com>`) → **Kaydet**.

---

## 5. WhatsApp Business (Cloud API) — yaklaşık 20 dakika, **isteğe bağlı**

> WhatsApp otomatik gönderim için **ayrı bir telefon numarası** ve Meta işletme doğrulaması ister. Şimdilik panelde her kayıtta **"WhatsApp'ta aç"** düğmesi zaten var — tek dokunuşla sizin WhatsApp'ınızdan gönderir. Otomatik gönderim gerçekten gerekirse:

1. Meta uygulamanıza **Ürün ekle → WhatsApp → Kur**.
2. **WhatsApp → API kurulumu**: **Telefon numarası kimliği**ni kopyalayın.
3. **İşletme Ayarları → Sistem kullanıcıları** → yeni kullanıcı → **Anahtar oluştur** (izin: `whatsapp_business_messaging`, süre: kalıcı).
4. Panel → **Giriş bilgileri → WhatsApp** → anahtar + numara kimliği → **Kaydet**.

---

## 6. Canva — yaklaşık 5 dakika, **isteğe bağlı**

1. **canva.com/developers** → **Integrations → Create an integration**.
2. **Authentication → Authorized redirects**: yönlendirme adresini yapıştırın.
3. **Client ID** ve **Client secret** → Panel → **Giriş bilgileri → Canva** → **Kaydet** → **Uygulamalar → Canva → Hesabımla bağla**.

---

## 7. Şimdilik otomatik bağlanamayanlar (dürüst durum)

| Uygulama | Neden | Şimdilik ne yapıyoruz |
|---|---|---|
| **LinkedIn** | Şirket sayfasına otomatik paylaşım için LinkedIn'in "Community Management API" başvuru onayı gerekir (haftalar sürebilir) | **Telefondan paylaş** düğmesi |
| **X (Twitter)** | Otomatik paylaşım ücretli API paketi ister | **Telefondan paylaş** |
| **TikTok** | Uygulama incelemesi (audit) gerekir | **Telefondan paylaş** |
| **Google İşletme Profili** | Google'dan ayrıca API erişim onayı gerekir | Botlar içerik hazırlar, elle yayın |
| **Sahibinden / Armut** | Resmi API yok | Bot ilan metnini hazırlar, siz yayınlarsınız |

---

## 8. Sık görülen hatalar ve çözümleri

| Ekranda gördüğünüz | Anlamı | Çözüm |
|---|---|---|
| Facebook: **"URL Yüklenemedi — domain uygulamanın domainlerinde yer almıyor"** | Alan adı ayarı eksik | Bölüm 1.2 ve 1.3 |
| Facebook: **"Error validating client secret"** | Gizli anahtar yanlış/yarım | Bölüm 1.1 — "Göster"e basıp tamamını kopyalayın |
| Google: **"Hata 400: redirect_uri_mismatch"** | Yönlendirme adresi Google'a eklenmemiş | Bölüm 2, adım 4 |
| Google: **"invalid_client"** | Gizli anahtar kutusunda yanlış değer | Bölüm 2, adım 7 (`GOCSPX-` ile başlayan) |
| Google: **"Erişim engellendi: … test kullanıcısı değil"** | Gmail test kullanıcısı değil | Bölüm 2, adım 8 |
| Panel: **"Instagram hesabı kişisel hesap"** | Profesyonel hesap değil | Instagram → Profesyonel hesaba geç |
| Panel: **"Giriş bilgisi eksik"** | O uygulamanın bilgileri girilmemiş | İlgili bölüm |
| Panel kaydederken **Türkçe hata** çıkıyor | Biçim kontrolü yanlış değeri yakaladı | Mesajda yazan değeri kopyalayın |

---

## 9. Bağlantıdan sonra sistem ne yapar? (mimari özeti)

```
Siz ──"Hesabımla bağla"──► Platform girişi (Facebook/Google/Instagram)
                              │ izin verilince
                              ▼
         Sunucu (Supabase "ops") ── erişim anahtarını VAULT'a şifreli koyar (panelde asla görünmez)
                              │
     social_accounts  ◄───────┘  bağlı hesap kaydı (ad, kimlik, süre)
     bot_accounts               hangi bot hangi hesabı kullanır (paylaşım / okuma / yanıt)
     connector_activity         HER işlem: bağlandı, paylaştı, istatistik çekti, oturum yeniledi, hata, elle paylaşım
     connector_events           platformdan gelen yorum / mesaj / bahsetme (imza doğrulamalı)
     connector_health           uygulama başına özet: son başarı, son hata, 24 saat & 7 gün sayaçları
     audit_log                  kim, ne zaman, neyi değiştirdi (değişmez kayıt)
```

- **Paylaşım:** Yayın Kuyruğu'ndaki gönderi saati gelince bot, bağlı hesaptan resmi API ile paylaşır; başarı **yalnızca platformun cevabıyla** (gönderi kimliği + link) yazılır — sahte "başarılı" yoktur.
- **İstatistik:** Paylaşılan gönderilerin beğeni/yorum/erişim verisi 6 saatte bir çekilir.
- **Oturum yenileme:** Instagram girişi 60 günlüktür; son 10 günde otomatik uzatılır.
- **Hata:** Her hata aktivite günlüğüne sebebiyle yazılır; bağlantı koparsa botlar "bağlantı bekliyor"a geçer, paylaşımlar kaybolmaz, sırada bekler.
- **Nerede görürüm:** Uygulamalar → bir uygulamaya dokunun → **Aktivite günlüğü**. Tüm bağlantı/çıkış geçmişi: Uygulamalar sayfasının altındaki **Bağlantı arşivi**.
- **Güvenlik:** Gizli anahtarlar ve erişim anahtarları yalnızca sunucuda (Vault) şifreli durur; tarayıcıya, günlüklere ve raporlara yazılmaz. Silme yerine arşivleme yapılır.

---

*Hazırlayan: Claude · Son güncelleme: 24 Eylül 2026*
