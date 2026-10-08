import assert from "node:assert/strict";
import test from "node:test";
import {
  HOME_EXIT_GUARD_STATE_KEY,
  hasHomeExitGuardState,
  installHomeBackExitGuard,
  isAppLikeRuntime,
  isHomePath,
  shouldConfirmHomeBackExit,
  shouldEnableHomeExitGuard,
  withHomeExitGuardState
} from "./homeBackExit.ts";

function createFakeWindow() {
  const listeners = new Map<(event: PopStateEvent) => void, boolean>();
  const fakeLocation = {
    href: "https://dadaeyu.vercel.app/",
    pathname: "/"
  };
  let state: unknown = null;
  const fakeDocument = {
    querySelector: (): HTMLButtonElement | null => null
  };
  const fakeWindow = {
    document: fakeDocument,
    location: fakeLocation,
    history: {
      get state() {
        return state;
      },
      pushState(nextState: unknown, _unused: string, url?: string | URL | null) {
        state = nextState;
        if (url) fakeLocation.href = String(url);
      },
      replaceState(nextState: unknown, _unused: string, url?: string | URL | null) {
        state = nextState;
        if (url) {
          const nextUrl = new URL(String(url), fakeLocation.href);
          fakeLocation.href = nextUrl.href;
          fakeLocation.pathname = nextUrl.pathname;
        }
      },
      back() {}
    },
    confirm: () => false,
    close() {},
    addEventListener(_type: "popstate", listener: (event: PopStateEvent) => void, capture = false) {
      listeners.set(listener, capture);
    },
    removeEventListener(_type: "popstate", listener: (event: PopStateEvent) => void) {
      listeners.delete(listener);
    },
    dispatchPopState(nextState: unknown) {
      state = nextState;
      let stopped = false;
      const event = {
        state: nextState,
        stopImmediatePropagation: () => {
          stopped = true;
        }
      } as PopStateEvent;
      for (const [listener] of [...listeners].sort((a, b) => Number(b[1]) - Number(a[1]))) {
        if (stopped) break;
        listener(event);
      }
      return stopped;
    }
  };

  return fakeWindow as typeof fakeWindow & Window;
}

test("home back exit guard only runs on the home path in app-like runtimes", () => {
  assert.equal(isHomePath("/"), true);
  assert.equal(isHomePath(""), true);
  assert.equal(isHomePath("/map"), false);

  assert.equal(isAppLikeRuntime({ standalone: true, userAgent: "Mozilla/5.0" }), true);
  assert.equal(isAppLikeRuntime({ standalone: false, userAgent: "Mozilla/5.0 Android" }), true);
  assert.equal(isAppLikeRuntime({ standalone: false, userAgent: "Mozilla/5.0 Macintosh" }), false);

  assert.equal(
    shouldEnableHomeExitGuard({ pathname: "/", standalone: false, userAgent: "Android" }),
    true
  );
  assert.equal(
    shouldEnableHomeExitGuard({ pathname: "/course", standalone: true, userAgent: "Android" }),
    false
  );
});

test("home back exit guard preserves existing history state and marks its sentinel", () => {
  const state = withHomeExitGuardState({ scroll: 120 });

  assert.equal(hasHomeExitGuardState(state), true);
  assert.equal(state?.scroll, 120);
  assert.equal(state?.[HOME_EXIT_GUARD_STATE_KEY], true);
});

test("home back exit guard confirms only when back leaves the sentinel on home", () => {
  assert.equal(
    shouldConfirmHomeBackExit({
      pathname: "/",
      state: null,
      standalone: false,
      userAgent: "Mozilla/5.0 Android"
    }),
    true
  );
  assert.equal(
    shouldConfirmHomeBackExit({
      pathname: "/",
      state: withHomeExitGuardState(null),
      standalone: false,
      userAgent: "Mozilla/5.0 Android"
    }),
    false
  );
  assert.equal(
    shouldConfirmHomeBackExit({
      pathname: "/map",
      state: null,
      standalone: true,
      userAgent: "Mozilla/5.0 Android"
    }),
    false
  );
});

