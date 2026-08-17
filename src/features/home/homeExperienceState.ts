export function buildHomeRequestKey(
  ownerId: string | null,
  requestUrl: string | null,
  retryKey: number
) {
  if (!requestUrl) return null;
  return JSON.stringify([ownerId, requestUrl, retryKey]);
}

export function getOwnerScopedHomeResponse<T extends { ownerId: string | null }>(
  responseState: T | null,
  ownerId: string | null
): T | null {
  return responseState?.ownerId === ownerId ? responseState : null;
}

export function getCriteriaScopedHomeResponse<
  T extends { ownerId: string | null; criteriaKey: string }
>(responseState: T | null, ownerId: string | null, criteriaKey: string | null): T | null {
  if (!criteriaKey) return null;
  const ownerResponseState = getOwnerScopedHomeResponse(responseState, ownerId);
  return ownerResponseState?.criteriaKey === criteriaKey ? ownerResponseState : null;
}

const HOME_RECOMMENDATION_SEED_RANGE = 0x1_0000_0000;
const HOME_RECENT_PLACE_LIMIT = 48;
const HOME_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export function createHomeRecommendationSeed(randomValue = Math.random()) {
  const normalizedRandomValue =
    Number.isFinite(randomValue) && randomValue >= 0 && randomValue < 1 ? randomValue : 0;
  return Math.floor(normalizedRandomValue * HOME_RECOMMENDATION_SEED_RANGE);
}

export function mergeRecentHomePlaceIds(
  currentPlaceIds: readonly string[],
  nextPlaceIds: readonly string[],
  limit = HOME_RECENT_PLACE_LIMIT
) {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  const mergedPlaceIds = [...nextPlaceIds, ...currentPlaceIds]
    .map((placeId) => placeId.trim())
    .filter((placeId) => HOME_PLACE_ID_PATTERN.test(placeId));
  return [...new Set(mergedPlaceIds)].slice(0, safeLimit);
}

export function parseRecentHomePlaceIds(value: string | null) {
  if (!value) return [];
  try {
    const parsedValue: unknown = JSON.parse(value);
    if (!Array.isArray(parsedValue)) return [];
    return mergeRecentHomePlaceIds(
      [],
      parsedValue.filter((placeId): placeId is string => typeof placeId === "string")
    );
  } catch {
    return [];
  }
}
