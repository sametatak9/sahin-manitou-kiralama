-- Embay Yapı: iletişimde yalnızca 0531 436 29 04 kullanılır (kullanıcı talebi).
-- Yayınlanmış kayıtlara ve denetim günlüğüne dokunulmaz; yalnızca henüz yayınlanmamış/gönderilmemiş metinler sadeleşir.
create or replace function public.embay_single_phone(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(replace(t,
    '0536 784 62 22 · 0531 436 29 04', '0531 436 29 04'),
    '0531 436 29 04 / 0536 784 62 22', '0531 436 29 04'),
    '0536 784 62 22  ·  0531 436 29 04', '0531 436 29 04'),
    '0531 436 29 04  ·  0536 784 62 22', '0531 436 29 04'),
    '0531 436 29 04 · 0536 784 62 22', '0531 436 29 04')
$$;
revoke all on function public.embay_single_phone(text) from public, anon, authenticated;

update public.brand_kits set phone2 = null where phone2 = '0536 784 62 22';

update public.social_drafts set caption = public.embay_single_phone(caption), body = public.embay_single_phone(body)
 where (coalesce(caption, '') || coalesce(body, '')) like '%0536 784 62 22%'
   and coalesce(workflow_status, '') <> 'published' and coalesce(status, '') not in ('yayinlandi', 'published');

update public.media_library set caption = public.embay_single_phone(caption), title = public.embay_single_phone(title)
 where (coalesce(caption, '') || coalesce(title, '')) like '%0536 784 62 22%';

update public.content_plan set caption = public.embay_single_phone(caption) where caption like '%0536 784 62 22%';

update public.social_inbox set reply_text = public.embay_single_phone(reply_text) where reply_text like '%0536 784 62 22%' and status = 'open';

-- Arşivlenmiş eski Instagram açıklamalarındaki diğer biçimler ("📱 0536 784 62 22" satırı, "0536 784 62 22 - " öneki)
update public.media_library
   set caption = regexp_replace(regexp_replace(caption, '📱 ?0536 784 62 22\s*\n', '', 'g'), '0536 784 62 22\s*-\s*', '', 'g'),
       title   = regexp_replace(regexp_replace(title,   '📱 ?0536 784 62 22\s*\n', '', 'g'), '0536 784 62 22\s*-\s*', '', 'g')
 where (coalesce(caption, '') || coalesce(title, '')) like '%0536 784 62 22%';
update public.media_library set caption = replace(caption, '0536 784 62 22 | ', '') where caption like '%0536 784 62 22 | %';
