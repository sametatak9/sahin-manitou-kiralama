import {
  DEFAULT_FAST_MODEL,
  DEFAULT_INTERACTIVE_MODEL,
  DEFAULT_RESEARCH_MODEL,
  fallbackProviders,
  routeForModel,
  shouldUseOpenAiForResearch,
} from '../supabase/functions/_shared/pure/model-routing.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(DEFAULT_INTERACTIVE_MODEL === 'gpt-5-mini', 'interactive default must be gpt-5-mini');
assert(DEFAULT_FAST_MODEL === 'gpt-5-nano', 'fast default must be gpt-5-nano');
assert(DEFAULT_RESEARCH_MODEL === 'claude-sonnet-5', 'research fallback must preserve web-capable Claude');
assert(routeForModel('gpt-5-mini')?.provider === 'openai', 'gpt-5-mini must route to OpenAI');
assert(routeForModel('gpt-5-mini')?.role === 'chat', 'gpt-5-mini must be chat-first');
assert(routeForModel('claude-sonnet-5')?.provider === 'anthropic', 'Claude route must remain supported');
assert(shouldUseOpenAiForResearch('gpt-5'), 'explicit gpt model must be routable');
assert(!shouldUseOpenAiForResearch(null), 'blank mission preference must not force OpenAI research');
const chain = fallbackProviders('anthropic');
assert(chain[0] === 'anthropic', 'selected provider must be tried first');
assert(chain.includes('openai') && chain.indexOf('openai') > 0, 'OpenAI must be an available fallback');
assert(new Set(chain).size === chain.length, 'provider fallback chain must be unique');

console.log('model-routing tests passed');
