const KAKAO_MAP_SCRIPT_ID = "kakao-map-sdk";
const LOAD_TIMEOUT_MS = 15_000;

let loadPromise: Promise<typeof kakao> | null = null;

function waitForMapsReady(): Promise<typeof kakao> {
  return new Promise((resolve, reject) => {
    if (!window.kakao?.maps) {
      reject(new Error("카카오맵 SDK 로드 실패"));
      return;
    }

    const timer = window.setTimeout(() => {
      reject(new Error("카카오맵 SDK 로드 시간 초과"));
    }, LOAD_TIMEOUT_MS);

    window.kakao.maps.load(() => {
      window.clearTimeout(timer);
      resolve(window.kakao);
    });
  });
}

function injectScript(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(
      KAKAO_MAP_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existing) {
      if (window.kakao?.maps) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("카카오맵 SDK 로드 실패")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_MAP_SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("카카오맵 SDK 로드 실패"));
    document.head.appendChild(script);
  });
}

function loadKakaoMapInternal(): Promise<typeof kakao> {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!key) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.")
    );
  }

  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("카카오맵은 브라우저에서만 로드할 수 있습니다.")
    );
  }

  if (window.kakao?.maps) {
    return waitForMapsReady();
  }

  return injectScript(key).then(() => waitForMapsReady());
}

export function loadKakaoMap(): Promise<typeof kakao> {
  if (!loadPromise) {
    loadPromise = loadKakaoMapInternal().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}
