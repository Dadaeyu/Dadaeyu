// 카카오톡 공유하기 SDK 로더 — 지도 SDK(loadKakaoMap.ts)와 별개의 스크립트(window.Kakao, 대문자).
// 카카오 디벨로퍼스 콘솔에서 "카카오톡 공유" 제품이 활성화돼 있어야 하고, 지도와 같은
// JavaScript 키(NEXT_PUBLIC_KAKAO_MAP_API_KEY)를 그대로 쓴다.
const KAKAO_SHARE_SCRIPT_ID = "kakao-share-sdk";
const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

let loadPromise: Promise<void> | null = null;

function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(KAKAO_SHARE_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      if (window.Kakao) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("카카오 SDK 로드 실패")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SHARE_SCRIPT_ID;
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("카카오 SDK 로드 실패"));
    document.head.appendChild(script);
  });
}

function loadKakaoShareInternal(): Promise<void> {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ?? process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!key) {
    return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_MAP_API_KEY가 설정되지 않았습니다."));
  }
  if (typeof window === "undefined") {
    return Promise.reject(new Error("카카오 공유는 브라우저에서만 사용할 수 있습니다."));
  }

  return injectScript().then(() => {
    if (!window.Kakao) throw new Error("카카오 SDK 로드 실패");
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(key);
    }
  });
}

export function loadKakaoShare(): Promise<void> {
  if (!loadPromise) {
    loadPromise = loadKakaoShareInternal().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

export async function shareToKakaoTalk(params: {
  title: string;
  description?: string;
  imageUrl: string;
  url: string;
}) {
  await loadKakaoShare();
  window.Kakao!.Share.sendDefault({
    objectType: "feed",
    content: {
      title: params.title,
      description: params.description,
      imageUrl: params.imageUrl,
      link: { mobileWebUrl: params.url, webUrl: params.url }
    },
    buttons: [
      {
        title: "코스 보러가기",
        link: { mobileWebUrl: params.url, webUrl: params.url }
      }
    ]
  });
}
