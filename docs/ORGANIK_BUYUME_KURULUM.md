# Organik Büyüme Skill Kurulumu (2026-09-27)

## Ne eklendi?

İki yeni migration (eski dosyalara dokunulmadı):

1. `supabase/migrations/20260927100000_ops_organik_buyume_skills.sql`
   - Skill'ler: hashtag_arastirma, profil_optimizasyon, manuel_etkilesim_plani, meta_organik_buyume
   - Sosyal Büyüme Botu bağlantısı
   - Pazartesi / Salı / Çarşamba zamanlı görevler

2. `supabase/migrations/20260927101000_ops_organik_buyume_bindings.sql`
   - meta_organik_buyume talimat güçlendirme
   - Instagram / Facebook / Content / Sosyal botlara skill bağlama
   - Cuma performans kontrol schedule

## Kurallar (değişmedi)

- Otomatik beğeni / takip / yorum **YOK**
- Sadece işletme hesapları
- Her çıktı onay kuyruğundan geçer

## Supabase'de migration nasıl uygulanır? (telefonda)

### Seçenek A — Supabase Dashboard (en kolay)

1. [supabase.com](https://supabase.com) → projeni aç
2. Sol menü **SQL Editor**
3. Yeni sorgu → GitHub'daki migration dosyasının içeriğini yapıştır
4. **Run** (önce `20260927100000_...`, sonra `20260927101000_...`)

Dosya linkleri:
- https://github.com/sametatak9/sahin-manitou-kiralama/blob/main/supabase/migrations/20260927100000_ops_organik_buyume_skills.sql
- https://github.com/sametatak9/sahin-manitou-kiralama/blob/main/supabase/migrations/20260927101000_ops_organik_buyume_bindings.sql

### Seçenek B — Supabase CLI (bilgisayar)

```bash
npx supabase db push
```

veya projedeki migration klasörü bağlıysa normal deploy.

### Seçenek C — GitHub entegrasyonu açıksa

Supabase projesi GitHub'a bağlıysa main'e push sonrası otomatik uygulanabilir. Dashboard → Database → Migrations bölümünden son migration'ları kontrol et.

## Uygulama sonrası kontrol (panel)

1. **Yetenek Kütüphanesi** → şu skill'ler görünmeli:
   - Gelişmiş Hashtag Araştırması
   - Profil Optimizasyon Önerisi
   - Manuel Etkileşim Planı
   - Meta organik büyüme yöntemi

2. **Bot Merkezi** → Sosyal Büyüme / Instagram / Content botlarında bu skill'ler bağlı olmalı

3. **Zamanlı işler / Görevler** → Meta Algoritma başlıklı schedule'lar görünmeli

## İlk test (10 dk)

Sosyal Büyüme Botu → Görev ver:

```
Gelişmiş hashtag seti + profil optimizasyon önerisi + bu haftanın manuel etkileşim planını çıkar.
Sadece işletme hesapları. Otomatik takip/beğeni yapma.
Raporunda hashtag_arastirma, profil_optimizasyon, manuel_etkilesim_plani skill'lerini belirt.
```

Rapor temizse uzun vadeli schedule'lar zaten Pazartesi–Cuma çalışacak şekilde ayarlıdır.
