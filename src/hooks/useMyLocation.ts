"use client";

import { useEffect, useRef, useState } from "react";

export interface MyLocationCoords {
  lat: number;
  lng: number;
}

export type MyLocationStatus = "idle" | "locating" | "active" | "error";
export type MyLocationErrorReason =
  "unsupported" | "denied" | "unavailable" | "timeout" | "outside_daejeon" | null;

// 대전 전역을 넉넉히 덮는 bounding box (동/중/서/유성/대덕구 + 여유분)
const DAEJEON_BOUNDS = { minLat: 36.05, maxLat: 36.55, minLng: 127.15, maxLng: 127.65 };

// 이 정도(m) 이내로 정확해지면 더 기다리지 않고 확정한다.
const ACCURACY_THRESHOLD_M = 100;
// 첫 화면 표시(카메라 이동)는 이 정도로 정확한 값이 나오기 전까지는 하지 않는다.
// (초기 Wi-Fi/IP 기반 리딩은 정확도가 수백m~수km로 나빠서, 그대로 보여주면
// "엉뚱한 곳이 먼저 잡혔다가 내 위치로 바뀌는" 것처럼 보인다 — 이를 막기 위한 값.)
const ACCEPTABLE_ACCURACY_M = 500;
// 정확도가 끝까지 안 좋아도(Wi-Fi/IP 기반 등) 이 횟수까지만 시도하고 마지막 값으로 확정한다.
const MAX_READINGS = 6;

function isInDaejeon({ lat, lng }: MyLocationCoords): boolean {
  return (
    lat >= DAEJEON_BOUNDS.minLat &&
    lat <= DAEJEON_BOUNDS.maxLat &&
    lng >= DAEJEON_BOUNDS.minLng &&
    lng <= DAEJEON_BOUNDS.maxLng
  );
}

// 버튼을 누른 시점에만 위치를 잡는다(백그라운드에서 계속 따라다니지 않음).
// 다만 GPS가 스스로 정확도를 보정할 시간을 잠깐 주기 위해, 충분히 정확한 값이 나오거나
// 시도 횟수를 다 채울 때까지만 짧게 추적하다가 자동으로 멈춘다 — 그래서 "허용" 직후
// 대충 잡힌 값(Wi-Fi/IP 기반) 대신 실제 GPS 위치로 보정될 기회를 준다.
// 대전 밖이거나 권한 거부/조회 실패 시 location은 null로 유지되어 마커를 표시하지 않고,
// resetTrigger를 올려 지도를 대전 전체 화면으로 되돌릴 수 있게 한다.
export function useMyLocation() {
  const [location, setLocation] = useState<MyLocationCoords | null>(null);
  const [status, setStatus] = useState<MyLocationStatus>("idle");
  const [errorReason, setErrorReason] = useState<MyLocationErrorReason>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const readingCountRef = useRef(0);
  const hasFocusedRef = useRef(false);

  const stopWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const start = () => {
    if (!navigator.geolocation) {
      setLocation(null);
      setStatus("error");
      setErrorReason("unsupported");
      setResetTrigger((n) => n + 1);
      return;
    }

    stopWatch();
    readingCountRef.current = 0;
    hasFocusedRef.current = false;
    setStatus("locating");
    setErrorReason(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        readingCountRef.current += 1;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy;
        const isLastAllowedReading = readingCountRef.current >= MAX_READINGS;

        if (!isInDaejeon(coords)) {
          stopWatch();
          setLocation(null);
          setStatus("error");
          setErrorReason("outside_daejeon");
          setResetTrigger((n) => n + 1);
          return;
        }

        // 아직 신뢰하기엔 부정확한 초기 리딩(Wi-Fi/IP 기반 등)은 화면에 반영하지 않고
        // 조용히 다음 리딩을 기다린다 — 단, 시도 횟수를 다 채웠으면 마지막 값이라도 확정한다.
        if (accuracy > ACCEPTABLE_ACCURACY_M && !isLastAllowedReading) {
          return;
        }

        setLocation(coords);
        setStatus("active");
        setErrorReason(null);
        // 지도 이동(카메라 팬)은 처음으로 쓸만한 값을 잡았을 때만 — 이후 보정되는 값은 마커 위치만 갱신.
        if (!hasFocusedRef.current) {
          hasFocusedRef.current = true;
          setFocusTrigger((n) => n + 1);
        }

        if (accuracy <= ACCURACY_THRESHOLD_M || isLastAllowedReading) {
          stopWatch();
        }
      },
      (error) => {
        stopWatch();
        setLocation(null);
        setStatus("error");
        if (error.code === error.PERMISSION_DENIED) setErrorReason("denied");
        else if (error.code === error.POSITION_UNAVAILABLE) setErrorReason("unavailable");
        else if (error.code === error.TIMEOUT) setErrorReason("timeout");
        else setErrorReason("unavailable");
        setResetTrigger((n) => n + 1);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  };

  // 내 위치 표시를 끄고(다시 누르면 재조회) 지도를 대전 전체 화면으로 되돌린다.
  const reset = () => {
    stopWatch();
    setLocation(null);
    setStatus("idle");
    setErrorReason(null);
    setResetTrigger((n) => n + 1);
  };

  useEffect(() => stopWatch, []);

  return { location, status, errorReason, start, reset, focusTrigger, resetTrigger };
}
