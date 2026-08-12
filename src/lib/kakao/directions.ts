/** 지도·코스 공용 길찾기 타입·딥링크·클라이언트 fetch */

export type RouteMode = "walk" | "car";

export type RoutePoint = {
  lat: number;
  lng: number;
  name?: string;
};

/** 카카오 traffic_state: 0 정보없음, 1 정체, 2 지체, 3 서행, 4 원활, 6 사고 */
export type TrafficState = 0 | 1 | 2 | 3 | 4 | 6;

export type TrafficPathChunk = {
  points: RoutePoint[];
  trafficState: TrafficState;
};

export type RouteOption = {
  id: string;
  label: string;
  distanceM: number;
  durationSec: number;
  tollFare: number;
  points: RoutePoint[];
  /** 자동차 API — 도로별 실시간 교통 상태 */
  trafficChunks?: TrafficPathChunk[];
  fallback?: boolean;
};

export type DirectionsResult = {
  /** car 모드 + API 성공 시 2개 이상일 수 있음 */
  routes?: RouteOption[];
  distanceM: number;
  durationSec: number;
  points: RoutePoint[];
  tollFare?: number;
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

export function formatRouteTollFare(won: number): string {
  if (!Number.isFinite(won) || won <= 0) return "";
  return `통행료 ${won.toLocaleString("ko-KR")}원`;
}

/** 네이버 지도 유사 교통 혼잡도 색상 (0 정보없음 → 원활과 동일) */
export function trafficStateToColor(state: number): string {
  switch (state) {
    case 1:
      return "#ef4444";
    case 2:
      return "#f97316";
    case 3:
      return "#f59e0b";
    case 4:
    case 0:
      return "#22c55e";
    case 6:
      return "#991b1b";
    default:
      return "#22c55e";
  }
}

export function normalizeTrafficState(value: unknown): TrafficState {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 6) return value;
  return 0;
}

/** 경로 옵션 → 지도 path segment (자동차만 trafficChunks 포함) */
export function buildRoutePathFromOption(
  opt: RouteOption,
  mode: RouteMode,
  color: string
): {
  points: RoutePoint[];
  color: string;
  dashed: boolean;
  trafficChunks?: TrafficPathChunk[];
} {
  const trafficChunks =
    mode === "car" && !opt.fallback && opt.trafficChunks && opt.trafficChunks.length > 0
      ? opt.trafficChunks
      : undefined;
  return {
    points: opt.points,
    color,
    dashed: Boolean(opt.fallback),
    trafficChunks
  };
}

/** routes[] 또는 단일 필드에서 선택된 경로 반환 */
export function pickRouteOption(result: DirectionsResult, routeId?: string | null): RouteOption {
  const routes = result.routes;
  if (routes?.length) {
    const found = routeId ? routes.find((r) => r.id === routeId) : undefined;
    return found ?? routes[0];
  }
  return {
    id: "0",
    label: "추천",
    distanceM: result.distanceM,
    durationSec: result.durationSec,
    tollFare: result.tollFare ?? 0,
    points: result.points,
    fallback: result.fallback
  };
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
  const option: RouteOption = {
    id: "0",
    label: "직선",
    distanceM,
    durationSec,
    tollFare: 0,
    points: pts,
    fallback: true
  };
  return {
    routes: [option],
    distanceM,
    durationSec,
    points: pts,
    tollFare: 0,
    fallback: true
  };
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
  // setTimeout 안의 window.open은 iOS 등에서 팝업 차단되어 무반응처럼 보임 → location.assign 사용
  // 앱이 실제로 열리면 페이지가 hidden이 되므로, 그때는 웹으로 덮어쓰지 않음
  if (app && typeof window !== "undefined") {
    const ua = window.navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (isMobile) {
      window.location.href = app;
      window.setTimeout(() => {
        if (document.visibilityState === "visible" && !document.hidden && web) {
          window.location.assign(web);
        }
      }, 1200);
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
  if (!json.points?.length && !json.routes?.length) {
    throw new Error("경로 좌표가 없습니다.");
  }
  const routes = json.routes;
  const primary = pickRouteOption(json);
  return {
    routes,
    distanceM: primary.distanceM,
    durationSec: primary.durationSec,
    points: primary.points,
    tollFare: primary.tollFare,
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
