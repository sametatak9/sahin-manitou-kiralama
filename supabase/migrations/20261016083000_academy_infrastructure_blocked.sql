-- Academy: infrastructure failures are not skill-quality failures.
-- Existing evidence stays in the same table; this only expands the allowed status value.
alter table public.automation_skills
  drop constraint if exists automation_skills_capability_test_status_check;

alter table public.automation_skills
  add constraint automation_skills_capability_test_status_check
  check (capability_test_status in ('unverified', 'prompt_verified', 'handler_verified', 'failed', 'blocked'));
