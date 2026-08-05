import assert from "node:assert/strict";
import test from "node:test";
import { retryTextToSpeechAccountingCleanup } from "./accounting-cleanup-retry.ts";

test("TTS accounting cleanup retry succeeds after transient failures", async () => {
  let attempts = 0;
  const sleeps: number[] = [];

  await retryTextToSpeechAccountingCleanup({
    backoffMs: 10,
    cleanup: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("temporary");
    },
    onFinalFailure: () => {
      throw new Error("should not log success");
    },
    operation: "refund",
    reservationToken: "reservation-token",
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
    }
  });

  assert.equal(attempts, 3);
  assert.deepEqual(sleeps, [10, 20]);
});

test("TTS accounting cleanup retry reports bounded final failure", async () => {
  const failures: unknown[] = [];
  const sleeps: number[] = [];
  let attempts = 0;

  await retryTextToSpeechAccountingCleanup({
    backoffMs: 5,
    cleanup: async () => {
      attempts += 1;
      throw new Error(`failure-${attempts}`);
    },
    onFinalFailure: (failure) => {
      failures.push(failure);
    },
    operation: "finalize",
    reservationToken: "reservation-token",
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
    }
  });

  assert.equal(attempts, 3);
  assert.deepEqual(sleeps, [5, 10]);
  assert.equal(failures.length, 1);
  assert.deepEqual(
    failures.map((failure) => ({
      attempts: (failure as { attempts: number }).attempts,
      operation: (failure as { operation: string }).operation,
      reservationToken: (failure as { reservationToken: string }).reservationToken
    })),
    [{ attempts: 3, operation: "finalize", reservationToken: "reservation-token" }]
  );
});
