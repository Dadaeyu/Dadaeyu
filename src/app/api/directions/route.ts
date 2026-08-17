import { NextResponse } from "next/server";
import {
  buildStraightRoute,
  isRouteMode,
  type DirectionsResult,
  type RouteMode,
  type RouteOption,
  type RoutePoint,
  type TrafficPathChunk,
  normalizeTrafficState
} from "@/lib/kakao/directions";

export const runtime = "nodejs";

type KakaoRoad = {
  vertexes?: number[];
  distance?: number;
  duration?: number;
  traffic_state?: number;
  traffic_speed?: number;
};

type KakaoSection = {
  distance?: number;
  duration?: number;
  roads?: KakaoRoad[];
};

type KakaoRoute = {
  result_code?: number;
  summary?: {
    distance?: number;
    duration?: number;
    priority?: string;
    fare?: { toll?: number; taxi?: number };
  };
  sections?: KakaoSection[];
};

function parseNumber(value: string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function vertexesToPoints(vertexes: number[]): RoutePoint[] {
  const points: RoutePoint[] = [];
  for (let i = 0; i + 1 < vertexes.length; i += 2) {
    const lng = vertexes[i];
    const lat = vertexes[i + 1];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const prev = points[points.length - 1];
    if (prev && prev.lat === lat && prev.lng === lng) continue;
    points.push({ lat, lng });
  }
  return points;
}

function routePriorityLabel(priority: string | undefined, index: number): string {
  switch (priority) {
    case "RECOMMEND":
      return "추천";
    case "TIME":
      return "최단시간";
    case "DISTANCE":
      return "최단거리";
    default:
      return index === 0 ? "추천" : `대안 ${index}`;
  }
}

function normalizeSingleKakaoRoute(route: KakaoRoute, label: string): RouteOption | null {
  if (route.result_code != null && route.result_code !== 0) return null;

  const points: RoutePoint[] = [];
  const trafficChunks: TrafficPathChunk[] = [];
  let distanceM = route.summary?.distance ?? 0;
  let durationSec = route.summary?.duration ?? 0;

  for (const section of route.sections ?? []) {
    if (!route.summary) {
      distanceM += section.distance ?? 0;
      durationSec += section.duration ?? 0;
    }
    for (const road of section.roads ?? []) {
      if (!road.vertexes?.length) continue;
      const roadPoints = vertexesToPoints(road.vertexes);
      if (roadPoints.length < 2) continue;
      points.push(...roadPoints);
      trafficChunks.push({
        points: roadPoints,
        trafficState: normalizeTrafficState(road.traffic_state)
      });
    }
  }

  if (points.length < 2) return null;

  const tollRaw = route.summary?.fare?.toll;
  const tollFare = Number.isFinite(tollRaw) ? Math.max(0, tollRaw as number) : 0;

  return {
    id: "0",
    label,
    distanceM,
    durationSec,
    tollFare,
    points,
    trafficChunks: trafficChunks.length > 0 ? trafficChunks : undefined
  };
}

/** 거리·시간이 거의 같으면 동일 경로로 간주 */
function isDuplicateRoute(existing: RouteOption[], candidate: RouteOption): boolean {
  return existing.some((e) => {
    const distRatio =
      Math.abs(e.distanceM - candidate.distanceM) / Math.max(e.distanceM, candidate.distanceM, 1);
    const durRatio =
      Math.abs(e.durationSec - candidate.durationSec) /
      Math.max(e.durationSec, candidate.durationSec, 1);
    return distRatio < 0.03 && durRatio < 0.06;
  });
}

function appendRouteOption(options: RouteOption[], candidate: RouteOption | null): void {
  if (!candidate || isDuplicateRoute(options, candidate)) return;
  options.push({ ...candidate, id: String(options.length) });
}

/** alternatives(추천·대안) + avoid=toll(무료 우선) 경로 병합 */
function mergeCarRouteOptions(altRoutes: KakaoRoute[], freeRoutes: KakaoRoute[]): RouteOption[] {
  const options: RouteOption[] = [];

  altRoutes.forEach((route, index) => {
    appendRouteOption(
      options,
      normalizeSingleKakaoRoute(route, routePriorityLabel(route.summary?.priority, index))
    );
  });

  const freeRoute = freeRoutes[0];
  if (freeRoute) {
    appendRouteOption(options, normalizeSingleKakaoRoute(freeRoute, "무료"));
  }

  return options.map((opt, index) => ({ ...opt, id: String(index) }));
}

function toDirectionsResult(options: RouteOption[]): DirectionsResult | null {
  if (options.length === 0) return null;
  const primary = options[0];
  return {
    routes: options,
    distanceM: primary.distanceM,
    durationSec: primary.durationSec,
    points: primary.points,
    tollFare: primary.tollFare
  };
}

function normalizeKakaoRoutes(routes: KakaoRoute[]): DirectionsResult | null {
  const options: RouteOption[] = [];
  routes.forEach((route, index) => {
    appendRouteOption(
      options,
      normalizeSingleKakaoRoute(route, routePriorityLabel(route.summary?.priority, index))
    );
  });
  return toDirectionsResult(options.map((opt, index) => ({ ...opt, id: String(index) })));
}

async function fetchKakaoJson(
  url: string,
  params: URLSearchParams,
  key: string,
  affiliate: boolean
): Promise<KakaoRoute[]> {
  const headers: Record<string, string> = {
    Authorization: `KakaoAK ${key}`,
    Accept: "application/json"
  };
  if (affiliate) headers.service = "dadaeyu";

  const res = await fetch(`${url}?${params}`, {
    headers,
    signal: AbortSignal.timeout(12_000)
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { routes?: KakaoRoute[] };
  return json.routes ?? [];
}

function buildBaseParams(origin: string, destination: string, waypoints: string): URLSearchParams {
  const params = new URLSearchParams({
    origin,
    destination,
    summary: "false"
  });
  if (waypoints) params.set("waypoints", waypoints);
  return params;
}

async function fetchKakaoCarDirections(input: {
  key: string;
  origin: RoutePoint;
  destination: RoutePoint;
  waypoints: RoutePoint[];
  publicUrl: string;
  affiliateUrl: string;
}): Promise<DirectionsResult | null> {
  const origin = `${input.origin.lng},${input.origin.lat}`;
  const destination = `${input.destination.lng},${input.destination.lat}`;
  const waypoints =
    input.waypoints.length > 0 ? input.waypoints.map((p) => `${p.lng},${p.lat}`).join("|") : "";

  const altParams = buildBaseParams(origin, destination, waypoints);
  altParams.set("alternatives", "true");

  const freeParams = buildBaseParams(origin, destination, waypoints);
  freeParams.set("avoid", "toll");

  // 1) 공개 내비 API
  const [altRoutes, freeRoutes] = await Promise.all([
    fetchKakaoJson(input.publicUrl, altParams, input.key, false),
    fetchKakaoJson(input.publicUrl, freeParams, input.key, false)
  ]);
  if (altRoutes.length > 0 || freeRoutes.length > 0) {
    const merged = mergeCarRouteOptions(altRoutes, freeRoutes);
    return toDirectionsResult(merged);
  }

  // 2) 제휴 API
  const affAltParams = buildBaseParams(origin, destination, waypoints);
  affAltParams.set("alternatives", "true");
  affAltParams.set("priority", "DISTANCE");

  const affFreeParams = buildBaseParams(origin, destination, waypoints);
  affFreeParams.set("avoid", "toll");
  affFreeParams.set("priority", "DISTANCE");

  const [affAltRoutes, affFreeRoutes] = await Promise.all([
    fetchKakaoJson(input.affiliateUrl, affAltParams, input.key, true),
    fetchKakaoJson(input.affiliateUrl, affFreeParams, input.key, true)
  ]);
  if (affAltRoutes.length > 0 || affFreeRoutes.length > 0) {
    const merged = mergeCarRouteOptions(affAltRoutes, affFreeRoutes);
    return toDirectionsResult(merged);
  }

  return null;
}

async function fetchKakaoDirections(input: {
  key: string;
  mode: RouteMode;
  origin: RoutePoint;
  destination: RoutePoint;
  waypoints: RoutePoint[];
}): Promise<DirectionsResult | null> {
  const origin = `${input.origin.lng},${input.origin.lat}`;
  const destination = `${input.destination.lng},${input.destination.lat}`;
  const waypoints =
    input.waypoints.length > 0 ? input.waypoints.map((p) => `${p.lng},${p.lat}`).join("|") : "";

  if (input.mode === "car") {
    return fetchKakaoCarDirections({
      key: input.key,
      origin: input.origin,
      destination: input.destination,
      waypoints: input.waypoints,
      publicUrl: "https://apis-navi.kakaomobility.com/v1/directions",
      affiliateUrl: "https://apis-navi.kakaomobility.com/affiliate/v1/directions"
    });
  }

  // 도보 — 제휴 API
  const affParams = buildBaseParams(origin, destination, waypoints);
  affParams.set("priority", "DISTANCE");

  const walkRoutes = await fetchKakaoJson(
    "https://apis-navi.kakaomobility.com/affiliate/walking/v1/directions",
    affParams,
    input.key,
    true
  );
  return normalizeKakaoRoutes(walkRoutes);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeRaw = searchParams.get("mode");
  if (!isRouteMode(modeRaw)) {
    return NextResponse.json({ error: "mode는 walk 또는 car 여야 합니다." }, { status: 400 });
  }

  const originLat = parseNumber(searchParams.get("originLat"));
  const originLng = parseNumber(searchParams.get("originLng"));
  const destLat = parseNumber(searchParams.get("destLat"));
  const destLng = parseNumber(searchParams.get("destLng"));
  if (originLat == null || originLng == null || destLat == null || destLng == null) {
    return NextResponse.json({ error: "출발·도착 좌표가 필요합니다." }, { status: 400 });
  }

  const origin: RoutePoint = {
    lat: originLat,
    lng: originLng,
    name: searchParams.get("originName") ?? undefined
  };
  const destination: RoutePoint = {
    lat: destLat,
    lng: destLng,
    name: searchParams.get("destName") ?? undefined
  };

  const waypoints: RoutePoint[] = [];
  const wpRaw = searchParams.get("waypoints");
  if (wpRaw) {
    for (const part of wpRaw.split("|")) {
      const [lngS, latS] = part.split(",");
      const lng = Number(lngS);
      const lat = Number(latS);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        waypoints.push({ lat, lng });
      }
    }
  }

  const key = process.env.KAKAO_REST_API_KEY?.trim();
  let result: DirectionsResult | null = null;

  if (key) {
    try {
      result = await fetchKakaoDirections({
        key,
        mode: modeRaw,
        origin,
        destination,
        waypoints: waypoints.slice(0, 5)
      });
    } catch {
      result = null;
    }
  }

  if (!result) {
    const fallback = buildStraightRoute([origin, ...waypoints, destination], modeRaw);
    if (!fallback) {
      return NextResponse.json({ error: "경로를 계산할 수 없습니다." }, { status: 502 });
    }
    return NextResponse.json({ ...fallback, fallback: true });
  }

  return NextResponse.json(result);
}
