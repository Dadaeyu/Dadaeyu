import type { User } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/auth/phone";
import { createAdminClient } from "./admin";
type MemberRow = {
  id: string;
  onboarding_completed: boolean;
};

function deriveBaseNickname(user: User): string {
  const meta = user.user_metadata ?? {};
  const candidates = [
    meta.nickname,
    meta.name,
    meta.full_name,
    user.email?.split("@")[0],
  ];

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
      .from("members")
      .select("id")
      .eq("nickname", finalNickname)
      .maybeSingle();

    if (!data) return finalNickname;
    suffix += 1;
    finalNickname = `${baseNickname}_${suffix}`;
  }
}

/** DB 트리거 실패 시 members 행을 보장 (서버 전용) */
export async function ensureMemberExists(user: User): Promise<MemberRow | null> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("members")
    .select("id, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing as MemberRow;

  const nickname = await findAvailableNickname(deriveBaseNickname(user));
  const meta = user.user_metadata ?? {};
  const phoneRaw = typeof meta.phone === "string" ? normalizePhone(meta.phone) : "";
  const phone = phoneRaw || null;

  const { data: created, error } = await admin
    .from("members")
    .insert({ id: user.id, nickname, phone })
    .select("id, onboarding_completed")
    .single();

  if (!error && created) return created as MemberRow;

  const { data: retry } = await admin
    .from("members")
    .select("id, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  return (retry as MemberRow | null) ?? null;
}
