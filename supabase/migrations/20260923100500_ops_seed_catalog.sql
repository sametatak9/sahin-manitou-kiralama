-- EMBAY AI OPS — 6/7: katalog seed (AI agent, tool, skill, bot, marka kiti, şablon, varsayılan görevler)
-- Idempotent: on conflict do nothing / do update yalnızca katalog alanları.

-- ── AI agent'lar ─────────────────────────────────────────────────────────────
insert into public.ai_agents (agent_key, name, provider, model, temperature, max_tokens, system_prompt) values
('content-writer', 'İçerik Yazarı', 'anthropic', 'claude-opus-5', 0.7, 3000,
 'Sen Embay Yapı ve Şahin Manitou Kiralama (Güngören/İstanbul) için çalışan kurumsal bir içerik uzmanısın. Türkçe yaz. Asla veri, rakam, müşteri adı, proje veya başarı uydurma; yalnızca sana verilen bilgileri ve araç çıktısını kullan. Belirsiz bilgiyi köşeli parantezle [doğrulanacak] işaretle.'),
('analyst', 'Analist', 'anthropic', 'claude-haiku-4-5', 0.2, 2000,
 'Sen Embay operasyon analistisin. Yalnızca araçlardan gelen gerçek veriyi yorumla. Veri yoksa "veri yok" de; tahmin üretme. Kısa, maddeli, Türkçe rapor yaz.'),
('planner', 'Kampanya Planlayıcı', 'anthropic', 'claude-opus-5', 0.5, 8000,
 'Sen Embay Yapı ve Şahin Manitou için aylık sosyal medya ve pazarlama planlayıcısısın. Türkçe yaz. Özel günleri, şantiye sezonunu, kentsel dönüşüm ve Manitou kiralama hizmetlerini dengele. Uydurma istatistik kullanma.')
on conflict (agent_key) do nothing;

-- ── Tool registry ────────────────────────────────────────────────────────────
insert into public.automation_tools (tool_key, name, description, category, min_role, approval_required, platform, handler, input_schema) values
('create_content', 'İçerik oluştur', 'Konu/amaç/kitleye göre başlık, metin, CTA ve hashtag içeren içerik nesnesi üretir (AI).', 'content', 'staff', false, null, 'create_content',
 '{"type":"object","properties":{"platform":{"type":"string"},"topic":{"type":"string"},"objective":{"type":"string"},"audience":{"type":"string"},"tone":{"type":"string"},"cta":{"type":"string"}},"required":["platform","topic"]}'),
('generate_caption', 'Caption yaz', 'Platform kurallarına uygun gönderi metni üretir (AI).', 'content', 'staff', false, null, 'generate_caption',
 '{"type":"object","properties":{"platform":{"type":"string"},"topic":{"type":"string"},"tone":{"type":"string"}},"required":["platform","topic"]}'),
('generate_hashtags', 'Hashtag üret', 'Konu ve lokasyona uygun hashtag seti üretir (AI).', 'content', 'staff', false, null, 'generate_hashtags',
 '{"type":"object","properties":{"topic":{"type":"string"},"location":{"type":"string"},"count":{"type":"integer"}},"required":["topic"]}'),
('generate_image_prompt', 'Görsel fikri / brief', 'Görsel fikri ve tasarım brief''i üretir (AI).', 'design', 'staff', false, null, 'generate_image_prompt',
 '{"type":"object","properties":{"topic":{"type":"string"},"format":{"type":"string"}},"required":["topic"]}'),
('create_design', 'Tasarım oluştur', 'Embay Design Studio şablonundan marka kitiyle tasarım kaydı oluşturur.', 'design', 'staff', false, null, 'create_design',
 '{"type":"object","properties":{"content_id":{"type":"string"},"format_key":{"type":"string"},"headline":{"type":"string"},"subtitle":{"type":"string"},"cta":{"type":"string"}},"required":["format_key","headline"]}'),
