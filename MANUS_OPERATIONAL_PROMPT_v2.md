# MANUS — OPERASYONEL MASTER PROMPT v2
**Tarih:** 9 Ekim 2026  
**Versiyon:** 2.0 (Net Scope + Fazlar)  
**Bu belge TEK kaynaktır.** Sil-yeniden yazma yok; additive build.  
**Rol:** Uygulayıcı (kod, migration, UI, bot, deploy).  
**Verifier:** Claude Code (işler canlıda test, PR kanıt doğrula).

---

## 1) ÜRÜN PUSULA

**MANUS** = Türkiye KOBİ'leri için **otomasyonlu büyüme & reklam yönetim sistemi** (Agency OS).

### Temel İlkeler
- ✅ İşletmeler tenant/workspace altında izole yönetilir
- ✅ Botlar (content, growth, fırsat keşfi) insan onayı ile çalışır
- ✅ Gerçek kaynaklar (Drive, library) + AI destekli; kaynaksız/klişe başarı YOK
- ✅ "Piri Chat" ana ekran: rapor, todo, bot kontrolü, sorular → ürün feedback
- ✅ Bağlı uygulamalar (Meta, Google, Canva) sekme gibi; izolasyon kesin
- ✅ Müşteri ödemeleri → reklam + AI + ürün geliştirme; kişisel kâr abartısı YOK
- ✅ Bot Lab (eğitim) → kapalı; production'da yalnız onaylı skill
- ✅ Panel arama motoruna kapalı; showroom public (tenant versiyonları gelecek)

