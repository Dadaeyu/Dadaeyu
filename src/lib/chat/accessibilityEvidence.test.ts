import assert from "node:assert/strict";
import test from "node:test";

type AccessibilityEvidenceRow = {
  id: string;
  title: string;
  metadata?: {
    accessibility?: Record<string, string>;
  };
};

type AccessibilityEvidenceModule = {
  filterRowsByAccessibilityEvidence?: (
    rows: AccessibilityEvidenceRow[],
    needs: string[]
  ) => AccessibilityEvidenceRow[];
  evaluateAccessibilityNeeds?: (
    row: AccessibilityEvidenceRow,
    needs: string[]
  ) => Array<{ need: string; label: string; status: string; evidence: string | null }>;
};

async function loadAccessibilityEvidenceModule() {
  let loadedModule: AccessibilityEvidenceModule | null = null;
  let importError: unknown = null;

  try {
    const modulePath = "./accessibilityEvidence.ts";
    loadedModule = (await import(modulePath)) as AccessibilityEvidenceModule;
  } catch (error) {
    importError = error;
    loadedModule = null;
  }

  if (!loadedModule) {
    assert.fail(
      `accessibilityEvidence.ts should be importable${
        importError instanceof Error ? `: ${importError.message}` : ""
      }`
    );
  }

  const filterRowsByAccessibilityEvidence = loadedModule.filterRowsByAccessibilityEvidence;
  assert.equal(
    typeof filterRowsByAccessibilityEvidence,
    "function",
    "accessibilityEvidence.ts should export filterRowsByAccessibilityEvidence"
  );

  return filterRowsByAccessibilityEvidence as NonNullable<
    AccessibilityEvidenceModule["filterRowsByAccessibilityEvidence"]
  >;
}

async function loadAccessibilityNeedEvaluator() {
  const loadedModule = (await import("./accessibilityEvidence.ts")) as AccessibilityEvidenceModule;
  assert.equal(typeof loadedModule.evaluateAccessibilityNeeds, "function");
  return loadedModule.evaluateAccessibilityNeeds as NonNullable<
    AccessibilityEvidenceModule["evaluateAccessibilityNeeds"]
  >;
}

test("휠체어 요청은 주차장과 화장실 근거만 있는 장소를 제외한다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const parkingAndToiletOnly = row("parking-toilet-only", {
    parking: "장애인 전용 주차구역 있음",
    restroom: "장애인 화장실 있음"
  });

  assert.deepEqual(filterRowsByAccessibilityEvidence([parkingAndToiletOnly], ["wheelchair"]), []);
});

test("휠체어 요청은 접근로와 출입구 근거가 있는 장소를 남긴다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const routeAndEntrance = row("route-and-entrance", {
    route: "주출입구까지 단차 없는 접근로 있음",
    exit: "주출입구 단차 없음"
  });

  assert.deepEqual(filterRowsByAccessibilityEvidence([routeAndEntrance], ["wheelchair"]), [
    routeAndEntrance
  ]);
});

test("계단 없이 접근 가능하다는 긍정 안내를 부정 근거로 오인하지 않는다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const stepFreeRoute = row("step-free-route", {
    route: "계단 없이 주출입구까지 휠체어 접근 가능"
  });

  assert.deepEqual(filterRowsByAccessibilityEvidence([stepFreeRoute], ["wheelchair"]), [
    stepFreeRoute
  ]);
});

test("홈의 계단 없는 이동 조건은 이동 동선 근거가 있는 장소를 남긴다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const routeAndEntrance = row("route-and-entrance", {
    route: "주출입구까지 단차 없는 접근로 있음"
  });
  const toiletOnly = row("toilet-only", {
    restroom: "장애인 화장실 있음"
  });

  assert.deepEqual(
    filterRowsByAccessibilityEvidence([routeAndEntrance, toiletOnly], ["step_free"]),
    [routeAndEntrance]
  );
});

test("장애인 화장실 조건은 화장실 근거가 있는 장소를 남긴다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const toiletOnly = row("toilet-only", {
    restroom: "장애인 화장실 있음"
  });
  const routeOnly = row("route-only", {
    route: "주출입구까지 단차 없는 접근로 있음"
  });

  assert.deepEqual(
    filterRowsByAccessibilityEvidence([toiletOnly, routeOnly], ["accessible_toilet"]),
    [toiletOnly]
  );
});

test("장애인 주차 조건은 주차 근거가 있는 장소를 남긴다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const parkingOnly = row("parking-only", {
    parking: "장애인 전용 주차구역 있음"
  });
  const toiletOnly = row("toilet-only", {
    restroom: "장애인 화장실 있음"
  });

  assert.deepEqual(
    filterRowsByAccessibilityEvidence([parkingOnly, toiletOnly], ["accessible_parking"]),
    [parkingOnly]
  );
});

