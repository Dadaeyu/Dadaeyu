import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseConfig } from "@/lib/supabase/config";

/** 서버 전용 — RLS 우회, 관리자 작업용 */
export function createAdminClient() {
  const config = getServerSupabaseConfig();

  if (!config.isConfigured) {
    throw new Error("Supabase server configuration is missing");
  }

  return createClient(config.url.replace(/\/rest\/v1\/?$/, ""), config.key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
