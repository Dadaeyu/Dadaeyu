import assert from "node:assert/strict";
import test from "node:test";
import { asksForSingleRecommendation, selectDiverseItems } from "./recommendationDiversity.ts";

type Candidate = { id: string; title: string };

const candidates: Candidate[] = [
  { id: "a-1", title: "천연기념물센터" },
  { id: "a-2", title: "천연기념물센터" },
  { id: "b-1", title: "대전시립미술관" },
  { id: "c-1", title: "한밭수목원" },
  { id: "d-1", title: "대전교통문화연수원" }
];

test("같은 장소의 문서 조각이 여러 개여도 추천 후보는 장소별로 하나씩 고른다", () => {
  const selected = selectDiverseItems({
    items: candidates,
    getTitle: (candidate) => candidate.title,
    limit: 3
  });

  assert.deepEqual(
    selected.map((candidate) => candidate.title),
    ["천연기념물센터", "대전시립미술관", "한밭수목원"]
  );
});

test("이미 보여준 장소보다 새로운 장소를 먼저 추천한다", () => {
  const selected = selectDiverseItems({
    items: candidates,
    getTitle: (candidate) => candidate.title,
    limit: 3,
    seenTitles: ["천연 기념물 센터", "대전시립미술관"]
  });

  assert.deepEqual(
    selected.map((candidate) => candidate.title),
    ["한밭수목원", "대전교통문화연수원", "천연기념물센터"]
  );
});

test("새 후보가 부족하면 이전 장소도 뒤에서 보충한다", () => {
  const selected = selectDiverseItems({
    items: candidates,
    getTitle: (candidate) => candidate.title,
    limit: 4,
    seenTitles: ["천연기념물센터", "대전시립미술관", "한밭수목원"]
  });

  assert.deepEqual(
    selected.map((candidate) => candidate.title),
    ["대전교통문화연수원", "천연기념물센터", "대전시립미술관", "한밭수목원"]
  );
});

test("'추천한 곳 말고'를 한 곳만 추천해 달라는 요청으로 오해하지 않는다", () => {
  assert.equal(asksForSingleRecommendation("방금 추천한 곳 말고 다른 곳도 추천해줘"), false);
  assert.equal(asksForSingleRecommendation("그중 한 곳만 추천해줘"), true);
});
