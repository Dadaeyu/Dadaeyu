"use client";

import { useEffect, useRef, useState } from "react";

export interface MyLocationCoords {
  lat: number;
  lng: number;
}

export type MyLocationStatus = "idle" | "locating" | "active" | "error";

// 대전 전역을 넉넉히 덮는 bounding box (동/중/서/유성/대덕구 + 여유분)
const DAEJEON_BOUNDS = { minLat: 36.05, maxLat: 36.55, minLng: 127.15, maxLng: 127.65 };

function isInDaejeon({ lat, lng }: MyLocationCoords): boolean {
  return (
    lat >= DAEJEON_BOUNDS.minLat &&
    lat <= DAEJEON_BOUNDS.maxLat &&
    lng >= DAEJEON_BOUNDS.minLng &&
    lng <= DAEJEON_BOUNDS.maxLng
  );
}

// 브라우저 Geolocation으로 실시간 위치를 추적한다.
// 대전 밖이거나 권한 거부/조회 실패 시 location은 null로 유지되어 마커를 표시하지 않는다.
export function useMyLocation() {
  const [location, setLocation] = useState<MyLocationCoords | null>(null);
  const [status, setStatus] = useState<MyLocationStatus>("idle");
  const [focusTrigger, setFocusTrigger] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const pendingFocusRef = useRef(false);

  const start = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setStatus("locating");
    pendingFocusRef.current = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!isInDaejeon(coords)) {
          setLocation(null);
          setStatus("error");
          return;
        }
        setLocation(coords);
        setStatus("active");
        if (pendingFocusRef.current) {
          pendingFocusRef.current = false;
          setFocusTrigger((n) => n + 1);
        }
      },
      () => {
        setLocation(null);
        setStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  return { location, status, start, focusTrigger };
}
