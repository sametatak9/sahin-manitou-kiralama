# EMBAY İçerik Çeşitliliği — Üretim Kanıtı

**Tarih:** 26 Ekim 2026
**Üretim Supabase projesi:** `utngxnqlcayfjkknaysx` (`sahin-embay-panel`)
**Müşteri:** Embay Yapı — `8166d141-9160-4a69-a691-4843c686f787`
**Üretim migration'ı:** `embay_light_steel_content_diversity_20261026` — uygulandı.

## Üretim öncesi bulgular

Canlı `agency_clients` kaydında `content_pillars`, `growth_tags` ve `audience` boştu. Günlük Instagram görevinin girdisi hafif çelikle sınırlandırılmamış; prefabrik ev, villa ve genel şantiye süreçlerini de içeriyordu. İki kampanya planlayıcı girdisinde de Manitou/kentsel dönüşüm ve genel inşaat konu riski görülmüştü. Kaynak proje ve görev kayıtları yalnız okundu; görev girdileri, yayın takvimi ve onay ayarları değiştirilmedi.

## Uygulanan üretim değişikliği ve doğrulama

Migration öncesi salt okunur önizleme; 17 doğrulanmış Drive yüklemesinin Embay'e bağlanacağını, Embay markası/telefonuyla eşleşen 281 fabrika görselinin Embay'e atanacağını ve 275 Embay metin şablonunun kapsam bakımından inceleneceğini gösterdi. Kapsam dışı arşivleme sosyal taslaklara, onay taleplerine veya yayın kayıtlarına dokunmadı.

Migration sonrası yine sınırlı salt okunur sorgularla doğrulananlar:

- **17** Drive yüklemesi doğru `client_id` ile eşleşti; bu yüklemelerde açık ağır çelik/beton/genel hizmet etiketi bulunmadı.
- **281** fabrika görselinden **202** kapsam dışı olanı ve **11** kapsam içi yinelenen kopya arşivlendi; **68** aktif fabrika görseli kaldı.
- **230** kapsam dışı Embay şablonu arşivlendi; **45** mevcut kapsam içi şablon korundu.
- Düzenlenebilir havuza **13** özgün hafif çelik stil örneği eklendi. Aktif toplam **58** şablon; aktif kapsam dışı şablon **0**.
- Aktif, sahipsiz metin şablonu **0**; aktif, kapsam dışı fabrika görseli **0**.
- Arşivleme silme değildir; eski satırlar ve sosyal yayın durumu değiştirilmedi.

## Kod ve kalite kanıtı

Günlük fabrika ve haftalık planlayıcı için server-side hafif çelik kapsam kontrolü; tekrarlayan başlık/açıklama reddi; tenant'a ait brand kit ve medya doğrulaması; görseli olmayan fabrika banner'ını durdurma kuralı eklendi. Ek olarak `save_draft` son kapısı, botun alternatif içerik yolunun filtreden kaçmasını engelliyor. İçerik havuzu UI'sinde listeleme, seçme, düzenleme, kopyalama, arşivleme ve kullanım sayımı seçili müşteriyle sınırlandırıldı.

`npm run test:editorial`, `npm run lint`, `npm run build` ve `git diff --check` başarılı. Testler 13 stili tekrarsız bir çevrimde, ağır çelik/beton/genel çelik ev ifadelerini reddetmede, hafif çelik ifadelerini kabul etmede ve tekrar filtresinde doğruluyor. Build çıktısında yalnız Vite'ın gelecekteki `configLoader` değişikliğiyle ilgili uyarı görüldü.

## Edge Function dağıtım durumu — engel açıkça kaydedildi

Canlı fonksiyon envanteri dağıtım öncesinde `ops` v112 ve `missions` v69, ikisini de `verify_jwt=false` olarak gösterdi. Güncellenmiş kod **henüz üretim Edge Function'larına dağıtılmadı**; production bot çıktısında yeni server-side guard'ların etkin olduğu iddia edilmemelidir.

Supabase MCP dağıtım aracı her kaynak dosyasının içeriğini açıkça `files[]` içinde bekliyor; yerel dosya yolu kabul etmiyor. Tam, tekrarlı bağımlılık grafiği `ops` için 43 dosya / 526.888 bayt, `missions` için 39 dosya / 368.542 bayt. Güvenli biçimde aktarılabilir eksiksiz bir paket hazırlamak mümkün olmadığından dağıtım çağrısı yapılmadı; kısmi bundle, JWT ayarı varsayımı veya bot çalıştırması yapılmadı. Canlı sürümler `ops` v112 / `missions` v69 olarak kaldı. Sonraki adım, aynı kaynakla CLI/CI üzerinden eksiksiz dağıtım sağlayıp ardından sürüm ve test çıktısını doğrulamaktır.

## Bot testi ve yayın sınırı

Bu kontrolde üretim botu çalıştırılmadı; yeni model çıktısı veya yayın başarısı iddia edilmiyor. Migration ve UI değişiklikleri mevcut onay/yayın davranışını değiştirmedi. Canlı fonksiyon kodu dağıtılmadan yeni içerik filtresinin üretimde devrede olduğu varsayılmamalıdır.
