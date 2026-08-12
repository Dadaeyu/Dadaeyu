"use client";

// 카카오맵 SDK 래퍼: 마커/경로선/내 위치 표시를 관리하는 지도 컴포넌트.
import { useEffect, useRef, useState } from "react";
import { loadKakaoMap } from "@/lib/kakao/loadKakaoMap";
import {
  formatRouteDistance,
  formatRouteDuration,
  formatRouteTollFare,
  trafficStateToColor
} from "@/lib/kakao/directions";

export interface KakaoPlaceResult {
  id: string;
  place_name: string;
  category_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

// ── 공개 상수 ──────────────────────────────────────────────
// 대전광역시청 (대전 서구 둔산로 100)
export const MAP_CENTER = { lat: 36.3505389, lng: 127.384834846753 };
export const MAP_LEVEL = 8;

// ── 범용 마커 타입 ─────────────────────────────────────────
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  shape?: "pin" | "dot" | "heart" | "teardrop";
  // pin: 원 테두리/중앙 점 색. teardrop: 중앙 점 색.
  borderColor?: string;
  /** 마커 안에 표시할 짧은 텍스트(예: 코스 방문 순서 번호). pin/dot에서만 그려진다. */
  label?: string;
}

// 경로선 한 구간(코스 일정용). points 가 2개 미만이면 그리지 않는다.
export interface MapPathSegment {
  points: { lat: number; lng: number }[];
  color?: string; // 기본 초록
  dashed?: boolean; // true 면 점선(Day 간 연결 구간 표시용)
  /** 자동차 안내 — 도로별 교통 혼잡도 (있으면 color 대신 구간별 색) */
  trafficChunks?: { points: { lat: number; lng: number }[]; trafficState: number }[];
  /** 이 구간에 마우스를 올렸을 때 커서 위치에 보여줄 라벨(예: "Day 1"). 없으면 호버해도 안 뜬다. */
  label?: string;
  /** 이 구간을 클릭했을 때 onPathClick 으로 전달할 값(예: Day 번호). label 이 있어야 클릭도 반응한다. */
  day?: number;
}

// ── Props ──────────────────────────────────────────────────
interface Props {
  markers?: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onDeselect?: () => void;
  navTarget?: { lat: number; lng: number } | null;
  center?: { lat: number; lng: number };
  level?: number;
  myLocation?: { lat: number; lng: number } | null;
  focusMyLocationTrigger?: number;
  // 값이 바뀔 때마다(0 제외) 지도를 초기 중심·줌(대전 전체가 보이는 화면)으로 되돌린다.
  resetViewTrigger?: number;
  // 여러 구간의 경로선(코스 일정용). 구간별로 색상·점선 여부를 다르게 줄 수 있다.
  path?: MapPathSegment[];
  /** 경로선 구간(day 있는 것) 클릭 시 그 구간의 day 값을 전달한다. */
  onPathClick?: (day: number) => void;
  /** 값이 바뀌면 path 전체가 화면에 들어오도록 panTo(bounds). 안내 경로 전용 */
  fitPathKey?: string | number | null;
  /** 하단 시트 등 UI가 가리는 높이(px). 경로 맞춤 시 bottom padding으로 사용 */
  bottomOverlayPx?: number;
  /** 경로 중간점에 고정 표시할 거리·시간 요약 (네이버 지도 스타일 칩) */
  pathSummary?: { distanceM: number; durationSec: number; tollFare?: number } | null;
}

// ── 핀 렌더러 ──────────────────────────────────────────────
function renderDot(
  el: HTMLDivElement,
  color: string,
  selected: boolean,
  _borderColor?: string,
  label?: string
) {
  const size = selected ? 20 : 14;
  const labelEl = label
    ? `<div style="font-size:${Math.round(size / 1.9)}px;line-height:1;font-weight:700;color:white;">${label}</div>`
    : "";
  el.innerHTML = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.28);${selected ? `outline:3px solid ${color}55;outline-offset:1px;` : ""}cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;">${labelEl}</div>`;
}

function renderHeart(
  el: HTMLDivElement,
  color: string,
  selected: boolean,
  _borderColor?: string,
  _label?: string
) {
  const size = selected ? 26 : 20;
  el.innerHTML = `
    <div style="cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));${selected ? "transform:scale(1.15);" : ""}transition:transform 0.15s;">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
        <path d="M12 21s-6.7-4.35-9.3-8.3C1.1 10.2 1.5 6.6 4.4 4.9c2.2-1.3 4.9-.7 6.4 1.2l1.2 1.5 1.2-1.5c1.5-1.9 4.2-2.5 6.4-1.2 2.9 1.7 3.3 5.3 1.7 7.8C18.7 16.65 12 21 12 21z"/>
      </svg>
    </div>`;
}

