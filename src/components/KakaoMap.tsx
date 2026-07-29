"use client";

// 카카오맵 SDK 래퍼: 마커/툴팁/경로선/내 위치 표시를 관리하는 지도 컴포넌트.
import { useEffect, useRef, useState } from "react";
import Script from "next/script";

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
  shape?: "pin" | "dot";
}

export interface TooltipInfo {
  lat: number;
  lng: number;
  name: string;
  address: string;
  phone?: string;
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
}

// ── 핀 렌더러 ──────────────────────────────────────────────
function renderDot(el: HTMLDivElement, color: string, selected: boolean) {
  const size = selected ? 20 : 14;
  el.innerHTML = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.28);${selected ? `outline:3px solid ${color}55;outline-offset:1px;` : ""}cursor:pointer;transition:all 0.15s;"></div>`;
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
  focusMyLocationTrigger = 0
}: Props) {
  const mapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ?? process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const markerElemsRef = useRef(new Map<string, HTMLDivElement>());
  const polylineRef = useRef<kakao.maps.Polyline | null>(null);
  const tooltipOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const myLocationOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const [mapInitCount, setMapInitCount] = useState(0);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  const initMap = () => {
    if (!containerRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;
    const map = new K.Map(containerRef.current, {
      center: new K.LatLng(center.lat, center.lng),
      level
    });
    mapRef.current = map;
    map.addControl(new K.ZoomControl(), K.ControlPosition.TOPRIGHT);

    K.event.addListener(map, "click", () => onDeselect?.());
    setMapInitCount((c) => c + 1);
  };

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
      const render = marker.shape === "dot" ? renderDot : renderPin;
      render(el, marker.color, marker.id === selectedId);

      const overlay = new K.CustomOverlay({
        position: new K.LatLng(marker.lat, marker.lng),
        content: el,
        yAnchor: marker.shape === "dot" ? 0.5 : 1,
        xAnchor: 0.5,
        zIndex: 3
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
      const render = marker.shape === "dot" ? renderDot : renderPin;
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

    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position:relative;background:white;border-radius:12px;padding:10px 32px 10px 14px;box-shadow:0 4px 20px rgba(0,0,0,0.18);border:1px solid #e5e7eb;min-width:180px;max-width:240px;cursor:default;">
        <button data-close style="position:absolute;top:7px;right:9px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:13px;line-height:1;padding:2px 4px;">✕</button>
        <p style="font-weight:700;font-size:13px;color:#111827;margin:0 0 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tooltip.name}</p>
        <p style="font-size:11px;color:#6b7280;margin:0 0 2px 0;line-height:1.4;">${tooltip.address}</p>
        ${tooltip.phone ? `<p style="font-size:11px;color:#0891b2;margin:0;">${tooltip.phone}</p>` : ""}
        <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid white;"></div>
      </div>`;

    el.querySelector("[data-close]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      onCloseTooltip?.();
    });
    el.addEventListener("click", (e) => e.stopPropagation());

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
  }, [navTarget, myLocation]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMyLocationTrigger]);

  return (
    <>
      {mapKey ? (
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${mapKey}&libraries=services&autoload=false`}
          strategy="afterInteractive"
          onReady={() => window.kakao.maps.load(initMap)}
          onError={() => setMapLoadFailed(true)}
        />
      ) : null}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {!mapKey || mapLoadFailed ? (
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
