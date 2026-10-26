-- EMBAY YAPI: varied light-steel editorial pool and tenant-safe legacy media.
-- Additive only. Existing drafts/publications are not changed or deleted.

alter table public.post_templates
  add column if not exists client_id uuid references public.agency_clients(id),
  add column if not exists tone text;

create index if not exists post_templates_client_active_idx
  on public.post_templates (client_id, updated_at desc)
  where archived_at is null;

create index if not exists media_library_client_active_kind_idx
  on public.media_library (client_id, kind, created_at desc)
  where archived_at is null;

do $$
begin
  if not exists (select 1 from public.agency_clients where slug = 'embay-yapi' and status = 'active') then
    raise exception 'Cannot seed Embay editorial pool: active embay-yapi client not found';
  end if;
end $$;

-- Drive uploads from 2026-10-06 are the Embay Yapı folder the customer connected.
-- Other older, unassigned Drive uploads are intentionally left unassigned (they may belong to Şahin Manitou).
update public.media_library m
set client_id = c.id
from public.agency_clients c
where c.slug = 'embay-yapi' and c.status = 'active'
  and m.client_id is null and m.source = 'drive'
  and m.created_at >= '2026-10-06'::date and m.created_at < '2026-10-07'::date
  and lower(translate(concat_ws(' ', m.title, m.caption), 'ğüşıöçĞÜŞİÖÇ', 'gusiocGUSIOC')) !~ '(agir[[:space:]]*celik|beton(arme)?|prefabrik|kentsel[[:space:]]+donusum|tadilat|tamirat|manitou|telehandler|kiralama)';

-- Attribute existing factory material only when its stored brand or Embay contact number identifies it.
update public.media_library m
set client_id = c.id
from public.agency_clients c
where c.slug = 'embay-yapi' and c.status = 'active'
  and m.client_id is null and m.source = 'factory'
  and ((m.template->>'brand') = 'Embay Yapı' or coalesce(m.caption, '') like '%0531 436 29 04%');

update public.post_templates t
set client_id = c.id
from public.agency_clients c
where c.slug = 'embay-yapi' and c.status = 'active'
  and t.client_id is null
  and (t.brand = 'Embay Yapı' or coalesce(t.caption, '') like '%0531 436 29 04%');

-- Remove clearly off-scope factory material from the reusable media/text pools without deleting it.
update public.media_library m
set archived_at = now()
from public.agency_clients c
where c.slug = 'embay-yapi' and c.status = 'active'
  and m.client_id = c.id and m.source = 'factory' and m.archived_at is null
  and lower(translate(concat_ws(' ', m.title, m.caption, m.pillar, m.template::text), 'ğüşıöçĞÜŞİÖÇ', 'gusiocGUSIOC'))
    ~ '(^|[^a-z0-9])(agir[[:space:]]*celik|heavy[[:space:]]*steel|beton(arme)?|prefabrik|kentsel[[:space:]]+donusum|kat[[:space:]]+karsiligi|istinat[[:space:]]+duvari|tas[[:space:]]+duvar|tadilat|tamirat|manitou|telehandler|kiralama)([^a-z0-9]|$)';

update public.post_templates t
set archived_at = now()
from public.agency_clients c
where c.slug = 'embay-yapi' and c.status = 'active'
  and t.client_id = c.id and t.archived_at is null
  and lower(translate(concat_ws(' ', t.title, t.headline, t.caption, t.pillar, t.tone), 'ğüşıöçĞÜŞİÖÇ', 'gusiocGUSIOC'))
    ~ '(^|[^a-z0-9])(agir[[:space:]]*celik|heavy[[:space:]]*steel|beton(arme)?|prefabrik|kentsel[[:space:]]+donusum|kat[[:space:]]+karsiligi|istinat[[:space:]]+duvari|tas[[:space:]]+duvar|tadilat|tamirat|manitou|telehandler|kiralama)([^a-z0-9]|$)';

-- Exact duplicate legacy factory renders are archived, newest copy retained. No social draft or publication state changes.
with ranked as (
  select m.id, row_number() over (
    partition by m.client_id, m.platform, lower(btrim(coalesce(m.title, ''))), lower(btrim(coalesce(m.caption, '')))
    order by m.created_at desc, m.id desc
  ) as rn
  from public.media_library m
  join public.agency_clients c on c.id = m.client_id
  where c.slug = 'embay-yapi' and m.source = 'factory' and m.archived_at is null
)
update public.media_library m
set archived_at = now()
from ranked r
where r.id = m.id and r.rn > 1;

