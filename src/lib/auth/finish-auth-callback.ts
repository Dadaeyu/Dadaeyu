import type { EmailOtpType, SupabaseClient, User } from "@supabase/supabase-js";
import { resolveAuthDestination } from "@/lib/auth/post-login";
import { isOAuthUser } from "@/lib/auth/actions";
import {
  ensureMemberExists,
  syncAccessibilityNeedsFromMetadata,
  syncThemePreferencesFromMetadata
} from "@/lib/supabase/ensure-member";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/auth/phone";

function phoneFromUserMetadata(user: User): string | null {
  const raw =
    typeof user.user_metadata?.phone === "string" ? normalizePhone(user.user_metadata.phone) : "";
  return raw || null;
}

/** 이메일 가입(닉네임 이미 입력)은 온보딩 단계 생략 */
export async function completeEmailSignupOnboardingIfNeeded(user: User): Promise<void> {
  if (isOAuthUser(user)) return;

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("tb_members")
    .select("nickname, phone, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!member || member.onboarding_completed) return;

  const phone = member.phone ?? phoneFromUserMetadata(user);
  const nickname = member.nickname?.trim();

  if (!nickname) return;

  await admin
    .from("tb_members")
    .update({
      onboarding_completed: true,
      ...(phone && !member.phone ? { phone } : {})
    })
    .eq("id", user.id);

  await syncThemePreferencesFromMetadata(user);
  await syncAccessibilityNeedsFromMetadata(user);
}

export async function resolvePostAuthRedirect(
  supabase: SupabaseClient,
  user: User,
  next?: string | null
): Promise<string> {
  try {
    await ensureMemberExists(user);
    await completeEmailSignupOnboardingIfNeeded(user);
  } catch {
    // 온보딩 /api/auth/ensure-member 에서 재시도
  }

  return resolveAuthDestination(supabase, user.id, next);
}

export function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value === "signup" || value === "email" || value === "recovery" || value === "invite";
}
