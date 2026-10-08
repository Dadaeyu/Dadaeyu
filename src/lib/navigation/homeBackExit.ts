export const HOME_EXIT_GUARD_STATE_KEY = "__dadaeyuHomeExitGuard";

type HistoryState = Record<string, unknown> | null;

export function isHomePath(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function isAppLikeRuntime({
  standalone,
  userAgent
}: {
  standalone: boolean;
  userAgent: string;
}): boolean {
  return standalone || /\bAndroid\b/iu.test(userAgent);
}

export function shouldEnableHomeExitGuard({
  pathname,
  standalone,
  userAgent
}: {
  pathname: string;
  standalone: boolean;
  userAgent: string;
}): boolean {
  return isHomePath(pathname) && isAppLikeRuntime({ standalone, userAgent });
}

export function hasHomeExitGuardState(state: unknown): boolean {
  return Boolean(state && typeof state === "object" && HOME_EXIT_GUARD_STATE_KEY in state);
}

export function withHomeExitGuardState(state: unknown): HistoryState {
  const base = state && typeof state === "object" ? state : {};
  return {
    ...base,
    [HOME_EXIT_GUARD_STATE_KEY]: true
  };
}

export function shouldConfirmHomeBackExit({
  pathname,
  state,
  standalone,
  userAgent
}: {
  pathname: string;
  state: unknown;
  standalone: boolean;
  userAgent: string;
}): boolean {
  return (
    shouldEnableHomeExitGuard({ pathname, standalone, userAgent }) && !hasHomeExitGuardState(state)
  );
}

export function closeTopHomeOverlay(document: Document): boolean {
  const closeButton = document.querySelector<HTMLButtonElement>(
    'dialog[open] button[aria-label="채팅창 닫기"], dialog[open] button[aria-label="장소 정보 닫기"]'
  );
  if (!closeButton) return false;

  closeButton.click();
  return true;
}

type AppNavigation = {
  currentEntry: { index: number; key: string } | null;
  entries(): { index: number; key: string; sameDocument: boolean }[];
};

function exitAppHistory(window: Window, onExitFallback: () => void): () => void {
  window.close();
  if (window.closed) return () => {};

  const navigation = (window as Window & { navigation?: AppNavigation }).navigation;
  const current = navigation?.currentEntry;
  const first = navigation?.entries().find((entry) => entry.sameDocument);
  if (!current || !first || first.index > current.index) {
    // Older browsers retain their native back behavior.
    window.history.back();
    return () => {};
  }

  if (first.index === current.index) {
    onExitFallback();
    return () => {};
  }

  const homeUrl = window.location.href;
  const homeState = window.history.state;
  const cleanup = () => window.removeEventListener("popstate", onExitPopState, true);
  const onExitPopState = (event: PopStateEvent) => {
    cleanup();
    if (navigation.currentEntry?.key !== first.key) return;
    // Keep Next from restoring an old route while clearing the app's back stack.
    // The original Home state includes Next's router tree and must stay intact.
    event.stopImmediatePropagation();
    window.history.replaceState(homeState, "", homeUrl);
    onExitFallback();
  };

  window.addEventListener("popstate", onExitPopState, true);
  // length includes forward entries, so -history.length can overshoot and do nothing.
  window.history.go(first.index - current.index);
  return cleanup;
}

export function installHomeBackExitGuard({
  window,
  pathname,
  standalone,
  userAgent,
  confirmMessage,
  onExitFallback = () => {}
}: {
  window: Window;
  pathname: string;
  standalone: boolean;
  userAgent: string;
  confirmMessage: string;
  onExitFallback?: () => void;
}): () => void {
  if (!shouldEnableHomeExitGuard({ pathname, standalone, userAgent })) return () => {};
  let cleanupExit = () => {};

  const pushGuardState = () => {
    if (hasHomeExitGuardState(window.history.state)) return;
    window.history.pushState(
      withHomeExitGuardState(window.history.state),
      "",
      window.location.href
    );
  };

  const onPopState = (event: PopStateEvent) => {
    if (
      !shouldConfirmHomeBackExit({
        pathname: window.location.pathname,
        state: event.state,
        standalone,
        userAgent
      })
    ) {
      return;
    }

    if (closeTopHomeOverlay(window.document)) {
      pushGuardState();
      return;
    }

    if (window.confirm(confirmMessage)) {
      window.removeEventListener("popstate", onPopState);
      cleanupExit = exitAppHistory(window, onExitFallback);
      return;
    }

    pushGuardState();
  };

  pushGuardState();
  window.addEventListener("popstate", onPopState);

  return () => {
    window.removeEventListener("popstate", onPopState);
    cleanupExit();
  };
}
