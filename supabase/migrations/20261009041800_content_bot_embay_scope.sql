-- Content Bot kapsam düzeltmesi: Embay Yapı test müşterisi çelik yapı içerikleri üretir.
-- Mevcut taslaklar veya yayın kayıtları silinmez; yalnızca gelecekteki otomasyon girdisi düzeltilir.

WITH target AS (
  SELECT t.id
  FROM public.automation_tasks t
  JOIN public.automation_bots b ON b.id = t.bot_id
  JOIN public.automation_skills s ON s.id = t.skill_id
  WHERE b.slug = 'content-bot'
    AND s.skill_key = 'content_scheduler'
    AND coalesce(t.input_config->>'topic', '') ILIKE '%Manitou%'
  ORDER BY t.created_at ASC
  LIMIT 1
)
UPDATE public.automation_tasks t
SET input_config = jsonb_set(
  coalesce(t.input_config, '{}'::jsonb),
  '{topic}',
  to_jsonb('Embay Yapı çelik yapı, prefabrik ev, villa ve gerçek şantiye süreçleri için Instagram içerikleri'::text)
)
FROM target
WHERE t.id = target.id;

WITH target AS (
  SELECT id
  FROM public.brand_kits
  WHERE company_name = 'Embay Yapı'
    AND default_cta = 'Hayalinizdeki eve bir adım: hemen arayın'
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE public.brand_kits b
SET default_cta = 'Çelik yapı projeniz için bilgi almak isterseniz bize yazabilirsiniz.'
FROM target
WHERE b.id = target.id;
