# Grok bot için kurulum görevi (üyelikler + API anahtarları)

## 1) Arkadaşa kısa not (bunu arkadaşına ilet)

> Merhaba, aşağıdaki uzun metnin tamamını kopyalayıp Grok'a yapıştır ve gönder. Gerisini Grok yapacak.
> Senin yapman gereken tek şey: Grok senden bir **doğrulama kodu** (e-posta veya SMS), bir **"ben robot değilim"** onayı
> ya da **Samet Bey'e sorulacak** bir şey isterse onu yapmak. Kart/ödeme bilgisi asla girme; o kısım gelince Grok duracak ve
> Samet Bey'e soracaksın. İş bitince Grok'un hazırladığı "Giriş Bilgileri" belgesini sadece Samet Bey'e gönder ve kendi telefonundan sil.

---

## 2) Grok'a yapıştırılacak metin (tamamını kopyala)

```
Sen benim yerime telefonda/bilgisayarda işlem yapan bir kurulum asistanısın. Görevin: "Şahin Manitou Kiralama"
şirketi için aşağıdaki servislerde hesap açmak ve API anahtarlarını toplamak. Bu işlemleri yapan kişi bu işlere
yabancı; ona her adımda tek bir kısa ve net talimat ver, ekranda neye dokunacağını söyle. Mümkün olan her şeyi
kendin yap; kişiye yalnızca zorunlu durumlarda başvur.

ŞİRKET BİLGİLERİ (her yerde bunları kullan)
- Şirket adı: Şahin Manitou Kiralama (inşaat için ayrıca: Embay Yapı)
- E-posta: info@sahinmanitou.com
- Telefon: +90 531 436 29 04
- Web sitesi: https://sahin-manitou-kiralama.vercel.app
- Ülke / saat dilimi: Türkiye / İstanbul
- Yetkili kişi: Samet Bey (şirket sahibi)

DEĞİŞMEZ KURALLAR
1. Sahte kimlik, sahte isim veya başkası adına kişisel hesap AÇMA. Facebook kişisel profili gibi "gerçek kişi"
   gerektiren hesaplar Samet Bey'in KENDİ hesabı olmalıdır; yoksa dur ve "Samet Bey'e sor" de.
2. Kredi kartı, ödeme, fatura bilgisi GİRME. Ödeme ekranı çıkarsa dur, "Bu adım Samet Bey'in, ona sor" de ve sonraki servise geç.
3. Doğrulama kodları info@sahinmanitou.com e-postasına veya 0531 436 29 04 numarasına gelir. Kişiye "e-postana/SMS'e
   gelen 6 haneli kodu yaz" de. Kod o telefona gelmiyorsa kişiye "Samet Bey'den bu kodu iste" dedirt.
4. Her servis için GÜÇLÜ ve BENZERSİZ bir şifre üret (en az 16 karakter, harf+rakam+sembol). Aynı şifreyi iki yerde kullanma.
5. Açtığın her hesabı ve aldığın her anahtarı hemen "GİRİŞ BİLGİLERİ" adlı bir metin belgesine yaz (şablon aşağıda).
   API anahtarları genellikle SADECE BİR KEZ gösterilir: ekranda görür görmez kopyalayıp belgeye yapıştır.
6. Anahtarları hiçbir sohbete, gruba veya başka kişiye gönderme. Belge sadece Samet Bey'e verilecek.
7. Bir adımda 2 kez başarısız olursan o servisi "YARIM KALDI + neden" diye not et ve sıradakine geç. Sonunda özet ver.
8. İki adımlı doğrulama (2FA) teklif edilirse şimdilik "daha sonra" de; Samet Bey kendi telefonuyla açacak (belgeye not düş).

ÖNEMLİ BAĞLANTI ADRESİ (Meta, Google ve Canva ayarlarında "Redirect URI / Yönlendirme adresi" istenince AYNEN yaz):
https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/oauth/callback

SIRAYLA YAPILACAKLAR

ADIM 1 — Anthropic (Claude) — EN ÖNEMLİSİ, botların beyni
- console.anthropic.com → Sign up → info@sahinmanitou.com ile kayıt (e-postaya gelen bağlantıyla doğrula).
- Organization name: Sahin Manitou Kiralama.
- Settings → API Keys → Create Key → adı "embay-panel" → çıkan "sk-ant-..." ile başlayan anahtarı belgeye yaz.
- Billing / Plans (bakiye yükleme) ekranı gelirse DUR: "Bakiye yükleme Samet Bey'in işi" diye not et.

ADIM 2 — Google hesabı + Gemini (yedek yapay zekâ)
- accounts.google.com → Hesap oluştur → "İşletmem için" → "Mevcut e-posta adresimi kullan" → info@sahinmanitou.com.
  (Bu e-postayla zaten bir Google hesabı varsa yeni açma, onunla giriş yap; şifreyi Samet Bey'e sor.)
- aistudio.google.com/app/apikey → Create API key → "AIza..." ile başlayan anahtarı belgeye yaz (GEMINI).

ADIM 3 — YouTube kanalı + Google Cloud (videoların otomatik yüklenmesi için)
- Aynı Google hesabıyla youtube.com → kanal oluştur → kanal adı "Şahin Manitou Kiralama".
- console.cloud.google.com → yeni proje: "embay-panel".
- "API'ler ve Hizmetler" → "Kitaplık" → "YouTube Data API v3" → ETKİNLEŞTİR.
- "OAuth izin ekranı" → Harici (External) → uygulama adı "Embay Panel", destek e-postası info@sahinmanitou.com,
  geliştirici e-postası info@sahinmanitou.com → "Test kullanıcıları"na info@sahinmanitou.com ekle → kaydet.
- "Kimlik bilgileri" → "Kimlik bilgisi oluştur" → "OAuth istemci kimliği" → Uygulama türü: Web uygulaması →
  "Yetkilendirilmiş yönlendirme URI'leri"ne yukarıdaki BAĞLANTI ADRESİNİ ekle → Oluştur.
- Çıkan "İstemci kimliği" (…apps.googleusercontent.com) ve "İstemci gizli anahtarı"nı belgeye yaz (GOOGLE).

ADIM 4 — Instagram profesyonel hesap + Facebook sayfası
- Instagram hesabı yoksa: "sahinmanitou" benzeri bir kullanıcı adıyla info@sahinmanitou.com ile aç.
- Instagram → Ayarlar → Hesap türü ve araçlar → "Profesyonel hesaba geç" → "İşletme" → kategori: Ekipman kiralama.
- Facebook SAYFASI (kişisel profil değil) gerekiyor. Sayfa açmak için bir Facebook kişisel hesabı şart:
  bu hesap Samet Bey'in KENDİ hesabı olmalı. Kişiye "Samet Bey'in Facebook'una giriş yapabiliyor musun?" diye sor.
  Yapamıyorsa bu adımı "SAMET BEY YAPACAK" diye not et ve ADIM 6'ya geç.
- Yapabiliyorsa: Facebook → Sayfalar → Yeni sayfa oluştur → "Şahin Manitou Kiralama", kategori: Ekipman kiralama.
- Instagram'ı sayfaya bağla: Facebook sayfası → Ayarlar → Bağlı hesaplar → Instagram → Bağla.

ADIM 5 — Meta geliştirici uygulaması (Instagram/Facebook'a otomatik paylaşım için)
- developers.facebook.com → Samet Bey'in Facebook hesabıyla giriş → "Başlayın" → telefon/e-posta doğrula (kod 0531'e gelir).
- "Uygulama oluştur" → tür: "İşletme" (Business) → ad: "Embay Panel" → iletişim e-postası info@sahinmanitou.com.
- Ürün ekle: "Facebook Girişi (İşletme için)" ve "Instagram Graph API" / "Instagram".
- Facebook Girişi → Ayarlar → "Geçerli OAuth Yönlendirme URI'leri" alanına BAĞLANTI ADRESİNİ yaz → kaydet.
- Uygulama Ayarları → Temel → "Uygulama Alan Adları" alanına `utngxnqlcayfjkknaysx.supabase.co` yaz; aynı sayfada "+ Platform ekle → Web sitesi" → Site URL: `https://embay-panel.vercel.app` → kaydet. (Bu yapılmazsa Facebook "URL Yüklenemedi — domain uygulamanın domainlerinde yer almıyor" hatası verir.)
- Uygulama Ayarları → Temel: "Gizlilik politikası URL'si" alanına https://sahin-manitou-kiralama.vercel.app yaz;
  "Uygulama Kimliği (App ID)" ve "Uygulama Gizli Anahtarı (App Secret — Göster'e bas, şifre sorabilir)" değerlerini belgeye yaz (META).

