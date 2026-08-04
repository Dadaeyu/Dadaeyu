import assert from "node:assert/strict";
import test from "node:test";
import { getGoogleTextToSpeechBillingPeriods } from "./usage-period.ts";

test("Google TTS 사용량은 태평양 시간 기준 자정에 일·월 구간이 바뀐다", () => {
  assert.deepEqual(getGoogleTextToSpeechBillingPeriods(new Date("2026-08-01T06:59:59Z")), {
    billingPeriod: "2026-07",
    clientPeriod: "2026-07-31"
  });
  assert.deepEqual(getGoogleTextToSpeechBillingPeriods(new Date("2026-08-01T07:00:00Z")), {
    billingPeriod: "2026-08",
    clientPeriod: "2026-08-01"
  });
});

test("서머타임이 끝난 뒤에는 태평양 표준시 자정을 따른다", () => {
  assert.deepEqual(getGoogleTextToSpeechBillingPeriods(new Date("2026-12-01T07:59:59Z")), {
    billingPeriod: "2026-11",
    clientPeriod: "2026-11-30"
  });
  assert.deepEqual(getGoogleTextToSpeechBillingPeriods(new Date("2026-12-01T08:00:00Z")), {
    billingPeriod: "2026-12",
    clientPeriod: "2026-12-01"
  });
});
