-- EMBAY AI OPS — capability registry foundation
-- Skill metni ile gerçek tool/connector erişimini ayırır.
-- Bu migration yeni bir handler çalıştırmaz; mevcut registry ve Academy onayı aynen geçerlidir.

alter table public.automation_skills add column if not exists capability_kind text not null default 'prompt_only';
alter table public.automation_skills add column if not exists risk_level text not null default 'read_only';
alter table public.automation_skills add column if not exists catalog_source text not null default 'native';
alter table public.automation_skills add column if not exists handler_key text;
alter table public.automation_skills add column if not exists connector_key text;
alter table public.automation_skills add column if not exists capability_surfaces text[] not null default '{mission,academy}';
alter table public.automation_skills add column if not exists evidence_contract text not null default 'auditable_output';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'automation_skills_capability_kind_check') then
    alter table public.automation_skills add constraint automation_skills_capability_kind_check
      check (capability_kind in ('prompt_only', 'tool_backed', 'connector_backed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'automation_skills_risk_level_check') then
    alter table public.automation_skills add constraint automation_skills_risk_level_check
      check (risk_level in ('read_only', 'draft', 'approval_required', 'external_action'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'automation_skills_catalog_source_check') then
    alter table public.automation_skills add constraint automation_skills_catalog_source_check
      check (catalog_source in ('native', 'imported', 'curated'));
  end if;
end $$;

-- Gerçek tool eşleşmesi olmayan skill hiçbir zaman tool-backed diye işaretlenmez.
update public.automation_skills s
set capability_kind = case
  when exists (select 1 from public.automation_skill_tools st where st.skill_id = s.id) then 'tool_backed'
  else 'prompt_only'
end
where s.capability_kind = 'prompt_only';

-- Pipeline/tool ilişkisinin gerçek handler adını yalnızca mevcut tool registry'den al.
update public.automation_skills s
set handler_key = x.handler
from (
  select st.skill_id, min(t.handler) as handler
  from public.automation_skill_tools st
  join public.automation_tools t on t.id = st.tool_id
  where t.handler is not null and length(btrim(t.handler)) > 0
  group by st.skill_id
) x
where s.id = x.skill_id and s.handler_key is null;

-- Mevcut onay politikasını risk görünümüne yansıt; izin sınırlarını değiştirme.
update public.automation_skills
set risk_level = case when approval_required then 'approval_required' else 'read_only' end
where risk_level = 'read_only';

create index if not exists automation_skills_capability_kind_idx on public.automation_skills (capability_kind, lifecycle);
create index if not exists automation_skills_connector_idx on public.automation_skills (connector_key) where connector_key is not null;