('save_draft', 'Taslak kaydet', 'İçeriği social_drafts tablosuna DRAFT olarak kaydeder.', 'content', 'staff', false, null, 'save_draft',
 '{"type":"object","properties":{"title":{"type":"string"},"caption":{"type":"string"},"platform":{"type":"string"},"hashtags":{"type":"array","items":{"type":"string"}},"cta":{"type":"string"},"headline":{"type":"string"},"image_brief":{"type":"string"},"scheduled_at":{"type":"string"}},"required":["title","caption","platform"]}'),
('submit_approval', 'Onaya gönder', 'Bir kaydı onay kuyruğuna (PENDING_APPROVAL) gönderir.', 'workflow', 'staff', false, null, 'submit_approval',
 '{"type":"object","properties":{"entity_type":{"type":"string"},"entity_id":{"type":"string"},"title":{"type":"string"},"summary":{"type":"string"}},"required":["entity_type","title"]}'),
('publish_post', 'Gönderi yayınla', 'Onaylı içeriği bağlı platform hesabına resmi API ile yayınlar.', 'social', 'admin', true, null, 'publish_post',
 '{"type":"object","properties":{"content_id":{"type":"string"},"platform":{"type":"string"},"scheduled_at":{"type":"string"}},"required":["content_id","platform"]}'),
('fetch_metrics', 'Metrik çek', 'Yayınların resmi API metriklerini ve panel verilerini okur.', 'analytics', 'staff', false, null, 'fetch_metrics',
 '{"type":"object","properties":{"days":{"type":"integer"}}}'),
('create_lead', 'Lead / aday oluştur', 'Onaylı kaynaktan gelen aday firmayı duplicate kontrolüyle kaydeder (kişisel veri içermez).', 'crm', 'staff', false, null, 'create_lead',
 '{"type":"object","properties":{"firm_name":{"type":"string"},"website":{"type":"string"},"public_phone":{"type":"string"},"ilce":{"type":"string"},"source_url":{"type":"string"},"need":{"type":"string"},"project":{"type":"string"}},"required":["firm_name","source_url"]}'),
('update_crm', 'CRM güncelle', 'Müşteri kayıtlarında takip tarihi, not ve öncelik günceller; duplicate/eksik veri raporlar.', 'crm', 'staff', false, null, 'update_crm',
 '{"type":"object","properties":{"module":{"type":"string"},"customer_id":{"type":"string"},"note":{"type":"string"},"next_action_at":{"type":"string"}}}'),
('send_email', 'E-posta gönder', 'Onaylı e-posta taslağını bağlı e-posta sağlayıcısından gönderir.', 'communication', 'admin', true, null, 'send_email',
 '{"type":"object","properties":{"to":{"type":"string"},"subject":{"type":"string"},"body":{"type":"string"}},"required":["to","subject","body"]}'),
('prepare_whatsapp_message', 'WhatsApp mesajı hazırla', 'Müşteri için WhatsApp mesaj taslağı hazırlar; gönderim onay ve izin gerektirir.', 'communication', 'staff', true, 'whatsapp', 'prepare_whatsapp_message',
 '{"type":"object","properties":{"customer_module":{"type":"string"},"customer_id":{"type":"string"},"message":{"type":"string"}},"required":["message"]}'),
('create_listing', 'İlan hazırla', 'Sahibinden / Armut için ilan metni hazırlar; resmi API olmadığından yayını manuel onaylı yapılır.', 'listing', 'staff', true, null, 'create_listing',
 '{"type":"object","properties":{"platform":{"type":"string"},"title":{"type":"string"},"description":{"type":"string"},"price_note":{"type":"string"}},"required":["platform","title","description"]}'),
('seo_audit', 'Teknik SEO denetimi', 'Web sitesinin title, meta, H1, canonical, robots, sitemap ve JSON-LD kontrolünü gerçek HTTP isteğiyle yapar.', 'seo', 'staff', false, 'web', 'seo_audit',
 '{"type":"object","properties":{"url":{"type":"string"}}}'),
('create_report', 'Rapor oluştur', 'Veritabanındaki gerçek verilerden (lead, müşteri, onay, koşu, yayın) özet rapor oluşturur.', 'analytics', 'staff', false, null, 'create_report',
 '{"type":"object","properties":{"scope":{"type":"string","enum":["daily","crm","marketing","operations","weekly"]},"title":{"type":"string"},"body":{"type":"string"}}}')
