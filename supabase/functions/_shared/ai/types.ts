// AI Provider Adapter sözleşmesi. Bot Engine sağlayıcıya doğrudan bağımlı değildir.

export interface AgentConfig {
  id?: string;
  provider: 'anthropic' | 'openai' | 'gemini';
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
}

export interface AITool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolCallResult {
  ok: boolean;
  content: unknown;
}

export interface AgentRunInput {
  system: string;
  prompt: string;
  tools: AITool[];
  maxTurns: number;
  onToolCall: (name: string, input: Record<string, unknown>) => Promise<ToolCallResult>;
}

export interface Usage { tokensIn: number; tokensOut: number }

export interface AgentRunResult {
  finalText: string;
  turns: number;
  toolCalls: number;
  stopReason: string;
  usage: Usage;
}

export interface CompleteInput {
  system: string;
  prompt: string;
  schema?: Record<string, unknown>; // JSON schema → yapılandırılmış çıktı
}

export interface CompleteResult {
  text: string;
  json: unknown | null;
  usage: Usage;
  stopReason: string;
}

export interface AIProvider {
  readonly name: AgentConfig['provider'];
  complete(agent: AgentConfig, input: CompleteInput): Promise<CompleteResult>;
  runAgent(agent: AgentConfig, input: AgentRunInput): Promise<AgentRunResult>;
}

/** Sağlayıcı anahtarı yoksa fırlatılır; UI'da "CONFIGURATION REQUIRED" olarak gösterilir. */
export class ConfigurationRequiredError extends Error {
  code = 'CONFIGURATION_REQUIRED';
  constructor(public missing: string) {
    super(`${missing} tanımlı değil (Supabase Edge Function Secrets)`);
  }
}

export class AIRefusalError extends Error {
  code = 'AI_REFUSAL';
}

export function extractJson(text: string): unknown | null {
  try { return JSON.parse(text); } catch { /* devam */ }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* devam */ } }
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch { /* devam */ } }
  return null;
}
