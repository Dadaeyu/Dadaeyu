// DB 장소(tb_place.lclssystm1) 대분류별 지도 마커 색.
// tb_code(code_group='LCLSSYSTM1')의 9개 실제 카테고리에 맞춰 배정했고,
// 카카오 검색 마커(파란 배경)와 헷갈리지 않는 색으로 골랐다.
// 추천코스(C01)는 tb_place 카테고리로 쓰이지 않아(테마 필터에서도 제외됨) 매핑하지 않는다.
// BK("빵지순례")는 실제 LCLSSYSTM1 코드가 아니라 getBakeryPlaceIds() 로 판정한 자체 테마지만,
// 지도 마커에서는 이 9개와 동일한 취급으로 10번째 카테고리 색을 부여한다(검색 경로와 무관하게 적용).
export const LCLSSYSTM1_COLORS: Record<string, string> = {
  AC: "#2a78d6", // 숙박
  EV: "#4a3aa7", // 축제/공연/행사
  EX: "#0891b2", // 체험관광
  FD: "#eb6834", // 음식
  HS: "#92400e", // 역사관광
  LS: "#e34948", // 레저스포츠
  NA: "#008300", // 자연관광
  SH: "#e87ba4", // 쇼핑
  VE: "#1baf7a", // 문화관광
  BK: "#9d174d" // 빵지순례
};

// 위 목록에 없는 카테고리(또는 미분류)용 중립 회색.
export const DEFAULT_CATEGORY_COLOR = "#64748b";

// LCLSSYSTM1_COLORS 와 같은 순서 — tb_code(code_group='LCLSSYSTM1') code_nm 과 동일한 표시 텍스트.
// 범례처럼 매번 DB를 조회하기 부담스러운 곳에서 쓰는 정적 사본이라, tb_code 쪽 라벨이 바뀌면 같이 맞춰야 한다.
export const LCLSSYSTM1_LABELS: Record<string, string> = {
  AC: "숙박",
  EV: "축제/공연/행사",
  EX: "체험관광",
  FD: "음식",
  HS: "역사관광",
  LS: "레저스포츠",
  NA: "자연관광",
  SH: "쇼핑",
  VE: "문화관광",
  BK: "빵지순례"
};

export function getCategoryColor(categoryCode?: string | null): string {
  if (!categoryCode) return DEFAULT_CATEGORY_COLOR;
  return LCLSSYSTM1_COLORS[categoryCode] ?? DEFAULT_CATEGORY_COLOR;
}
