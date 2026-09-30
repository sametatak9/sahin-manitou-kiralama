-- Güncellik sıkılaştırma: max 60 gün; 2025 ve öncesi / sonuçlanmış ihale = BULGU DEĞİL.
-- 1 yıl önceki ihale çoktan alınmış/yapılmıştır.

update public.automation_skills
set instructions = regexp_replace(
      coalesce(instructions, ''),
      E'\\n\\nGÜNCELLİK KURALI[^\\n]*(?:\\n(?!\\n)[^\\n]*)*',
      '',
      'g'
    ) || E'\n\nGÜNCELLİK KURALI (zorunlu — 60 GÜN): Yalnızca SON 60 GÜN içindeki ilan, ihale, talep veya şantiye haberleri. Tercihen son 21–30 gün. 1 yıl önceki, 2025 ve daha eski, veya sonuçlanmış ihaleler (yüklenici belirlendi, sözleşme imzalandı, iş bitti) BULGU DEĞİLDİR. Her bulguda mümkünse yayın/ihale tarihini yaz. Arama sorgularına “2026”, “güncel ilan”, “yeni duyuru” ekle.',
    test_goal = case
      when skill_key = 'ozel_insaat_is_bulma' then 'İstanbul/Trakya''da SON 21–60 GÜN içinde yayınlanmış güncel kat karşılığı, kentsel dönüşüm, villa/prefabrik talepleri bul. 2025 ve öncesi veya sonuçlanmış kayıtları getirme.'
      when skill_key = 'manitou_is_bulma' then 'SON 21–60 GÜN içinde güncel kiralama ihtiyacı sinyalleri (bot pasif olabilir). Eski ilan yok.'
      when test_goal is not null and (test_goal ilike '%ihale%' or test_goal ilike '%iş%' or test_goal ilike '%fırsat%')
        then regexp_replace(test_goal, 'SON 30-90 GÜN|son 90 gün|90 gün', 'SON 21–60 GÜN', 'gi')
      else test_goal
    end,
    bad_examples = case
      when bad_examples is null then array[
        '2024 veya 2025 ihale sonucu',
        'Yüklenici belirlendi duyurusu',
        '1 yıl önce açılmış ve kapanmış ihale',
        '60 günden eski ilan',
        'Sözleşme imzalandı / iş tamamlandı kaydı'
      ]
      else (
        select array_agg(distinct x)
        from unnest(
          bad_examples || array[
            '2024 veya 2025 ihale sonucu',
            'Yüklenici belirlendi duyurusu',
            '1 yıl önce açılmış ve kapanmış ihale',
            '60 günden eski ilan',
            'Sözleşme imzalandı / iş tamamlandı kaydı'
          ]
        ) as t(x)
      )
    end
where skill_key in ('ozel_insaat_is_bulma', 'manitou_is_bulma')
   or category in ('arastirma', 'arastırma')
   or display_name ilike '%iş bul%'
   or display_name ilike '%ihale%'
   or display_name ilike '%fırsat%';

update public.mission_schedules
set goal = case
      when goal ~* 'son 90 gün|90 gün|son 30-90' then
        regexp_replace(goal, 'son 90 gün \(tercihen 30 gün\)|SON 90 GÜN|90 gün|30-90 gün', 'son 60 gün (tercihen 21–30 gün)', 'gi')
      when goal !~* '60 gün|güncel kayıt' then
        goal || E' Yalnızca son 60 gün (tercihen 21–30 gün) içindeki güncel kayıtlar. 2025 ve öncesi, sonuçlanmış ihale getirme.'
      else goal
    end,
    search_for = case
      when search_for is null or search_for = '' then search_for
      when search_for !~* '2026' then search_for || ', 2026 güncel ilan, yeni duyuru, son ihale'
      else search_for
    end
where enabled is not false
  and (
    title ilike '%iş%'
    or title ilike '%ihale%'
    or title ilike '%fırsat%'
    or goal ilike '%inşaat%'
    or goal ilike '%ihale%'
    or goal ilike '%talep%'
  );
