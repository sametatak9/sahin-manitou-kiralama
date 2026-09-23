-- EMBAY AI OPS — Bot görevi sonuç kutusu: hata türü (kredi bitti / anahtar geçersiz / tekrarlanan hata) +
-- yönetici onayı ("Onayla ve kaydet") ile onaylı sonuç arşivi. Additive; DROP yok, mevcut kısıtlar değişmez.

alter table public.bot_missions add column if not exists error_kind text;
alter table public.bot_missions add column if not exists error_count int not null default 0;
alter table public.bot_missions add column if not exists review_status text not null default 'pending';
alter table public.bot_missions add column if not exists reviewed_by uuid references auth.users(id);
alter table public.bot_missions add column if not exists reviewed_at timestamptz;
alter table public.bot_missions add column if not exists review_note text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bot_missions_error_kind_check') then
    alter table public.bot_missions add constraint bot_missions_error_kind_check
      check (error_kind is null or error_kind in ('ai_credit', 'ai_auth', 'repeated_error', 'timeout'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bot_missions_review_status_check') then
    alter table public.bot_missions add constraint bot_missions_review_status_check
      check (review_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists bot_missions_review_idx on public.bot_missions (review_status, finished_at desc) where status in ('completed', 'stopped', 'failed');
