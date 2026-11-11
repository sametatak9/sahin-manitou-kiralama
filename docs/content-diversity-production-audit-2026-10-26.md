# EMBAY İçerik Çeşitliliği — Üretim Kanıtı ve Giriş Sorunu

**İlk uygulama:** 26 Ekim 2026. **Son durum güncellemesi:** 11 Kasım 2026.
**Üretim Supabase projesi:** `utngxnqlcayfjkknaysx` (`sahin-embay-panel`)
**Müşteri:** Embay Yapı — `8166d141-9160-4a69-a691-4843c686f787`
**Üretim migration'ı:** `embay_light_steel_content_diversity_20261026` — uygulandı.

## İçerik çeşitliliği ve tenant kapsamı

Canlı `agency_clients` kaydında `content_pillars`, `growth_tags` ve `audience` boştu. Günlük Instagram görevinin girdisi hafif çelikle sınırlandırılmamış; prefabrik ev, villa ve genel şantiye süreçlerini de içeriyordu. İki kampanya planlayıcı girdisinde de Manitou/kentsel dönüşüm ve genel inşaat konu riski görülmüştü. Kaynak görev kayıtları, yayın takvimi ve onay ayarları değiştirilmedi.

Migration öncesi salt okunur önizleme; 17 Drive yüklemesinin Embay'e bağlanacağını, Embay markası/telefonuyla eşleşen 281 fabrika görselinin Embay'e atanacağını ve 275 Embay metin şablonunun kapsam bakımından inceleneceğini gösterdi. Migration sonrası sınırlı salt okunur sorgularla doğrulananlar:

- **17** Drive yüklemesi doğru `client_id` ile eşleşti; açık ağır çelik/beton/genel hizmet etiketi görülmedi.
- **281** fabrika görselinden **202** kapsam dışı olanı ve **11** kapsam içi yinelenen kopya arşivlendi; **68** aktif fabrika görseli kaldı.
- **230** kapsam dışı Embay şablonu arşivlendi; **45** mevcut kapsam içi şablon korundu.
- Düzenlenebilir havuza **13** hafif çelik stili eklendi. Aktif toplam **58** şablon; aktif kapsam dışı şablon **0**.
- Aktif sahipsiz metin şablonu **0**; aktif kapsam dışı fabrika görseli **0**.
- Arşivleme silme değildir; sosyal taslaklar, onaylar ve yayın kayıtları değiştirilmedi.

Kodda günlük fabrika/haftalık planlayıcı kapsam kontrolleri, tekrar reddi, müşteriye ait brand kit/medya doğrulaması ve `save_draft` son kapısı eklendi. Banner görseli yoksa üretim durur. Havuz UI'sindeki listeleme, seçme, düzenleme, kopyalama, arşivleme ve kullanım sayımı seçili müşteriye bağlandı. `npm run test:editorial`, `npm run lint`, `npm run build` ve `git diff --check` başarılı oldu. Build'de yalnız Vite'ın gelecekteki `configLoader` değişikliği uyarısı görüldü.

## Edge Function dağıtımı

Tam kaynak aktarımı MCP'de mümkün olmayınca kod, tam SHA'ya sabitlenmiş herkese açık GitHub raw entrypoint'i üzerinden Deno ile kontrol edildi; iki entrypoint'in de tüm göreli importları çözümlendi. Güncellenen üretim sürümleri:

- `ops` **v113**, `verify_jwt=false` (canlıdaki ayar korundu).
- `missions` **v70**, `verify_jwt=false` (canlıdaki ayar korundu).

Deploy edilen entrypoint'ler `46ee1a7c18c4a2e2d74cc7367e33fd7cc9fb5144` commit'ine sabitlenmiştir. Supabase MCP `get_edge_function` ile iki dağıtımın da bu SHA'yı kullanan wrapper içerdiği doğrulandı.

## 11 Kasım giriş sorunu — doğrulanmış neden

Hesap kaydı mevcut, e-posta doğrulanmış, `banned_until` boş ve proje `ACTIVE_HEALTHY` durumunda. Giriş sayfası doğru Supabase projesini kullanıyor. Supabase Auth `/auth/v1/token` isteği **402** döndürüyor. Aynı projedeki public Auth health isteğinin yanıt metni doğrudan nedeni verdi: `exceed_storage_size_quota`; proje sahibi planı yükseltmeli veya depolama kullanımını kota altına indirmeli. Bu nedenle sorun parolanın yanlış olmasından değil, proje depolama kotasının aşılmasından kaynaklanıyor. Parola değiştirilmedi, sıfırlama gönderilmedi ve bu incelemede yeni bir giriş denemesi yapılmadı.

Supabase organizasyon planı `free`. Depolama metadata'sı üzerinden ölçülen kullanım:

- `media-uploads`: **353 nesne**, **1.582.194.027 bayt**; bunun **110 videosu 1.447.673.716 bayt**, 243 görseli 134.520.311 bayt.
- `design-exports`: **383 görsel**, **108.390.824 bayt**.
- `audio`: **11 nesne**, **5.894.910 bayt**.
- PostgreSQL veritabanı: **212.733.075 bayt**.
- `media-uploads` içindeki 353 nesnenin **337'si** `media_library` URL/yollarında referanslı. Kalan 16 nesne (`157.818.561` bayt) yalnızca bu tablodaki referanslarla eşleşmedi; başka tabloların ve iş akışlarının kullanımı henüz dışlanmadığından bunlar güvenli silme adayı ilan edilmedi.

**Hiçbir depolama nesnesi veya veritabanı kaydı silinmedi.** Hızlı ve veri koruyan seçenek Supabase planını yükseltmektir. Kota düşürme seçeneğinde önce başka tablo referanslarını ve yedeklemeyi doğrulayıp, hangi büyük medya dosyalarının taşınacağı/silineceği için açık onay almak gerekir. Silme veya ücretli plana geçiş yapılmadı.

## Bot testi ve yayın sınırı

Üretim botu çalıştırılmadı ve içerik yayınlanmadı. Auth servisinin kota kısıtlaması giderilmeden kullanıcı girişi ve uçtan uca bot testi doğrulanmış sayılamaz. Yeni bot guard'ları deploy edildi; ancak gerçek içerik çıktısı ve kullanıcı panelinde uçtan uca doğrulama kota sorunu giderildikten sonra yapılmalıdır.