-- Seed original, short style examples. These are editable pool templates, not pre-approved posts.
with embay as (
  select id from public.agency_clients where slug = 'embay-yapi' and status = 'active' limit 1
), styles(tone, title, headline, caption, cta, hashtags) as (
  values
    ('question_hook', 'Stil örneği · Merak sorusu', 'Ev projesine nereden başlanır?', 'Hafif çelik ev fikriniz varsa ilk adım, arsanızı ve nasıl bir yaşam alanı istediğinizi konuşmak. Aklınızdaki ilk soru ne?', 'Projenizi konuşalım', array['#hafifçelik','#evprojesi','#arsa','#embayyapı']),
    ('myth_fact', 'Stil örneği · Yanlış bilinen / gerçek', 'Bir kavramı netleştirelim', 'Hafif çelik yapı hakkında duyduğunuz her bilgi aynı projeye uymaz. Karar verirken kendi arsanıza ve proje kapsamınıza göre soru sormak en sağlıklı başlangıçtır.', 'Sorunuzu bize yazın', array['#hafifçelikev','#yapıtasarımı','#evhayali','#embayyapı']),
    ('mini_checklist', 'Stil örneği · Mini kontrol listesi', 'İlk görüşmede 3 soru', 'Kullanım amacınız ne? Arsanızla ilgili hangi bilgiler hazır? Projede hangi detayları birlikte netleştirmelisiniz? Görüşmeye bu üç soruyla başlayabilirsiniz.', 'Kaydedip not alın', array['#hafifçelik','#projeplanlama','#arsa','#embayyapı']),
    ('detail_closeup', 'Stil örneği · Detaya yakından', 'Bir detay, bir soru', 'Hafif çelik ev planlarken duvar ve çatı katmanlarını birlikte değerlendirmek gerekir. Projenizde hangi detayı önce görmek istersiniz?', 'Merak ettiğinizi sorun', array['#hafifçelik','#yapıdetayı','#evprojesi','#embayyapı']),
    ('project_journey', 'Stil örneği · Proje yolculuğu', 'Her proje bir fikirle başlar', 'Bir ev projesini konuşurken ihtiyaçlar, arsa ve tasarım birlikte ele alınır. Siz hayalinizdeki evde en çok hangi alanı önemsiyorsunuz?', 'Fikrinizi paylaşın', array['#hafifçelikev','#proje','#müstakilev','#embayyapı']),
    ('homeowner_view', 'Stil örneği · Ev sahibinin gözünden', 'Eviniz size nasıl hissettirsin?', 'Plan yaparken yalnızca oda sayısını değil, günlük yaşamınızı da düşünün. Evinizde sizin için vazgeçilmez olan bir detay var mı?', 'Yorumlara yazın', array['#evhayali','#hafifçelik','#yaşamalanı','#embayyapı']),
    ('short_explainer', 'Stil örneği · Kısa açıklama', 'Bugünün yapı terimi', 'Hafif çelik, taşıyıcı sistemde çelik profillerin kullanıldığı yapı yaklaşımını anlatır. Her projenin detayları, tasarım ve mühendislik çalışmasıyla netleşir.', 'Daha fazlasını sorun', array['#hafifçelik','#yapıbilgisi','#evprojesi','#embayyapı']),
    ('process_steps', 'Stil örneği · Süreç adımları', 'Önce fikir, sonra plan', 'İhtiyacı anlatın, arsa bilgilerini paylaşın, proje kapsamını birlikte netleştirin. Uygulama detayları her projeye göre ayrıca değerlendirilir.', 'İlk adımı konuşalım', array['#hafifçelikev','#projeplanlama','#arsa','#embayyapı']),
    ('visual_story', 'Stil örneği · Görüntüden hikâye', 'Kadrajda hangi detay var?', 'Bu paylaşımda göze çarpan bir ayrıntıyı seçin ve kendi ev projenizde nasıl bir görünüm istediğinizi düşünün. Siz ilk neye baktınız?', 'Gözleminizi paylaşın', array['#hafifçelik','#sahadannotlar','#evtasarımı','#embayyapı']),
    ('choice_guide', 'Stil örneği · Karar rehberi', 'Arsa ve ihtiyaç birlikte', 'Proje konuşmasına başlamadan önce arsanızla ilgili bilgileri ve evden beklentinizi not edin. Böylece görüşmede doğru sorulara odaklanabilirsiniz.', 'Görüşme için yazın', array['#arsa','#hafifçelikev','#proje','#embayyapı']),
    ('comment_prompt', 'Stil örneği · Yorum başlatan soru', 'İlk sorunuz ne olurdu?', 'Hafif çelik ev planlama sürecinde en çok hangi konuyu merak ediyorsunuz: tasarım, arsa uyumu, yoksa proje adımları mı?', 'Yorumlarda buluşalım', array['#hafifçelik','#evprojesi','#sorunuz','#embayyapı']),
    ('quiet_asmr', 'Stil örneği · Sakin saha notu', 'Sahadan sakin bir an', 'Gerçek saha görüntüsünü izleyin; ritmi ve ortam sesini dinleyin. Görüntüde olmayan bir aşamayı veya sonucu varsaymadan, o anın kendisine odaklanın.', 'Sesi açıp izleyin', array['#hafifçelik','#sahadan','#asmr','#embayyapı']),
    ('materials', 'Stil örneği · Katman ve malzeme', 'Katmanları birlikte düşünün', 'Duvar ve çatı katmanları proje kapsamına göre değerlendirilir. Malzeme seçimi, tasarım ve teknik gerekliliklerle birlikte ele alınmalıdır.', 'Detayları birlikte konuşalım', array['#hafifçelik','#yapıdetayı','#evprojesi','#embayyapı'])
)
insert into public.post_templates (client_id, tone, title, platform, brand, pillar, headline, caption, hashtags, cta, notes, source)
select e.id, s.tone, s.title, 'instagram', 'Embay Yapı', 'Hafif çelik ev', s.headline, s.caption, s.hashtags, s.cta,
  'Düzenlenebilir stil örneği; otomatik onaylı paylaşım değildir. Görsel/proje iddiaları yalnız doğrulanmış şirket materyaliyle kullanılmalıdır.', 'manual'
from embay e cross join styles s
where not exists (
  select 1 from public.post_templates t where t.client_id = e.id and t.tone = s.tone and t.archived_at is null
);
