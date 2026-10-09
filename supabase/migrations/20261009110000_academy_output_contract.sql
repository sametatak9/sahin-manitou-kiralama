-- EMBAY AI OPS — Academy output contract (additive; DROP yok)
-- Kaynak bulgusu üretmeyen prompt-only skill'ler için boş findings başarısızlık sayılmaz.

alter table public.automation_skills
  add column if not exists academy_output_kind text not null default 'findings';

alter table public.automation_skills
  add column if not exists capability_test_output_count integer not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'automation_skills_academy_output_kind_check') then
    alter table public.automation_skills add constraint automation_skills_academy_output_kind_check
      check (academy_output_kind in ('findings', 'action_list', 'structured_output'));
  end if;
end $$;

create index if not exists automation_skills_academy_output_kind_idx
  on public.automation_skills (academy_output_kind, capability_tested_at desc);

-- Açıkça yapılandırılmış aksiyon/plan çıktısı bekleyen mevcut prompt-only skill'ler.
-- Bulgulu araştırma skill'leri varsayılan 'findings' olarak kalır.
update public.automation_skills
set academy_output_kind = 'action_list'
where skill_key in (
  'aksiyon_listesi_uret',
  'gece_gunduz_aktivite_ozeti',
  'gunluk_etkilesim_plani',
  'gunluk_takip_listesi_15',
  'hashtag_arastirma',
  'kesif_hashtag_seti',
  'manuel_etkilesim_plani',
  'meta_organik_buyume',
  'profil_optimizasyon',
  'saatlik_ozet_raporu',
  'takipci_ceken_icerik_fikri',
  'yorum_begeni_aksiyon_karti'
)
and academy_output_kind = 'findings';
