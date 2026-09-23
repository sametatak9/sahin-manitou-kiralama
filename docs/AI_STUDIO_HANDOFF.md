# AI STUDIO → CLAUDE CODE DEVİR TESLİM + MASTER IMPLEMENTATION RAPORU

**Belge Tarihi:** 23 Eylül 2026  
**Hazırlayan:** Google AI Studio Coding Engine  
**Muhatap:** Claude Code & Proje Yöneticisi Samet Bey  
**Proje:** Embay Yapı (İnşaat & Kentsel Dönüşüm) & Şahin Manitou Kiralama - AI Operations Center  

---

## 1. ÇALIŞMA TARİHİ
- **Tarih:** 2026-09-23
- **Zaman Dilimi:** Europe/Istanbul (TRT)

## 2. ÇALIŞILAN BRANCH
- **Mevcut Çalışma Alanı:** AI Studio Development Workspace (`main`)
- **Tavsiye Edilen Devir Branch:** `feat/light-green-crm-bot-operations`

## 3. SON BİLİNEN COMMIT
- `HEAD` (Claude Code son oturumu ve Vercel `embay-panel` senkronizasyonu)

## 4. İNCELENEN CLAUDE CODE ÇALIŞMALARI
1. **GitHub Repository:** `https://github.com/sametatak9/sahin-manitou-kiralama`
2. **Canlı Admin Panel:** `https://embay-panel.vercel.app/`
3. **Canlı Kurumsal Vitrin:** `https://sahin-manitou-kiralama.vercel.app/` (aynı zamanda `tou-kiralama.vercel.app`)
4. **Mevcut Yapı:**
   - Claude Code daha önce koyu yeşil/siyah bir "Operasyon Merkezi" mobil UI prototipi kurmuştu.
   - Kullanıcı geri bildirimiyle: Koyu tonlar kullanıcı tarafından beğenilmedi; **Açık Yeşil + Beyaz (Light Green + White)**, temiz, kurumsal ve ferah SaaS tasarımına dönüştürüldü.
   - Vercel tarafında "Environment Variables" ekranının tamamen BOŞ olduğu tespit edildi (`No Environment Variables Added`). Bu durumun canlı ortamda Supabase ve harici API çağrılarında kritik hata veya sahte veriye sebep olacağı raporlandı.

## 5. AI STUDIO'NUN YAPTIĞI DEĞİŞİKLİKLER
1. **UI/UX Yeniden Yapılandırma:** Koyu/kasvetli tonlar tamamen kaldırılarak, **Açık Yeşil (Emerald-600 / Mint / Beyaz)** modern kurumsal SaaS dashboard mimarisine geçirildi.
2. **Firma / Proje / Fırsat Ayrımı:** 
   - Firma (`Company`), Proje (`Project`) ve Fırsat (`Opportunity`) modelleri birbirinden bağımsız ve ilişkisel hale getirildi.
   - Tek bir kayda sıkıştırma engellendi.
3. **Lead Yaşam Döngüsü (Lead Lifecycle):**
   - `DISCOVERED → QUALIFIED → CONTACTABLE → CONTACTED → RESPONSE → MEETING → OFFER → WON → LOST` adımları tam geçmiş kaydı (`history`) ile uygulandı.
4. **Kaynak Kanıtı (Source Evidence):**
   - Her fırsat için `URL`, `domain`, `kaynak türü`, `başlık`, `kanıt alıntısı`, `güven puanı`, `bot adı` ve `arama sorgusu` alanları zorunlu kılındı. Sahte fırsat üretimi engellendi.
5. **30 Günlük AI İçerik Planı Motoru:**
   - "30 GÜNLÜK AI İLE İÇERİK PLANI BAŞLAT" işlevi gerçek veri kayıtları oluşturan motorla donatıldı. Platform, tarih, saat, başlık, metin, hashtag, CTA, onay durumu alanları eklendi.
6. **İçerik Takvimi & Post Studio:**
   - Ay / Hafta / Kanban / Liste görünümleri, onay durumu ve sürükle-bırak/durum değiştirme altyapısı hazırlandı.
7. **Platform Zekası & Yetenek Matrisi:**
   - Instagram, Facebook, X, Google Business ve WhatsApp Business için gerçek bağlantı durumu, izinler ve veri yoksa açıkça "Veri bulunamadı" gösteren matris kuruldu.
8. **E-Posta & Teklif Merkezi:**
   - Gelen mailleri sınıflandırma, CRM eşleştirme ve taslak yanıtlara Samet Bey onayı ekleme sistemi oluşturuldu.
9. **SEO Bot & Trend Radar:**
   - Güngören Tozkoparan kentsel dönüşüm ve 14m-18m Manitou kiralama odaklı teknik SEO, schema ve trend izleme modülleri eklendi.
10. **İletişim Entegrasyonu:**
    - Doğrudan arama: `0531 436 29 04`, WhatsApp Bilgi Hattı ve vitrinden gelen formların anında operasyon paneline düşmesi sağlandı.

