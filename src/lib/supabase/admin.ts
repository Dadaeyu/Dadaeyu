import { createClient } from "@supabase/supabase-js";
import { getAdminSupabaseConfig } from "@/lib/supabase/config";

/** 서버 전용 — RLS 우회, 관리자 작업용 */
export function createAdminClient() {
  const config = getAdminSupabaseConfig();

  if (!config.isConfigured) {
    throw new Error("Supabase service-role configuration is missing");
  }

  return createClient(config.url.replace(/\/rest\/v1\/?$/, ""), config.key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
