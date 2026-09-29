-- Manitou / makine kiralama botlarını ve ilgili otomatik görevleri durdur.
-- Yönetici kararı: yalnızca Embay Yapı inşaat işi aranacak.

update public.automation_bots
set status = 'paused',
    description = coalesce(description, '') || ' [DURDURULDU: Manitou kiralama araması kapalı — yalnızca inşaat]'
where slug in ('manitou-is-bulucu')
  and status is distinct from 'archived';

update public.automation_tasks
set enabled = false
where bot_id in (select id from public.automation_bots where slug = 'manitou-is-bulucu');

-- Sosyal büyüme botunun Manitou odaklı otomatik görevlerini kapat (inşaat keşfi kalsın)
update public.automation_tasks t
set enabled = false
from public.automation_bots b
where t.bot_id = b.id
  and b.slug = 'sosyal-buyume'
  and (
    t.name ilike '%manitou%'
    or t.name ilike '%teleskopik%'
    or coalesce(t.payload::text, '') ilike '%manitou%'
  );

-- Manitou skill pasif
update public.automation_skills
set active = false
where skill_key in ('manitou_is_bulma');
