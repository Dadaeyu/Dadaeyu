"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const FAILSAFE_MS = 8000;

function urlKey(pathname: string, search: string) {
  return `${pathname}${search}`;
}

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const routeKey = urlKey(pathname, search ? `?${search}` : "");

  const [pending, setPending] = useState(false);
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentKeyRef = useRef(routeKey);
  const pendingRef = useRef(false);

  const clearFailsafe = useCallback(() => {
    if (failsafeRef.current) {
      clearTimeout(failsafeRef.current);
      failsafeRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    clearFailsafe();
    // history.push/replaceState 가 React useInsertionEffect 안에서 호출될 수 있어
    // setState는 다음 태스크로 미룬다.
    setTimeout(() => {
      if (!pendingRef.current) return;
      setPending(true);
    }, 0);
    failsafeRef.current = setTimeout(() => {
      pendingRef.current = false;
      setPending(false);
    }, FAILSAFE_MS);
  }, [clearFailsafe]);

  // 라우트/쿼리 완료 시 해제 (키 변경만 구독)
  useEffect(() => {
    currentKeyRef.current = routeKey;
    if (!pendingRef.current) return;
    pendingRef.current = false;
    clearFailsafe();
    queueMicrotask(() => setPending(false));
  }, [routeKey, clearFailsafe]);

  useEffect(() => {
    const sameDocumentNav = (href: string) => {
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return false;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (!sameDocumentNav(href)) return;
      start();
    };

    const onPopState = () => start();

    const wrapHistory = (method: "pushState" | "replaceState") => {
      const original = history[method].bind(history);
      history[method] = function patched(data: unknown, unused: string, url?: string | URL | null) {
        if (url != null) {
          const abs = new URL(String(url), window.location.href);
          const nextKey = urlKey(abs.pathname, abs.search);
          if (nextKey !== currentKeyRef.current) {
            start();
          }
        }
        return original(data, unused, url);
      };
      return original;
    };

    const origPush = wrapHistory("pushState");
    const origReplace = wrapHistory("replaceState");

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      history.pushState = origPush;
      history.replaceState = origReplace;
      clearFailsafe();
    };
  }, [start, clearFailsafe]);

  if (!pending) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 bottom-20 z-[100] md:bottom-0"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className="bg-ink/25 pointer-events-auto absolute inset-0 cursor-wait backdrop-blur-[1px]"
        onClick={(e) => e.preventDefault()}
        onPointerDown={(e) => e.preventDefault()}
      />
      <div className="bg-surface-soft pointer-events-none absolute inset-x-0 top-0 z-[1] h-1 overflow-hidden">
        <div className="nav-progress-bar bg-brand-500 h-full w-1/3 rounded-r-full" />
      </div>
      <span className="sr-only">페이지를 불러오는 중</span>
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
