-- Fiyat/bilgi/konum soran yorumcuların takibi (Müşteri Adayları). Kişi kendi sorusunu bize yazdı; yalnızca bu talebe dönüş için
-- (meşru menfaat). Telefon/e-posta yalnızca kişi onay verdiğinde construction_customers'a (kvkk_consent=true) geçer. Additive.
alter table public.social_inbox add column if not exists follow_stage text not null default 'yeni';
alter table public.social_inbox add column if not exists followed_at timestamptz;
alter table public.social_inbox add column if not exists customer_id uuid references public.construction_customers(id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'social_inbox_follow_stage_check') then
    alter table public.social_inbox add constraint social_inbox_follow_stage_check check (follow_stage in ('yeni', 'dm_yazildi', 'cevap_geldi', 'teklif', 'musteri', 'ilgisiz'));
  end if;
end $$;
create index if not exists social_inbox_intent_stage_idx on public.social_inbox (intent, follow_stage, commented_at desc);
