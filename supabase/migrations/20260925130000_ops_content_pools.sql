-- EMBAY AI OPS — İçerik havuzları: Video · Banner (şablonlu, yeniden çizilebilir) · Gönderi metni şablonları.
-- Gönderi hazırlarken havuzdan seçilir. Silme = arşive kaldırma (archived_at) — veri kaybı yok. Additive; DROP yok (CHECK yalnızca genişletilir).

alter table public.media_library drop constraint if exists media_library_kind_check;
alter table public.media_library add constraint media_library_kind_check check (kind in ('video', 'image', 'banner'));
alter table public.media_library add column if not exists template jsonb;          -- banner şablonu: headline, subtitle, badge, cta, brand, width, height, photo_url
alter table public.media_library add column if not exists platform text;           -- ölçünün hazırlandığı platform
alter table public.media_library add column if not exists pillar text;             -- konu (Manitou, villa, kampanya…)
alter table public.media_library add column if not exists source text not null default 'upload';  -- upload | factory | manual
alter table public.media_library add column if not exists use_count int not null default 0;
alter table public.media_library add column if not exists last_used_at timestamptz;

create table if not exists public.post_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  platform text,
  brand text,
  pillar text,
  headline text,
  caption text not null default '',
  hashtags text[] not null default '{}',
  cta text,
  notes text,
  source text not null default 'manual',     -- manual | factory
  use_count int not null default 0,
  last_used_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.post_templates enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'post_templates' and policyname = 'post_templates_team_select') then
    create policy post_templates_team_select on public.post_templates for select to authenticated using (public.is_team_member());
    create policy post_templates_team_insert on public.post_templates for insert to authenticated with check (public.is_team_member());
    create policy post_templates_team_update on public.post_templates for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'post_templates_updated') then
    create trigger post_templates_updated before update on public.post_templates for each row execute function public.set_updated_at();
  end if;
end $$;
create index if not exists post_templates_active_idx on public.post_templates (created_at desc) where archived_at is null;
create index if not exists media_library_kind_idx on public.media_library (kind, created_at desc) where archived_at is null;

-- Bugün üretilen fabrika banner'larını ve metinlerini havuza al (geçmiş taslaklar etkilenmez)
insert into public.media_library (kind, title, url, mime, targets, caption, hashtags, status, platform, pillar, source, template, created_by)
select 'banner', coalesce(d.headline, d.title), d.design_url, 'image/png', array[d.primary_platform], d.caption, coalesce(d.hashtags, '{}'), 'pool', d.primary_platform, d.content_pillar, 'factory',
  jsonb_build_object('headline', d.headline, 'subtitle', d.headline, 'badge', d.content_pillar, 'cta', d.cta, 'brand', d.brand), d.created_by
from public.social_drafts d
where d.format = 'banner' and d.design_url is not null and d.campaign_name like 'Günlük içerik %'
  and not exists (select 1 from public.media_library m where m.url = d.design_url);

insert into public.post_templates (title, platform, brand, pillar, headline, caption, hashtags, cta, source, created_by)
select distinct on (d.primary_platform, d.headline) coalesce(d.headline, d.title), d.primary_platform, d.brand, d.content_pillar, d.headline, coalesce(d.caption, d.body), coalesce(d.hashtags, '{}'), d.cta, 'factory', d.created_by
from public.social_drafts d
where d.campaign_name like 'Günlük içerik %' and d.workflow_status <> 'cancelled'
  and not exists (select 1 from public.post_templates t where t.platform = d.primary_platform and t.headline = d.headline);