test("home back exit guard restores sentinel when the user cancels exit", () => {
  const window = createFakeWindow();
  let confirmCount = 0;
  let backCount = 0;
  window.confirm = () => {
    confirmCount += 1;
    return false;
  };
  window.history.back = () => {
    backCount += 1;
  };

  const cleanup = installHomeBackExitGuard({
    window,
    pathname: "/",
    standalone: true,
    userAgent: "Mozilla/5.0 Android",
    confirmMessage: "앱을 종료하시겠습니까?"
  });

  window.dispatchPopState(null);

  assert.equal(confirmCount, 1);
  assert.equal(backCount, 0);
  assert.equal(hasHomeExitGuardState(window.history.state), true);
  cleanup();
});

test("home back exit guard delegates confirmed exit to browser history", () => {
  const window = createFakeWindow();
  let confirmCount = 0;
  let backCount = 0;
  window.confirm = () => {
    confirmCount += 1;
    return true;
  };
  window.history.back = () => {
    backCount += 1;
  };

  const cleanup = installHomeBackExitGuard({
    window,
    pathname: "/",
    standalone: true,
    userAgent: "Mozilla/5.0 Android",
    confirmMessage: "앱을 종료하시겠습니까?"
  });

  window.dispatchPopState(null);
  window.dispatchPopState(null);

  assert.equal(confirmCount, 1);
  assert.equal(backCount, 1);
  cleanup();
});

test("home back exit guard closes home dialogs before showing exit confirmation", () => {
  const window = createFakeWindow();
  let closeCount = 0;
  let confirmCount = 0;
  window.document.querySelector = () =>
    ({
      click() {
        closeCount += 1;
      }
    }) as HTMLButtonElement;
  window.confirm = () => {
    confirmCount += 1;
    return true;
  };

  const cleanup = installHomeBackExitGuard({
    window,
    pathname: "/",
    standalone: true,
    userAgent: "Mozilla/5.0 Android",
    confirmMessage: "앱을 종료하시겠습니까?"
  });

  window.dispatchPopState(null);

  assert.equal(closeCount, 1);
  assert.equal(confirmCount, 0);
  assert.equal(hasHomeExitGuardState(window.history.state), true);
  cleanup();
});

test("home back exit guard does not intercept back after leaving home", () => {
  const window = createFakeWindow();
  let confirmCount = 0;
  window.confirm = () => {
    confirmCount += 1;
    return true;
  };

  const cleanup = installHomeBackExitGuard({
    window,
    pathname: "/",
    standalone: true,
    userAgent: "Mozilla/5.0 Android",
    confirmMessage: "앱을 종료하시겠습니까?"
  });

  window.history.replaceState(null, "", "/map");
  window.dispatchPopState(null);

  assert.equal(confirmCount, 0);
  cleanup();
});

function createNavigationWindow(firstIndex = 0) {
  const window = createFakeWindow();
  const entries = [
    ...(firstIndex > 0 ? [{ index: 0, key: "previous-document", sameDocument: false }] : []),
    { index: firstIndex, key: "first", sameDocument: true },
    { index: 8, key: "home", sameDocument: true },
    { index: 9, key: "sentinel", sameDocument: true }
  ];
  const navigation = { currentEntry: entries[entries.length - 2], entries: () => entries };
  Object.assign(window, { navigation });
  const steps: number[] = [];
  window.history.go = (delta = 0) => {
    steps.push(delta);
  };
  window.confirm = () => true;
  return { window, navigation, steps, entries };
}

const guardOptions = {
  pathname: "/",
  standalone: true,
  userAgent: "Android",
  confirmMessage: "앱을 종료하시겠습니까?"
};