on conflict (tool_key) do nothing;

-- ── Skill'ler: mevcut 5 skill korunur ve zenginleştirilir, yenileri eklenir ──
update public.automation_skills set category = 'content', icon = 'calendar-days', execution_mode = 'agent',
  instructions = 'Hedef platform için tek bir gönderi hazırla: create_content ile içerik üret, save_draft ile kaydet, submit_approval ile onaya gönder. Yayınlama yapma.'
 where skill_key = 'content_scheduler' and instructions = '';
update public.automation_skills set category = 'analytics', icon = 'activity', execution_mode = 'pipeline', pipeline = '{fetch_metrics,create_report}',
  instructions = 'Yayın metriklerini oku ve etkileşim raporu çıkar.' where skill_key = 'engagement_monitor' and instructions = '';
update public.automation_skills set category = 'crm', icon = 'user-plus', execution_mode = 'pipeline', pipeline = '{create_lead}',
  instructions = 'Web formu ve manuel eklenen izinli kaynaklardaki adayları tekrar kontrolüyle portföye al.' where skill_key = 'prospect_builder' and instructions = '';
update public.automation_skills set category = 'analytics', icon = 'bar-chart-3', execution_mode = 'pipeline', pipeline = '{fetch_metrics,create_report}',
  instructions = 'Haftalık/aylık performans raporu üret.' where skill_key = 'performance_analyst' and instructions = '';
update public.automation_skills set category = 'communication', icon = 'message-circle', execution_mode = 'agent',
  instructions = 'Takip gerektiren müşteriler için WhatsApp/e-posta taslağı hazırla ve onaya gönder. Asla doğrudan gönderme.' where skill_key = 'inbox_assistant' and instructions = '';

insert into public.automation_skills (skill_key, display_name, description, allowed_actions, approval_required, category, icon, execution_mode, pipeline, instructions) values
('seo_audit', 'SEO Denetimi', 'Web sitesinin teknik SEO kontrolünü gerçek HTTP isteğiyle yapar ve rapor üretir.', '{read,report}', false, 'seo', 'search-check', 'pipeline', '{seo_audit,create_report}', 'Siteyi denetle, bulguları raporla.'),
('keyword_research', 'Anahtar Kelime Araştırması', 'Hizmet ve ilçe bazlı anahtar kelime fikirleri üretir (AI önerisidir, arama hacmi verisi değildir).', '{suggest,report}', false, 'seo', 'key-round', 'agent', '{}', 'Manitou kiralama, kentsel dönüşüm ve inşaat için ilçe bazlı anahtar kelime fikirleri öner; arama hacmi uydurma. Sonucu create_report ile kaydet.'),
('social_publisher', 'Sosyal Yayıncı', 'Onaylı içeriği bağlı platformda yayınlamak için yayın isteği açar.', '{publish}', true, 'social', 'send', 'agent', '{}', 'Yalnızca onaylı içerik için publish_post çağır. Bağlantı yoksa bunu açıkça raporla.'),
('image_designer', 'Görsel Tasarımcı', 'Gönderi için görsel fikri, tasarım brief''i ve Design Studio taslağı hazırlar.', '{design}', true, 'design', 'palette', 'agent', '{}', 'generate_image_prompt ile brief hazırla, create_design ile Design Studio taslağı oluştur.'),
('caption_writer', 'Caption Yazarı', 'Platforma uygun metin ve hashtag üretir.', '{draft}', true, 'content', 'pen-line', 'agent', '{}', 'generate_caption ve generate_hashtags kullan; sonucu save_draft ile kaydet.'),
('lead_discovery', 'Lead Keşfi', 'Web formu, sosyal aday listesi ve onaylı araştırma kaynaklarını tarar, puanlar ve tekrarları ayıklar.', '{read,score,queue}', true, 'crm', 'radar', 'pipeline', '{create_lead,create_report}', 'İzinli kaynakları tara; kişisel veri toplama.'),
('crm_cleaner', 'CRM Temizleyici', 'Müşteri modüllerinde eksik veri, gecikmiş takip ve tekrar kayıtları raporlar.', '{read,report}', false, 'crm', 'sparkles', 'pipeline', '{update_crm,create_report}', 'CRM sağlığını denetle.'),
('follow_up_assistant', 'Takip Asistanı', 'Takip zamanı gelen müşteriler için mesaj taslağı hazırlar; gönderim onay gerektirir.', '{draft,queue}', true, 'crm', 'phone-forwarded', 'agent', '{}', 'Takip tarihi gelen müşteriler için prepare_whatsapp_message veya send_email taslağı hazırla. Ticari ileti izni olmayan kişiye pazarlama mesajı hazırlama.'),
('campaign_planner', 'Kampanya Planlayıcı', 'Aylık/haftalık içerik planı ve kampanya taslağı üretir.', '{plan,draft}', true, 'content', 'map', 'agent', '{}', 'Aylık plan için birden fazla save_draft çağrısı yap; her içerik için tarih ver, sonra submit_approval ile onaya gönder.'),
('analytics', 'Analitik', 'Platform ve CRM verilerinden gerçek performans özeti çıkarır.', '{read,report}', false, 'analytics', 'line-chart', 'pipeline', '{fetch_metrics,create_report}', 'Gerçek veriyi özetle.'),
('report_generator', 'Rapor Üretici', 'Gün sonu / haftalık yönetici raporu hazırlar.', '{report}', false, 'analytics', 'file-text', 'pipeline', '{create_report}', 'Gün sonu raporu üret.'),
('listing_creator', 'İlan Oluşturucu', 'Sahibinden ve Armut için ilan metni hazırlar; yayın manuel ve onaylıdır.', '{draft,queue}', true, 'listing', 'store', 'agent', '{}', 'create_listing ile ilan taslağı hazırla. Fiyat uydurma; [fiyat doğrulanacak] yaz.'),
('google_business_manager', 'Google İşletme Yöneticisi', 'Google Business Profile gönderisi hazırlar; yayın bağlantı ve onay gerektirir.', '{draft,publish}', true, 'social', 'map-pin', 'agent', '{}', 'GBP için kısa yerel gönderi hazırla (create_content + save_draft + submit_approval).')
on conflict (skill_key) do nothing;

