import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as evidence from "./accessibilityEvidence.ts";
import type { CourseAccessibilitySummary } from "../supabase/types";

const source = readFileSync(
  new URL("../../app/api/courses/shared/route.ts", import.meta.url),
  "utf8"
);
const output: {
  buildCourseAccessibilitySummary?: (
    input: Record<string, unknown>
  ) => CourseAccessibilitySummary | undefined;
} = {};
runInNewContext(
  ts.transpileModule(`${source}\nexport { buildCourseAccessibilitySummary };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText,
  {
    exports: output,
    require: (id: string) => (id === "@/lib/chat/accessibilityEvidence" ? evidence : {})
  }
);
const summarize = output.buildCourseAccessibilitySummary!;

test("코스 접근성은 실제 항목을 확인하며 누락 및 삭제된 방문지를 분모에 남긴다", () => {
  const result = summarize({
    courseId: 7,
    needs: ["wheelchair", "accessible_toilet"],
    detailRows: [
      { course_id: 7, place_id: 1 },
      { course_id: 7, place_id: 2 },
      { course_id: 7, place_id: null },
      { course_id: 7, place_id: 3 },
      { course_id: 9, place_id: 1 }
    ],
    placeMap: new Map([
      [1, { title: "확인된 문화관", contentid: "100", delete_yn: "N" }],
      [2, { title: "정보 부족 장소", contentid: "200", delete_yn: "N" }]
    ]),
    barrierFreeByContentId: new Map([
      ["100", { exit: "주출입구 단차 없음", restroom: "장애인 화장실 있음" }],
      ["200", { has_gait: true, has_infant: true, wheelchair: "휠체어 대여 가능" }]
    ])
  })!;
  assert.equal(result.totalPlaceCount, 4);
  assert.equal(result.confirmedPlaceCount, 1);
  assert.equal(result.unknownPlaceCount, 3);
  assert.equal(result.restrictedPlaceCount, 0);
  assert.equal(result.places[1].status, "unknown");
});

test("이용 제한과 근거 부족을 코스에서 구분한다", () => {
  const result = summarize({
    courseId: 7,
    needs: ["accessible_toilet"],
    detailRows: [
      { course_id: 7, place_id: 1 },
      { course_id: 7, place_id: 2 }
    ],
    placeMap: new Map([
      [1, { title: "제한 장소", contentid: "100" }],
      [2, { title: "미확인 장소", contentid: "200" }]
    ]),
    barrierFreeByContentId: new Map([["100", { restroom: "장애인 화장실 이용 불가" }]])
  })!;
  assert.equal(result.restrictedPlaceCount, 1);
  assert.equal(result.unknownPlaceCount, 1);
  assert.equal(result.confirmedPlaceCount, 0);
});

test("조건이 없으면 적합 판정을 만들지 않고 빈 코스도 확인된 장소로 세지 않는다", () => {
  const empty = {
    courseId: 7,
    needs: [],
    detailRows: [],
    placeMap: new Map(),
    barrierFreeByContentId: new Map()
  };
  assert.equal(summarize(empty), undefined);
  assert.equal(summarize({ ...empty, needs: ["wheelchair"] })?.confirmedPlaceCount, 0);
});

test("삭제된 장소는 제목과 근거를 노출하지 않고 미확인 방문지로 남긴다", () => {
  const result = summarize({
    courseId: 7,
    needs: ["wheelchair"],
    detailRows: [{ course_id: 7, place_id: 1 }],
    placeMap: new Map([[1, { title: "삭제된 비공개 제목", contentid: "100", delete_yn: "Y" }]]),
    barrierFreeByContentId: new Map([["100", { exit: "주출입구 단차 없음" }]])
  })!;
  assert.equal(result.totalPlaceCount, 1);
  assert.equal(result.unknownPlaceCount, 1);
  assert.equal(JSON.stringify(result).includes("삭제된 비공개 제목"), false);
});

test("접근성 자료 조회 실패는 단순 정보 부족과 구분해 알린다", () => {
  const result = summarize({
    courseId: 7,
    needs: ["wheelchair"],
    lookupFailed: true,
    detailRows: [{ course_id: 7, place_id: 1 }],
    placeMap: new Map([[1, { title: "문화관", contentid: "100" }]]),
    barrierFreeByContentId: new Map()
  })!;
  assert.equal(result.dataStatus, "unavailable");
  assert.match(result.note, /불러오지 못/);
});
