// DB 장소(tb_place.lclssystm1) 대분류별 지도 마커 색.
// tb_code(code_group='LCLSSYSTM1')의 9개 실제 카테고리에 맞춰 배정했고,
// 카카오 검색 마커(#FEE500 노랑)와 헷갈리지 않도록 노란 계열은 쓰지 않는다.
// 추천코스(C01)는 tb_place 카테고리로 쓰이지 않아(테마 필터에서도 제외됨) 매핑하지 않는다.
export const LCLSSYSTM1_COLORS: Record<string, string> = {
  AC: "#2a78d6", // 숙박
  EV: "#4a3aa7", // 축제/공연/행사
  EX: "#0891b2", // 체험관광
  FD: "#eb6834", // 음식
  HS: "#92400e", // 역사관광
  LS: "#e34948", // 레저스포츠
  NA: "#008300", // 자연관광
  SH: "#e87ba4", // 쇼핑
  VE: "#1baf7a" // 문화관광
};

// 위 목록에 없는 카테고리(또는 미분류)용 중립 회색.
export const DEFAULT_CATEGORY_COLOR = "#64748b";

export function getCategoryColor(categoryCode?: string | null): string {
  if (!categoryCode) return DEFAULT_CATEGORY_COLOR;
  return LCLSSYSTM1_COLORS[categoryCode] ?? DEFAULT_CATEGORY_COLOR;
}