test("일반 주차와 장애인 화장실 근거를 장애인 주차 근거로 합치지 않는다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const mixedFacilities = row("mixed-facilities", {
    parking: "일반 주차장 있음",
    restroom: "장애인 화장실 있음"
  });

  assert.deepEqual(
    filterRowsByAccessibilityEvidence([mixedFacilities], ["accessible_parking"]),
    []
  );
});

test("일반 화장실만 있는 장소는 장애인 화장실 조건에서 제외한다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const regularToilet = row("regular-toilet", {
    restroom: "일반 화장실 있음"
  });

  assert.deepEqual(filterRowsByAccessibilityEvidence([regularToilet], ["accessible_toilet"]), []);
});

test("장애인 전용 주차와 장애인 화장실이 명시된 장소만 각각 통과한다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const accessibleParking = row("accessible-parking", {
    parking: "장애인 전용 주차구역 있음"
  });
  const accessibleToilet = row("accessible-toilet", {
    restroom: "장애인 화장실 있음"
  });

  assert.deepEqual(
    filterRowsByAccessibilityEvidence(
      [accessibleParking, accessibleToilet],
      ["accessible_parking"]
    ),
    [accessibleParking]
  );
  assert.deepEqual(
    filterRowsByAccessibilityEvidence([accessibleParking, accessibleToilet], ["accessible_toilet"]),
    [accessibleToilet]
  );
});

test("대중교통 조건은 대중교통 근거가 있는 장소를 남긴다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const transitOnly = row("transit-only", {
    publictransport: "대전역 정류장에서 저상버스 이용 가능"
  });
  const parkingOnly = row("parking-only", {
    parking: "장애인 전용 주차구역 있음"
  });

  assert.deepEqual(
    filterRowsByAccessibilityEvidence([transitOnly, parkingOnly], ["public_transport"]),
    [transitOnly]
  );
});

test("유모차 요청은 유모차 근거만 있고 단차 없는 동선 근거가 없으면 제외한다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const strollerOnly = row("stroller-only", {
    stroller: "유모차 대여 가능"
  });

  assert.deepEqual(filterRowsByAccessibilityEvidence([strollerOnly], ["stroller"]), []);
});

test("유모차 요청은 유모차 근거와 단차 없는 동선 근거가 함께 있으면 남긴다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const strollerAndStepFree = row("stroller-and-step-free", {
    stroller: "유모차 대여 가능",
    elevator: "엘리베이터 있음"
  });

  assert.deepEqual(filterRowsByAccessibilityEvidence([strollerAndStepFree], ["stroller"]), [
    strollerAndStepFree
  ]);
});

test("세부 시설 요청은 이동경로 근거가 없어도 해당 시설 근거로 판단한다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const toiletOnly = row("toilet-only", {
    restroom: "장애인 화장실 있음"
  });
  const parkingOnly = row("parking-only", {
    parking: "장애인 전용 주차구역 있음"
  });
  const transitOnly = row("transit-only", {
    publictransport: "저상버스 정류장과 가까움"
  });

  assert.deepEqual(filterRowsByAccessibilityEvidence([toiletOnly], ["accessible_toilet"]), [
    toiletOnly
  ]);
  assert.deepEqual(filterRowsByAccessibilityEvidence([parkingOnly], ["accessible_parking"]), [
    parkingOnly
  ]);
  assert.deepEqual(filterRowsByAccessibilityEvidence([transitOnly], ["public_transport"]), [
    transitOnly
  ]);
  assert.deepEqual(filterRowsByAccessibilityEvidence([toiletOnly], ["step_free"]), []);
});

test("접근성 조건이 없으면 후보 목록을 그대로 유지한다", async () => {
  const filterRowsByAccessibilityEvidence = await loadAccessibilityEvidenceModule();
  const rows = [
    row("first", { parking: "장애인 전용 주차구역 있음" }),
    row("second", { stroller: "유모차 대여 가능" })
  ];

  assert.deepEqual(filterRowsByAccessibilityEvidence(rows, []), rows);
});

test("접근성 근거는 확인·제한·정보부족을 구분한다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("mixed-evidence", {
      route: "주출입구까지 단차 없는 접근로 있음",
      restroom: "장애인 화장실 없음",
      parking: ""
    }),
    ["wheelchair", "accessible_toilet", "public_transport", "easy_explanation"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [
      { need: "wheelchair", status: "confirmed" },
      { need: "accessible_toilet", status: "restricted" },
      { need: "public_transport", status: "unknown" }
    ]
  );
  assert.match(result[0].evidence ?? "", /단차 없는 접근로/u);
});

test("점자블록의 계단 안내를 보행 제한 근거로 오인하지 않는다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("forest-center", {
      exit: "주출입구는 턱이 없어 휠체어 접근 가능함(수동문)",
      braileblock: "건물입구, 계단, 엘리베이터 등 점자블록 있음"
    }),
    ["wheelchair"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [{ need: "wheelchair", status: "confirmed" }]
  );
  assert.match(result[0].evidence ?? "", /^출구정보: /u);
});

