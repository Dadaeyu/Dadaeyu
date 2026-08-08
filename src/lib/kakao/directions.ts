/** 지도·코스 공용 길찾기 타입·딥링크·클라이언트 fetch */

export type RouteMode = "walk" | "car";

export type RoutePoint = {
  lat: number;
  lng: number;
  name?: string;
};

export type DirectionsResult = {
  distanceM: number;
  durationSec: number;
  points: RoutePoint[];
  /** 카카오 API 대신 직선 추정인 경우 */
  fallback?: boolean;
};

export function isRouteMode(value: string | null | undefined): value is RouteMode {
  return value === "walk" || value === "car";
}

export function formatRouteDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)}km`;
}

export function formatRouteDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${Math.max(1, mins)}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

export function haversineMeters(a: RoutePoint, b: RoutePoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 좌표 있는 장소만, Day/목록 순서 유지 */
export function filterRoutablePoints(points: RoutePoint[]): RoutePoint[] {
  return points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0)
  );
}

export function buildStraightRoute(
  points: RoutePoint[],
  mode: RouteMode = "walk"
): DirectionsResult | null {
  const pts = filterRoutablePoints(points);
  if (pts.length < 2) return null;
  let distanceM = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    distanceM += haversineMeters(pts[i], pts[i + 1]);
  }
  const speedKmh = mode === "walk" ? 4 : 30;
  const durationSec = Math.round((distanceM / 1000 / speedKmh) * 3600);
  return { distanceM, durationSec, points: pts };
}

/** 카카오맵 앱 URL (sp/ep = lat,lng) */
export function buildKakaoMapRouteAppUrl(points: RoutePoint[], mode: RouteMode): string | null {
  const pts = filterRoutablePoints(points);
  if (pts.length < 2) return null;
  const by = mode === "walk" ? "foot" : "car";
  const origin = pts[0];
  const dest = pts[pts.length - 1];
  const mids = pts.slice(1, -1).slice(0, 5);
  const params = new URLSearchParams();
  params.set("sp", `${origin.lat},${origin.lng}`);
  params.set("ep", `${dest.lat},${dest.lng}`);
  params.set("by", by);
  mids.forEach((p, i) => {
    params.set(i === 0 ? "vp" : `vp${i + 1}`, `${p.lat},${p.lng}`);
  });
  return `kakaomap://route?${params.toString()}`;
}

/** 웹 폴백 — by/walk|car/이름,lat,lng/... */
export function buildKakaoMapRouteWebUrl(points: RoutePoint[], mode: RouteMode): string | null {
  const pts = filterRoutablePoints(points);
  if (pts.length < 2) return null;
  const by = mode === "walk" ? "walk" : "car";
  // 웹 링크는 경유 지원이 약해 출발·도착만 (중간은 앱 스킴 권장)
  const origin = pts[0];
  const dest = pts[pts.length - 1];
  const oName = encodeURIComponent(origin.name?.trim() || "출발");
  const dName = encodeURIComponent(dest.name?.trim() || "도착");
  return `https://map.kakao.com/link/by/${by}/${oName},${origin.lat},${origin.lng}/${dName},${dest.lat},${dest.lng}`;
}

export function openKakaoMapRoute(points: RoutePoint[], mode: RouteMode): boolean {
  const app = buildKakaoMapRouteAppUrl(points, mode);
  const web = buildKakaoMapRouteWebUrl(points, mode);
  if (!app && !web) return false;
  // 모바일: 앱 스킴 시도 후 웹 폴백
  if (app && typeof window !== "undefined") {
    const ua = window.navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (isMobile) {
      const started = Date.now();
      window.location.href = app;
      window.setTimeout(() => {
        if (Date.now() - started < 1800 && web) {
          window.open(web, "_blank", "noopener,noreferrer");
        }
      }, 900);
      return true;
    }
  }
  if (web) {
    window.open(web, "_blank", "noopener,noreferrer");
    return true;
  }
  return false;
}

export async function fetchDirections(input: {
  origin: RoutePoint;
  destination: RoutePoint;
  waypoints?: RoutePoint[];
  mode: RouteMode;
}): Promise<DirectionsResult> {
  const params = new URLSearchParams({
    mode: input.mode,
    originLat: String(input.origin.lat),
    originLng: String(input.origin.lng),
    destLat: String(input.destination.lat),
    destLng: String(input.destination.lng)
  });
  if (input.origin.name) params.set("originName", input.origin.name);
  if (input.destination.name) params.set("destName", input.destination.name);
  if (input.waypoints?.length) {
    params.set("waypoints", input.waypoints.map((p) => `${p.lng},${p.lat}`).join("|"));
  }

  const res = await fetch(`/api/directions?${params}`);
  const json = (await res.json().catch(() => ({}))) as DirectionsResult & {
    error?: string;
    fallback?: boolean;
  };
  if (!res.ok) {
    throw new Error(json.error ?? "경로를 불러오지 못했습니다.");
  }
  if (!json.points?.length) {
    throw new Error("경로 좌표가 없습니다.");
  }
  return {
    distanceM: json.distanceM,
    durationSec: json.durationSec,
    points: json.points,
    fallback: Boolean(json.fallback)
  };
}

/** 여러 장소를 순서대로 잇는 경로 (2점 미만이면 null) */
export async function fetchDirectionsForStops(
  stops: RoutePoint[],
  mode: RouteMode
): Promise<DirectionsResult> {
  const pts = filterRoutablePoints(stops);
  if (pts.length < 2) {
    throw new Error("안내하려면 좌표가 있는 장소가 2곳 이상 필요합니다.");
  }
  const origin = pts[0];
  const destination = pts[pts.length - 1];
  const waypoints = pts.slice(1, -1);
  try {
    return await fetchDirections({ origin, destination, waypoints, mode });
  } catch {
    const fallback = buildStraightRoute(pts, mode);
    if (!fallback) throw new Error("경로를 만들 수 없습니다.");
    return { ...fallback, fallback: true };
  }
}
