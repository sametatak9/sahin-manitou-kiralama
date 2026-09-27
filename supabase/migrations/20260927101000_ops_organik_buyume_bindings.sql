-- EMBAY AI OPS — Organik büyüme skill bağları + meta_organik_buyume güçlendirme
-- Additive; DROP yok; mevcut satırları silmez.
-- Tarih: 2026-09-27

-- 1) meta_organik_buyume talimatını güçlendir (varsa, üzerine yazmadan ekle)
UPDATE public.automation_skills
SET
  instructions = instructions || E'\n\n[2026-09-27 Organik Büyüme Paketi]\nEk yetenekler: hashtag_arastirma, profil_optimizasyon, manuel_etkilesim_plani.\nReels öncelikli; 8-12 sektörel hashtag zorunlu; sadece işletme hesapları; otomatik beğeni/takip/yorum YASAK.\n30 günlük plan + haftalık hashtag/etkileşim/içerik önerileri üret. Her çıktı onay kuyruğuna düşer.',
  allowed_actions = CASE
    WHEN allowed_actions @> ARRAY['research','report'] THEN
      (SELECT array_agg(DISTINCT a) FROM unnest(allowed_actions || ARRAY['create_content','generate_hashtags','save_draft','plan']) AS a)
    ELSE allowed_actions
  END,
  version = COALESCE(version, 1) + 1
WHERE skill_key = 'meta_organik_buyume'
  AND instructions NOT LIKE '%2026-09-27 Organik Büyüme Paketi%';

-- 2) Yeni skill'leri ilgili botlara bağla (slug esnek eşleşme)
INSERT INTO public.automation_bot_skills (bot_id, skill_id, position)
SELECT b.id, s.id, 30 + (row_number() OVER (PARTITION BY b.id ORDER BY s.skill_key))
FROM public.automation_bots b
CROSS JOIN public.automation_skills s
WHERE s.skill_key IN ('hashtag_arastirma', 'profil_optimizasyon', 'manuel_etkilesim_plani', 'meta_organik_buyume')
  AND (
    b.slug IN ('sosyal-buyume', 'content-bot', 'icerik-fabrikasi')
    OR b.slug ILIKE '%instagram%'
    OR b.slug ILIKE '%facebook%'
    OR b.slug ILIKE '%sosyal%'
    OR b.slug ILIKE '%content%'
    OR b.name ILIKE '%Instagram%'
    OR b.name ILIKE '%Facebook%'
    OR b.name ILIKE '%Sosyal Büyüme%'
    OR b.name ILIKE '%Content%'
    OR b.name ILIKE '%İçerik%'
  )
  AND b.archived_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.automation_bot_skills x
    WHERE x.bot_id = b.id AND x.skill_id = s.id
  );

-- 3) Cuma performans kontrol schedule (opsiyonel, sadece sosyal-buyume varsa)
INSERT INTO public.mission_schedules (bot_id, title, goal, search_for, report_spec, model, duration_minutes, run_hour, weekdays, only_new, created_by, last_run_at)
SELECT
  (SELECT id FROM public.automation_bots WHERE slug = 'sosyal-buyume' LIMIT 1),
  'Meta Algoritma — Haftalık performans kontrol',
  'Meta Algoritma Motoru — Haftalık performans kontrol listesi. 1) Bu hafta hashtag/içerik/etkileşim özeti (varsa) 2) Sonraki hafta için 3 net ayar 3) Profil (bio, highlight, CTA) kontrol notu. Sadece öneri. Otomatik işlem yok.',
  null,
  'Kısa kontrol listesi + 3 ayar önerisi.',
  null, 10, 11, '{5}', true,
  (SELECT user_id FROM public.team_members WHERE role = 'admin' ORDER BY created_at LIMIT 1),
  null
WHERE EXISTS (SELECT 1 FROM public.automation_bots WHERE slug = 'sosyal-buyume')
  AND NOT EXISTS (SELECT 1 FROM public.mission_schedules WHERE title = 'Meta Algoritma — Haftalık performans kontrol');