test("종료 확인 후 이전 화면들을 건너뛰고 홈의 Next 상태를 첫 기록에 보존한다", () => {
  const { window, navigation, steps, entries } = createNavigationWindow();
  const homeState = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { route: "/" } };
  let nextRestores = 0;
  let readyCount = 0;
  window.addEventListener("popstate", () => {
    nextRestores += 1;
  });
  const cleanup = installHomeBackExitGuard({
    window,
    ...guardOptions,
    onExitFallback: () => {
      readyCount += 1;
    }
  });
  window.dispatchPopState(homeState);
  assert.deepEqual(steps, [-8]);
  assert.equal(readyCount, 0);

  navigation.currentEntry = entries[0];
  window.history.replaceState({ __NA: true, route: "/course" }, "", "/course");
  assert.equal(window.dispatchPopState(window.history.state), true);
  assert.equal(window.location.pathname, "/");
  assert.deepEqual(window.history.state, homeState);
  assert.equal(nextRestores, 1, "Next must not restore the old course after confirmation");
  assert.equal(readyCount, 1);
  cleanup();
});

test("이전 문서나 앞으로 가기 기록을 포함한 history.length로 과도하게 이동하지 않는다", () => {
  const { window, steps } = createNavigationWindow(3);
  Object.defineProperty(window.history, "length", { value: 30 });
  const cleanup = installHomeBackExitGuard({ window, ...guardOptions });
  window.dispatchPopState(null);
  assert.deepEqual(steps, [-5]);
  cleanup();
});

test("이미 첫 기록이면 새로고침하거나 가드를 다시 쌓지 않고 추가 뒤로가기를 안내한다", () => {
  const { window, navigation, entries, steps } = createNavigationWindow();
  navigation.currentEntry = entries[0];
  let readyCount = 0;
  const cleanup = installHomeBackExitGuard({
    window,
    ...guardOptions,
    onExitFallback: () => {
      readyCount += 1;
    }
  });
  window.dispatchPopState(null);
  assert.deepEqual(steps, []);
  assert.equal(readyCount, 1);
  assert.equal(hasHomeExitGuardState(window.history.state), false);
  cleanup();
});

test("창 닫기를 지원하면 추가 기록 이동과 안내를 하지 않는다", () => {
  const { window, steps } = createNavigationWindow();
  let closeCount = 0;
  window.close = () => {
    closeCount += 1;
    Object.defineProperty(window, "closed", { value: true });
  };
  let readyCount = 0;
  const cleanup = installHomeBackExitGuard({
    window,
    ...guardOptions,
    onExitFallback: () => {
      readyCount += 1;
    }
  });
  window.dispatchPopState(null);
  assert.equal(closeCount, 1);
  assert.deepEqual(steps, []);
  assert.equal(readyCount, 0);
  cleanup();
});

test("종료 기록 이동을 기다리다가 해제되면 나중의 popstate를 가로채지 않는다", () => {
  const { window, navigation, entries } = createNavigationWindow();
  const cleanup = installHomeBackExitGuard({ window, ...guardOptions });
  window.dispatchPopState(null);
  cleanup();
  navigation.currentEntry = entries[0];
  assert.equal(window.dispatchPopState(null), false);
});

test("종료 대상으로 지정하지 않은 기록으로 이동하면 해당 탐색을 가로채지 않는다", () => {
  const { window } = createNavigationWindow();
  let readyCount = 0;
  const cleanup = installHomeBackExitGuard({
    window,
    ...guardOptions,
    onExitFallback: () => {
      readyCount += 1;
    }
  });
  window.dispatchPopState(null);
  assert.equal(window.dispatchPopState(null), false);
  assert.equal(readyCount, 0);
  cleanup();
});

test("종료를 반복해서 취소해도 매번 확인하고 홈 가드를 복원한다", () => {
  const window = createFakeWindow();
  let confirms = 0;
  window.confirm = () => {
    confirms += 1;
    return false;
  };
  const cleanup = installHomeBackExitGuard({ window, ...guardOptions });
  for (let index = 0; index < 3; index += 1) {
    window.dispatchPopState(null);
    assert.equal(hasHomeExitGuardState(window.history.state), true);
  }
  assert.equal(confirms, 3);
  cleanup();
});