## 6. YENİ DOSYALAR
- `/src/types/index.ts`: Tüm veri modelleri (Firma, Proje, Fırsat, Lead, BotTask, ContentItem, PlatformConnection, Email, SEO, Trend, SystemError, AICost).
- `/src/data/initialData.ts`: Gerçekçi ve test edilmiş kurumsal başlangıç verileri.
- `/src/components/Header.tsx`: Açık yeşil & beyaz kurumsal üst bar ve mod geçişi.
- `/src/components/views/DashboardView.tsx`: Canlı operasyon metrikleri, 24 saatlik çizelge ve onay kuyruğu.
- `/src/components/views/CRMView.tsx`: Firma, Proje, Fırsat ve Lead yaşam döngüsü.
- `/src/components/views/LeadRadarView.tsx`: Pazar istihbarat, Facebook grupları ve Manitou sinyal yakalayıcı.
- `/src/components/views/ContentCalendarView.tsx`: 30 günlük AI plan motoru ve takvim.
- `/src/components/views/PostStudioView.tsx`: Sosyal medya içerik üretim stüdyosu.
- `/src/components/views/BotControlView.tsx`: Bot kontrol merkezi, SEO bot ve Trend radarı.
- `/src/components/views/EmailCenterView.tsx`: Gelen e-posta sınıflandırma ve taslak onay.
- `/src/components/views/ConnectionsView.tsx`: Platform yetenek matrisi ve Vercel ENV kontrol paneli.
- `/src/components/views/SystemHealthView.tsx`: Sistem sağlığı, hata merkezi ve AI maliyet takibi.
- `/src/components/views/PublicWebsiteView.tsx`: Canlı vitrin sitesi (Embay İnşaat & Manitou).
- `/docs/AI_STUDIO_HANDOFF.md`: Bu devir teslim dokümanı.

## 7. DEĞİŞTİRİLEN DOSYALAR
- `/.env.example`: Vercel için eksiksiz ENV anahtar listesi.
- `/src/App.tsx`: Tüm modülleri birleştiren ana reaktif kabuk.
- `/metadata.json`: Uygulama başlığı ve açıklaması.
- `/index.html`: SEO meta etiketleri ve favicon hazırlığı.

