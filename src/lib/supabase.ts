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
  }
};
