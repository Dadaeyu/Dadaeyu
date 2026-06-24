"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

// ── Kakao Maps type declarations ───────────────────────────
interface KakaoLatLng { getLat(): number; getLng(): number; }
interface KakaoMapInstance { setLevel(n: number, options?: { animate?: boolean; anchor?: KakaoLatLng }): void; getLevel(): number; addControl(ctrl: object, pos: number): void; panTo(latlng: KakaoLatLng): void; setCenter(latlng: KakaoLatLng): void; }
interface KakaoOverlay { setMap(m: KakaoMapInstance | null): void; }

declare global {
  interface Window {
    kakao: {
      maps: {
        load(fn: () => void): void;
        Map: new (el: HTMLElement, opts: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        CustomOverlay: new (opts: {
          position: KakaoLatLng;
          content: HTMLElement;
          yAnchor?: number;
          xAnchor?: number;
          zIndex?: number;
        }) => KakaoOverlay;
        Polyline: new (opts: {
          path: KakaoLatLng[];
          strokeWeight?: number;
          strokeColor?: string;
          strokeOpacity?: number;
          strokeStyle?: string;
        }) => KakaoOverlay;
        ZoomControl: new () => object;
        ControlPosition: { TOPRIGHT: number };
        event: { addListener(t: object, type: string, fn: () => void): void };
      };
    };
  }
}

// ── 공개 상수 ──────────────────────────────────────────────
export const MAP_CENTER = { lat: 36.387, lng: 127.443 };
export const MAP_LEVEL = 8;
export const MY_LOCATION = { lat: 36.3511, lng: 127.3786 };

// ── 범용 마커 타입 ─────────────────────────────────────────
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
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
}

// ── 핀 렌더러 ──────────────────────────────────────────────
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
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const overlaysRef = useRef<KakaoOverlay[]>([]);
  const markerElemsRef = useRef(new Map<string, HTMLDivElement>());
  const polylineRef = useRef<KakaoOverlay | null>(null);
  const [mapInitCount, setMapInitCount] = useState(0);

  const initMap = () => {
    if (!containerRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;
    const map = new K.Map(containerRef.current, {
      center: new K.LatLng(center.lat, center.lng),
      level,
    });
    mapRef.current = map;
    map.addControl(new K.ZoomControl(), K.ControlPosition.TOPRIGHT);

    const myOverlay = new K.CustomOverlay({
      position: new K.LatLng(MY_LOCATION.lat, MY_LOCATION.lng),
      content: createMyLocationEl(),
      yAnchor: 0.5,
      xAnchor: 0.5,
      zIndex: 1,
    });
    myOverlay.setMap(map);

    K.event.addListener(map, "click", () => onDeselect?.());
    setMapInitCount(c => c + 1);
  };

  // 마커 동기화
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];
    markerElemsRef.current.clear();

    markers.forEach(marker => {
      const el = document.createElement("div");
      markerElemsRef.current.set(marker.id, el);
      renderPin(el, marker.color, marker.id === selectedId);

      const overlay = new K.CustomOverlay({
        position: new K.LatLng(marker.lat, marker.lng),
        content: el,
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 3,
      });
      overlay.setMap(mapRef.current!);
      overlaysRef.current.push(overlay);

      el.addEventListener("click", e => {
        e.stopPropagation();
        onSelect?.(marker.id);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInitCount, markers, selectedId]);

  // 선택 상태 시각 업데이트
  useEffect(() => {
    markers.forEach(marker => {
      const el = markerElemsRef.current.get(marker.id);
      if (el) renderPin(el, marker.color, marker.id === selectedId);
    });
  }, [selectedId, markers]);

  // [줌-투-마커] selectedId 변경 시 해당 마커로 줌인 — 필요 없으면 이 useEffect 삭제
  useEffect(() => {
    if (!selectedId || !mapRef.current || !window.kakao?.maps) return;
    const marker = markers.find(m => m.id === selectedId);
    if (!marker) return;
    const K = window.kakao.maps;
    mapRef.current.setCenter(new K.LatLng(marker.lat, marker.lng));
    mapRef.current.setLevel(5, { animate: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, mapInitCount]);

  // 경로 폴리라인
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    if (navTarget) {
      const line = new K.Polyline({
        path: [
          new K.LatLng(MY_LOCATION.lat, MY_LOCATION.lng),
          new K.LatLng(navTarget.lat, navTarget.lng),
        ],
        strokeWeight: 4,
        strokeColor: "#2563eb",
        strokeOpacity: 0.85,
        strokeStyle: "dash",
      });
      line.setMap(mapRef.current);
      polylineRef.current = line;
    }
  }, [navTarget]);

  return (
    <>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => window.kakao.maps.load(initMap)}
      />
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}