test("휠체어 대여 정보만으로는 이동 동선 확인으로 표시하지 않는다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("wheelchair-rental-only", {
      wheelchair: "휠체어 대여 가능"
    }),
    ["wheelchair"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [{ need: "wheelchair", status: "unknown" }]
  );
});

test("같은 조건에 제한 문구가 있으면 긍정보다 제한을 우선한다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("conflicting-toilet", {
      restroom: "장애인 화장실 없음",
      restroom_detail: "장애인 화장실 있음"
    }),
    ["accessible_toilet"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [{ need: "accessible_toilet", status: "restricted" }]
  );
});

test("문의와 확인 필요 문구는 제한이 아니라 미확인 근거로 표시한다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("check-needed", {
      restroom: "장애인 화장실 이용 가능 여부는 현장 문의 필요",
      exit: "주출입구 접근성 확인 필요"
    }),
    ["accessible_toilet", "wheelchair"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [
      { need: "accessible_toilet", status: "unknown" },
      { need: "wheelchair", status: "unknown" }
    ]
  );
  assert.match(result[0].evidence ?? "", /문의 필요/u);
  assert.match(result[1].evidence ?? "", /확인 필요/u);
});

test("출입구 단차 없음은 보행 이동 가능 근거로 확인한다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("step-free-exit", {
      exit: "주출입구 단차 없음",
      restroom: "장애인 화장실 있음"
    }),
    ["wheelchair", "accessible_toilet"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [
      { need: "wheelchair", status: "confirmed" },
      { need: "accessible_toilet", status: "confirmed" }
    ]
  );
});

test("흔한 보행 긍정 표기를 값 기준으로 확인한다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const rows = [
    row("ramp", { exit: "주출입구 경사로 있음" }),
    row("wheelchair-accessible", { exit: "휠체어 접근이 가능" }),
    row("no-threshold", { exit: "주출입구 턱이 없음" })
  ];

  for (const item of rows) {
    const result = evaluateAccessibilityNeeds(item, ["wheelchair"]);
    assert.deepEqual(
      result.map(({ need, status }) => ({ need, status })),
      [{ need: "wheelchair", status: "confirmed" }]
    );
  }
});

test("엘리베이터 필드명만으로 보행 확인 처리하지 않는다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("elevator-field-only", {
      elevator: "운영시간 현장 확인"
    }),
    ["wheelchair"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [{ need: "wheelchair", status: "unknown" }]
  );
});

test("점자블록 입구 문구와 대중교통 문구를 보행 가능 근거로 보지 않는다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("field-scoped-mobility", {
      route: "시내버스 이용 가능",
      braileblock: "입구 점자블록 있음"
    }),
    ["wheelchair", "step_free"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [
      { need: "wheelchair", status: "unknown" },
      { need: "step_free", status: "unknown" }
    ]
  );
});

test("수어 안내의 guide 문자열을 시각장애 편의 근거로 보지 않는다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("sign-only", {
      signguide: "수어 안내 있음"
    }),
    ["visual_impairment", "hearing_impairment"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [
      { need: "visual_impairment", status: "unknown" },
      { need: "hearing_impairment", status: "confirmed" }
    ]
  );
});

test("출입구 접근 가능만으로 짧은 동선 조건을 확인 처리하지 않는다", async () => {
  const evaluateAccessibilityNeeds = await loadAccessibilityNeedEvaluator();
  const result = evaluateAccessibilityNeeds(
    row("accessible-exit", {
      exit: "주출입구는 턱이 없어 휠체어 접근 가능함"
    }),
    ["wheelchair", "short_distance"]
  );

  assert.deepEqual(
    result.map(({ need, status }) => ({ need, status })),
    [
      { need: "wheelchair", status: "confirmed" },
      { need: "short_distance", status: "unknown" }
    ]
  );
});

function row(id: string, accessibility: Record<string, string>): AccessibilityEvidenceRow {
  return {
    id,
    title: id,
    metadata: {
      accessibility
    }
  };
}

test("정보 없음은 미확인이고 실제 이용 불가 문구가 함께 있으면 제한이다", async () => {
  const { evaluateAccessibilityNeeds } = await import("./accessibilityEvidence.ts");
  assert.equal(
    evaluateAccessibilityNeeds(row("missing", { restroom: "정보 없음" }), ["accessible_toilet"])[0]
      .status,
    "unknown"
  );
  assert.equal(
    evaluateAccessibilityNeeds(
      row("restricted", { restroom: "상세 정보 없음. 장애인 화장실 이용 불가" }),
      ["accessible_toilet"]
    )[0].status,
    "restricted"
  );
});
