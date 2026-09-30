-- İş bulucu yetenekleri: yalnızca güncel (son 90 gün) fırsatlar; sonuçlanmış/eski ihaleler elenir.
update public.automation_skills
set instructions = coalesce(instructions, '') || E'\n\nGÜNCELLİK KURALI (zorunlu): Yalnızca son 90 gün içindeki ilan, ihale, talep veya şantiye haberleri. 1 yıl önceki veya sonuçlanmış ihaleler (yüklenici belirlendi, sözleşme imzalandı, iş bitti) BULGU DEĞİLDİR. Tercihen son 30 gün. Her bulguda mümkünse yayın/ihale tarihini yaz.',
    test_goal = case
      when skill_key = 'ozel_insaat_is_bulma' then 'Istanbul/Trakya SON 30-90 GÜN içinde yayınlanmış güncel kat karşılığı, kentsel dönüşüm, villa/prefabrik talepleri bul. Eski veya sonuçlanmış kayıtları getirme.'
      when skill_key = 'manitou_is_bulma' then 'SON 30-90 GÜN içinde güncel sinyaller. Eski ilan yok.'
      else test_goal
    end,
    bad_examples = case
      when bad_examples is null then array['2024 veya daha eski ihale sonucu', 'Yüklenici belirlendi duyurusu', '1 yıl önce açılmış ve kapanmış ihale']
      else bad_examples || array['2024 veya daha eski ihale sonucu', 'Yüklenici belirlendi duyurusu', '1 yıl önce açılmış ve kapanmış ihale']
    end
where skill_key in ('ozel_insaat_is_bulma', 'manitou_is_bulma')
   or display_name ilike '%iş bul%'
   or display_name ilike '%ihale%';

update public.mission_schedules
set goal = goal || E' Yalnızca son 90 gün (tercihen 30 gün) içindeki güncel kayıtlar. Sonuçlanmış ihale ve yıl önceki ilanları getirme.',
    search_for = case
      when search_for is null or search_for = '' then search_for
      else search_for || ', 2026 ihale, güncel ilan, son duyuru'
    end
where coalesce(enabled, true) = true
  and (
    title ilike '%iş%'
    or title ilike '%ihale%'
    or title ilike '%fırsat%'
    or goal ilike '%inşaat%'
    or goal ilike '%ihale%'
  );
