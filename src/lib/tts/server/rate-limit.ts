import "server-only";

import { createFixedWindowRateLimiter } from "@/lib/server/fixed-window-rate-limit";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 20;
const MAX_TRACKED_CLIENTS = 1_000;
const rateLimiter = createFixedWindowRateLimiter({
  maxRequests: getMaxRequests,
  maxTrackedClients: MAX_TRACKED_CLIENTS,
  windowMs: WINDOW_MS
});

export function enforceTextToSpeechRateLimit(clientKey: string): RateLimitResult {
  return rateLimiter.enforce(clientKey);
}

function getMaxRequests() {
  const configuredLimit = Number(process.env.TTS_RATE_LIMIT_PER_MINUTE);

  return Number.isInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : DEFAULT_MAX_REQUESTS;
}
