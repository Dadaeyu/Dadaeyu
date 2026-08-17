// tb_place_barrierfree 의 무장애 원본 항목(24개, PK place_id/contentid·타임스탬프 제외)과
// 요약 플래그(has_blind/has_deaf/has_gait/has_infant) 계산 로직 — 정부 API 동기화
// (src/lib/place/syncEngine.ts), 장소 상세 표시(/api/tourism/detail), 관리자 등록 폼
// (/api/admin/places) 세 곳이 전부 이 파일을 공용으로 쓴다(항목이 어긋나면 관리자가 입력한
// 내용이 상세 페이지에 안 보이거나 접근성 필터에서 빠지는 문제가 생기므로 단일 출처로 둔다).
//
// route/publictransport 라벨이 뒤바뀐 것처럼 보이는 건 TourAPI 응답 자체가 그렇게 오기 때문.
// ticket_office(매표소)는 이 목록에 없어 동기화되지 않으므로 제외한다.
export const ACCESSIBILITY_GROUPS = [
  {
    category: "보행",
    flag: "has_gait",
    fields: [
      { key: "parking", label: "주차" },
      { key: "route", label: "대중교통" },
      { key: "publictransport", label: "접근로" },
      { key: "wheelchair", label: "휠체어" },
      { key: "exit", label: "출구정보" },
      { key: "elevator", label: "엘리베이터" },
      { key: "restroom", label: "화장실" },
      { key: "handicapetc", label: "기타" }
    ]
  },
  {
    category: "시각",
    flag: "has_blind",
    fields: [
      { key: "braileblock", label: "점자블록" },
      { key: "helpdog", label: "안내견" },
      { key: "guidehuman", label: "안내인력" },
      { key: "audioguide", label: "오디오가이드" },
      { key: "bigprint", label: "큰활자" },
      { key: "brailepromotion", label: "점자안내물" },
      { key: "guidesystem", label: "유도안내시스템" },
      { key: "blindhandicapetc", label: "기타" }
    ]
  },
  {
    category: "청각",
    flag: "has_deaf",
    fields: [
      { key: "signguide", label: "수어안내" },
      { key: "videoguide", label: "동영상자막" },
      { key: "hearingroom", label: "청각장애객실" },
      { key: "hearinghandicapetc", label: "기타" }
    ]
  },
  {
    category: "영유아",
    flag: "has_infant",
    fields: [
      { key: "stroller", label: "유모차" },
      { key: "lactationroom", label: "수유실" },
      { key: "babysparechair", label: "아기의자" },
      { key: "infantsfamilyetc", label: "기타" }
    ]
  }
] as const;

export const BF_FIELDS = ACCESSIBILITY_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

// 무장애 요약 플래그: 같은 카테고리 원본 컬럼 중 하나라도 값이 있으면 true.
// (has_gait 는 원본 API 특성상 "publictransport"를 요약 판정에서 제외한다 — 정부 API 동기화와 동일)
const BF_FLAG_SOURCES: Record<string, readonly string[]> = {
  has_blind: ACCESSIBILITY_GROUPS.find((g) => g.flag === "has_blind")!.fields.map((f) => f.key),
  has_deaf: ACCESSIBILITY_GROUPS.find((g) => g.flag === "has_deaf")!.fields.map((f) => f.key),
  has_gait: ACCESSIBILITY_GROUPS.find((g) => g.flag === "has_gait")!
    .fields.map((f) => f.key)
    .filter((k) => k !== "publictransport"),
  has_infant: ACCESSIBILITY_GROUPS.find((g) => g.flag === "has_infant")!.fields.map((f) => f.key)
};

// row 의 BF_FIELDS 값(문자열)들을 보고 요약 플래그를 계산한다. 값이 하나라도 비어있지 않으면 true.
export function computeBfFlags(row: Record<string, unknown>): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const [flag, sources] of Object.entries(BF_FLAG_SOURCES)) {
    flags[flag] = sources.some((field) => {
      const value = row[field];
      return typeof value === "string" ? value.trim() !== "" : value != null;
    });
  }
  return flags;
}
