# Agency UI Overhaul — Faz C

**Tarih:** 19 Ekim 2026  
**Mode:** Redesign · Overhaul  
**Durum:** Tam UI revizyonu PR #52 branch’inde; production’a merge/deploy değildir.

## Design read

- **Ürün/kitle:** Mobil öncelikli, çok müşterili reklam ajansı operasyon paneli; ilk pilot EMBAY YAPI.
- **Görsel dil:** Sakin premium agency cockpit; açık Apple-tonlu yüzeyler, lacivert metin, EMBAY mavisi ve düşük yoğunlukta mavi/cyan holografik aksan.
- **Kadranlar:** Görsel varyans 6/10; hareket 4/10; bilgi yoğunluğu 7/10; asset bağımlılığı 3/10; marka sadakati 8/10.
- **Kısıt:** Bot, lead, bağlantı, Academy, onay ve görev durumları yalnız gerçek kayıtlardan gösterilir. Hareket veri durumunu taklit etmez.

## Korunan sözleşmeler

- Route ID’leri, auth, role gating, tenant/customer switcher, `ClientProvider` ve local selection state.
- Supabase sorguları, RLS, API/RPC çağrıları, görev başlatma ve yayın/onay davranışları.
- Academy, bağlantı, bot ve müşteri verisinin anlamı; yeni metrik veya sahte başarı göstergesi eklenmedi.
- EMBAY YAPI logo dosyası ve Türkçe ürün metinleri.

## Görsel yenileme

- Desktop sidebar, müşteri bağlamı, gruplu gezinme, responsive header, mobil drawer ve hızlı alt gezinme yeniden düzenlendi.
- Shared `Panel`, `Pill`, `Button`, `Tabs`, `Stat`, `StateView` ve modal yüzeyleri ortak design tokenlarına taşındı.
- Ana kontrol şeridinde “bağlı/sağlıklı” olduğu varsayılan dekoratif nokta kaldırıldı; model etiketi yerel tercihi doğru anlatacak şekilde “Model tercihi” oldu.
- Profil/üyelik ekranı mevcut session ve workspace üyeliği alanlarıyla yeniden kuruldu; var olmayan avatar, yetki veya bakiye alanı uydurulmadı.
- Müşteri, büyüme ve editli Reels başlıkları ortak EMBAY hero diline taşındı; kart içerikleri, aksiyonlar ve gerçek durumlar korundu.
- Üye/avatar ve bot mikro animasyonları hafif ve `prefers-reduced-motion` uyumlu.

## Değişen dosyalar

`src/index.css`, `src/ops/Shell.tsx`, `src/ops/ui.tsx`, `src/ops/client.tsx`, `src/ops/components/AgencyControlStrip.tsx`, `src/ops/components/PageGuide.tsx`, `src/ops/screens/Account.tsx`, `Clients.tsx`, `EditedVideos.tsx`, `Reports.tsx`.

Yeni design records: `docs/agency-ui-brand-spec.md` ve bu dosya.

## Doğrulama

- `node_modules/.bin/tsc --noEmit` — geçti.
- `node_modules/.bin/vite build && node scripts/embay-html.mjs` — geçti.
- `git diff --check` — geçti.
- API, database migration, OAuth veya sosyal platform dış eylemi bu UI işi kapsamında değiştirilmedi.