-- Skill ↔ tool eşlemesi
insert into public.automation_skill_tools (skill_id, tool_id)
select s.id, t.id from (values
  ('content_scheduler', 'create_content'), ('content_scheduler', 'save_draft'), ('content_scheduler', 'submit_approval'), ('content_scheduler', 'generate_hashtags'),
  ('engagement_monitor', 'fetch_metrics'), ('engagement_monitor', 'create_report'),
  ('prospect_builder', 'create_lead'),
  ('performance_analyst', 'fetch_metrics'), ('performance_analyst', 'create_report'),
  ('inbox_assistant', 'prepare_whatsapp_message'), ('inbox_assistant', 'send_email'),
  ('seo_audit', 'seo_audit'), ('seo_audit', 'create_report'),
  ('keyword_research', 'create_report'),
  ('social_publisher', 'publish_post'), ('social_publisher', 'submit_approval'),
  ('image_designer', 'generate_image_prompt'), ('image_designer', 'create_design'),
  ('caption_writer', 'generate_caption'), ('caption_writer', 'generate_hashtags'), ('caption_writer', 'save_draft'),
  ('lead_discovery', 'create_lead'), ('lead_discovery', 'create_report'),
  ('crm_cleaner', 'update_crm'), ('crm_cleaner', 'create_report'),
  ('follow_up_assistant', 'prepare_whatsapp_message'), ('follow_up_assistant', 'send_email'), ('follow_up_assistant', 'submit_approval'),
  ('campaign_planner', 'create_content'), ('campaign_planner', 'save_draft'), ('campaign_planner', 'submit_approval'),
  ('analytics', 'fetch_metrics'), ('analytics', 'create_report'),
  ('report_generator', 'create_report'),
  ('listing_creator', 'create_listing'), ('listing_creator', 'generate_caption'),
  ('google_business_manager', 'create_content'), ('google_business_manager', 'save_draft'), ('google_business_manager', 'submit_approval'), ('google_business_manager', 'publish_post')
) as m(skill_key, tool_key)
join public.automation_skills s on s.skill_key = m.skill_key
join public.automation_tools t on t.tool_key = m.tool_key
on conflict do nothing;

