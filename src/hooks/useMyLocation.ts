"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMap } from "@/lib/kakao/loadKakaoMap";

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

// bounding box는 사각형이라 대전과 맞닿은 세종·계룡·옥천 등도 넉넉히 통과시킨다.
// 카카오맵 JS SDK(Geocoder)로 실제 시/도가 "대전광역시"인지 한 번 더 확인한다 — 좌표를
// 우리 서버로 보내지 않고 브라우저에서 곧바로 카카오 SDK를 호출한다(이미 지도에 쓰고
// 있는 공개 JS 키만 사용, 서버 전용 REST 키는 쓰지 않음).
// 조회 실패(SDK 로드 실패 등) 시에는 bbox 판정을 그대로 신뢰해 과도하게 막지 않는다.
async function verifyIsDaejeon(coords: MyLocationCoords): Promise<boolean> {
  try {
    const kakao = await loadKakaoMap();
    const geocoder = new kakao.maps.services.Geocoder();
    return await new Promise<boolean>((resolve) => {
      geocoder.coord2RegionCode(coords.lng, coords.lat, (result, status) => {
        if (status !== kakao.maps.services.Status.OK) {
          resolve(true);
          return;
        }
        resolve(result.some((region) => region.region_1depth_name === "대전광역시"));
      });
    });
  } catch {
    return true;
  }
}

// 버튼을 누른 시점에만 위치를 잡는다(백그라운드에서 계속 따라다니지 않음).
// 다만 GPS가 스스로 정확도를 보정할 시간을 잠깐 주기 위해, 충분히 정확한 값이 나오거나
// 시도 횟수를 다 채울 때까지만 짧게 추적하다가 자동으로 멈춘다 — 그래서 "허용" 직후
// 대충 잡힌 값(Wi-Fi/IP 기반) 대신 실제 GPS 위치로 보정될 기회를 준다.
// 대전 밖이거나 권한 거부/조회 실패 시 location은 null로 유지되어 마커를 표시하지 않는다.
// 대전 밖은 사용자가 보던 지도 화면을 그대로 두고(카메라 이동 없음) 안내만 띄우고,
// 권한 거부·조회 실패 등 다른 오류는 resetTrigger를 올려 지도를 대전 전체 화면으로 되돌린다.
export function useMyLocation() {
  const [location, setLocation] = useState<MyLocationCoords | null>(null);
  const [status, setStatus] = useState<MyLocationStatus>("idle");
  const [errorReason, setErrorReason] = useState<MyLocationErrorReason>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const readingCountRef = useRef(0);
  const hasFocusedRef = useRef(false);
  const verifiedRef = useRef(false);
  const sessionIdRef = useRef(0);

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
    verifiedRef.current = false;
    const sessionId = ++sessionIdRef.current;
    setStatus("locating");
    setErrorReason(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        readingCountRef.current += 1;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy;
        const isLastAllowedReading = readingCountRef.current >= MAX_READINGS;

        if (!isInDaejeon(coords)) {
          // 대전 밖은 지도를 움직이지 않는다 — 사용자가 보던 화면 그대로 두고 안내만 띄운다.
          stopWatch();
          setLocation(null);
          setStatus("error");
          setErrorReason("outside_daejeon");
          return;
        }

        setLocation(coords);
        setStatus("active");
        setErrorReason(null);

        if (accuracy <= ACCURACY_THRESHOLD_M || isLastAllowedReading) {
          stopWatch();
        }

        // bbox를 통과한 이번 세션 첫 좌표만 실제 대전인지 한 번 더 확인한다(호출 최소화).
        // 지도 이동(카메라 팬)은 대전이 확인된 뒤에만 한다 — 확인 전에 미리 옮겼다가 대전이
        // 아닌 걸로 밝혀지면 되돌릴 방법이 없어 화면만 어긋난 채로 남는다. 이후 보정되는
        // 값은(이미 한 번 확인·이동했으므로) 마커 위치만 갱신한다.
        if (!verifiedRef.current) {
          verifiedRef.current = true;
          void verifyIsDaejeon(coords).then((ok) => {
            if (sessionIdRef.current !== sessionId) return;
            if (!ok) {
              setLocation(null);
              setStatus("error");
              setErrorReason("outside_daejeon");
              return;
            }
            if (!hasFocusedRef.current) {
              hasFocusedRef.current = true;
              setFocusTrigger((n) => n + 1);
            }
          });
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
    sessionIdRef.current += 1; // 진행 중인 비동기 대전 확인 결과를 무시하게 한다
    stopWatch();
    setLocation(null);
    setStatus("idle");
    setErrorReason(null);
    setResetTrigger((n) => n + 1);
  };

  useEffect(
    () => () => {
      sessionIdRef.current += 1; // 언마운트 후 늦게 온 대전 확인 결과로 setState하지 않게 한다
      stopWatch();
    },
    []
  );

  return { location, status, errorReason, start, reset, focusTrigger, resetTrigger };
}
