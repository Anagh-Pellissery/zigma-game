import { createClient } from '@supabase/supabase-js';

// Publishable key: can only read the public_state snapshot and call server_now() (see supabase/schema.sql).
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
