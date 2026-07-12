import type { User } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/auth/phone";
import { parseThemePreferencesFromMetadata } from "@/lib/supabase/codes";
import { createAdminClient } from "./admin";

type MemberRow = {
  id: string;
  onboarding_completed: boolean;
};

function deriveBaseNickname(user: User): string {
  const meta = user.user_metadata ?? {};
  const candidates = [meta.nickname, meta.name, meta.full_name, user.email?.split("@")[0]];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return `user_${user.id.replace(/-/g, "").slice(0, 8)}`;
}

async function findAvailableNickname(baseNickname: string): Promise<string> {
  const admin = createAdminClient();
  let finalNickname = baseNickname;
  let suffix = 0;

  while (true) {
    const { data } = await admin
      .from("tb_members")
      .select("id")
      .eq("nickname", finalNickname)
      .maybeSingle();

    if (!data) return finalNickname;
    suffix += 1;
    finalNickname = `${baseNickname}_${suffix}`;
  }
}

function phoneFromUserMetadata(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const phoneRaw = typeof meta.phone === "string" ? normalizePhone(meta.phone) : "";
  return phoneRaw || null;
}

async function ensureUserPreferences(userId: string, user?: User): Promise<void> {
  const admin = createAdminClient();
  const themes = user
    ? parseThemePreferencesFromMetadata(user.user_metadata?.theme_preferences)
    : null;

  const { data } = await admin
    .from("tb_user_preferences")
    .select("user_id, theme_preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    await admin.from("tb_user_preferences").insert({
      user_id: userId,
      ...(themes ? { theme_preferences: themes } : {})
    });
    return;
  }

  if (themes && (!data.theme_preferences || data.theme_preferences.length === 0)) {
    await admin
      .from("tb_user_preferences")
      .update({ theme_preferences: themes })
      .eq("user_id", userId);
  }
}

/** metadata theme_preferences → tb_user_preferences (idempotent) */
export async function syncThemePreferencesFromMetadata(user: User): Promise<void> {
  const themes = parseThemePreferencesFromMetadata(user.user_metadata?.theme_preferences);
  if (!themes) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("tb_user_preferences")
    .select("theme_preferences")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    await admin.from("tb_user_preferences").insert({
      user_id: user.id,
      theme_preferences: themes
    });
    return;
  }

  if (!data.theme_preferences || data.theme_preferences.length === 0) {
    await admin
      .from("tb_user_preferences")
      .update({ theme_preferences: themes })
      .eq("user_id", user.id);
  }
}

/** DB 트리거 실패 시 members 행을 보장 (서버 전용) */
export async function ensureMemberExists(user: User): Promise<MemberRow | null> {
  const admin = createAdminClient();
  const phone = phoneFromUserMetadata(user);

  const { data: existing } = await admin
    .from("tb_members")
    .select("id, onboarding_completed, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    if (!existing.phone && phone) {
      await admin.from("tb_members").update({ phone }).eq("id", user.id);
    }
    await ensureUserPreferences(user.id, user);
    return {
      id: existing.id,
      onboarding_completed: existing.onboarding_completed
    };
  }

  const nickname = await findAvailableNickname(deriveBaseNickname(user));

  const { data: created, error } = await admin
    .from("tb_members")
    .insert({ id: user.id, nickname, phone })
    .select("id, onboarding_completed")
    .single();

  if (!error && created) {
    await ensureUserPreferences(user.id, user);
    return created as MemberRow;
  }

  const { data: retry } = await admin
    .from("tb_members")
    .select("id, onboarding_completed, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (retry && !retry.phone && phone) {
    await admin.from("tb_members").update({ phone }).eq("id", user.id);
  }

  if (retry) await ensureUserPreferences(user.id, user);

  return retry ? { id: retry.id, onboarding_completed: retry.onboarding_completed } : null;
}
