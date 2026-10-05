-- Ev Vitrini Editör Botu: ön yazı + yayına girince IG/FB paylaşım taslağı. Tamamen ek (additive).
alter table public.showroom_models add column if not exists ai_written_at timestamptz;
alter table public.showroom_models add column if not exists ai_requested_at timestamptz;
alter table public.showroom_models add column if not exists ai_note text;
alter table public.showroom_models add column if not exists announced_at timestamptz;
alter table public.showroom_models add column if not exists social_caption text;

insert into public.automation_bots (slug, name, bot_type, icon, description, instructions, status, client_id)
select 'vitrin-editoru', 'Ev Vitrini Editörü', 'content', 'store',
  'Sitedeki ev vitrini (/evler) için editör: eksik ön yazıları yazar, yayına giren her evi Instagram + Facebook paylaşım taslağı olarak havuza koyar.',
  'Yalnızca panelde girilen bilgileri kullan; m², fiyat, süre, konum uydurma. Yayındaki evin metnini değiştirme, öneri bırak. Yayına alma kararı ekibindir.',
  'active', (select id from public.agency_clients where name ilike 'Embay%' order by created_at limit 1)
where not exists (select 1 from public.automation_bots where slug = 'vitrin-editoru');
