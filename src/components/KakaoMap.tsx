"use client";

// 카카오맵 SDK 래퍼: 마커/툴팁/경로선/내 위치 표시를 관리하는 지도 컴포넌트.
import { useEffect, useRef, useState } from "react";
import { loadKakaoMap } from "@/lib/kakao/loadKakaoMap";

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
  shape?: "pin" | "dot" | "heart";
}

export interface TooltipInfo {
  lat: number;
  lng: number;
  name: string;
  address: string;
  phone?: string;
}

// 경로선 한 구간(코스 일정용). points 가 2개 미만이면 그리지 않는다.
export interface MapPathSegment {
  points: { lat: number; lng: number }[];
  color?: string; // 기본 초록
  dashed?: boolean; // true 면 점선(Day 간 연결 구간 표시용)
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
  tooltip?: TooltipInfo | null;
  onCloseTooltip?: () => void;
  myLocation?: { lat: number; lng: number } | null;
  focusMyLocationTrigger?: number;
  // 여러 구간의 경로선(코스 일정용). 구간별로 색상·점선 여부를 다르게 줄 수 있다.
  path?: MapPathSegment[];
}

// ── 핀 렌더러 ──────────────────────────────────────────────
function renderDot(el: HTMLDivElement, color: string, selected: boolean) {
  const size = selected ? 20 : 14;
  el.innerHTML = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.28);${selected ? `outline:3px solid ${color}55;outline-offset:1px;` : ""}cursor:pointer;transition:all 0.15s;"></div>`;
}

function renderHeart(el: HTMLDivElement, color: string, selected: boolean) {
  const size = selected ? 26 : 20;
  el.innerHTML = `
    <div style="cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));${selected ? "transform:scale(1.15);" : ""}transition:transform 0.15s;">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
        <path d="M12 21s-6.7-4.35-9.3-8.3C1.1 10.2 1.5 6.6 4.4 4.9c2.2-1.3 4.9-.7 6.4 1.2l1.2 1.5 1.2-1.5c1.5-1.9 4.2-2.5 6.4-1.2 2.9 1.7 3.3 5.3 1.7 7.8C18.7 16.65 12 21 12 21z"/>
      </svg>
    </div>`;
}

function getRenderer(shape?: "pin" | "dot" | "heart") {
  if (shape === "dot") return renderDot;
  if (shape === "heart") return renderHeart;
  return renderPin;
}

function renderPin(el: HTMLDivElement, color: string, selected: boolean) {
  const size = selected ? 36 : 28;
  const tri = Math.round(size / 3);
  const dot = Math.round(size / 3.5);
  const ring = selected
    ? `box-shadow:0 0 0 6px ${color}30,0 2px 8px rgba(0,0,0,0.35);`
    : "box-shadow:0 2px 6px rgba(0,0,0,0.28);";
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;${selected ? "transform:scale(1.15);" : ""}transition:transform 0.15s;">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;${ring}display:flex;align-items:center;justify-content:center;">
        <div style="width:${dot}px;height:${dot}px;background:white;border-radius:50%;"></div>
      </div>
      <div style="width:0;height:0;border-left:${tri}px solid transparent;border-right:${tri}px solid transparent;border-top:${tri}px solid ${color};margin-top:-1px;"></div>
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

function createTooltipEl(tooltip: TooltipInfo, onClose: (() => void) | undefined): HTMLDivElement {
  const container = document.createElement("div");
  const card = document.createElement("div");
  card.style.cssText =
    "position:relative;background:white;border-radius:12px;padding:10px 32px 10px 14px;box-shadow:0 4px 20px rgba(0,0,0,0.18);border:1px solid #e5e7eb;min-width:180px;max-width:240px;cursor:default;";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "✕";
  closeButton.setAttribute("aria-label", `${tooltip.name} 정보 닫기`);
  closeButton.style.cssText =
    "position:absolute;top:7px;right:9px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:13px;line-height:1;padding:2px 4px;";
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    onClose?.();
  });

  const name = document.createElement("p");
  name.textContent = tooltip.name;
  name.style.cssText =
    "font-weight:700;font-size:13px;color:#111827;margin:0 0 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";

  const address = document.createElement("p");
  address.textContent = tooltip.address;
  address.style.cssText = "font-size:11px;color:#6b7280;margin:0 0 2px 0;line-height:1.4;";

  card.append(closeButton, name, address);

  if (tooltip.phone) {
    const phone = document.createElement("p");
    phone.textContent = tooltip.phone;
    phone.style.cssText = "font-size:11px;color:#0891b2;margin:0;";
    card.append(phone);
  }

  const pointer = document.createElement("div");
  pointer.style.cssText =
    "position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid white;";
  card.append(pointer);
  container.append(card);
  container.addEventListener("click", (event) => event.stopPropagation());
  return container;
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
  tooltip = null,
  onCloseTooltip,
  myLocation = null,
  focusMyLocationTrigger = 0,
  path = []
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const onDeselectRef = useRef(onDeselect);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const markerElemsRef = useRef(new Map<string, HTMLDivElement>());
  const polylineRef = useRef<kakao.maps.Polyline | null>(null);
  const pathPolylinesRef = useRef<kakao.maps.Polyline[]>([]);
  const tooltipOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const myLocationOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
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
        map.addControl(new K.ZoomControl(), K.ControlPosition.TOPRIGHT);
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
      render(el, marker.color, marker.id === selectedId);

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
      render(el, marker.color, marker.id === selectedId);
    });
  }, [selectedId, markers]);

  // 말풍선 툴팁
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    tooltipOverlayRef.current?.setMap(null);
    tooltipOverlayRef.current = null;

    if (!tooltip) return;

    const el = createTooltipEl(tooltip, onCloseTooltip);

    const overlay = new K.CustomOverlay({
      position: new K.LatLng(tooltip.lat, tooltip.lng),
      content: el,
      yAnchor: 1.6,
      xAnchor: 0.5,
      zIndex: 10
    });
    overlay.setMap(mapRef.current);
    tooltipOverlayRef.current = overlay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltip, mapInitCount]);

  // [줌-투-마커] selectedId 변경 시 해당 마커로 줌인 — 필요 없으면 이 useEffect 삭제
  useEffect(() => {
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
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    pathPolylinesRef.current.forEach((line) => line.setMap(null));
    pathPolylinesRef.current = [];

    for (const segment of path) {
      if (segment.points.length < 2) continue;
      const line = new K.Polyline({
        path: segment.points.map((p) => new K.LatLng(p.lat, p.lng)),
        strokeWeight: 4,
        strokeColor: segment.color ?? "#16a34a",
        strokeOpacity: 0.8,
        strokeStyle: segment.dashed ? "shortdash" : "solid"
      });
      line.setMap(mapRef.current);
      pathPolylinesRef.current.push(line);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(path), mapInitCount]);

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

  // [내 위치로 이동] focusMyLocationTrigger가 바뀔 때(버튼 클릭 후 첫 위치 확인) 1회만 이동
  useEffect(() => {
    if (!focusMyLocationTrigger || !myLocation || !mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;
    mapRef.current.panTo(new K.LatLng(myLocation.lat, myLocation.lng));
    mapRef.current.setLevel(4, { animate: true });
  }, [focusMyLocationTrigger, mapInitCount, myLocation]);

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
