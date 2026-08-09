import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHomeRequestKey,
  createHomeRecommendationSeed,
  getCriteriaScopedHomeResponse,
  getOwnerScopedHomeResponse,
  mergeRecentHomePlaceIds,
  parseRecentHomePlaceIds
} from "./homeExperienceState.ts";

test("같은 추천 URL이어도 사용자가 바뀌면 새 요청 키를 만든다", () => {
  const requestUrl = "/api/home?needs=step_free";

  assert.notEqual(
    buildHomeRequestKey("user-a", requestUrl, 0),
    buildHomeRequestKey("user-b", requestUrl, 0)
  );
  assert.equal(buildHomeRequestKey("user-a", null, 0), null);
});

test("이전 사용자의 추천 응답은 현재 사용자 화면에 재사용하지 않는다", () => {
  const previousResponse = { ownerId: "user-a", data: ["place-a"] };

  assert.equal(getOwnerScopedHomeResponse(previousResponse, "user-b"), null);
  assert.equal(getOwnerScopedHomeResponse(previousResponse, "user-a"), previousResponse);
});

test("이전 조건의 추천 응답은 새 조건을 불러오는 동안 재사용하지 않는다", () => {
  const previousResponse = {
    ownerId: "user-a",
    criteriaKey: "step-free",
    data: ["place-a"]
  };

  assert.equal(getCriteriaScopedHomeResponse(previousResponse, "user-a", "visual-guidance"), null);
  assert.equal(
    getCriteriaScopedHomeResponse(previousResponse, "user-a", "step-free"),
    previousResponse
  );
});

test("방문 추천 seed는 주어진 난수에서 재현 가능한 정수로 만든다", () => {
  assert.equal(createHomeRecommendationSeed(0), 0);
  assert.equal(createHomeRecommendationSeed(0.5), 2_147_483_648);
  assert.equal(createHomeRecommendationSeed(Number.NaN), 0);
});

test("최근 본 장소는 최신 순으로 중복 없이 제한해 보관한다", () => {
  assert.deepEqual(mergeRecentHomePlaceIds(["old-a", "same"], ["new-a", "same"], 3), [
    "new-a",
    "same",
    "old-a"
  ]);
  assert.deepEqual(parseRecentHomePlaceIds('["place-a","place-a","",3,"place-b"]'), [
    "place-a",
    "place-b"
  ]);
  assert.deepEqual(parseRecentHomePlaceIds("not-json"), []);
});