function getRenderer(shape?: "pin" | "dot" | "heart" | "teardrop") {
  if (shape === "dot") return renderDot;
  if (shape === "heart") return renderHeart;
  if (shape === "teardrop") return renderTeardrop;
  return renderPin;
}

// 카카오맵 스타일의 눈물방울 핀 — 단색 플랫 디자인, 중앙에 작은 원 하나만.
function renderTeardrop(
  el: HTMLDivElement,
  color: string,
  selected: boolean,
  dotColor = "#191919",
  _label?: string
) {
  const w = selected ? 34 : 28;
  const h = Math.round(w * 1.25);
  el.innerHTML = `
    <div style="cursor:pointer;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.25));${selected ? "transform:scale(1.12);" : ""}transition:transform 0.15s;">
      <svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C7.58 2 4 5.58 4 10c0 6 8 12 8 12s8-6 8-12c0-4.42-3.58-8-8-8Z" fill="${color}"/>
        <circle cx="12" cy="10" r="3.2" fill="${dotColor}"/>
      </svg>
    </div>`;
}

function renderPin(
  el: HTMLDivElement,
  color: string,
  selected: boolean,
  borderColor = "white",
  label?: string
) {
  const size = selected ? 36 : 28;
  const tri = Math.round(size / 3);
  const sw = 1.5; // 삼각형 테두리 두께
  const dot = Math.round(size / 3.5);
  const ring = selected
    ? `box-shadow:0 0 0 6px ${color}30,0 2px 8px rgba(0,0,0,0.35);`
    : "box-shadow:0 2px 6px rgba(0,0,0,0.28);";
  const centerDot = label
    ? `<div style="width:${dot + 4}px;height:${dot + 4}px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round((dot + 4) * 0.65)}px;font-weight:800;color:${borderColor};line-height:1;">${label}</div>`
    : `<div style="width:${dot}px;height:${dot}px;background:${borderColor};border-radius:50%;"></div>`;
  const triW = tri * 2;
  const triH = tri;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;${selected ? "transform:scale(1.15);" : ""}transition:transform 0.15s;">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid ${borderColor};${ring}display:flex;align-items:center;justify-content:center;">
        ${centerDot}
      </div>
      <svg width="${triW + sw * 2}" height="${triH + sw * 2}" viewBox="-${sw} -${sw} ${triW + sw * 2} ${triH + sw * 2}" style="margin-top:-3px;display:block;">
        <polygon points="0,0 ${triW},0 ${triW / 2},${triH}" fill="${color}" stroke="${borderColor}" stroke-width="${sw}" stroke-linejoin="round"/>
      </svg>
    </div>`;
}

function createMyLocationEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.18;"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;background:#3b82f6;opacity:0.28;"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);position:relative;z-index:1;"></div>
      </div>
      <div style="font-size:10px;color:#1d4ed8;font-weight:600;margin-top:1px;white-space:nowrap;background:rgba(255,255,255,0.85);padding:1px 4px;border-radius:3px;">현재 위치</div>
    </div>`;
  return el;
}

