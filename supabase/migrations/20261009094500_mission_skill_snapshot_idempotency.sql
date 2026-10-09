-- A mission may load its skill context more than once only in logs if workers race.
-- Keep exactly one audit event per mission without changing existing step history.
create unique index if not exists bot_mission_steps_skill_loaded_once_idx
  on public.bot_mission_steps (mission_id)
  where action = 'skills_loaded';
