import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEssentialFacilities,
  formatDistance,
  getAccessibilityGroups,
  getHomeEvidenceStatus,
  getNeedEvidenceChecks,
  homeNeedIdsToChatNeeds,
  homeNeedIdsToStorageValues,
  rankHomePlaces,
  resolveHomeNeedIds,
  rotateDailyFeaturedPlace,
  sortHomeEvidenceForNeeds,
  summarizeVisitInfo,
  type HomePlace,
  type RankedHomePlace
} from "./homeData.ts";

const basePlace: HomePlace = {
  id: "place-a",
  title: "문화 공간",
  category: "문화시설",
  address: "대전광역시",
  imageUrl: null,
  latitude: 36.35,
  longitude: 127.38,
  sourceUpdatedAt: "20260701000000",
  overview: "실내 전시 공간",
  hours: "09:00~18:00",
  restDate: null,
  fee: null,
  phone: null,
  parking: null,
  officialUrl: null,
  reservationUrl: null,
  accessibility: [
    { key: "elevator", label: "엘리베이터", value: "주 출입구 옆에 있습니다." },
    { key: "restroom", label: "장애인 화장실", value: "1층에 있습니다." }
  ]
};

test("기존 프로필 값을 홈 도움 조건으로 변환한다", () => {
  assert.deepEqual(resolveHomeNeedIds(["보행", "시각"]), ["step_free", "visual_guidance"]);
  assert.deepEqual(homeNeedIdsToStorageValues(["step_free", "easy_explanation"]), [
    "계단 피하기",
    "쉬운 설명"
  ]);
  assert.deepEqual(
    homeNeedIdsToChatNeeds(["step_free", "short_distance", "hearing_guidance", "easy_explanation"]),
    ["mobility_access", "short_distance", "hearing_impairment", "easy_explanation"]
  );
});

test("선택한 도움과 실제 접근성 근거가 있는 장소를 우선한다", () => {
  const withoutEvidence: HomePlace = {
    ...basePlace,
    id: "place-b",
    title: "야외 공간",
    accessibility: []
  };
  const [first] = rankHomePlaces([withoutEvidence, basePlace], ["step_free"], null);

  assert.equal(first.id, "place-a");
  assert.deepEqual(first.matchedNeedIds, ["step_free"]);
  assert.equal("score" in first, false);
});

test("필드가 있어도 이용 불가 안내는 추천 근거로 사용하지 않는다", () => {
  const unavailablePlace: HomePlace = {
    ...basePlace,
    id: "place-unavailable",
    title: "엘리베이터 미설치 장소",
    accessibility: [
      { key: "elevator", label: "엘리베이터", value: "엘리베이터가 설치되어 있지 않습니다." },
      { key: "restroom", label: "장애인 화장실", value: "장애인 화장실 없음" }
    ]
  };
  const [ranked] = rankHomePlaces([unavailablePlace], ["step_free"], null);

  assert.deepEqual(ranked.matchedNeedIds, []);
  assert.equal(buildEssentialFacilities([ranked]).length, 0);
  assert.equal(
    getHomeEvidenceStatus({ key: "elevator", value: "엘리베이터가 설치되어 있지 않습니다." }),
    "unavailable"
  );
});

test("단차나 턱이 없다는 설명은 이용 가능한 근거로 구분한다", () => {
  assert.equal(
    getHomeEvidenceStatus({ key: "route", value: "주 출입구까지 단차가 없습니다." }),
    "available"
  );
});

test("선택한 조건의 확인 근거와 미확인 항목을 구분한다", () => {
  const checks = getNeedEvidenceChecks(basePlace, ["step_free"]);

  assert.deepEqual(
    checks.map(({ label, status }) => ({ label, status })),
    [
      { label: "출입구·접근로", status: "unknown" },
      { label: "엘리베이터", status: "available" }
    ]
  );
});

test("접근성 정보는 이동·시각·청각·영유아 목적별로 묶는다", () => {
  const evidence = [
    ...basePlace.accessibility,
    { key: "audio_guide" as const, label: "음성 안내", value: "음성 안내기를 대여할 수 있습니다." },
    { key: "stroller" as const, label: "유모차", value: "유모차를 대여할 수 있습니다." }
  ];
  const groups = getAccessibilityGroups(evidence);

  assert.deepEqual(
    groups.map((group) => group.id),
    ["mobility", "visual", "family"]
  );
  assert.equal(sortHomeEvidenceForNeeds(evidence, ["visual_guidance"])[0]?.key, "audio_guide");
});

