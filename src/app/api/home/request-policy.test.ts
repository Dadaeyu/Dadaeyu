import assert from "node:assert/strict";
import test from "node:test";
import { parseHomeExcludedPlaceIds, parseHomeRecommendationSeed } from "./request-policy.ts";

test("홈 추천 seed는 unsigned 32비트 정수만 허용한다", () => {
  assert.equal(parseHomeRecommendationSeed("0"), 0);
  assert.equal(parseHomeRecommendationSeed("4294967295"), 4_294_967_295);
  assert.equal(parseHomeRecommendationSeed("4294967296"), undefined);
  assert.equal(parseHomeRecommendationSeed("-1"), undefined);
  assert.equal(parseHomeRecommendationSeed("1.5"), undefined);
});

test("최근 장소 제외값은 유효한 ID 48개까지만 중복 없이 받는다", () => {
  const placeIds = Array.from({ length: 60 }, (_, index) => `place-${index}`);
  const parsedPlaceIds = parseHomeExcludedPlaceIds([
    `${placeIds.join(",")},place-0,잘못된 값`,
    "ignored-place"
  ]);

  assert.equal(parsedPlaceIds.length, 48);
  assert.deepEqual(parsedPlaceIds, placeIds.slice(0, 48));
});
