import type { SupabaseClient } from "@supabase/supabase-js";
import { getSafeNextPath } from "@/lib/auth/paths";

/** 로그인·OAuth 콜백 후 이동 경로 (members 없음 또는 온보딩 미완료 → /onboarding) */
export async function resolveAuthDestination(
  supabase: SupabaseClient,
  userId: string,
  next?: string | null,
  fallback = "/"
): Promise<string> {
  const safeNext = getSafeNextPath(next, fallback);

  const { data: member } = await supabase
    .from("members")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (!member || !member.onboarding_completed) {
    return `/onboarding?next=${encodeURIComponent(safeNext)}`;
  }

  return safeNext;
}
