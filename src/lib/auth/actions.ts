import { createClient } from "@/lib/supabase/client";
import { resolveAuthDestination } from "@/lib/auth/post-login";
import { getSafeNextPath } from "@/lib/auth/paths";
import { normalizePhone } from "@/lib/auth/phone";
import { normalizeNickname } from "@/lib/supabase/member";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type OAuthProvider = "google" | "kakao" | "naver";

const OAUTH_PROVIDERS: Record<OAuthProvider, string> = {
  google: "google",
  kakao: "kakao",
  naver: "custom:naver",
};

export interface SignUpProfile {
  nickname: string;
  phone: string;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  profile: SignUpProfile
) {
  const supabase = createClient();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return {
      data: { user: null, session: null },
      error: { message: 'Email address "" is invalid', name: "AuthApiError", status: 400 },
    } as Awaited<ReturnType<typeof supabase.auth.signUp>>;
  }

  return supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        nickname: normalizeNickname(profile.nickname),
        phone: normalizePhone(profile.phone),
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function resetPasswordForEmail(email: string) {
  const supabase = createClient();
  return supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  return supabase.auth.updateUser({ password: newPassword });
}

export async function signInWithOAuth(provider: OAuthProvider, next?: string) {
  if (provider === "naver") {
    const url = new URL("/auth/naver", window.location.origin);
    if (next) url.searchParams.set("next", next);
    window.location.assign(url.toString());
    return {
      data: { provider: "naver", url: url.toString() },
      error: null,
    } as { data: { provider: string; url: string }; error: null };
  }

  const supabase = createClient();
  const redirectTo = new URL("/auth/callback", window.location.origin);
  if (next) redirectTo.searchParams.set("next", next);

  const options: {
    redirectTo: string;
    queryParams?: Record<string, string>;
  } = {
    redirectTo: redirectTo.toString(),
  };

  if (provider === "kakao") {
    options.queryParams = { lang: "ko" };
  }

  return supabase.auth.signInWithOAuth({
    provider: OAUTH_PROVIDERS[provider] as never,
    options,
  });
}

export { getSafeNextPath } from "@/lib/auth/paths";

/** 이메일 로그인 후 온보딩 필요 여부에 따라 이동 경로 반환 */
export async function resolvePostLoginPath(next: string): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return getSafeNextPath(next);

  return resolveAuthDestination(supabase, user.id, next);
}

/** OAuth 제공자 여부 (이메일 가입자는 provider가 email) */
export function isOAuthUser(user: {
  app_metadata?: { provider?: string; providers?: string[] };
}): boolean {
  const providers = user.app_metadata?.providers ?? [];
  if (providers.length > 0) {
    return providers.some((p) => p !== "email");
  }
  const provider = user.app_metadata?.provider;
  return !!provider && provider !== "email";
}

/** 이메일 가입자 여부 (가입 시 휴대폰 필수 → phone 존재로 구분) */
export function isEmailSignupMember(member: { phone?: string | null } | null): boolean {
  return !!member?.phone;
}