// ── 컴포넌트 ───────────────────────────────────────────────
export default function KakaoMap({
  markers = [],
  selectedId = null,
  onSelect,
  onDeselect,
  navTarget = null,
  center = MAP_CENTER,
  level = MAP_LEVEL,
  myLocation = null,
  focusMyLocationTrigger = 0,
  resetViewTrigger = 0,
  path = [],
  onPathClick,
  fitPathKey = null,
  bottomOverlayPx = 0,
  pathSummary = null
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const onDeselectRef = useRef(onDeselect);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const markerElemsRef = useRef(new Map<string, HTMLDivElement>());
  const polylineRef = useRef<kakao.maps.Polyline | null>(null);
  const pathPolylinesRef = useRef<kakao.maps.Polyline[]>([]);
  // 경로선 호버 시 커서 위치에 뜨는 라벨 — 한 번에 하나만 필요해서 배열이 아니라 단일 참조.
  const pathHoverOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const pathHoverElRef = useRef<HTMLDivElement | null>(null);
  const pathSummaryOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const myLocationOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const zoomControlRef = useRef<kakao.maps.ZoomControl | null>(null);
  const [mapInitCount, setMapInitCount] = useState(0);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  useEffect(() => {
    onDeselectRef.current = onDeselect;
  }, [onDeselect]);

  useEffect(() => {
    let cancelled = false;

    loadKakaoMap()
      .then((kakaoSdk) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        setMapLoadFailed(false);
        const K = kakaoSdk.maps;
        const map = new K.Map(containerRef.current, {
          center: new K.LatLng(center.lat, center.lng),
          level
        });
        mapRef.current = map;
        K.event.addListener(map, "click", () => onDeselectRef.current?.());
        setMapInitCount((count) => count + 1);
      })
      .catch(() => {
        if (!cancelled) setMapLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng, level]);

  // 컨테이너 크기 변경 시(상단 50% 분할 등) 지도 재배치 후 선택 마커를 보이는 영역 중앙에 맞춤
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let timer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const map = mapRef.current;
        if (!map || !window.kakao?.maps) return;
        map.relayout();
        if (fitPathKey != null && fitPathKey !== "") return;
        if (!selectedId) return;
        const marker = markers.find((m) => m.id === selectedId);
        if (!marker) return;
        const K = window.kakao.maps;
        map.setCenter(new K.LatLng(marker.lat, marker.lng));
      }, 50);
    });
    ro.observe(el);
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInitCount, selectedId, fitPathKey]);

  // 확대/축소 +/- 컨트롤은 데스크탑에서만. 모바일은 핀치 줌으로 충분해서 화면을 가리지 않게 뺀다.
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;
    const map = mapRef.current;
    const mql = window.matchMedia("(min-width: 768px)");

    const sync = (showControl: boolean) => {
      if (showControl) {
        if (!zoomControlRef.current) {
          zoomControlRef.current = new K.ZoomControl();
          map.addControl(zoomControlRef.current, K.ControlPosition.TOPRIGHT);
        }
      } else if (zoomControlRef.current) {
        map.removeControl(zoomControlRef.current);
        zoomControlRef.current = null;
      }
    };

    sync(mql.matches);
    const handleChange = (e: MediaQueryListEvent) => sync(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [mapInitCount]);

  // 마커 동기화
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    markerElemsRef.current.clear();

    markers.forEach((marker) => {
      const el = document.createElement("div");
      markerElemsRef.current.set(marker.id, el);
      const render = getRenderer(marker.shape);
      render(el, marker.color, marker.id === selectedId, marker.borderColor, marker.label);

      const overlay = new K.CustomOverlay({
        position: new K.LatLng(marker.lat, marker.lng),
        content: el,
        yAnchor: marker.shape === "dot" || marker.shape === "heart" ? 0.5 : 1,
        xAnchor: 0.5,
        zIndex: marker.id === selectedId ? 5 : 3,
        // 마커 클릭이 지도 클릭(onDeselect)으로 이어지지 않게 함 → 다른 마커 클릭 시 바로 그 상세로 전환.
        clickable: true
      });
      overlay.setMap(mapRef.current!);
      overlaysRef.current.push(overlay);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect?.(marker.id);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInitCount, markers, selectedId]);

  // 선택 상태 시각 업데이트
  useEffect(() => {
    markers.forEach((marker) => {
      const el = markerElemsRef.current.get(marker.id);
      if (!el) return;
      const render = getRenderer(marker.shape);
      render(el, marker.color, marker.id === selectedId, marker.borderColor, marker.label);
    });
  }, [selectedId, markers]);

  // [줌-투-마커] selectedId 변경 시 해당 마커로 줌인 — 경로 맞춤 중이면 스킵
  // fitPathKey는 deps에 넣지 않음: 안내 종료 시 마커로 다시 점프하지 않게
  useEffect(() => {
    if (fitPathKey != null && fitPathKey !== "") return;
    if (!selectedId || !mapRef.current || !window.kakao?.maps) return;
    const marker = markers.find((m) => m.id === selectedId);
    if (!marker) return;
    const K = window.kakao.maps;
    mapRef.current.setCenter(new K.LatLng(marker.lat, marker.lng));
    mapRef.current.setLevel(5, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, mapInitCount]);

  // 경로 폴리라인 (내 위치를 확인 못한 상태면 그리지 않음)
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    if (navTarget && myLocation) {
      const line = new K.Polyline({
        path: [
          new K.LatLng(myLocation.lat, myLocation.lng),
          new K.LatLng(navTarget.lat, navTarget.lng)
        ],
        strokeWeight: 4,
        strokeColor: "#2563eb",
        strokeOpacity: 0.85,
        strokeStyle: "dash"
      });
      line.setMap(mapRef.current);
      polylineRef.current = line;
    }
  }, [mapInitCount, myLocation, navTarget]);

  // 코스 경로선 — 구간(path)별로 순서대로 잇는다(코스 일정 장소 순서). 구간마다 색상·점선 여부가 다를 수 있다.
  // 각 구간의 지점이 2개 미만이면 그 구간은 그리지 않음.
  // 구간 라벨(예: "Day 1")은 고정 위치가 아니라, 그 경로선에 마우스를 올렸을 때 커서가 있는
  // 지점에 붙여서 보여준다 — 노드(장소 마커) 위치와 안 겹치고, 어느 구간을 가리키는지 명확하다.
  // 같은 구간을 클릭하면 onPathClick(day)로 알려줘서 패널의 장소 목록도 그 Day로 전환할 수 있다.
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    pathPolylinesRef.current.forEach((line) => line.setMap(null));
    pathPolylinesRef.current = [];
    pathHoverOverlayRef.current?.setMap(null);
    pathHoverOverlayRef.current = null;

    const hoverEl = document.createElement("div");
    hoverEl.style.cssText =
      "color:white;font-size:11px;font-weight:700;line-height:1;padding:3px 7px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);border:1.5px solid white;pointer-events:none;";
    pathHoverElRef.current = hoverEl;

    const showHoverLabel = (text: string, color: string, position: kakao.maps.LatLng) => {
      hoverEl.textContent = text;
      hoverEl.style.background = color;
      if (!pathHoverOverlayRef.current) {
        pathHoverOverlayRef.current = new K.CustomOverlay({
          content: hoverEl,
          position,
          yAnchor: 1.6,
          xAnchor: 0.5,
          zIndex: 10
        });
        pathHoverOverlayRef.current.setMap(mapRef.current);
      } else {
        pathHoverOverlayRef.current.setPosition(position);
        pathHoverOverlayRef.current.setMap(mapRef.current);
      }
    };
    const hideHoverLabel = () => {
      pathHoverOverlayRef.current?.setMap(null);
    };

    for (const segment of path) {
      const defaultColor = segment.color ?? "#16a34a";
      const drawPolyline = (
        pts: { lat: number; lng: number }[],
        strokeColor: string,
        dashed: boolean
      ) => {
        if (pts.length < 2) return;
        const line = new K.Polyline({
          path: pts.map((p) => new K.LatLng(p.lat, p.lng)),
          strokeWeight: 4,
          strokeColor,
          strokeOpacity: 0.85,
          strokeStyle: dashed ? "shortdash" : "solid"
        });
        line.setMap(mapRef.current);
        pathPolylinesRef.current.push(line);

        if (segment.label) {
          const label = segment.label;
          K.event.addListener(line, "mouseover", (e: kakao.maps.MouseEvent) =>
            showHoverLabel(label, defaultColor, e.latLng)
          );
          K.event.addListener(line, "mousemove", (e: kakao.maps.MouseEvent) =>
            showHoverLabel(label, defaultColor, e.latLng)
          );
          K.event.addListener(line, "mouseout", hideHoverLabel);
          if (segment.day != null) {
            const day = segment.day;
            K.event.addListener(line, "click", () => onPathClick?.(day));
          }
        }
      };

      if (segment.trafficChunks?.length && !segment.dashed) {
        for (const chunk of segment.trafficChunks) {
          drawPolyline(chunk.points, trafficStateToColor(chunk.trafficState), false);
        }
        continue;
      }

      if (segment.points.length < 2) continue;
      drawPolyline(segment.points, defaultColor, Boolean(segment.dashed));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(path), mapInitCount]);

  // 경로 안내 시 전체 경로가 보이도록 영역 맞춤 (panTo = 부드러운 이동·줌)
  useEffect(() => {
    if (fitPathKey == null || fitPathKey === "") return;
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    const bounds = new K.LatLngBounds();
    let count = 0;
    for (const segment of path) {
      const pts = segment.points;
      if (pts.length === 0) continue;
      const step = pts.length > 200 ? Math.ceil(pts.length / 200) : 1;
      for (let i = 0; i < pts.length; i += step) {
        const p = pts[i];
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
        bounds.extend(new K.LatLng(p.lat, p.lng));
        count += 1;
      }
      const last = pts[pts.length - 1];
      if (Number.isFinite(last.lat) && Number.isFinite(last.lng)) {
        bounds.extend(new K.LatLng(last.lat, last.lng));
        count += 1;
      }
    }
    if (count < 2) return;

    mapRef.current.relayout();
    // 화면보다 멀리 이동하면 카카오가 애니메이션 없이 점프할 수 있음
    if (bottomOverlayPx > 0) {
      mapRef.current.setBounds(bounds, 56, 28, bottomOverlayPx + 16, 28);
    } else {
      mapRef.current.panTo(bounds, 72);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitPathKey, mapInitCount, bottomOverlayPx, JSON.stringify(path)]);

  // 경로 안내 요약 칩 — 경로 중간점에 거리·시간 고정 표시
  const pathSummaryKey = pathSummary
    ? `${pathSummary.distanceM}-${pathSummary.durationSec}-${pathSummary.tollFare ?? 0}`
    : "";
  const pathPointsKey = JSON.stringify(path);

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    pathSummaryOverlayRef.current?.setMap(null);
    pathSummaryOverlayRef.current = null;

    if (
      !pathSummary ||
      !Number.isFinite(pathSummary.distanceM) ||
      !Number.isFinite(pathSummary.durationSec)
    ) {
      return;
    }

    const points = path.flatMap((segment) => segment.points);
    const routable = points.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0)
    );
    if (routable.length < 2) return;

    const mid = routable[Math.floor((routable.length - 1) / 2)];
    const tollPart = formatRouteTollFare(pathSummary.tollFare ?? 0);
    const label = tollPart
      ? `${formatRouteDistance(pathSummary.distanceM)} · ${formatRouteDuration(pathSummary.durationSec)} · ${tollPart}`
      : `${formatRouteDistance(pathSummary.distanceM)} · ${formatRouteDuration(pathSummary.durationSec)}`;

    const el = document.createElement("div");
    el.textContent = label;
    el.style.cssText =
      "background:#fff;color:#0f172a;font-size:12px;font-weight:700;line-height:1.2;padding:6px 10px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 10px rgba(15,23,42,0.18);border:1px solid rgba(15,23,42,0.08);pointer-events:none;";

    const overlay = new K.CustomOverlay({
      content: el,
      position: new K.LatLng(mid.lat, mid.lng),
      yAnchor: 0.5,
      xAnchor: 0.5,
      zIndex: 8
    });
    overlay.setMap(mapRef.current);
    pathSummaryOverlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      if (pathSummaryOverlayRef.current === overlay) {
        pathSummaryOverlayRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInitCount, pathSummaryKey, pathPointsKey]);

  // 내 위치 마커 — myLocation이 바뀔 때마다 다시 그리고, null이면 제거
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    myLocationOverlayRef.current?.setMap(null);
    myLocationOverlayRef.current = null;

    if (!myLocation) return;

    const overlay = new K.CustomOverlay({
      position: new K.LatLng(myLocation.lat, myLocation.lng),
      content: createMyLocationEl(),
      yAnchor: 0.5,
      xAnchor: 0.5,
      zIndex: 2
    });
    overlay.setMap(mapRef.current);
    myLocationOverlayRef.current = overlay;
  }, [myLocation, mapInitCount]);

  // [내 위치로 이동] focusMyLocationTrigger가 바뀔 때 1회만 이동
  // myLocation / fitPathKey를 deps에 넣지 않음 — GPS 갱신·안내 종료 시 카메라 재점프 방지
  useEffect(() => {
    if (fitPathKey != null && fitPathKey !== "") return;
    if (!focusMyLocationTrigger || !myLocation || !mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;
    mapRef.current.panTo(new K.LatLng(myLocation.lat, myLocation.lng));
    mapRef.current.setLevel(4, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMyLocationTrigger, mapInitCount]);

  // [지도 초기화] resetViewTrigger가 바뀔 때(검색·필터 변경) 대전 전체가 보이는 초기 화면으로 되돌린다.
  useEffect(() => {
    if (!resetViewTrigger || !mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;
    mapRef.current.setCenter(new K.LatLng(MAP_CENTER.lat, MAP_CENTER.lng));
    mapRef.current.setLevel(MAP_LEVEL, { animate: true });
  }, [resetViewTrigger, mapInitCount]);

  return (
    <>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {mapLoadFailed ? (
        <div className="bg-surface text-slate absolute inset-0 grid place-items-center px-6 text-center">
          <div className="max-w-sm">
            <p className="text-ink text-lg font-semibold">지도를 불러올 수 없어요</p>
            <p className="mt-2 text-base leading-6">
              지도 연결 설정을 확인하는 동안 검색 결과 목록에서 장소 정보를 먼저 확인해 주세요.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
