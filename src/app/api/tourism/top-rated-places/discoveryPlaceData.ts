interface PlaceReviewSignalRow {
  content_id: string | number | null;
  rating: number | null;
}

interface PlaceFavoriteSignalRow {
  place_id: string | number | null;
}

interface PlaceReviewRanking {
  contentId: string;
  average: number;
  count: number;
}

export function groupPlaceReviewSignals(rows: readonly PlaceReviewSignalRow[]) {
  const grouped = new Map<string, { sum: number; count: number }>();

  for (const row of rows) {
    if (row.content_id == null || row.rating == null) continue;
    const contentId = String(row.content_id);
    const current = grouped.get(contentId) ?? { sum: 0, count: 0 };
    current.sum += Number(row.rating);
    current.count += 1;
    grouped.set(contentId, current);
  }

  return grouped;
}

export function buildPlaceReviewRankings(
  rows: readonly PlaceReviewSignalRow[],
  homeLimit = 4,
  legacyLimit = 5
): {
  grouped: Map<string, { sum: number; count: number }>;
  home: PlaceReviewRanking[];
  legacy: PlaceReviewRanking[];
} {
  const grouped = groupPlaceReviewSignals(rows);
  const ranked = Array.from(grouped.entries())
    .map(([contentId, { sum, count }]) => ({ contentId, average: sum / count, count }))
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, Math.max(homeLimit, legacyLimit));

  return {
    grouped,
    home: ranked.slice(0, homeLimit),
    legacy: ranked.slice(0, legacyLimit)
  };
}

export function groupPlaceFavoriteSignals(rows: readonly PlaceFavoriteSignalRow[]) {
  const grouped = new Map<string, number>();

  for (const row of rows) {
    if (row.place_id == null) continue;
    const contentId = String(row.place_id);
    grouped.set(contentId, (grouped.get(contentId) ?? 0) + 1);
  }

  return grouped;
}
