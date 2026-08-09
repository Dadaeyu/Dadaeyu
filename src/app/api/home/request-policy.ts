const HOME_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_EXCLUDED_PLACE_IDS = 48;
const MAX_EXCLUDED_QUERY_CHARS = MAX_EXCLUDED_PLACE_IDS * 81;

export function parseHomeRecommendationSeed(value: string | null) {
  if (!value || !/^\d{1,10}$/.test(value)) return undefined;
  const seed = Number(value);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) return undefined;
  return seed;
}

export function parseHomeExcludedPlaceIds(values: readonly string[]) {
  const placeIds: string[] = [];
  const seenPlaceIds = new Set<string>();
  let remainingCharacters = MAX_EXCLUDED_QUERY_CHARS;

  for (const rawValue of values) {
    if (placeIds.length >= MAX_EXCLUDED_PLACE_IDS || remainingCharacters <= 0) break;
    const boundedValue = rawValue.slice(0, remainingCharacters);
    remainingCharacters -= boundedValue.length;

    for (const value of boundedValue.split(",")) {
      const placeId = value.trim();
      if (!HOME_PLACE_ID_PATTERN.test(placeId) || seenPlaceIds.has(placeId)) continue;
      seenPlaceIds.add(placeId);
      placeIds.push(placeId);
      if (placeIds.length >= MAX_EXCLUDED_PLACE_IDS) return placeIds;
    }
  }

  return placeIds;
}
