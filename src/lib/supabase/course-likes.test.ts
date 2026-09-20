import assert from "node:assert/strict";
import test from "node:test";
import { formatCoursePeriod } from "./course-period.ts";

test("코스 일정은 시각 없이 년월일만 보여 준다", () => {
  assert.equal(
    formatCoursePeriod("2026-08-03T00:00:00+00:00", "2026-08-05T00:00:00+00:00"),
    "2026-08-03 ~ 2026-08-05"
  );
  assert.equal(formatCoursePeriod("2026-08-03", "2026-08-03"), "2026-08-03");
  assert.equal(formatCoursePeriod("2026-08-03T00:00:00+00:00", null), "2026-08-03");
  assert.equal(formatCoursePeriod(null, null), null);
});
