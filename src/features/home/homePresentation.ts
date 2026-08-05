export type HomeRefinementLoadState = "loading" | "ready" | "empty" | "error";

export function shouldShowHomePlaceImage(source: string | null, failedSource: string | null) {
  return Boolean(source && source !== failedSource);
}

export function getHomeRefinementStatusLabel(query: string, loadState: HomeRefinementLoadState) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  const suffix: Record<HomeRefinementLoadState, string> = {
    loading: "추천 필터 적용 중",
    ready: "추천 필터에 맞춰 정렬",
    empty: "추천 필터에 맞는 결과 없음",
    error: "추천 필터 적용 실패"
  };
  return `“${normalizedQuery}” ${suffix[loadState]}`;
}