ADIM 6 — Telegram bildirim botu (yönetici bildirimi için, 3 dakika)
- Telegram'da @BotFather'a yaz → /newbot → ad: "Embay Panel Bildirim" → kullanıcı adı: embay_panel_bildirim_bot
  (alınmışsa sonuna rakam ekle) → verilen uzun anahtarı (123456:ABC...) belgeye yaz (TELEGRAM_BOT_TOKEN).
- Oluşan bota "merhaba" yaz. Sonra @userinfobot'a yaz → gösterilen "Id" numarasını belgeye yaz (TELEGRAM_CHAT_ID).
  (Bu kısmı Samet Bey'in kendi Telegram'ında yapmak en doğrusu; kişinin telefonunda yapıldıysa bunu not et.)

ADIM 7 — Resend (e-posta gönderimi) — alan adı yetkisi gerekir
- resend.com → Sign up → info@sahinmanitou.com.
- API Keys → Create API Key → "re_..." ile başlayan anahtarı belgeye yaz (RESEND_API_KEY).
- Domains → Add domain → sahinmanitou.com → çıkan DNS kayıtlarını belgeye kopyala ve "DNS kayıtları Samet Bey/alan adı
  firması tarafından eklenecek" diye not et (bu kısmı kişi yapmasın).

ADIM 8 — Canva (isteğe bağlı, tasarım)
- canva.com/developers → info@sahinmanitou.com ile giriş → "Create an integration" → ad "Embay Panel" →
  Authentication → Redirect URL olarak BAĞLANTI ADRESİNİ ekle → Client ID ve Client secret'ı belgeye yaz (CANVA).

