// 카카오톡 공유하기 SDK (지도 SDK와는 별개 — window.Kakao, 대문자 K).
interface KakaoShareLink {
  mobileWebUrl: string;
  webUrl: string;
}

interface KakaoShareFeedContent {
  title: string;
  description?: string;
  imageUrl: string;
  link: KakaoShareLink;
}

interface KakaoShareButton {
  title: string;
  link: KakaoShareLink;
}

interface KakaoShareStatic {
  sendDefault(options: {
    objectType: "feed";
    content: KakaoShareFeedContent;
    buttons?: KakaoShareButton[];
  }): void;
}

interface KakaoStatic {
  init(appKey: string): void;
  isInitialized(): boolean;
  Share: KakaoShareStatic;
}

interface Window {
  Kakao?: KakaoStatic;
}
