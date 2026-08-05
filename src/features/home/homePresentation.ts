export type HomeSearchLoadState = "loading" | "ready" | "empty" | "error";

export function shouldShowHomePlaceImage(source: string | null, failedSource: string | null) {
  return Boolean(source && source !== failedSource);
}

export function getHomeSearchStatusLabel(query: string, loadState: HomeSearchLoadState) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  const suffix: Record<HomeSearchLoadState, string> = {
    loading: "검색 중",
    ready: "검색 결과",
    empty: "검색 결과 없음",
    error: "검색 실패"
  };
  return `“${normalizedQuery}” ${suffix[loadState]}`;
}
