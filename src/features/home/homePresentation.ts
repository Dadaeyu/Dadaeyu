export type HomeRefinementLoadState = "loading" | "ready" | "empty" | "error";

export function shouldShowHomePlaceImage(source: string | null, failedSource: string | null) {
  return Boolean(source && source !== failedSource);
}

export function getHomeRefinementStatusLabel(query: string, loadState: HomeRefinementLoadState) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  const suffix: Record<HomeRefinementLoadState, string> = {
    loading: "조건을 반영하고 있어요",
    ready: "조건을 반영했어요",
    empty: "조건에 맞는 장소가 없어요",
    error: "조건을 반영하지 못했어요"
  };
  return `“${normalizedQuery}” ${suffix[loadState]}`;
}
