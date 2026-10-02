-- REKLAM AJANSI DÖNÜŞÜMÜ (additive): her işletme bir "müşteri" (agency_clients). Sosyal hesaplar, gelen sorular ve kitle radarı
-- müşteriye bağlanır; büyüme (takipçi) gerçek API verisiyle günlük ölçülür. Hiçbir tablo/kolon/veri silinmez.

-- 1) Müşteri profili: büyüme etiketleri, hedef kitle, içerik temaları
alter table public.agency_clients add column if not exists growth_tags text[] not null default '{}';
alter table public.agency_clients add column if not exists audience text;
alter table public.agency_clients add column if not exists content_pillars text[] not null default '{}';
alter table public.agency_clients add column if not exists color text;
alter table public.agency_clients add column if not exists logo_url text;

-- 2) Müşteri bağları (boşsa varsayılan müşteri Embay Yapı)
alter table public.social_accounts add column if not exists client_id uuid references public.agency_clients(id);
alter table public.social_inbox add column if not exists client_id uuid references public.agency_clients(id);
alter table public.audience_radar add column if not exists client_id uuid references public.agency_clients(id);
alter table public.audience_radar add column if not exists skipped_at timestamptz;
alter table public.media_library add column if not exists client_id uuid references public.agency_clients(id);
alter table public.social_publications add column if not exists client_id uuid references public.agency_clients(id);
create index if not exists social_accounts_client_idx on public.social_accounts(client_id);
create index if not exists social_inbox_client_idx on public.social_inbox(client_id);
create index if not exists audience_radar_client_idx on public.audience_radar(client_id, score desc);

update public.social_accounts set client_id = (select id from public.agency_clients where slug = 'embay-yapi') where client_id is null;
update public.social_inbox set client_id = (select id from public.agency_clients where slug = 'embay-yapi') where client_id is null;
update public.audience_radar set client_id = (select id from public.agency_clients where slug = 'embay-yapi') where client_id is null;

-- 3) Gerçek büyüme ölçümü: her gün hesabın takipçi / gönderi sayısı (Graph API)
create table if not exists public.growth_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.agency_clients(id),
  platform text not null,
  account_id uuid references public.social_accounts(id),
  day date not null default (now() at time zone 'Europe/Istanbul')::date,
  followers integer,
  media_count integer,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (account_id, day)
);
alter table public.growth_snapshots enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'growth_snapshots' and policyname = 'growth_snapshots_team_read') then
    create policy growth_snapshots_team_read on public.growth_snapshots for select to authenticated using (public.is_team_member());
  end if;
end $$;
alter table public.ops_autopilot add column if not exists growth_synced_at timestamptz;

-- 4) Embay profili: eski başarılı gönderideki slogan + iki telefon + büyüme etiketleri
update public.brand_kits b set phone2 = coalesce(b.phone2, '0536 784 62 22'), slogan = 'Türkiye''nin 81 İline Kurulum!'
from public.agency_clients c where c.slug = 'embay-yapi' and c.brand_kit_id = b.id;
update public.agency_clients set
  growth_tags = array['müstakilev','bahçeliev','evyaptırmak','çelikvilla','villa','arsaüzerineev','hayalimdekiev','çelikev','hafifçelik','prefabrikev',
    'evimizyapılıyor','villaprojesi','köyevi','taşev','anahtarteslim','bungalov','ağırçelik','dağevi','yazlıkev','istinatduvarı'],
  audience = 'Arsası olup villa, müstakil ev, bahçe evi, çelik ev yaptırmak isteyenler; tadilat/tamirat ihtiyacı olan ev sahipleri (Çatalca, İstanbul, Trakya, tüm Türkiye)',
  content_pillars = array['ağır çelik','betonarme','hafif çelik','ileri kaba inşaat','istinat / taş duvar','biten villa tanıtımı','tadilat'],
  color = coalesce(color, '#0F1A33')
where slug = 'embay-yapi';

-- 5) Grok ile eklenen, gerçek veri üretmeyen görevler KAPATILIR (silinmez; panelden tekrar açılabilir)
update public.mission_schedules set enabled = false, updated_at = now()
where enabled and (title like 'Toplu 60dk — %' or (title ilike 'Takipci — %') or title ilike 'Embay stil — %' or title ilike 'Çelik stil — %' or title ilike 'Embay — gunluk ozgun icerik%');

-- İçi boş (talimatı 120 karakterden kısa) yetenekler emekliye ayrılır (silinmez)
update public.automation_skills set lifecycle = 'retired', updated_at = now()
where lifecycle = 'approved' and length(coalesce(instructions, '')) < 120;

-- Grok'un "yalnızca inşaat" kararı (Manitou iş arama durdurulur — veri korunur)
update public.automation_bots set status = 'paused' where slug = 'manitou-is-bulucu' and status = 'active';
update public.mission_schedules set enabled = false where bot_id in (select id from public.automation_bots where slug = 'manitou-is-bulucu');
update public.automation_bots set name = 'Büyüme Botu (Kitle Radarı)',
  description = 'Instagram resmi etiket aramasıyla villa / müstakil ev / ev yaptırma ilgisi olan güncel gönderileri bulur, puanlar ve elle etkileşim kartı hazırlar; kendi gönderilerimize gelen soruları yanıtlar; takipçi sayısını her gün ölçer. Otomatik takip/beğeni yok (Meta kuralı).'
where slug = 'sosyal-buyume';