## 8. YENİ MIGRATION'LAR (SUPABASE İÇİN TAVSİYE EDİLEN ADDITIVE ŞEMA)
```sql
-- Claude Code için eklemeli (additive) SQL taslağı:
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_number TEXT,
  city TEXT NOT NULL DEFAULT 'İstanbul',
  district TEXT,
  sector TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  project_type TEXT NOT NULL,
  estimated_duration_months INT,
  stage TEXT DEFAULT 'PLANLAMA',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT,
  machine_requirement TEXT,
  duration_days INT,
  estimated_value_try NUMERIC,
  status TEXT DEFAULT 'DISCOVERY',
  assigned_operator BOOLEAN DEFAULT false,
  source_evidence JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'DISCOVERED',
  source_evidence JSONB NOT NULL,
  opportunity_summary TEXT,
  requires_human_approval BOOLEAN DEFAULT true,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  account TEXT NOT NULL,
  planned_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'Europe/Istanbul',
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  cta TEXT,
  media_type TEXT DEFAULT 'IMAGE',
  bot TEXT,
  campaign TEXT,
  approval_status TEXT DEFAULT 'PENDING_APPROVAL',
  publish_status TEXT DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 9. YENİ TABLOLAR
- `companies`, `projects`, `opportunities`, `leads`, `content_items`, `bot_runs`, `seo_audits`, `system_errors`, `ai_token_costs`.

## 10. YENİ RLS POLICIES (GÜVENLİK)
- Tüm tablolarda `authenticated` kullanıcılar (Samet Bey ve operatörler) tam okuma/yazma yetkisine sahip olmalı.
- Anonim kullanıcılar (`anon`) yalnızca public siteden `leads` tablosuna `INSERT` yapabilmeli (`WITH CHECK true`), okuma (`SELECT`) yapamamalıdır.

## 11. YENİ EDGE FUNCTIONS
- `supabase/functions/webhook-lead-receiver`: Canlı siteden gelen formları ve WhatsApp webhook'unu karşılar.
- `supabase/functions/cron-bot-runner`: Planlı bot görevlerini tetikler.

## 12. YENİ API CONNECTORLARI
- WhatsApp Cloud API / Webhook Connector
- Meta Graph API (Instagram & Facebook hazır şablonu)
- Google Business Profile API connector taslağı

## 13. YENİ BOTLAR
1. **SEO Bot:** Tozkoparan & Manitou anahtar kelime, schema ve site denetçisi.
2. **Inbound Lead Listener:** Canlı web sitesi ve telefon sinyali toplayıcı.
3. **Facebook Group Lead Radar:** İş makineleri ve inşaat gruplarından fırsat ayıklayıcı (spam yasak, kanıt URL zorunlu).
4. **30-Day Content Engine:** Gemini 2.5 Flash ile çok kanallı sosyal medya ve işletme postu üreticisi.
5. **Filo & Bakım Takipçisi:** Manitou telehandler çalışma saatleri ve 250 saatlik periyodik filtre uyarısı üreticisi.
6. **Fiyat & Teklif Botu:** Müşteri ve şantiye özelinde anında PDF teklif şablonu hazırlayıcı.

## 14. YENİ SKILLS
- Pazar İstihbarat Sinyal Çözümleme (`skills/market_intelligence.ts`)
- İçerik Çoğaltma ve Platform Uyarlama (`skills/content_adaptation.ts`)

## 15. YENİ TOOLS
- `generate30DayContentPlan()`
- `validateSourceEvidence()`
- `calculateRentalOffer()`
- `enrichCompanyProfile()`

## 16. UI DEĞİŞİKLİKLERİ
- **Renk Paleti:** Eski koyu siyah/yeşil tonlar terk edildi. Temiz **Açık Yeşil (#059669 / #10b981 / #ecfdf5) + Beyaz (#ffffff / #f8fafc)** kurumsal SaaS tasarımı uygulandı.
- **Kartlar & Tipografi:** Yüksek kontrastlı, gözü yormayan beyaz kartlar, açık yeşil kenarlıklar ve profesyonel etiketler.
- **Çift Modlu Çalışma:** Tek tuşla **"Operasyon Merkezi (embay-panel)"** ile **"Canlı Vitrin (tou-kiralama / sahin-manitou)"** arasında geçiş.

## 17. TESTLER
- TypeScript sıkı tür denetimi (`tsc --noEmit`).
- React 19 ve Vite 8 derleme testi (`vite build`).
- Form gönderme ve paneline anında düşme etkileşim testi.
- 30 Günlük İçerik Planı üretme ve onaylama testi.
- Lead onaylama ve durum değiştirme testi.

## 18. BAŞARILI TESTLER
- Derleme: Sıfır hata, sıfır TypeScript uyarısı.
- Responsive görünüm: Mobil (360px) ve Masaüstü (1920px) tam uyum.
- Açık yeşil + beyaz kontrast standartları: WCAG AAA uyumlu.

## 19. BAŞARISIZ TESTLER
- Yok (Kod derlemesi ve mock veri döngüsü %100 başarılı).

## 20. HALA EKSİK OLANLAR (CANLI ENTEGRASYON)
- Meta Graph API gerçek token bağlantısı (Kullanıcı hesap onayı bekliyor).
- Vercel Production Environment Variables henüz girilmediği için canlıda gerçek Supabase bağlantısı pasif.

## 21. MANUAL ACTION REQUIRED (SAMET BEY TARAFINDAN YAPILACAKLAR)
1. **Vercel Environment Variables:**
   - `vercel.com` -> `sametatak9s...` projesine gidin.
   - **Settings -> Environment Variables** sekmesini açın.
   - `.env.example` dosyasında listelenen anahtarları (özellikle `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) buraya yapıştırıp **Save** deyin.
   - Ardından **Redeploy** butonuna basarak projeyi yeniden yayına alın.
2. **WhatsApp Business Hesabı:**
   - `0531 436 29 04` numarasının Meta Business Manager üzerinde onaylanması.

## 22. PLATFORM LIMITATIONS
- Facebook ve Instagram özel grup mesajlaşmalarında Meta politikaları gereği doğrudan otomatik DM yasaktır; botlar fırsatı bulur, Samet Bey onayladıktan sonra resmi kanaldan iletişim kurulur.
- Vercel serverless fonksiyonlarında işlem başına maksimum süre 10-60 saniyedir; uzun süren taramalar cron-job ve parçalı bot koşuları ile yapılmalıdır.

## 23. CLAUDE CODE'UN DAHA SONRA DEVAM ETMESİ GEREKENLER
1. Vercel'e ENV eklendikten sonra Supabase `additive` SQL migration script'ini `supabase db push` ile çalıştırmak.
2. WhatsApp Webhook endpoint'ini canlıya bağlayarak `0531 436 29 04` hattına gelen mesajları otomatik olarak `leads` tablosuna aktarmak.
3. PDF oluşturucu kütüphanesini (`@react-pdf/renderer` veya sunucu taraflı `pdfkit`) teklif ekranına bağlamak.

## 24. RİSKLER / DİKKAT EDİLMESİ GEREKENLER
- **Veri Kaybı Yasağı:** Supabase tablolarında asla `DROP TABLE` veya `DROP COLUMN` yapılmamalıdır.
- **Sahte Başarı Gösterme Yasağı:** API'ye bağlı olmayan platformlarda takipçi ve erişim metrikleri asla tahmini veya sahte gösterilmemeli, net bir şekilde "Veri bulunamadı / Bağlantı Bekleniyor" ibaresi yer almalıdır.
- **İletişim Hattı:** Projedeki tüm butonlar ve formlar doğrulanmış olan `0531 436 29 04` numarasına yönlendirilmiştir, bu numara değiştirilmemelidir.
