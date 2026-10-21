# Botu Başlat — uygulama, production durumu ve sınırlar (21 Ekim 2026)

## Kullanıcı akışı

Bot detayındaki serbest **Görev ver** formu, **Botu başlat** akışına taşındı. Kullanıcı yalnız çalışma süresini (1/5/10 dakika) ve modelini seçer. Sistem seçili işletme için hazırlanmış, aktif, Academy’de onaylı ve test edilmiş profiller arasından en uzun süredir kullanılmayan uygun beceriyi seçer; görev metni veya hedef URL istenmez. Uygun beceri/görev yoksa güvenlik için başlamaz ve nedenini gösterir.

## Sunucu tarafı kapıları

- Botun `client_id` değeri seçili şirketle eşleşmelidir; şirket ve bot aktif olmalıdır.
- Beceri botta atanmış olmalı, `enabled=true`, `lifecycle='approved'` ve capability test durumu beceri türüne göre `prompt_verified` veya `handler_verified` olmalıdır.
- `blocked`, emekli, devre dışı, uyumsuz sektörlü veya güvenli handler’ı bulunmayan profiller seçilmez.
- Araç destekli profillerde tüm bağlı araçlar aktif, kayıtlı handler’a sahip ve izinli iç taslak/rapor/okuma listesinden olmalıdır. Harici yayın/mesaj, Canva tasarım üretimi ve ilan oluşturma bu başlangıç yoluna dahil değildir.
- Tool’suz prompt-only beceriler yalnız Academy’de `prompt_verified` olup çıktı sözleşmesi `action_list` veya `structured_output` ise çalışabilir; `findings` türündeki araştırma becerileri kaynak/handler olmadan seçilmez. `connector_backed` profiller, tenant bağlantı sağlığı preflight’ı eklenene kadar otomatik başlatılmaz.
- İçerik taslağı görevi seçili şirketin adı, sektörü, hizmetleri ve içerik başlıklarından üretilir; başka şirketten kalmış konu/URL yeniden kullanılmaz. SEO görevi ancak şirketin bağlı brand kit’inde doğrulanabilir site URL’si varsa seçilir.
- Görev mevcut `claim_task_now` atomik kilidi ve engine üzerinden yürür. Serbest prompt kullanıcı görevi olarak saklanmaz; `bot_start` denetim kaydı yazılır.
- Günlük bot koşu kotası İstanbul gün başlangıcına göre kontrol edilir. Günlük/aylık AI harcama freni etkin ve limitli değilse yeni koşu başlatılmaz.

## Model ve harcama gösterimi

Modal; aynı bot/yetenek için son başarılı koşuların token hacmini seçilen model fiyatıyla yeniden fiyatlayarak en fazla 10 örneğin medyan tahminini gösterir. Geçmiş yoksa “Henüz yok” denir. Koşudan sonra model/provider, tokenlar ve AI kullanım defterindeki maliyet tahmini döndürülür; sağlayıcı faturası gibi sunulmaz.

Bugünkü sistem şirket bazında cüzdan, ödeme yöntemi veya işlem başına garantili maliyet tavanı sağlamıyor. AI bütçe sayaçları ajans genelindedir; bu nedenle modal bu ayrımı açıkça söyler ve bütçe koruması yoksa başlatmayı durdurur.

## Release ve production readiness

PR #53 (`c11b66a434df75f58e2ae8ddbc42c27814052911`) main’e merge edildi. Vercel `embay-panel` production deployment `READY` ve `embay-panel.vercel.app` alias’ı bu deployment’a atanmış durumda; Supabase `ops` Edge Function v112’ye güncellendi. Canlı UI’da **Botu başlat** görünür. Release doğrulamasında bot çalıştırılmadı.

21 Ekim tarihli salt-okunur production uygunluk taramasında 21 arşivlenmemiş bot incelendi. Atanmış onaylı ve Academy’de doğrulanmış beceri/task eşleşmesi bulunan çalıştırılabilir profil sayısı **0** çıktı; dolayısıyla canlı buton şu an tüm botlar için fail-closed kalıyor. Mevcut görevlerin bir kısmı `unverified` yeteneklere bağlı. Bu güvenlik kapısı kaldırılmamalı; kullanıcıya bot hazırmış gibi gösterilmemeli. Ayrıntı: [one-click-production-readiness-2026-10-21.md](one-click-production-readiness-2026-10-21.md).

## Kapsam dışı ve sonraki bağımlılıklar

Bu değişiklik tek bir çalışmada tüm becerileri paralel orkestre etmez; her koşuda bir uygun beceri seçilir. Tüm atanmış becerileri tek bir koordine iş akışında çalıştırmak sonraki teknik kapsamdır ve ancak bileşen beceriler Academy’de geçtikten ve kaynak/çıktı sözleşmeleri tanımlandıktan sonra yapılmalıdır. Yayınlama/mesaj gönderimi bu akışta kapalı kalır.

Ayrıca müşteri üyeliği bazında `user ↔ client` erişim ilişkisi, kurucu panelindeki üyelik yönetimi, şirket bazında cüzdan/ledger, bakiye yükleme ve ödeme sağlayıcısı entegrasyonu bu PR’da kurulmaz. Bunlar için önce sağlam tenant/membership ve bakiye sözleşmeleri ile ayrı güvenlik/ödeme planı gerekir.

## Test kapsamı

- Yeni unit testler: bot ve task eşleşmesi, Academy approval/test gate, emekli/engelli beceri reddi, güvenli tool allowlist, prompt-only çıktılar, sektör uyumu, least-recently-used dönüşümü ve eski müşteri URL’sinin temizlenmesi.
- Mevcut regresyon testleri: model routing, skill lifecycle, mission outcome ve capability registry.
- TypeScript kontrolü ve Vite production build’i çalıştırıldı.
- Production readiness taraması read-only yapıldı; gerçek `Botu başlat` endpointi çalıştırılmadı.
