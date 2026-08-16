import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlaceReviewRankings,
  groupPlaceFavoriteSignals,
  groupPlaceReviewSignals
} from "./discoveryPlaceData.ts";

test("장소 후기 집계는 숫자형과 문자열 content id를 같은 장소로 합친다", () => {
  const grouped = groupPlaceReviewSignals([
    { content_id: 1796079, rating: 5 },
    { content_id: "1796079", rating: 3 },
    { content_id: null, rating: 5 }
  ]);

  assert.deepEqual(grouped.get("1796079"), { sum: 8, count: 2 });
});

test("장소 즐겨찾기 집계도 place id를 문자열 키로 통일한다", () => {
  const grouped = groupPlaceFavoriteSignals([
    { place_id: 1796079 },
    { place_id: "1796079" },
    { place_id: null }
  ]);

  assert.equal(grouped.get("1796079"), 2);
});

test("홈 후기 목록은 4개로 제한해도 기존 places 응답은 상위 5개를 유지한다", () => {
  const rankings = buildPlaceReviewRankings([
    { content_id: "place-1", rating: 5 },
    { content_id: "place-2", rating: 4.8 },
    { content_id: "place-3", rating: 4.6 },
    { content_id: "place-4", rating: 4.4 },
    { content_id: "place-5", rating: 4.2 }
  ]);

  assert.deepEqual(
    rankings.home.map(({ contentId }) => contentId),
    ["place-1", "place-2", "place-3", "place-4"]
  );
  assert.deepEqual(
    rankings.legacy.map(({ contentId }) => contentId),
    ["place-1", "place-2", "place-3", "place-4", "place-5"]
  );
});

test("핫플레이스 후기 순위는 평균 4점 미만 장소를 제외한다", () => {
  const rankings = buildPlaceReviewRankings([
    { content_id: "place-1", rating: 4.1 },
    { content_id: "place-2", rating: 4 },
    { content_id: "place-3", rating: 3.9 },
    { content_id: "place-4", rating: 1 }
  ]);

  assert.deepEqual(
    rankings.legacy.map(({ contentId }) => contentId),
    ["place-1", "place-2"]
  );
});
