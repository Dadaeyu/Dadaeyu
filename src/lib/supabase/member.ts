import { createClient } from "./client";
import type {
  AgeGroup,
  DbMember,
  DbUserPreferences,
  Gender,
} from "./types";

export const NICKNAME_MIN_LENGTH = 2;

export function normalizeNickname(nickname: string): string {
  return nickname.trim();
}

export async function isNicknameAvailable(
  nickname: string,
  excludeUserId?: string
): Promise<boolean> {
  const trimmed = normalizeNickname(nickname);
  if (trimmed.length < NICKNAME_MIN_LENGTH) return false;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id")
    .eq("nickname", trimmed)
    .maybeSingle();

  if (error) throw error;
  if (!data) return true;
  return excludeUserId !== undefined && data.id === excludeUserId;
}

export function getNicknameSubmitError(nickname: string, available: boolean): string | null {
  const trimmed = normalizeNickname(nickname);
  if (trimmed.length < NICKNAME_MIN_LENGTH) {
    return "닉네임을 2자 이상 입력해 주세요.";
  }
  if (!available) {
    return "이미 사용 중인 닉네임입니다.";
  }
  return null;
}

function mapMemberUpdateError(error: { code?: string; message: string }): Error {
  if (
    error.code === "23505" ||
    error.message.includes("members_nickname_unique")
  ) {
    return new Error("이미 사용 중인 닉네임입니다.");
  }
  return new Error(error.message);
}

export async function fetchMember(userId: string): Promise<DbMember | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as DbMember | null;
}

export async function fetchUserPreferences(
  userId: string
): Promise<DbUserPreferences | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as DbUserPreferences | null;
}

export async function updateMember(
  userId: string,
  patch: Partial<
    Pick<DbMember, "nickname" | "phone" | "avatar_url" | "gender" | "age_group" | "onboarding_completed">
  >
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw mapMemberUpdateError(error);
  return data as DbMember;
}

export async function updateUserPreferences(
  userId: string,
  patch: Partial<Omit<DbUserPreferences, "user_id" | "updated_at">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .update(patch)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as DbUserPreferences;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

  await updateMember(userId, { avatar_url: avatarUrl });
  return avatarUrl;
}
