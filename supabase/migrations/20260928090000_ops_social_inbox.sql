-- EMBAY OPS — Gelen kutusu (yorum botu): kendi Instagram gönderilerimize gelen yorumlar/sorular.
-- Fiyat / bilgi / konum sorularını toplar; otomatik yanıt açıksa yeni sorulara kibar, kurumsal bir yanıt verir
-- (yalnızca KENDİ gönderilerimize — Meta kurallarına uygun). Kişisel veri: yalnızca herkese açık kullanıcı adı + yorum metni.
-- ADDITIVE: yeni tablo + yeni kolonlar; DROP yok.

create table if not exists public.social_inbox (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'instagram',
  kind text not null default 'comment',
  external_id text not null unique,
  media_id text,
  permalink text,
  username text,
  text text,
  intent text not null default 'other' check (intent in ('price', 'info', 'location', 'praise', 'other')),
  commented_at timestamptz,
  replied boolean not null default false,
  replied_at timestamptz,
  reply_text text,
  reply_source text,
  status text not null default 'open' check (status in ('open', 'replied', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_inbox_open_idx on public.social_inbox (status, commented_at desc);
alter table public.social_inbox enable row level security;
drop policy if exists social_inbox_team_select on public.social_inbox;
create policy social_inbox_team_select on public.social_inbox for select to authenticated using (public.is_team_member());
drop policy if exists social_inbox_team_update on public.social_inbox;
create policy social_inbox_team_update on public.social_inbox for update to authenticated using (public.is_team_member()) with check (public.is_team_member());

alter table public.ops_autopilot add column if not exists auto_reply boolean not null default true;
alter table public.ops_autopilot add column if not exists auto_reply_since timestamptz not null default now();
alter table public.ops_autopilot add column if not exists inbox_synced_at timestamptz;
