import assert from "node:assert/strict";
import test from "node:test";
import { getHomeRefinementStatusLabel, shouldShowHomePlaceImage } from "./homePresentation.ts";

test("홈 조건 입력 상태 문구는 통합검색이 아니라 추천 좁히기 역할을 설명한다", () => {
  assert.equal(getHomeRefinementStatusLabel("공원", "loading"), "“공원” 조건을 반영하고 있어요");
  assert.equal(getHomeRefinementStatusLabel("공원", "ready"), "“공원” 조건을 반영했어요");
  assert.equal(getHomeRefinementStatusLabel("공원", "empty"), "“공원” 조건에 맞는 장소가 없어요");
  assert.equal(getHomeRefinementStatusLabel("공원", "error"), "“공원” 조건을 반영하지 못했어요");
  assert.equal(getHomeRefinementStatusLabel("  ", "ready"), null);
});

test("대표 이미지 실패 상태는 같은 주소에만 적용한다", () => {
  const failedSource = "https://example.com/failed.jpg";

  assert.equal(shouldShowHomePlaceImage(null, null), false);
  assert.equal(shouldShowHomePlaceImage(failedSource, failedSource), false);
  assert.equal(shouldShowHomePlaceImage("https://example.com/new.jpg", failedSource), true);
});
