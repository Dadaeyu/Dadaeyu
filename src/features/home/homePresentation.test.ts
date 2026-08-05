import assert from "node:assert/strict";
import test from "node:test";
import { getHomeSearchStatusLabel, shouldShowHomePlaceImage } from "./homePresentation.ts";

test("홈 검색 상태 문구는 실제 로딩 결과와 일치한다", () => {
  assert.equal(getHomeSearchStatusLabel("공원", "loading"), "“공원” 검색 중");
  assert.equal(getHomeSearchStatusLabel("공원", "ready"), "“공원” 검색 결과");
  assert.equal(getHomeSearchStatusLabel("공원", "empty"), "“공원” 검색 결과 없음");
  assert.equal(getHomeSearchStatusLabel("공원", "error"), "“공원” 검색 실패");
  assert.equal(getHomeSearchStatusLabel("  ", "ready"), null);
});

test("대표 이미지 실패 상태는 같은 주소에만 적용한다", () => {
  const failedSource = "https://example.com/failed.jpg";

  assert.equal(shouldShowHomePlaceImage(null, null), false);
  assert.equal(shouldShowHomePlaceImage(failedSource, failedSource), false);
  assert.equal(shouldShowHomePlaceImage("https://example.com/new.jpg", failedSource), true);
});
