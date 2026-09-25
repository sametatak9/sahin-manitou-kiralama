-- Embay Yapı tasarımlarında yalnızca tek telefon (0531 436 29 04) kullanılır; ikinci numara kaldırıldı.
update public.brand_kits set phone2 = null, updated_at = now() where name = 'Embay Yapı';
