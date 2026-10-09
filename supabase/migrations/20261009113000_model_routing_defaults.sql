-- EMBAY MODEL ROUTING DEFAULTS
-- Chat/Copilot ve tool-use botları için gpt-5-mini; kısa sınıflandırma için gpt-5-nano.
-- Araştırma fallbackı web araması kaybolmasın diye mevcut Claude/Gemini akışını korur.

insert into public.ai_model_catalog
  (model_key, provider, display_name, description, capabilities, input_usd_per_million, output_usd_per_million, sort_order)
values
  ('gpt-5-mini', 'openai', 'GPT-5 mini', 'Chat/Copilot ve genel bot işleri için kalite-maliyet dengeli varsayılan.', '{chat,agent,content,tool_use}', 0.25, 2, 5),
  ('gpt-5-nano', 'openai', 'GPT-5 nano', 'Ön eleme, sınıflandırma ve kısa özetlerde düşük maliyetli yardımcı.', '{classification,fast,chat}', 0.05, 0.4, 6),
  ('gpt-5', 'openai', 'GPT-5', 'Karmaşık sentez ve yüksek muhakeme; seçili işler için.', '{research,planning,analysis,tool_use}', 1.25, 10, 7)
on conflict (model_key) do update set
  provider = excluded.provider,
  display_name = excluded.display_name,
  description = excluded.description,
  capabilities = excluded.capabilities,
  input_usd_per_million = excluded.input_usd_per_million,
  output_usd_per_million = excluded.output_usd_per_million,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

update public.agency_workspaces
set default_model_key = 'gpt-5-mini', updated_at = now()
where slug = 'embay-agency';

-- Genel Sonnet agentları GPT-5 mini’yi dener; OpenAI anahtarı yoksa runtime
-- loadAgent() mevcut Claude/Gemini/Groq fallback zincirine güvenli biçimde döner.
-- Opus gibi açıkça seçilmiş özel agentlar değiştirilmez.
update public.ai_agents
set provider = 'openai', model = 'gpt-5-mini', updated_at = now()
where active = true and provider = 'anthropic' and model = 'claude-sonnet-5';
