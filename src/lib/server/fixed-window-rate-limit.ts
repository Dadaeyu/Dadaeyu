export type FixedWindowRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type FixedWindowEntry = {
  count: number;
  resetAt: number;
};

export type FixedWindowRateLimiterOptions = {
  maxRequests: number | (() => number);
  maxTrackedClients: number;
  now?: () => number;
  windowMs: number;
};

export function createFixedWindowRateLimiter({
  maxRequests,
  maxTrackedClients,
  now = Date.now,
  windowMs
}: FixedWindowRateLimiterOptions) {
  const entries = new Map<string, FixedWindowEntry>();

  return {
    enforce(clientKey: string): FixedWindowRateLimitResult {
      const currentTime = now();
      const entry = entries.get(clientKey);

      if (!entry || currentTime >= entry.resetAt) {
        pruneExpiredEntries(entries, currentTime);
        evictUntilBelowCapacity(entries, maxTrackedClients);
        entries.set(clientKey, {
          count: 1,
          resetAt: currentTime + windowMs
        });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      const limit = resolveMaxRequests(maxRequests);
      if (entry.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1_000))
        };
      }

      entry.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    getTrackedClientCount() {
      return entries.size;
    }
  };
}

function resolveMaxRequests(maxRequests: number | (() => number)) {
  return typeof maxRequests === "function" ? maxRequests() : maxRequests;
}

function pruneExpiredEntries(entries: Map<string, FixedWindowEntry>, now: number) {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) {
      entries.delete(key);
    }
  }
}

function evictUntilBelowCapacity(
  entries: Map<string, FixedWindowEntry>,
  maxTrackedClients: number
) {
  while (entries.size >= maxTrackedClients && entries.size > 0) {
    const evictionKey = findEvictionKey(entries);
    entries.delete(evictionKey);
  }
}

function findEvictionKey(entries: Map<string, FixedWindowEntry>) {
  let evictionKey: string | null = null;
  let earliestResetAt = Number.POSITIVE_INFINITY;

  for (const [key, entry] of entries) {
    if (
      entry.resetAt < earliestResetAt ||
      (entry.resetAt === earliestResetAt && (evictionKey === null || key < evictionKey))
    ) {
      evictionKey = key;
      earliestResetAt = entry.resetAt;
    }
  }

  if (evictionKey === null) {
    throw new Error("Cannot evict from an empty fixed-window rate limiter.");
  }

  return evictionKey;
}
