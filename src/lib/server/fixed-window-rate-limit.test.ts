import assert from "node:assert/strict";
import test from "node:test";
import { createFixedWindowRateLimiter } from "./fixed-window-rate-limit.ts";

test("fixed-window limiter blocks the N+1 request in the same window", () => {
  let now = 1_000;
  const limiter = createFixedWindowRateLimiter({
    maxRequests: 2,
    maxTrackedClients: 10,
    now: () => now,
    windowMs: 60_000
  });

  assert.deepEqual(limiter.enforce("client-a"), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.enforce("client-a"), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.enforce("client-a"), { allowed: false, retryAfterSeconds: 60 });

  now += 60_000;
  assert.deepEqual(limiter.enforce("client-a"), { allowed: true, retryAfterSeconds: 0 });
});

test("fixed-window limiter caps tracked clients during fresh unique key floods", () => {
  let now = 1_000;
  const limiter = createFixedWindowRateLimiter({
    maxRequests: 1,
    maxTrackedClients: 3,
    now: () => now,
    windowMs: 60_000
  });

  for (const key of ["client-a", "client-b", "client-c", "client-d", "client-e"]) {
    assert.equal(limiter.enforce(key).allowed, true);
    assert.ok(limiter.getTrackedClientCount() <= 3);
  }

  assert.equal(limiter.getTrackedClientCount(), 3);

  now += 60_000;
  assert.equal(limiter.enforce("client-f").allowed, true);
  assert.equal(limiter.getTrackedClientCount(), 1);
});