-- ── Botlar ───────────────────────────────────────────────────────────────────
insert into public.automation_bots (slug, name, bot_type, platform, icon, description, connector_key, status, ai_agent_id, instructions)
select b.slug, b.name, b.bot_type, b.platform, b.icon, b.description, b.connector_key, b.status, a.id, b.instructions
from (values
  ('seo-bot', 'SEO Bot', 'seo', 'web', 'search-check', 'Web sitesinin teknik SEO sağlığını her sabah gerçek HTTP istekleriyle denetler.', 'website', 'active', 'analyst', 'Siteyi denetle ve bulguları önceliklendir.'),
  ('social-bot', 'Sosyal Medya Botu', 'social', 'multi', 'share-2', 'Tüm platformlar için içerik akışını koordine eder.', null, 'active', 'content-writer', 'Platform farklarını gözet; her içerik onaya gider.'),
  ('instagram-bot', 'Instagram Bot', 'social', 'instagram', 'instagram', 'Instagram gönderilerini hazırlar ve onaylı olanları resmi Graph API ile yayınlar.', 'instagram', 'waiting_connection', 'content-writer', 'Kare görsel, güçlü ilk satır, 8-15 hashtag.'),
  ('facebook-bot', 'Facebook Bot', 'social', 'facebook', 'facebook', 'Facebook Sayfası gönderilerini hazırlar ve onaylı olanları yayınlar.', 'facebook', 'waiting_connection', 'content-writer', 'Bilgilendirici, yerel topluluk odaklı ton.'),
  ('sahibinden-bot', 'Sahibinden Bot', 'listing', 'sahibinden', 'store', 'Sahibinden ilan metinlerini hazırlar. Resmi API olmadığı için yayın manuel yapılır.', 'sahibinden', 'active', 'content-writer', 'İlan başlığı 60 karakteri geçmesin.'),
  ('armut-bot', 'Armut Bot', 'listing', 'armut', 'hammer', 'Armut hizmet profili ve teklif metinlerini hazırlar. Resmi API yok; manuel yayın.', 'armut', 'active', 'content-writer', 'Hizmet kapsamını net yaz.'),
  ('google-business-bot', 'Google Business Bot', 'social', 'google_business', 'map-pin', 'Google İşletme Profili gönderilerini hazırlar; yayın için Business Profile API bağlantısı gerekir.', 'google_business', 'waiting_connection', 'content-writer', 'Yerel anahtar kelime ve CTA kullan.'),
  ('lead-discovery-bot', 'Lead Discovery Bot', 'lead', null, 'radar', 'Web formu ve izinli kaynaklardaki adayları tarar, puanlar ve tekrarları ayıklar.', null, 'active', 'analyst', 'Kişisel veri toplama; yalnızca izinli kaynak.'),
  ('crm-bot', 'CRM Bot', 'crm', null, 'users', 'Müşteri modüllerinin sağlığını denetler, günün yeni kayıtlarını raporlar.', null, 'active', 'analyst', 'Gecikmiş takipleri öne çıkar.'),
  ('content-bot', 'Content Bot', 'content', 'multi', 'pen-line', 'Günlük içerik taslaklarını AI ile üretir ve onaya gönderir.', null, 'active', 'content-writer', 'Her gün bir saha/hizmet odaklı içerik.'),
  ('marketing-bot', 'Marketing Bot', 'marketing', null, 'megaphone', 'Kampanya planı ve takip mesajı önerileri hazırlar; gönderim onaylıdır.', null, 'active', 'planner', 'Ticari ileti izni olmayan kişiye pazarlama mesajı hazırlama.'),
  ('analytics-bot', 'Analytics Bot', 'analytics', null, 'line-chart', 'Yayın ve CRM verilerinden haftalık performans özeti çıkarır.', null, 'active', 'analyst', 'Yalnızca gerçek veri.'),
  ('market-intel-bot', 'Market Intelligence Bot', 'research', null, 'telescope', 'Etkileşim sinyallerini ve anahtar kelime fırsatlarını izler.', null, 'active', 'analyst', 'Önerileri "AI önerisi" olarak işaretle.'),
  ('manager-assistant', 'Manager Assistant', 'assistant', null, 'briefcase', 'Gün sonunda yöneticiye operasyon raporu hazırlar.', null, 'active', 'analyst', 'Kısa, karar odaklı rapor.')
) as b(slug, name, bot_type, platform, icon, description, connector_key, status, agent_key, instructions)
left join public.ai_agents a on a.agent_key = b.agent_key
on conflict (slug) do nothing;

