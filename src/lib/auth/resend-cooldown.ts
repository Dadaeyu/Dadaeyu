const DEFAULT_COOLDOWN_MS = 5_000;

const cooldownMap = new Map<string, number>();

export function getResendCooldownMs(): number {
  const parsed = Number(process.env.AUTH_RESEND_COOLDOWN_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_COOLDOWN_MS;
}

export function checkResendCooldown(email: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const until = cooldownMap.get(key) ?? 0;

  if (now < until) {
    return { allowed: false, retryAfterMs: until - now };
  }

  cooldownMap.set(key, now + getResendCooldownMs());
  return { allowed: true, retryAfterMs: 0 };
}
