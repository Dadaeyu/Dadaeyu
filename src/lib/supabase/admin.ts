import { createClient } from "@supabase/supabase-js";

/** 서버 전용 — RLS 우회, 관리자 작업용 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("SUPABASE_SECRET_KEY 또는 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
