"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { PLACES, type Place } from "@/data/placesData";

// ── Constants ──────────────────────────────────────────────
const MAP_CENTER = { lat: 36.387, lng: 127.443 };
const MAP_LEVEL = 8;
export const MY_LOCATION = { lat: 36.3511, lng: 127.3786 };

// ── Marker colors cycling through PLACES ──────────────────
const MARKER_COLORS = PLACES.map((p) => p.color);

// ── Search place type (searchKeyword2 API) ─────────────────
export interface SearchPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
}

// ── Tourism place type - on hold ───────────────────────────
/* export interface TourismPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  addr: string;
  typeId: string;
} */

// ── Props ──────────────────────────────────────────────────
interface Props {
  places: Place[];
  selectedId: number | null;
  navTarget: Place | null;
  onSelectPlace: (id: number) => void;
  onDeselect: () => void;
  // tourismPlaces?: TourismPlace[];
  searchPlaces?: SearchPlace[];
  selectedSearchId?: string | null;
  onSelectSearchPlace?: (id: string) => void;
}

// ── PLACES pin renderer ────────────────────────────────────
function renderPin(container: HTMLDivElement, place: Place, selected: boolean, isNav: boolean) {
  const size = selected ? 36 : 28;
  const triSize = Math.round(size / 3);
  const dotSize = Math.round(size / 3.5);
  const pinColor = place.color;
  const ring = selected
    ? `box-shadow:0 0 0 6px ${pinColor}30,0 2px 8px rgba(0,0,0,0.35);`
    : isNav
      ? "box-shadow:0 0 0 6px #2563eb30,0 2px 8px rgba(0,0,0,0.35);"
      : "box-shadow:0 2px 6px rgba(0,0,0,0.28);";
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;${selected || isNav ? "transform:scale(1.15);" : ""}transition:transform 0.15s;">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${pinColor};border:3px solid white;${ring}display:flex;align-items:center;justify-content:center;">
        <div style="width:${dotSize}px;height:${dotSize}px;background:white;border-radius:50%;"></div>
      </div>
      <div style="width:0;height:0;border-left:${triSize}px solid transparent;border-right:${triSize}px solid transparent;border-top:${triSize}px solid ${pinColor};margin-top:-1px;"></div>
    </div>
  `;
}

// ── Search pin renderer (cycles through MARKER_COLORS) ─────
function renderSearchPin(container: HTMLDivElement, color: string, selected: boolean) {
  const size = selected ? 36 : 28;
  const triSize = Math.round(size / 3);
  const dotSize = Math.round(size / 3.5);
  const ring = selected
    ? `box-shadow:0 0 0 6px ${color}30,0 2px 8px rgba(0,0,0,0.35);`
    : "box-shadow:0 2px 6px rgba(0,0,0,0.28);";
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;${selected ? "transform:scale(1.15);" : ""}transition:transform 0.15s;">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;${ring}display:flex;align-items:center;justify-content:center;">
        <div style="width:${dotSize}px;height:${dotSize}px;background:white;border-radius:50%;"></div>
      </div>
      <div style="width:0;height:0;border-left:${triSize}px solid transparent;border-right:${triSize}px solid transparent;border-top:${triSize}px solid ${color};margin-top:-1px;"></div>
    </div>
  `;
}

// ── My-location overlay content ────────────────────────────
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
    </div>
  `;
  return el;
}

/* Tourism pin renderer - on hold
function createTourismPinEl(name: string): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:default;" title="${name.replace(/"/g, "&quot;")}">
      <div style="width:16px;height:16px;border-radius:50%;background:#0d9488;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>
      <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid #0d9488;margin-top:-1px;"></div>
    </div>
  `;
  return el;
}
*/

export default function KakaoMap({
  places,
  selectedId,
  navTarget,
  onSelectPlace: _onSelectPlace,
  onDeselect,
  // tourismPlaces = [],
  searchPlaces = [],
  selectedSearchId,
  onSelectSearchPlace,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markerElemsRef = useRef(new Map<number, HTMLDivElement>());
  const polylineRef = useRef<kakao.maps.Polyline | kakao.maps.CustomOverlay | null>(null);
  /* const tourismOverlaysRef = useRef<KakaoOverlay[]>([]); */
  const searchOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const searchMarkerElemsRef = useRef(new Map<string, HTMLDivElement>());
  const [mapInitCount, setMapInitCount] = useState(0);

  const initMap = () => {
    if (!containerRef.current || !window.kakao?.maps) return;

    /* Tourism overlays cleanup - on hold
    tourismOverlaysRef.current.forEach(o => o.setMap(null));
    tourismOverlaysRef.current = []; */

    const K = window.kakao.maps;
    const center = new K.LatLng(MAP_CENTER.lat, MAP_CENTER.lng);
    const map = new K.Map(containerRef.current, { center, level: MAP_LEVEL });
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

    /* 기존 
    places.forEach(place => {
      const el = document.createElement("div");
      markerElemsRef.current.set(place.id, el);
      renderPin(el, place, false, false);

      const overlay = new K.CustomOverlay({
        position: new K.LatLng(place.lat, place.lng),
        content: el,
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 3,
      });
      overlay.setMap(map);

      el.addEventListener("click", e => {
        e.stopPropagation();
        onSelectPlace(place.id);
      });
    }); */

    K.event.addListener(map, "click", onDeselect);
    setMapInitCount(c => c + 1);
  };

  // Update PLACES pin visuals on selection/nav change (no-op while markers are commented out)
  useEffect(() => {
    places.forEach(place => {
      const el = markerElemsRef.current.get(place.id);
      if (el) renderPin(el, place, place.id === selectedId, place.id === navTarget?.id);
    });
  }, [selectedId, navTarget, places]);

  // Add/update search markers whenever searchPlaces or selectedSearchId changes
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    searchOverlaysRef.current.forEach(o => o.setMap(null));
    searchOverlaysRef.current = [];
    searchMarkerElemsRef.current.clear();

    searchPlaces.forEach((sp, idx) => {
      const color = MARKER_COLORS[idx % MARKER_COLORS.length];
      const el = document.createElement("div");
      searchMarkerElemsRef.current.set(sp.id, el);
      renderSearchPin(el, color, sp.id === selectedSearchId);

      const overlay = new K.CustomOverlay({
        position: new K.LatLng(sp.lat, sp.lng),
        content: el,
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 3,
      });
      overlay.setMap(mapRef.current!);
      searchOverlaysRef.current.push(overlay);

      el.addEventListener("click", e => {
        e.stopPropagation();
        onSelectSearchPlace?.(sp.id);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInitCount, searchPlaces, selectedSearchId]);

  /* Tourism markers useEffect - on hold
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    tourismOverlaysRef.current.forEach(o => o.setMap(null));
    tourismOverlaysRef.current = [];

    tourismPlaces.forEach(tp => {
      const el = createTourismPinEl(tp.name);
      const overlay = new K.CustomOverlay({
        position: new K.LatLng(tp.lat, tp.lng),
        content: el,
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 2,
      });
      overlay.setMap(mapRef.current!);
      tourismOverlaysRef.current.push(overlay);
    });
  }, [mapInitCount, tourismPlaces]); */

  // Draw/remove route polyline on navTarget change
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const K = window.kakao.maps;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
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
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => window.kakao.maps.load(initMap)}
      />
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}
