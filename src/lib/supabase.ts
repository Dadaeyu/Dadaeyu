import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseConfig } from "@/lib/supabase/config";

const config = getServerSupabaseConfig();

if (!config.isConfigured) {
  throw new Error("Supabase server configuration is missing");
}

export const supabase = createClient(config.url.replace(/\/rest\/v1\/?$/, ""), config.key, {
  auth: { persistSession: false, autoRefreshToken: false }
});
