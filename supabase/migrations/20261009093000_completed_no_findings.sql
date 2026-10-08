-- Empty research runs must be distinguishable from successful runs with findings.
alter table public.bot_missions drop constraint if exists bot_missions_finish_reason_check;

alter table public.bot_missions
  add constraint bot_missions_finish_reason_check
  check (finish_reason = any (array[
    'deadline',
    'stop_condition',
    'admin_stop',
    'max_steps',
    'completed_no_findings',
    'error',
    'no_ai',
    'budget'
  ]));
