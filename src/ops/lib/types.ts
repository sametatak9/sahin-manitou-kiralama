// Panelde kullanılan satır tipleri (Supabase tablolarının alt kümeleri).
export interface Bot {
  id: string; slug: string; name: string; bot_type: string; platform: string | null; icon: string; description: string; instructions: string;
  ai_agent_id: string | null; connector_key: string | null; permissions: { denied_tools?: string[]; max_runs_per_day?: number } | null;
  status: string; created_at: string; archived_at: string | null;
  automation_bot_skills?: Array<{ skill_id: string; position: number }>;
}
export interface Skill {
  id: string; skill_key: string; display_name: string; description: string; allowed_actions: string[]; approval_required: boolean; enabled: boolean;
  category: string; icon: string | null; instructions: string; execution_mode: 'agent' | 'pipeline'; pipeline: string[]; archived_at: string | null;
  automation_skill_tools?: Array<{ tool_id: string }>;
}
export interface Tool {
  id: string; tool_key: string; name: string; description: string; category: string; min_role: 'staff' | 'admin'; approval_required: boolean;
  platform: string | null; input_schema: Record<string, unknown>; output_schema: Record<string, unknown>; handler: string; active: boolean;
}
export interface Task {
  id: string; bot_id: string | null; skill_id: string | null; platform: string | null; task_type: string; title: string | null; status: string;
  approval_state: string; schedule_type: string; run_time: string | null; run_at: string | null; cron_expression: string | null; timezone: string;
  enabled: boolean; next_run_at: string | null; last_run_at: string | null; last_run_status: string | null; attempt: number; max_retries: number;
  timeout_seconds: number; last_error: string | null; result_summary: string | null; input_config: Record<string, unknown>; created_at: string; archived_at: string | null;
}
export interface Run {
  id: string; task_id: string | null; bot_id: string | null; skill_id: string | null; platform: string; run_scope: string; status: string; trigger: string;
  attempt: number; summary: string | null; error: string | null; error_code: string | null; duration_ms: number | null; tokens_in: number | null; tokens_out: number | null;
  started_at: string | null; completed_at: string | null; created_at: string; output: { tools?: Record<string, unknown>; approvals?: string[] } | null;
}
export interface RunLog { id: number; run_id: string; at: string; level: string; message: string; data: unknown }
export interface Approval {
  id: string; entity_type: string; entity_id: string | null; title: string; summary: string | null; bot_id: string | null; task_id: string | null; run_id: string | null;
  tool_key: string | null; platform: string | null; payload: Record<string, unknown>; status: string; priority: string; requested_by: string | null;
  decided_by: string | null; decided_at: string | null; decision_note: string | null; scheduled_for: string | null; executed_at: string | null;
  result: Record<string, unknown> | null; error: string | null; created_at: string;
}
export interface Draft {
  id: string; title: string; body: string; caption: string | null; headline: string | null; hashtags: string[]; cta: string | null; audience: string | null;
  objective: string | null; tone: string | null; image_brief: string | null; design_brief: string | null; platform_targets: string[]; primary_platform: string | null;
  scheduled_at: string | null; status: string; workflow_status: string; design_id: string | null; media_urls: string[]; bot_id: string | null; campaign_id: string | null;
  content_pillar: string | null; approval_request_id: string | null; error: string | null; created_at: string; archive_status: string; format?: string | null;
}
export interface Design {
  id: string; content_id: string | null; template_id: string | null; brand_kit_id: string | null; provider: 'embay_studio' | 'canva'; name: string; format_key: string;
  width: number; height: number; layers: DesignLayers; canva_design_id: string | null; canva_edit_url: string | null; export_url: string | null; status: string;
}
export interface DesignLayers {
  variant: 'hero' | 'split' | 'story' | 'corporate' | 'bold' | 'listing';
  headline: string; subtitle: string; cta: string; image_url: string | null; show_logo: boolean; show_phone: boolean;
  background?: 'primary' | 'secondary' | 'dark' | 'light' | 'image';
}
export interface BrandKit {
  id: string; name: string; company_name: string; logo_url: string | null; primary_color: string; secondary_color: string; accent_color: string; text_color: string;
  font_heading: string; font_body: string; phone: string | null; website: string | null; instagram: string | null; address: string | null; default_cta: string | null; is_default: boolean;
}
export interface Template { id: string; template_key: string; name: string; format_key: string; platform: string; width: number; height: number; layout: { variant?: string } }
export interface Publication {
  id: string; content_id: string | null; platform: string; status: string; external_post_id: string | null; external_url: string | null; error: string | null;
  published_at: string | null; scheduled_at: string | null; created_at: string;
}
export interface ConnectorStatus {
  key: string; name: string; category: string; authType: string; officialApi: boolean; implemented: boolean; requiredEnv: string[]; missing_env: string[];
  capabilities: { publish: boolean; metrics: boolean; messaging: boolean; design: boolean }; docsUrl: string; note: string; status: string;
  accounts: Array<{ id: string; platform: string; connection_status: string; external_account_name: string | null; token_expires_at: string | null; last_verified_at: string | null; last_error: string | null }>;
}
export interface OpsStatus { ai: { anthropic: boolean; openai: boolean; gemini: boolean; groq?: boolean }; connectors: ConnectorStatus[]; worker_last_seen: string | null; canva_connected: boolean; redirect_uri: string }

export interface MissionFinding {
  title: string; detail: string; url: string; evidence?: string; at: string; step: number;
  company?: string; location?: string; posted?: string; phone?: string; email?: string; website?: string;
  relevance?: number; fit?: string; verdict?: 'verified' | 'suspicious' | 'rejected'; verdict_reason?: string;
}
export interface MissionAudit { total: number; verified: number; suspicious: number; rejected: number; accuracy: number; checked_at: string; rejected_items?: Array<{ title: string; url: string; reason: string }> }
export interface Mission {
  id: string; bot_id: string | null; title: string; goal: string; target_url: string | null; search_for: string | null; report_spec: string | null;
  stop_condition: string | null; duration_minutes: number; status: 'running' | 'finalizing' | 'completed' | 'stopped' | 'failed' | 'blocked';
  finish_reason: string | null; started_at: string; deadline_at: string; finished_at: string | null; step_count: number; max_steps: number;
  provider: string | null; model: string | null; findings: MissionFinding[]; sources: Array<{ url: string; title?: string }>; summary: string | null;
  report_html: string | null; tokens_in: number; tokens_out: number; error: string | null; created_at: string;
  error_kind?: 'ai_credit' | 'ai_auth' | 'repeated_error' | 'timeout' | null; error_count?: number;
  review_status?: 'pending' | 'approved' | 'rejected'; reviewed_at?: string | null; review_note?: string | null;
  purpose?: 'task' | 'skill_test'; skill_ids?: string[]; audit?: MissionAudit | null; coach_note?: string | null;
}
export interface MissionStep { id: string; mission_id: string; step_no: number; action: string; target: string | null; message: string; duration_ms: number | null; created_at: string }