test("장소명뿐 아니라 활동과 편의시설 정보도 검색한다", () => {
  assert.equal(rankHomePlaces([basePlace], [], null, "전시").length, 1);
  assert.equal(rankHomePlaces([basePlace], [], null, "화장실").length, 1);
  assert.equal(rankHomePlaces([basePlace], [], null, "수영").length, 0);
});

test("실제 좌표가 있을 때만 거리와 장소 안 편의시설 정보를 만든다", () => {
  const [ranked] = rankHomePlaces([basePlace], ["short_distance"], { lat: 36.35, lng: 127.38 });
  const facilities = buildEssentialFacilities([ranked]);

  assert.equal(formatDistance(ranked.distanceMeters), "10m 이내");
  assert.deepEqual(
    facilities.map((facility) => facility.key),
    ["restroom", "elevator"]
  );
});

test("편의시설 바로 찾기는 가능한 경우 서로 다른 장소를 보여준다", () => {
  const places = [
    {
      ...basePlace,
      id: "place-all",
      title: "모든 시설이 있는 곳",
      distanceMeters: 100,
      matchedNeedIds: []
    },
    {
      ...basePlace,
      id: "place-elevator",
      title: "엘리베이터가 있는 곳",
      distanceMeters: 200,
      matchedNeedIds: [],
      accessibility: basePlace.accessibility.filter((item) => item.key === "elevator")
    },
    {
      ...basePlace,
      id: "place-parking",
      title: "주차할 수 있는 곳",
      distanceMeters: 300,
      matchedNeedIds: [],
      accessibility: [{ key: "parking", label: "장애인 주차", value: "장애인 주차 있음" }]
    }
  ] satisfies RankedHomePlace[];

  assert.deepEqual(
    buildEssentialFacilities(places).map((facility) => facility.placeId),
    ["place-all", "place-elevator", "place-parking"]
  );
});

test("조건 없는 기본 홈은 상위 후보 안에서 오늘의 첫 추천을 바꾼다", () => {
  const places = ["a", "b", "c"].map((id): RankedHomePlace => ({
    ...basePlace,
    id,
    title: `장소 ${id}`,
    imageUrl: `https://example.com/${id}.jpg`,
    distanceMeters: null,
    matchedNeedIds: []
  }));

  const rotated = rotateDailyFeaturedPlace(places, new Date("1970-01-02T00:00:00Z"));

  assert.equal(rotated[0].id, "b");
  assert.deepEqual(new Set(rotated.map((place) => place.id)), new Set(["a", "b", "c"]));
});

test("긴 이동 피하기는 접근성 필드 수보다 실제 직선거리를 먼저 적용한다", () => {
  const nearbyPlace: HomePlace = {
    ...basePlace,
    id: "place-nearby",
    title: "가까운 장소",
    latitude: 36.3501,
    longitude: 127.3801,
    accessibility: []
  };
  const fartherPlace: HomePlace = {
    ...basePlace,
    id: "place-farther",
    title: "먼 장소",
    latitude: 36.39,
    longitude: 127.42
  };
  const ranked = rankHomePlaces([fartherPlace, nearbyPlace], ["short_distance"], {
    lat: 36.35,
    lng: 127.38
  });

  assert.equal(ranked[0].id, "place-nearby");
  assert.deepEqual(ranked[0].matchedNeedIds, []);
});

test("긴 관광 운영시간을 홈에서 읽기 쉽게 요약한다", () => {
  assert.equal(
    summarizeVisitInfo({
      hours:
        "[전자정보자료실]- 평일 09:00~18:00- 주말 09:00~18:00[일반열람실]- 하절기 07:00~22:00※ 자세한 사항은 홈페이지 참조",
      restDate: null,
      phone: null
    }),
    "운영 09:00~18:00 / 07:00~22:00"
  );
  assert.equal(
    summarizeVisitInfo({ hours: "상시 개방", restDate: null, phone: null }),
    "상시 운영"
  );
});
