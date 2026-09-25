-- EMBAY AI OPS — Embay Yapı marka kiti, Instagram (@embayyapi) kimliğine göre güncellenir: lacivert/kraliyet mavisi/gökyüzü, iki telefon, gerçek web adresi.
-- Yalnızca veri güncellemesi; tablo/kolon değişikliği yok.
alter table public.brand_kits add column if not exists phone2 text;
alter table public.brand_kits add column if not exists slogan text;
update public.brand_kits set
  primary_color = '#262A6B',      -- lacivert (logo zemini, alt şerit)
  secondary_color = '#1E3FA0',    -- kraliyet mavisi (başlık, gradyan)
  accent_color = '#8FC6F2',       -- gökyüzü mavisi (bulutlu gradyan, vurgular)
  text_color = '#FFFFFF',
  phone = '0531 436 29 04', phone2 = '0536 784 62 22',
  website = 'www.embayyapi.com.tr', address = 'Çatalca, İstanbul',
  slogan = 'İşimiz güvencenizdir. Hayallerinizi güvenle gerçeğe dönüştürüyoruz.',
  default_cta = 'Hayalinizdeki eve bir adım: hemen arayın',
  company_name = 'Embay Yapı', updated_at = now()
where name = 'Embay Yapı';
