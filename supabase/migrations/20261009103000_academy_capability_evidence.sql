-- EMBAY AI OPS — Academy capability evidence (additive; DROP yok)
-- skill_test görevleri prompt kalitesini ölçer; gerçek handler/connector doğrulaması ayrı tutulur.

alter table public.automation_skills
  add column if not exists capability_test_status text not null default 'unverified';
alter table public.automation_skills
  add column if not exists capability_test_mission_id uuid references public.bot_missions(id) on delete set null;
alter table public.automation_skills
  add column if not exists capability_tested_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'automation_skills_capability_test_status_check') then
    alter table public.automation_skills add constraint automation_skills_capability_test_status_check
      check (capability_test_status in ('unverified', 'prompt_verified', 'handler_verified', 'failed'));
  end if;
end $$;

create index if not exists automation_skills_capability_test_idx
  on public.automation_skills (capability_test_status, capability_tested_at desc);
