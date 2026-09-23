import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables from Vite / Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('xxxxxxxxxx') &&
  !supabaseUrl.includes('sizin-proje-id')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Safe Supabase operations helper with local memory fallback
export const dbService = {
  async fetchLeads() {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] fetchLeads offline or table not ready, using memory store', err);
      return null;
    }
  },

  async insertLead(lead: any) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([{
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          status: lead.status || 'DISCOVERED',
          opportunity_summary: lead.opportunitySummary,
          source_evidence: lead.sourceEvidence,
          requires_human_approval: lead.requiresHumanApproval,
          history: lead.history
        }])
        .select();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] insertLead error, using memory fallback', err);
      return null;
    }
  },

  async updateLeadStatus(id: string, status: string, history: any[]) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ status, history })
        .eq('id', id)
        .select();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] updateLeadStatus error', err);
      return null;
    }
  },

  async insertContentItem(item: any) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('content_items')
        .insert([{
          id: item.id,
          platform: item.platform,
          account: item.account,
          planned_at: item.plannedAt,
          title: item.title,
          caption: item.caption,
          hashtags: item.hashtags,
          cta: item.cta,
          media_type: item.mediaType,
          bot: item.bot,
          campaign: item.campaign,
          approval_status: item.approvalStatus,
          publish_status: item.publishStatus
        }])
        .select();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] insertContentItem error', err);
      return null;
    }
  },

  // BOT TASKS PERSISTENCE
  async fetchBotTasks() {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('bot_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] fetchBotTasks offline or table not ready, using memory store', err);
      return null;
    }
  },

  async upsertBotTask(bot: any) {
    // Also save to localStorage for instant persistence across mobile page reloads
    try {
      const saved = localStorage.getItem('sahin_real_bots');
      const list = saved ? JSON.parse(saved) : [];
      const updated = [bot, ...list.filter((b: any) => b.id !== bot.id)];
      localStorage.setItem('sahin_real_bots', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }

    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('bot_tasks')
        .upsert([{
          id: bot.id,
          name: bot.name,
          category: bot.category,
          status: bot.status,
          schedule: bot.schedule,
          last_run_at: bot.lastRunAt,
          duration: bot.duration,
          report: bot.report,
          findings_count: bot.findingsCount,
          model: bot.model,
          target_url: bot.targetUrl,
          target_job_description: bot.targetJobDescription,
          max_run_duration_minutes: bot.maxRunDurationMinutes,
          last_run_outcome: bot.lastRunOutcome,
          execution_history: bot.executionHistory
        }])
        .select();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] upsertBotTask error, saved to local cache', err);
      return null;
    }
  },

  async deleteBotTask(id: string) {
    try {
      const saved = localStorage.getItem('sahin_real_bots');
      if (saved) {
        const list = JSON.parse(saved);
        localStorage.setItem('sahin_real_bots', JSON.stringify(list.filter((b: any) => b.id !== id)));
      }
    } catch (e) {
      // ignore
    }

    if (!supabase) return null;
    try {
      const { error } = await supabase.from('bot_tasks').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] deleteBotTask error', err);
      return false;
    }
  },

  async logBotExecution(botId: string, runLog: any) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('bot_execution_logs')
        .insert([{
          bot_id: botId,
          run_at: runLog.runAt,
          duration: runLog.duration,
          outcome: runLog.outcome,
          target_scanned: runLog.targetScanned,
          summary: runLog.summary
        }])
        .select();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] logBotExecution error', err);
      return null;
    }
  }
};
