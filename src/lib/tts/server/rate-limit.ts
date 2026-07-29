import "server-only";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const rateLimitEntries = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 20;
const MAX_TRACKED_CLIENTS = 1_000;

export function enforceTextToSpeechRateLimit(request: Request): RateLimitResult {
  const now = Date.now();
  const clientKey = getClientKey(request);
  const entry = rateLimitEntries.get(clientKey);

  if (!entry || now >= entry.resetAt) {
    pruneExpiredEntries(now);
    rateLimitEntries.set(clientKey, {
      count: 1,
      resetAt: now + WINDOW_MS
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= getMaxRequests()) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000))
    };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function getClientKey(request: Request) {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function getMaxRequests() {
  const configuredLimit = Number(process.env.TTS_RATE_LIMIT_PER_MINUTE);

  return Number.isInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : DEFAULT_MAX_REQUESTS;
}

function pruneExpiredEntries(now: number) {
  if (rateLimitEntries.size < MAX_TRACKED_CLIENTS) return;

  for (const [key, entry] of rateLimitEntries) {
    if (entry.resetAt <= now) {
      rateLimitEntries.delete(key);
    }
  }
}
