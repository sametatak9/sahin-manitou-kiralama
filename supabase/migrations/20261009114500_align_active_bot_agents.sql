-- General bot agents follow the agency GPT-5 mini default.
-- Explicit per-bot model preferences can be reintroduced later through the
-- model-preference surface; this only replaces the legacy seed assignments.
update public.ai_agents
set provider = 'openai',
    model = 'gpt-5-mini',
    updated_at = now()
where active = true
  and agent_key in ('analyst', 'content-writer', 'planner')
  and provider = 'anthropic'
  and model in ('claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-5');
