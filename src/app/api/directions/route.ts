import { NextResponse } from "next/server";
import {
  buildStraightRoute,
  isRouteMode,
  type DirectionsResult,
  type RouteMode,
  type RoutePoint
} from "@/lib/kakao/directions";

export const runtime = "nodejs";

type KakaoRoad = {
  vertexes?: number[];
  distance?: number;
  duration?: number;
};

type KakaoSection = {
  distance?: number;
  duration?: number;
  roads?: KakaoRoad[];
};

type KakaoRoute = {
  summary?: { distance?: number; duration?: number };
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

function normalizeKakaoRoutes(routes: KakaoRoute[]): DirectionsResult | null {
  const route = routes[0];
  if (!route) return null;
  const points: RoutePoint[] = [];
  let distanceM = route.summary?.distance ?? 0;
  let durationSec = route.summary?.duration ?? 0;

  for (const section of route.sections ?? []) {
    if (!route.summary) {
      distanceM += section.distance ?? 0;
      durationSec += section.duration ?? 0;
    }
    for (const road of section.roads ?? []) {
      if (road.vertexes?.length) {
        points.push(...vertexesToPoints(road.vertexes));
      }
    }
  }

  if (points.length < 2) return null;
  return { distanceM, durationSec, points };
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

  // 1) 공개 내비 API (자동차 중심, REST 키)
  if (input.mode === "car") {
    const params = new URLSearchParams({
      origin,
      destination,
      summary: "false"
    });
    if (waypoints) params.set("waypoints", waypoints);
    const res = await fetch(`https://apis-navi.kakaomobility.com/v1/directions?${params}`, {
      headers: {
        Authorization: `KakaoAK ${input.key}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(12_000)
    });
    if (res.ok) {
      const json = (await res.json()) as { routes?: KakaoRoute[] };
      const normalized = normalizeKakaoRoutes(json.routes ?? []);
      if (normalized) return normalized;
    }
  }

  // 2) 제휴 도보/자동차 (키가 제휴 상품에 열려 있을 때만 성공)
  const affiliateUrl =
    input.mode === "walk"
      ? "https://apis-navi.kakaomobility.com/affiliate/walking/v1/directions"
      : "https://apis-navi.kakaomobility.com/affiliate/v1/directions";
  const affParams = new URLSearchParams({
    origin,
    destination,
    summary: "false",
    priority: "DISTANCE"
  });
  if (waypoints) affParams.set("waypoints", waypoints);

  const affRes = await fetch(`${affiliateUrl}?${affParams}`, {
    headers: {
      Authorization: `KakaoAK ${input.key}`,
      Accept: "application/json",
      service: "dadaeyu"
    },
    signal: AbortSignal.timeout(12_000)
  });
  if (affRes.ok) {
    const json = (await affRes.json()) as { routes?: KakaoRoute[] };
    const normalized = normalizeKakaoRoutes(json.routes ?? []);
    if (normalized) return normalized;
  }

  return null;
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
