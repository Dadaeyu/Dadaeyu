import assert from "node:assert/strict";
import test from "node:test";
import { getChatUsagePeriods } from "./usage-period.ts";

test("chat usage periods use the Korea service day and month", () => {
  assert.deepEqual(getChatUsagePeriods(new Date("2026-07-31T14:59:59Z")), {
    clientPeriod: "2026-07-31",
    globalPeriod: "2026-07"
  });
  assert.deepEqual(getChatUsagePeriods(new Date("2026-07-31T15:00:00Z")), {
    clientPeriod: "2026-08-01",
    globalPeriod: "2026-08"
  });
});