insert into public.automation_bot_skills (bot_id, skill_id, position)
select bt.id, s.id, m.pos from (values
  ('seo-bot', 'seo_audit', 0), ('seo-bot', 'keyword_research', 1),
  ('social-bot', 'content_scheduler', 0), ('social-bot', 'caption_writer', 1), ('social-bot', 'social_publisher', 2),
  ('instagram-bot', 'caption_writer', 0), ('instagram-bot', 'image_designer', 1), ('instagram-bot', 'social_publisher', 2),
  ('facebook-bot', 'caption_writer', 0), ('facebook-bot', 'social_publisher', 1),
  ('sahibinden-bot', 'listing_creator', 0), ('armut-bot', 'listing_creator', 0),
  ('google-business-bot', 'google_business_manager', 0),
  ('lead-discovery-bot', 'lead_discovery', 0), ('lead-discovery-bot', 'prospect_builder', 1),
  ('crm-bot', 'crm_cleaner', 0), ('crm-bot', 'follow_up_assistant', 1),
  ('content-bot', 'content_scheduler', 0), ('content-bot', 'caption_writer', 1), ('content-bot', 'image_designer', 2), ('content-bot', 'campaign_planner', 3),
  ('marketing-bot', 'campaign_planner', 0), ('marketing-bot', 'follow_up_assistant', 1),
  ('analytics-bot', 'analytics', 0), ('analytics-bot', 'performance_analyst', 1),
  ('market-intel-bot', 'engagement_monitor', 0), ('market-intel-bot', 'keyword_research', 1),
  ('manager-assistant', 'report_generator', 0)
) as m(slug, skill_key, pos)
join public.automation_bots bt on bt.slug = m.slug
join public.automation_skills s on s.skill_key = m.skill_key
on conflict do nothing;

-- ── Marka kitleri ────────────────────────────────────────────────────────────
insert into public.brand_kits (name, company_name, logo_url, primary_color, secondary_color, accent_color, text_color, font_heading, font_body, phone, website, instagram, address, default_cta, is_default) values
('Embay Yapı', 'Embay Yapı ve Kiralık İş Makineleri', 'https://embay-panel.vercel.app/embay-mark.svg', '#3DAA5C', '#115A31', '#F5B301', '#0F1A14', 'Inter', 'Inter', '0531 436 29 04', 'sahin-manitou-kiralama.vercel.app', '@embayyapi', 'Tozkoparan Mah. Güngören / İstanbul', 'Hemen arayın: 0531 436 29 04', true),
('Şahin Manitou', 'Şahin Manitou Kiralama', 'https://embay-panel.vercel.app/embay-mark.svg', '#F5B301', '#1F2933', '#3DAA5C', '#111111', 'Inter', 'Inter', '0531 436 29 04', 'sahin-manitou-kiralama.vercel.app', '@embayyapi', 'Güngören / İstanbul', 'Operatörlü Manitou için WhatsApp''tan yazın', false)
on conflict (name) do nothing;

