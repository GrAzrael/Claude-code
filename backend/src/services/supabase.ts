import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// Server-side client using the service role key: this backend is the only
// thing that talks to Supabase, so RLS is not a concern in this phase.
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
