import { createClient } from '@supabase/supabase-js';

// Tarayıcıya yalnızca herkese açık (publishable/anon) anahtar gider; service-role anahtarı ASLA burada olmaz.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://utngxnqlcayfjkknaysx.supabase.co';
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_yhuFZsIya5PLT5bdtbXgnA_59_32cPD';

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