YAPMA (sonra, Samet Bey ile yapılacak): WhatsApp Business Cloud API (Meta işletme doğrulaması ister), Google İşletme Profili doğrulaması.

"GİRİŞ BİLGİLERİ" BELGE ŞABLONU (her servis için doldur):
------------------------------------------------------------
Servis: ...
Giriş adresi: ...
Kullanıcı / e-posta: info@sahinmanitou.com
Şifre: ...
Durum: TAMAM / YARIM KALDI (neden) / SAMET BEY YAPACAK
Anahtar(lar):
  ANTHROPIC_API_KEY = sk-ant-...
  GEMINI_API_KEY = AIza...
  GOOGLE_CLIENT_ID = ...apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET = ...
  META_APP_ID = ...
  META_APP_SECRET = ...
  TELEGRAM_BOT_TOKEN = ...
  TELEGRAM_CHAT_ID = ...
  RESEND_API_KEY = re_...
  EMAIL_FROM = Şahin Manitou <info@sahinmanitou.com>
  CANVA_CLIENT_ID = ... / CANVA_CLIENT_SECRET = ...
Not: ...
------------------------------------------------------------

BİTİNCE
- Kişiye tüm servislerin durumunu içeren kısa bir özet tablo göster (TAMAM / YARIM / SAMET BEY YAPACAK).
- Kişiye şunu söyle: "Belgeyi SADECE Samet Bey'e gönder, sonra kendi telefonundan ve sohbet geçmişinden sil."
- Samet Bey anahtarları panelde şu yerlere yapıştıracak (sen yapıştırma):
  * ANTHROPIC ve GEMINI → Panel › Ayarlar › AI anahtarı
  * META, GOOGLE, TELEGRAM, RESEND, CANVA → Panel › Bağlantı & Sistem › Giriş bilgileri
  * Sonra Panel › Uygulamalar › Instagram/Facebook/YouTube → "Hesabımla bağla"
Şimdi ADIM 1 ile başla ve kişiye ilk talimatı ver.
```

---

## 3) Samet Bey için: belge gelince yapılacaklar (5 dakika)
1. **Anthropic'e bakiye yükleyin** (console.anthropic.com → Billing). Botlar bununla çalışır.
2. Panel → **Ayarlar → AI anahtarı**: Anthropic ve Gemini anahtarlarını yapıştırın → sistem doğrular.
3. Panel → **Bağlantı & Sistem → Giriş bilgileri**: Meta, Google, Telegram, Resend, Canva bilgilerini yapıştırıp "Kaydet".
4. Panel → **Uygulamalar** → Instagram / Facebook / YouTube → **"Hesabımla bağla"** (bir kez giriş).
5. Tüm servislerde kendi telefonunuzla **iki adımlı doğrulamayı** açın ve şifreleri değiştirin (belge başka birinin telefonunda durduğu için).
6. **Bağlantı & Sistem → Sistem kontrolü**: her şeyin yeşil olduğunu görün.