-- ── Platform formatları ──────────────────────────────────────────────────────
insert into public.design_templates (template_key, name, format_key, platform, width, height, layout, is_system) values
('ig-post-hero', 'Instagram Post — Hero', 'instagram_post', 'instagram', 1080, 1080, '{"variant":"hero"}', true),
('ig-post-split', 'Instagram Post — Split', 'instagram_post', 'instagram', 1080, 1080, '{"variant":"split"}', true),
('ig-portrait', 'Instagram Portrait 4:5', 'instagram_portrait', 'instagram', 1080, 1350, '{"variant":"hero"}', true),
('ig-story', 'Instagram Story', 'instagram_story', 'instagram', 1080, 1920, '{"variant":"story"}', true),
('fb-post', 'Facebook Post', 'facebook_post', 'facebook', 1200, 630, '{"variant":"split"}', true),
('li-post', 'LinkedIn Post', 'linkedin_post', 'linkedin', 1200, 627, '{"variant":"corporate"}', true),
('x-post', 'X Post', 'x_post', 'x', 1600, 900, '{"variant":"split"}', true),
('yt-thumb', 'YouTube Thumbnail', 'youtube_thumbnail', 'youtube', 1280, 720, '{"variant":"bold"}', true),
('sahibinden-listing', 'Sahibinden İlan Görseli', 'sahibinden_listing', 'sahibinden', 1200, 900, '{"variant":"listing"}', true),
('armut-cover', 'Armut Görseli', 'armut_cover', 'armut', 1200, 800, '{"variant":"listing"}', true),
('gbp-post', 'Google Business Gönderisi', 'gbp_post', 'google_business', 1200, 900, '{"variant":"corporate"}', true)
on conflict (template_key) do nothing;

-- ── Varsayılan günlük operasyon görevleri (Europe/Istanbul) ─────────────────
-- Görevler ilk yöneticiye/kullanıcıya atanır; kullanıcı yoksa seed atlanır.
with owner as (
  select coalesce((select user_id from public.team_members where role = 'admin' order by created_at limit 1), (select id from auth.users order by created_at limit 1)) as uid
), defs(slug, skill_key, title, schedule_type, run_time, cron_expression) as (values
  ('seo-bot', 'seo_audit', 'Sabah teknik SEO kontrolü', 'daily', '08:00', null),
  ('content-bot', 'content_scheduler', 'Günün Instagram içerik taslağı', 'daily', '09:00', null),
  ('lead-discovery-bot', 'lead_discovery', 'Yeni başvuru ve aday taraması', 'daily', '12:00', null),
  ('crm-bot', 'crm_cleaner', 'Gün sonu CRM kontrolü', 'daily', '18:00', null),
  ('marketing-bot', 'follow_up_assistant', 'Takip mesajı önerileri', 'daily', '18:15', null),
  ('manager-assistant', 'report_generator', 'Gün sonu yönetici raporu', 'daily', '18:30', null),
  ('analytics-bot', 'analytics', 'Haftalık performans özeti', 'cron', null, '30 9 * * 1')
)
insert into public.automation_tasks (bot_id, skill_id, platform, task_type, title, schedule_type, run_time, cron_expression, timezone, status, approval_state, next_run_at, input_config, created_by)
select b.id, s.id, case when d.slug = 'content-bot' then 'instagram' else b.platform end, s.skill_key, d.title, d.schedule_type, d.run_time, d.cron_expression, 'Europe/Istanbul', 'scheduled',
       case when s.approval_required then 'approval_required' else 'not_required' end,
       case
         when d.run_time is not null then
           case when ((date_trunc('day', now() at time zone 'Europe/Istanbul') + d.run_time::time) at time zone 'Europe/Istanbul') > now()
                then ((date_trunc('day', now() at time zone 'Europe/Istanbul') + d.run_time::time) at time zone 'Europe/Istanbul')
                else ((date_trunc('day', now() at time zone 'Europe/Istanbul') + interval '1 day' + d.run_time::time) at time zone 'Europe/Istanbul') end
         else ((date_trunc('week', now() at time zone 'Europe/Istanbul') + interval '7 days' + time '09:30') at time zone 'Europe/Istanbul')
       end,
       jsonb_build_object('source', 'seed', 'topic', case when d.slug = 'content-bot' then 'Manitou kiralama ve şantiye hizmetleri' else null end),
       o.uid
from defs d
join public.automation_bots b on b.slug = d.slug
join public.automation_skills s on s.skill_key = d.skill_key
cross join owner o
where o.uid is not null
  and not exists (select 1 from public.automation_tasks t where t.bot_id = b.id and t.skill_id = s.id and t.input_config->>'source' = 'seed');
