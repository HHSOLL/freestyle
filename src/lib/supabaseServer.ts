import { createClient } from "@supabase/supabase-js";
import { serverConfig } from "@/lib/serverConfig";
import type { Database } from "@/lib/supabase.types";

export const getSupabaseAdmin = () => {
  const supabaseUrl = serverConfig.supabaseUrl;
  const supabaseKey = serverConfig.supabaseServiceRoleKey;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
};
