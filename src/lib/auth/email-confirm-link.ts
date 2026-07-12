import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailConfirmRedirectUrl } from "@/lib/auth/confirm-redirect";
import { getSafeNextPath } from "@/lib/auth/paths";
import { normalizeEmail } from "@/lib/auth/email";

type OtpType = "signup" | "email";

function buildConfirmUrl(
  origin: string,
  tokenHash: string,
  otpType: OtpType,
  safeNext: string
): string {
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", otpType);
  url.searchParams.set("next", safeNext);
  return url.toString();
}

/** PKCE 없이 어떤 브라우저·메일 앱에서도 동작하는 인증 URL */
export async function buildTokenHashConfirmUrl(
  email: string,
  origin: string,
  options?: {
    next?: string;
    password?: string;
    profile?: { nickname?: string; phone?: string; theme_preferences?: string[] };
  }
): Promise<string | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const admin = createAdminClient();
  const safeNext = getSafeNextPath(options?.next, "/mypage");
  const redirectTo = buildEmailConfirmRedirectUrl(origin, safeNext);

  if (options?.password) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password: options.password,
      options: {
        data: {
          nickname: options.profile?.nickname,
          phone: options.profile?.phone,
          ...(options.profile?.theme_preferences?.length
            ? { theme_preferences: options.profile.theme_preferences }
            : {})
        },
        redirectTo
      }
    });
    const tokenHash = data?.properties?.hashed_token;
    if (!error && tokenHash) {
      return buildConfirmUrl(origin, tokenHash, "signup", safeNext);
    }
  }

  const magicLink = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalizedEmail,
    options: { redirectTo }
  });
  const magicHash = magicLink.data?.properties?.hashed_token;
  if (!magicLink.error && magicHash) {
    return buildConfirmUrl(origin, magicHash, "email", safeNext);
  }

  return null;
}
