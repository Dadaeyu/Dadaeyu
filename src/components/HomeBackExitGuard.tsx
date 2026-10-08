"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { installHomeBackExitGuard } from "@/lib/navigation/homeBackExit";

const EXIT_CONFIRM_MESSAGE = "앱을 종료하시겠습니까?";

function isStandaloneDisplayMode(): boolean {
  return (
    typeof window !== "undefined" &&
    "matchMedia" in window &&
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function HomeBackExitGuard() {
  const pathname = usePathname();
  return <HomePathExitGuard key={pathname} pathname={pathname} />;
}

function HomePathExitGuard({ pathname }: { pathname: string }) {
  const [exitReady, setExitReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const standalone = isStandaloneDisplayMode();
    const userAgent = window.navigator.userAgent;

    return installHomeBackExitGuard({
      window,
      pathname,
      standalone,
      userAgent,
      confirmMessage: EXIT_CONFIRM_MESSAGE,
      onExitFallback: () => setExitReady(true)
    });
  }, [pathname, attempt]);

  if (!exitReady) return null;

  return (
    <div className="bg-background text-ink border-hairline fixed right-4 bottom-24 left-4 z-50 mx-auto max-w-md rounded-xl border p-4 shadow-lg">
      <p role="status">앱이 닫히지 않으면 뒤로가기를 한 번 더 눌러 주세요.</p>
      <button
        type="button"
        className="mt-3 min-h-11 rounded-lg border px-4 text-sm font-medium"
        onClick={() => {
          setExitReady(false);
          setAttempt((value) => value + 1);
        }}
      >
        계속 이용하기
      </button>
    </div>
  );
}
