/** 수동 생성 관리자 공용 계정 — 실제 메일함 없음, 인증 메일 생략 */
export const ADMIN_BOOTSTRAP_EMAILS = ["alianfamily@dadaeyu.com"] as const;

/** 이메일·비밀번호 가입자이며 아직 이메일 인증이 안 된 경우 */
export function needsEmailConfirmation(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  app_metadata?: { provider?: string; providers?: string[] };
}): boolean {
  const email = user.email?.toLowerCase();
  if (email && (ADMIN_BOOTSTRAP_EMAILS as readonly string[]).includes(email)) {
    return false;
  }

  const providers = user.app_metadata?.providers ?? [];
  const provider = providers.length > 0 ? providers[0] : (user.app_metadata?.provider ?? "email");

  if (provider !== "email") return false;
  return !user.email_confirmed_at;
}