### Pilot Müşteri
- **Embay Yapı** (workspace #1)
- Kod Embay'e kilitli DEĞİL; domain/logo/telefon config'den
- Tenant abstraction zorunlu (V1 Embay, V2+ multi-tenant)

### Yasaklar (Hard Constraints)
- ❌ Sahte takipçi, beğeni, otomatik etkileşim
- ❌ Kaynaksız içerik ("Google 1. sıra garantisi", "0 bulgu = başarı")
- ❌ Onaysız spam, scraping, ToS ihlali
- ❌ Sahte bakiye, sahte bağlantı
- ❌ Lab/prompt sızıntısı → production
- ❌ Tenant izolasyonunu kıran cross-client veri

---

## 2) FAZLAR VE MVP SINIRLARI

### MVP (PHASE 1) — Bitirmesi Zorunlu
**Hedef:** Tek tenant (Embay) ile AI content + approval workflow + bot lifecycle  
**Ödeme:** Şimdilik Embedded Admin (manuel bakiye); ürün ödeme V2'ye  
**Zaman:** ~4-5 hafta

#### P0 (Bu Hafta Kapat)
1. **Content Bot** — gerçek taslak DB + UI  
2. **Growth Bot** — kaynaklı hesap keşfi (uydurma handle yok)  
3. **Fırsat Bot** — DOĞRULANDI/ADAY/ELENDİ ayrımı, rakip-marka çelişkisi yok  
4. **Search Health** — Tavily available / `search_unavailable` fallback  

**Kanıt:** Üç bot ailesinde minimum 1 kontrollü canlı görev + panelde doğru status + production deploy

#### P1 (Sonraki)
- Bot status görünürlük (durumlar: completed, completed_no_findings, search_unavailable, permission_missing, awaiting_approval, published, failed)
- Home/Dashboard refactor (tasarım Claude/Grok standarı)
- Piri Chat MVP (intent allowlist: rapor, todo, kuyruk, büyüme)
- Approval workflow UI

#### P2
- Showroom + SEO (Embay sağlamlaştırma): robots, sitemap, canonical, JSON-LD
- Media library foundation
- Workspace settings UI

#### P3 (PHASE 1 Sonu)
- Recency / source kanıt katmanı doğrulama
- Edge Functions üretime koç (varsa pending)

**PHASE 1 Bitişi Kriteri:**
- ✅ 3 bot + approval workflow canlı + gerçek çıktı
- ✅ Main'e merged, Vercel production ready
- ✅ Supabase migrations applied + Edge ACTIVE
- ✅ Embay showroom public accessible
- ✅ 0 known critical bugs

---

### PHASE 2 (Sonrası) — Şimdiye Kapalı

- 🔒 **Ödeme Sistemi** (Stripe/Iyzico + wallet + invoice + subscription)
- 🔒 **Multi-tenant Showroom** (domain routing, branding per workspace)
- 🔒 **Meta/Google/Canva Real Integration** (clean OAuth, live publish)
- 🔒 **Advanced Analytics** (mission ROI, bot performance)
- 🔒 **3D/Parsel Features** (geometric/property data)
- 🔒 **Team Collaboration** (multi-member workspace, approver roles)

**Not:** PHASE 2 başlamaz PHASE 1 §2.2 kriterini karşılamadan.

---

## 3) TAMAMLANMA TANIMI (§2 STRICT)

**Bir madde "bitmiş" saymak için hepsi ZORUNLU:**

| Kriter | Kanıt |
|--------|-------|
| 1. Kod uygulandı | Dosyalar yazıldı, logic visible |
| 2. Gerçek veri / test | DB kayıt VAR, UI üzerinde görünür, bota test görev verdim |
| 3. **GitHub main merge** | PR #XX, commit message, §2 standarttı karşılanıyor |
| 4. **Vercel production ready** | Deploy log yeşil, URL çalışıyor (embay-panel.vercel.app/path) |
| 5. Supabase ACTIVE | Migration applied (migration name + timestamp) + Edge (varsa deploy log) |
| 6. Kanıt notu | PR comment / commit message: migration ad, test adım, Vercel URL, known issue |

**Bitmemiş = Local / açık PR / uygulanmamış SQL / failed deploy / test yok → liste açık kalır**

### Teslim Şablonu
```
## İş: [Başlık]

**PR:** #XX | **Commit:** abc1234def

**Migration:** [gerekli-hayır] 
- Migration adı: 20261009_...
- Status: Applied / Pending

**Edge Functions:** [varsa]
- Function: ops/…
- Deploy: ✅ / ⏳ / ❌

**Vercel Production:**
- URL: https://embay-panel.vercel.app/...
- Status: ✅ Ready / ⏳ Deploying / ❌ Failed

**Test / Kanıt:**
1. Bot görev oluşturdum (ID: XX)
2. Panelde status "completed" görünüyor
3. Çıktı DB'de `ai_generations.id=YY` kayıtlı

**Bilinen Sorunlar:**
- Yok / [İçerik]
```

---

## 4) MEVCUT DURUM KONTROLÜ (ŞİMDİ DOĞRULA)

Aşağıdakiler "base trunk" — sil-yeniden yazma yok.  
**HARITA:** Önce her satırı main branch'te kontrolü.

| Parça | PR | Migration | Edge | Vercel | Durum | Aksiyon |
|-------|-----|-----------|------|--------|-------|--------|
| Agency Foundation | #12 | 20261009090000 | — | ✅ | ✅ Aktif | Doğrula backend |
| Completed No Findings | #13 | 20261009090100 | ✅ ops/… | ✅ | ✅ | Test |
| Recency Kapısı | #15 | içinde | — | ✅ | ✅ | Test |
| Source Kanıt | #16 | içinde | — | ✅ | ✅ | Test |
| Rapor Güvenliği | #17 | — | — | ✅ | ✅ | Kod review |
| Screens (Bots, Home, etc) | #XX | — | — | ✅ | 🟡 Kısmi | UI update lazım |

**Şu an:** Herhangi bir deployment failure varsa ÖNCE düzelt.

---

## 5) P0 KAPANAN İŞ — GERÇEK VERİ / BOT ÇIKTISI

Her bot ailesinin EN AZ 1 kontrollü görev + production kanıt.

### 5.1 Content Bot
**Gerekli:**
- DB: `ai_generations.mode` = "content_draft" | "content_approved"
- UI: "İçerik Merkezi" sekmesinde görev kartı → status → çıktı preview
- Test: "Blog yazısı Embay projeleri için" → bot cevap → panelde gör
- Kaynak: Şablon + Gemini API (GEMINI_API_KEY)
- Başarı: Bot yazı üretti ✅ | Başarısızlık: Search unavailable ✅

**Redliner (Başarı Sayılmaz):**
- ❌ Şablon yazısı copy-paste
- ❌ Boş çıktı
- ❌ Kaynaksız iddia

### 5.2 Growth Bot
**Gerekli:**
- DB: `ai_generations.mode` = "lead_discovery" + `output` = JSON liste
- UI: "Büyüme" → hesap bulma → liste görün
- Test: "Fashion/İç Mimar kişiler Instagram'da" → bot 5-10 handle dönsün
- Kaynak: Tavily arama (TAVILY_API_KEY varsa) | local DB falls back
- Başarı: ✅ Gerçek hesap önerileri | ❌ Tekrar kontrol keçti

**Redliner:**
- ❌ Uydurulan handle
- ❌ Kapalı/silinmiş hesaplar
- ❌ Tekrar kontrol atlanmış

### 5.3 Fırsat / Lead Keşif Bot
**Gerekli:**
- DB: `ai_generations.mode` = "opportunity_discovery" + `validation_status` = DOĞRULANDI | ADAY | ELENDİ
- UI: "Müşteri Adayları" → botun bulduğu → onay kuyruğu
- Test: "Gayrimenkul emlakçılar Google harita'da" → 3+ sonuç → DOĞRULANDI/ELENDİ etiket
- Kurallar:
  - 🟢 **DOĞRULANDI:** İletişim var, web aktif, şu 30 gün aktivite kanıtı
  - 🟡 **ADAY:** Bir bilgi eksik veya tarih şüpheli
  - 🔴 **ELENDİ:** Kapalı, yanlış kategori, rakip markası (marka iddiasıyla çelişen)
- Redline (§1 Yasaklar):
  - ❌ Rakip özelliğini marka avantajı saydı
  - ❌ Güncel pencere atlayan eski verisi
  - ❌ Kaynaksız "100 sonuç" iddası

### 5.4 Search Health
**Gerekli:**
- Tavily (veya fallback): Çalışıyorsa normal sonuç; yoksa `search_unavailable` status
- UI: Bot kartında ⚠️ "Arama şu an devre dışı"
- **Başarı olarak sayılmaz:** ❌ Arama yok ama 10 uydurulan sonuç → başarı saydı

---

## 6) LLM ADAPTÖRÜ VE PROVIDER SEÇİMİ (KRITIK)

**Şimdiki Durum:** Sadece GEMINI (Google Genai)  
**Gereklilik:** Multi-provider capable; uzun vadede GitHub Models + Claude geçişi

### MVP Scope (PHASE 1)
- ✅ Gemini default (GEMINI_API_KEY)
- ✅ Adapter layer: `callLLM(provider, prompt)` → single interface
- ✅ Fallback: Gemini fail → error (retry logic yok V1)
- ❌ **PHASE 2 için reserved:** GitHub Models, Claude, OpenAI switching

### Teknik
```typescript
// src/lib/llm-adapter.ts
export async function callLLM(
  provider: 'gemini' | 'github-models' | 'claude',
  prompt: string,
  context?: Record<string, any>
): Promise<string> {
  switch (provider) {
    case 'gemini':
      return callGemini(prompt, context);
    case 'github-models':
      // TODO: PHASE 2
      throw new Error('GitHub Models: PHASE 2');
    case 'claude':
      // TODO: PHASE 2
      throw new Error('Claude: PHASE 2');
  }
}
```

**Workspace Config:**
- `workspace.default_llm_provider` = 'gemini' (şimdilik)
- Sonra UI'da değiştir (PHASE 2)

---

## 7) MİMARİ KURALLAR (SABIT)

| Kural | Gerekçe |
|-------|---------|
| **Additive Migration Yalnız** | Rollback karmaşası; DELETE var olmaz; ALTER ekler |
| **Tenant Izolasyonu (RLS)** | `workspace_id` EVERY table; cross-workspace query = error |
| **Secret Kaynak Kodda YOK** | `.env.example` public; `GEMINI_API_KEY` environment variable |
| **TypeScript + Strict** | `tsconfig.strict: true` |
| **Supabase Edge + Deno** | Serverless logic; Node.js yok edge function'da |
| **PR = Code Review** | Main'e direct push yasak; § tüm kriterler review'dan sonra |
| **Vercel Deploy Log** | Failed = PR merge red |
| **Panel indexlenmesin** | `robots: noindex, nofollow` (main.tsx satır 13 mevcut) |

---

## 8) DEPLOYMENT CHECKLIST (Her PR Öncesi)

Merge edilmeden **şunu doğrula:**

- [ ] `git log --oneline` son 5 commit message açıklayıcı
- [ ] `npm run lint` → 0 error
- [ ] TypeScript build → `tsc --noEmit` yeşil
- [ ] Migration: `supabase migration up` test ortamında çalıştı
- [ ] Edge Function: `supabase functions deploy` başarılı (varsa)
- [ ] Vercel preview build yeşil
- [ ] Production URL test:
  - [ ] Panel login çalışıyor
  - [ ] Bot görev oluştur → DB'ye kaydedildi
  - [ ] Çıktı panelde görünüyor
- [ ] Tarayıcı console → no errors
- [ ] Migration name push öncesi `TAMAMLANMA_TANIMI` notu yazıldı

---

## 9) ŞIMDIKINI YAP (SIRA)

### Faz 0 — Kontrol (Bugün)
1. Repo main branch'i pull et
2. Hepsini doğrula (§4 tablosunu):
   - PR merge durumu
   - Migration applied
   - Vercel production ready
   - Eksikse önce deploy kapat
3. Raporla: "Foundation OK" / "XYZ deployment failed"

### Faz 1 — P0 Bot Çalışması (Bu hafta)
1. Content Bot (§5.1) + test + deploy
2. Growth Bot (§5.2) + test + deploy
3. Fırsat Bot (§5.3) + test + deploy
4. Search health fallback (§5.4)
5. Her biri için teslim notu (§2.3 şablonu)

### Faz 2 — P1 UI & Workflow (Sonraki)
1. Home/Dashboard tasarım (Claude/Grok standard)
2. Approval workflow screen
3. Piri Chat MVP (sorular → product_feedback log)
4. Bot status indicator (§5'de tanımlı durumlar)

### Faz 3 — P2 Showroom (Sonra)
1. SEO foundation (robots, sitemap, canonical, JSON-LD)
2. Embay showroom public test
3. Media library DB (structure only, UI later)

### Faz 4 — P3 Kapanış (Sonra)
1. Recency & source kanıt layer doğrulama
2. Edge Functions final test
3. PHASE 1 bitişi kanıtı (§3 checklist)

**PHASE 2'ye Geçme Kriteri:**
- ✅ PHASE 1 §3 checklist tam
- ✅ 0 critical bug
- ✅ Ödeme sistemi mimarisi tasarlandı (separate doc)
- ✅ Main branch production-stable

---

## 10) YASAKLAR & RED LINES (Hard No)

❌ **ASLA Yapma:**
- Agency Foundation'ı baştan yazma
- İkinci wallet/growth/inbox motoru
- completed_no_findings kuralını ihlal (sahte başarı)
- Meta'yı yayın testine zorlamak (telefon OAuth düzelmeden)
- Scraping, otomatik takip, toplu DM
- Sahte bakiye, sahte bağlantı, kaynaksız başarı
- 3D / mini oyun / platform connector'ı P0 bitmeden açmak
- Lab prompt'unu production'a sızdırmak
- Cross-tenant veri sızıntısı
- Direct push to main (PR → review → merge)
- Migration DELETE/DROP (only additive)

---

## 11) BILINEN SORUNLAR & NOTLAR

| Sorun | Durum | Plan |
|--------|-------|------|
| Meta/telefon OAuth | ⏳ Blocked | PHASE 2 öncesi temiz OAuth yeniden açılacak |
| GitHub Models token | 🔒 PHASE 2 | Adapter layer hazır; şimdi kullanılmayacak |
| Multi-tenant UI | 🔒 PHASE 2 | Foundation var; tenant routing sonra |
| Payment system | 🔒 PHASE 2 | Separate design doc needed |
| Advanced analytics | 🔒 PHASE 2 | Mission ROI tracking |
| 3D parsel features | 🔒 PHASE 2 | Geometric data + permissions |

---

## 12) İLETİŞİM & KANIT

**Teslim dili:** Türkçe, net, şablona uygun  
**Takılırsan:** Dosya yolu, PR #, Vercel hata özeti — sessiz kapsam genişletme YOK  
**Kanıt:** PR comment + commit message + URL + test adımları

### Şablonlu Teslim Notu
```markdown
## ✅ [P0 / P1 / ...] Content Bot Tamamlandı

**PR:** #42 | **Commit:** a3f8c2d

**Migration:**
- Hayır (tablo var, kolon ekledim)

**Edge Functions:**
- Yok

**Vercel Production:**
- https://embay-panel.vercel.app/queue
- Status: ✅ Ready

**Test Adımları:**
1. "Embay yazı: müşteri hikayesi" görevi oluştur
2. Bot çalışıyor; DB'de ai_generations.id=5 kayıt
3. Panelde "Taslak" kartı görünüyor
4. Taslak önceleyen (human) → "Onaylandı"

**Bilinen Sorunlar:**
- Yok

**Sonraki:** Growth Bot
```

---

## ÖZET: TEK CÜMLELİK EMIR

**Kod + gerçek test + main merge + Vercel production ready + Supabase ACTIVE + teslim notu olmadan hiçbir maddeyi kapalı sayma; P0 üç bot + search kapısı canlı kanıt olmadan §5'in ötesine geçme; foundation ve kanıt katmanı yeniden yazma; tasarımı Claude/Grok standardına çek; Meta/PHASE 2'yi P0 bitene kadar bekleme.**

---

**Versiyon:** 2.0  
**Son Update:** 9 Ekim 2026  
**Next Review:** PHASE 1 bitişinde
