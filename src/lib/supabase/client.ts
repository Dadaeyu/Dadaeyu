import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export function createClient() {
  const config = getPublicSupabaseConfig();
  if (!config.isConfigured) throw new Error("Supabase public configuration is missing");
  return createBrowserClient(config.url, config.key);
}
