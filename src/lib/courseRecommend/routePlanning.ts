// AI 추천 코스의 "장소 방문 순서/날짜별 배정"은 LLM이 아니라 여기서 결정론적으로 계산한다.
// LLM은 어떤 장소들을 묶을지(컨셉)만 고르고, 동선 최적화·일자 분배·시간 배정은 좌표 기반으로 처리한다.

export interface RoutePoint {
  lat: number;
  lng: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: RoutePoint, b: RoutePoint): number {
  const earthRadiusM = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 탐욕적 최근접 이웃 방식으로 방문 순서를 정한다(목록의 첫 장소를 시작점으로 고정). */
export function orderByNearestNeighbor<T extends RoutePoint>(points: T[]): T[] {
  if (points.length <= 2) return [...points];

  const remaining = [...points];
  const ordered: T[] = [remaining.shift() as T];

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    let nearestIndex = 0;
    let nearestDist = Infinity;
    remaining.forEach((point, index) => {
      const dist = haversineMeters(current, point);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = index;
      }
    });
    ordered.push(remaining.splice(nearestIndex, 1)[0]);
  }

  return ordered;
}

/** 강제된 일수가 있으면 그대로 쓰고, 없으면 하루 최대 4곳 기준으로 자동 산정한다(최소 1일). */
export function resolveDayCount(placeCount: number, forcedDayCount?: number | null): number {
  if (forcedDayCount && forcedDayCount > 0) return forcedDayCount;
  return Math.max(1, Math.ceil(placeCount / 4));
}

/** 동선 순서(orderByNearestNeighbor 결과)를 dayCount개의 연속 구간으로 최대한 균등 분할한다. */
export function splitIntoDays<T>(ordered: T[], dayCount: number): T[][] {
  const days: T[][] = [];
  const base = Math.floor(ordered.length / dayCount);
  let extra = ordered.length % dayCount;
  let cursor = 0;

  for (let day = 0; day < dayCount; day++) {
    const size = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    days.push(ordered.slice(cursor, cursor + size));
    cursor += size;
  }

  return days;
}
