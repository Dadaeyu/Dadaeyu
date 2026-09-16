import assert from "node:assert/strict";
import test from "node:test";
import { getTodayKstDate, resolveEventStatusBadge } from "./event-ui.ts";

const fallback = { label: "진행중", color: "bg-brand-100 text-brand-700" };

test("기간이 없으면 관리자가 입력한 배지를 그대로 쓴다", () => {
  assert.deepEqual(resolveEventStatusBadge(null, null, fallback), fallback);
  assert.deepEqual(resolveEventStatusBadge("2026-06-30", null, fallback), fallback);
});

test("종료일이 지나면 관리자 배지와 무관하게 종료로 바뀐다 (실제 이벤트 #4 재현)", () => {
  const badge = resolveEventStatusBadge("2026-06-30", "2026-08-08", fallback, "2026-09-09");
  assert.equal(badge.label, "종료");
});

test("오늘이 기간 안이면 진행중, 시작 전이면 예정이다", () => {
  assert.equal(
    resolveEventStatusBadge("2026-06-30", "2026-08-08", fallback, "2026-07-15").label,
    "진행중"
  );
  assert.equal(
    resolveEventStatusBadge("2026-06-30", "2026-08-08", fallback, "2026-06-29").label,
    "예정"
  );
  // 시작일·종료일 당일은 모두 진행중(경계 포함)
  assert.equal(
    resolveEventStatusBadge("2026-06-30", "2026-08-08", fallback, "2026-06-30").label,
    "진행중"
  );
  assert.equal(
    resolveEventStatusBadge("2026-06-30", "2026-08-08", fallback, "2026-08-08").label,
    "진행중"
  );
});

test("한국 시간 기준 자정 넘김을 반영한다", () => {
  assert.equal(getTodayKstDate(new Date("2026-08-08T14:59:59Z")), "2026-08-08");
  assert.equal(getTodayKstDate(new Date("2026-08-08T15:00:00Z")), "2026-08-09");
});
