-- EMBAY AI OPS — Sosyal büyüme altyapısı (Meta bağlanmadan önce eğitim) + Çatalca/tadilat talep eğitimi.
-- Yasal çerçeve: yalnızca İŞLETME / kurum hesapları listelenir (rakip, tedarikçi, sektör medyası, yerel işletme).
-- Bireylerin beğeni/yorum verisi toplanmaz, otomatik toplu takip YAPILMAZ (Meta kuralları + KVKK); takip listesi insan tarafından uygulanır.
-- Meta bağlanınca rakip hesap metrikleri resmi Instagram Graph API "Business Discovery" ile çekilir. Additive; DROP yok.

alter table public.social_prospects add column if not exists account_kind text;
alter table public.social_prospects add column if not exists follow_status text not null default 'to_follow';
alter table public.social_prospects add column if not exists followers int;
alter table public.social_prospects add column if not exists media_count int;
alter table public.social_prospects add column if not exists avg_engagement numeric;   -- gönderi başı ortalama beğeni+yorum
alter table public.social_prospects add column if not exists engagement_rate numeric;  -- % (etkileşim / takipçi)
alter table public.social_prospects add column if not exists metrics jsonb;            -- en iyi gönderiler, gönderi sıklığı vb.
alter table public.social_prospects add column if not exists last_benchmarked_at timestamptz;
alter table public.social_prospects add column if not exists bot_mission_id uuid references public.bot_missions(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'social_prospects_account_kind_check') then
    alter table public.social_prospects add constraint social_prospects_account_kind_check check (account_kind is null or account_kind in ('competitor', 'supplier', 'industry_media', 'local_business', 'partner'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'social_prospects_follow_status_check') then
    alter table public.social_prospects add constraint social_prospects_follow_status_check check (follow_status in ('to_follow', 'followed', 'engaged', 'skip'));
  end if;
end $$;
create unique index if not exists social_prospects_platform_handle_uq on public.social_prospects (platform, lower(handle)) where handle is not null;

-- Yetenekler (Akademi'de TESTTE başlar)
insert into public.automation_skills (skill_key, display_name, description, category, icon, execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples)
select 'tadilat_tamirat_talebi', 'Tadilat / tamirat ve müstakil ev talebi (Çatalca öncelikli)', 'Çatalca ve çevresinde villa, müstakil ev yapımı ile tadilat-tamirat arayışlarını bulur.',
  'arastirma', 'hammer', 'agent', '{}', true, true, array['research', 'report'], 'testing',
  'Amaç: Embay Yapı için Çatalca (öncelik), Silivri, Arnavutköy, Büyükçekmece, Başakşehir ve çevresinde (1) villa / müstakil ev / betonarme ev yaptırma, '
  || '(2) ev-bina tadilat, tamirat, çatı, cephe, güçlendirme, ek kat, dış cephe mantolama ARAYIŞLARINI bulmak. Güçlü sinyaller: hizmet pazaryerlerindeki herkese açık talep özetleri '
  || '(ilçe + iş türü + büyüklük), forumlarda "Çatalca''da ev yaptırmak / tadilat yaptırmak istiyorum" başlıkları, site/kooperatif yönetimlerinin tadilat-yenileme duyuruları, '
  || 'yeni imar/parselasyon ile yapılaşmaya açılan Çatalca köyleri. Her bulgu: iş türü, ilçe/köy, büyüklük (m², kat), tarih, neden uygun, kaynak linki. '
  || 'KVKK: şahısların adını/telefonunu YAZMA; talebi anonim özetle ve linkiyle ver. Tadilat firmalarının kendi reklam/hizmet sayfaları bulgu DEĞİLDİR (bunlar rakip).',
  'Çatalca ve çevresinde (Silivri, Arnavutköy, Büyükçekmece) son 30 günde yayımlanmış en az 5 gerçek talep bul: villa/müstakil ev yaptırma veya tadilat/tamirat arayışı. Her biri için iş türü, ilçe/köy, büyüklük, tarih ve kaynak linki.',
  array['Çatalca müstakil ev yaptırmak', 'Çatalca villa yaptırma', 'Çatalca tadilat ustası arıyorum', 'Silivri ev tadilatı yaptırmak istiyorum', 'Çatalca çatı tamiri', 'Arnavutköy müstakil ev inşaatı',
        'Büyükçekmece villa tadilat', 'Çatalca imar planı yapılaşma köy', 'dış cephe mantolama yaptırmak Çatalca', 'ek kat yaptırmak istiyorum İstanbul'],
  array['armut.com', 'donanimhaber.com', 'eksisozluk.com', 'catalcahaber.com', 'silivrihaber.com'],
  'Ör: pazaryeri talep özeti "Çatalca, Ovayenice: 180 m² müstakil ev yapımı" · forum "Çatalca''da arsama villa yaptırmak istiyorum, betonarme mi prefabrik mi?" · "Silivri''de site yönetimi dış cephe yenileme için teklif topluyor".',
  'Ör: tadilat firmasının hizmet/reklam sayfası · "tadilat fiyatları 2026" rehberi · satılık villa ilanı · başka il · şahsın telefon numarası.'
where not exists (select 1 from public.automation_skills where skill_key = 'tadilat_tamirat_talebi');

insert into public.automation_skills (skill_key, display_name, description, category, icon, execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples)
select 'sektor_hesap_kesfi', 'Sektör hesap keşfi (rakip, tedarikçi, sektör medyası)', 'Instagram/Facebook''ta yüksek etkileşimli sektör İŞLETME hesaplarını bulur; takip listesi ve rakip analizi için.',
  'arastirma', 'users', 'agent', '{}', true, true, array['research', 'report'], 'testing',
  'Amaç: Embay Yapı & Şahin Manitou''nun Instagram/Facebook''ta trend bir sayfa olması için sektördeki İŞLETME hesaplarını bulmak: '
  || '(1) rakipler: İstanbul''daki inşaat/müteahhit, kentsel dönüşüm, villa-müstakil ev, prefabrik yapı firmaları ve manitou/iş makinesi kiralama firmaları; '
  || '(2) tedarikçi ağı: beton, demir, yapı malzemesi, iskele, cephe, prefabrik üreticileri, iş makinesi bayileri; (3) sektör medyası ve yerel sayfalar: inşaat haber hesapları, Çatalca/Silivri yerel işletme ve haber sayfaları. '
  || 'Her bulgu: hesap adı, platform, profil linki (instagram.com/... veya facebook.com/...), tür (rakip/tedarikçi/sektör medyası/yerel işletme), neden takip edilmeli (fit), varsa takipçi sayısı ve etkileşim işareti. '
  || 'YALNIZCA işletme/kurum hesapları; bireysel kişilerin hesapları, beğenen/yorum yapan kişi listeleri TOPLANMAZ.',
  'İstanbul inşaat, kentsel dönüşüm, villa/prefabrik ve manitou/iş makinesi kiralama sektöründe Instagram veya Facebook''ta aktif, etkileşimi yüksek en az 10 İŞLETME hesabı bul (rakip, tedarikçi, sektör medyası). Her biri için profil linki, tür ve neden takip edilmeli.',
  array['instagram inşaat firması İstanbul', 'instagram kentsel dönüşüm firması', 'instagram villa inşaat firması İstanbul', 'instagram prefabrik ev firması', 'instagram manitou kiralama',
        'instagram iş makinesi kiralama İstanbul', 'instagram yapı malzemesi tedarikçi', 'instagram inşaat haberleri sayfası', 'Çatalca instagram sayfası', 'facebook inşaat firması İstanbul sayfa'],
  array['instagram.com', 'facebook.com'],
  'Ör: instagram.com/<inşaat_firması> (rakip, Reels ile yüksek etkileşim) · instagram.com/<manitou_kiralama_firmasi> (doğrudan rakip) · instagram.com/<yapi_haber_hesabi> (sektör medyası, paylaşım fırsatı).',
  'Ör: bireysel kişi profili · hashtag sayfası · takipçi satan/"takipçi arttırma" hesapları · başka ülke · kapalı/pasif hesap.'
where not exists (select 1 from public.automation_skills where skill_key = 'sektor_hesap_kesfi');

insert into public.automation_skills (skill_key, display_name, description, category, icon, execution_mode, pipeline, approval_required, enabled, allowed_actions,
  lifecycle, instructions, test_goal, search_terms, sources, good_examples, bad_examples)
select 'meta_organik_buyume', 'Meta organik büyüme yöntemi (Instagram · Facebook · WhatsApp)', 'Doğal takipçi, etkileşim ve portföy edinme yöntemleri: içerik planı, Reels, etkileşim rutini, rakip analizi, WhatsApp dönüşüm.',
  'sosyal', 'trending-up', 'agent', '{}', true, true, array['plan', 'report'], 'testing',
  'Yöntem (Meta kurallarına uygun, satın alınmış takipçi/otomatik takip YOK): '
  || '1) KONUMLANDIRMA: Embay Yapı (villa, müstakil ev, kentsel dönüşüm, tadilat — Çatalca/İstanbul) + Şahin Manitou (teleskopik yükleyici kiralama). Profilde net hizmet, bölge, WhatsApp butonu, öne çıkan hikâyeler (Projeler, Makineler, Referanslar, Teklif). '
  || '2) İÇERİK DÜZENİ: haftada 4-5 Reels (şantiye ilerleme, önce/sonra, manitou iş başında, 15-30 sn, ilk 2 sn kanca), 2 karusel (süreç/ipucu: "kat karşılığı nasıl işler", "villa maliyeti neye bağlı"), günlük hikâye (şantiyeden anlık). '
  || '3) RAKİP ANALİZİ: takip listesindeki yüksek etkileşimli rakip/tedarikçi hesaplarının en çok beğeni-yorum alan gönderi TÜRLERİNİ, saatlerini ve konu başlıklarını çıkar; aynı formatı kendi gerçek projelerimizle üret (kopyalama yok). '
  || '4) ETKİLEŞİM RUTİNİ (insan eliyle, günde 20-30 dk): takip listesindeki sektör ve yerel işletme hesaplarının gönderilerine anlamlı yorum, yerel hashtag ve konum etiketi (Çatalca, Silivri, Başakşehir), gelen her yoruma 1 saat içinde yanıt, DM''leri WhatsApp''a yönlendirme. '
  || '5) İŞ BİRLİĞİ: tedarikçi ve yerel işletmelerle ortak gönderi (collab), müşteri referans videoları. 6) FACEBOOK: yerel gruplarda kurallara uygun, reklam olmayan faydalı paylaşım; sayfa yorumlarına hızlı yanıt. '
  || '7) WHATSAPP: katalog (makineler, proje tipleri), hızlı yanıtlar, Instagram/Facebook''tan gelen talebi 5 dakika içinde karşılama. 8) ÖLÇÜM: haftalık takipçi artışı, erişim, kaydetme, profil ziyareti → WhatsApp tıklaması; en iyi 3 gönderi tekrar formatlanır. '
  || 'YAPILMAZ: takipçi satın alma, otomatik toplu takip/beğeni, bireylerin verisini toplama, spam yorum.',
  'Embay Yapı & Şahin Manitou için Meta kurallarına uygun 30 günlük organik büyüme planı çıkar: haftalık içerik takvimi (Reels/karusel/hikâye konuları), günlük etkileşim rutini, takip listesinden örnek alınacak 3 rakip format, WhatsApp dönüşüm akışı ve haftalık ölçüm hedefleri.',
  array['instagram inşaat reels fikirleri', 'inşaat firması instagram büyüme', 'şantiye reels trend'],
  array['business.instagram.com', 'facebook.com/business'],
  'Ör: "Çatalca villa projesi 30 günde: temelden çatıya" Reels serisi · "Manitou 17 m''de nasıl çalışır" kısa video · "Kat karşılığında 5 kritik madde" karuseli.',
  'Ör: takipçi satın alma önerisi · otomatik takip botu · rakip içeriğini kopyalama · kişisel veri toplama.'
where not exists (select 1 from public.automation_skills where skill_key = 'meta_organik_buyume');

-- Bot: Sosyal Büyüme Botu (Meta bağlanmadan araştırma + plan; bağlanınca yayın/analiz)
insert into public.automation_bots (slug, name, bot_type, platform, icon, description, instructions, status)
select 'sosyal-buyume', 'Sosyal Büyüme Botu', 'research', 'instagram', 'trending-up',
  'Instagram · Facebook · WhatsApp organik büyüme: sektör hesap keşfi, takip listesi, rakip format analizi, 30 günlük içerik ve etkileşim planı.',
  'Yalnızca Meta kurallarına uygun organik yöntemler. İşletme hesaplarıyla çalış; bireylerin verisini toplama; otomatik toplu takip yapma — takip listesini yöneticiye sun.', 'active'
where not exists (select 1 from public.automation_bots where slug = 'sosyal-buyume');

insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, row_number() over () - 1 from public.automation_bots b join public.automation_skills s on s.skill_key in ('sektor_hesap_kesfi', 'meta_organik_buyume')
where b.slug = 'sosyal-buyume' and not exists (select 1 from public.automation_bot_skills x where x.bot_id = b.id and x.skill_id = s.id);
insert into public.automation_bot_skills (bot_id, skill_id, position)
select b.id, s.id, 1 from public.automation_bots b join public.automation_skills s on s.skill_key = 'tadilat_tamirat_talebi'
where b.slug = 'insaat-is-bulucu' and not exists (select 1 from public.automation_bot_skills x where x.bot_id = b.id and x.skill_id = s.id);

-- Özel inşaat yeteneğine Çatalca önceliği
update public.automation_skills set
  search_terms = array(select distinct t from unnest(search_terms || array['Çatalca kat karşılığı arsa', 'Çatalca villa inşaatı yaptırmak', 'Çatalca müstakil ev müteahhit']) t),
  instructions = instructions || E'\n\n[Öncelik] Çatalca ve çevresi (Silivri, Arnavutköy, Büyükçekmece) talepleri önce raporlanır.', version = version + 1
where skill_key = 'ozel_insaat_is_bulma' and not (search_terms @> array['Çatalca kat karşılığı arsa']);

-- Otomatik görevler
insert into public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at)
select (select id from public.automation_bots where slug = 'insaat-is-bulucu'), 'Çatalca & çevresi — villa / müstakil ev / tadilat talepleri',
  'Çatalca (öncelik), Silivri, Arnavutköy, Büyükçekmece ve Başakşehir''de villa / müstakil ev yaptırma ve tadilat-tamirat arayışlarını bul. Her bulgu: iş türü, ilçe/köy, büyüklük, tarih, neden uygun, kaynak linki. Şahısların kişisel verisini yazma; firma reklam sayfalarını bulgu yapma.',
  'Çatalca müstakil ev yaptırmak, Çatalca villa yaptırma, Çatalca tadilat ustası arıyorum, Silivri ev tadilatı yaptırmak istiyorum, Çatalca çatı tamiri',
  'Yönlendirici liste: en umut verici 3 talep başta; her biri için iş türü, yer, büyüklük, ilk adım (teklif/ziyaret), kaynak.',
  null, 15, 10, '{1,2,3,4,5,6}', true, (select user_id from public.team_members where role = 'admin' order by created_at limit 1), now()
where not exists (select 1 from public.mission_schedules where title = 'Çatalca & çevresi — villa / müstakil ev / tadilat talepleri');

insert into public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at)
select (select id from public.automation_bots where slug = 'sosyal-buyume'), 'Sektör hesap keşfi — haftalık takip listesi',
  'İstanbul inşaat, kentsel dönüşüm, villa/prefabrik ve manitou/iş makinesi kiralama sektöründe Instagram/Facebook''ta aktif ve etkileşimi yüksek İŞLETME hesaplarını (rakip, tedarikçi, sektör medyası, Çatalca yerel işletmeleri) bul. Her bulgu: hesap adı, profil linki, tür, neden takip edilmeli. Bireysel hesap ve kişi listesi toplama.',
  'instagram inşaat firması İstanbul, instagram manitou kiralama, instagram yapı malzemesi tedarikçi, instagram inşaat haberleri sayfası, Çatalca instagram sayfası',
  'Takip listesi: hesap, platform, link, tür, neden; en yüksek etkileşimli 5 hesap başta.',
  null, 15, 11, '{1}', true, (select user_id from public.team_members where role = 'admin' order by created_at limit 1), now()
where not exists (select 1 from public.mission_schedules where title = 'Sektör hesap keşfi — haftalık takip listesi');
