import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { afterEach } from "node:test";
import {
  A11Y_STORAGE_KEY,
  applyAccessibilityState,
  DEFAULT_A11Y_STATE,
  loadAccessibilityState,
  mergeAccessibilityPreferences,
  saveAccessibilityState,
  getSpeakableText,
  type AccessibilityState
} from "./accessibility.ts";

type TestStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  clear: () => void;
};

type TestRoot = {
  classes: Set<string>;
  styleValues: Map<string, string>;
  classList: {
    add: (name: string) => void;
    toggle: (name: string, force?: boolean) => void;
    contains: (name: string) => boolean;
  };
  style: {
    setProperty: (name: string, value: string) => void;
    getPropertyValue: (name: string) => string;
  };
};

const mutableGlobals = globalThis as unknown as {
  localStorage?: TestStorage;
  window?: { localStorage: TestStorage };
  document?: {
    documentElement: TestRoot;
    getElementById?: (id: string) => { textContent?: string | null } | null;
  };
};

function installLocalStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage: TestStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    clear: () => values.clear()
  };

  mutableGlobals.localStorage = storage;
  mutableGlobals.window = { localStorage: storage };
  return values;
}

function installDocument() {
  const root: TestRoot = {
    classes: new Set<string>(),
    styleValues: new Map<string, string>(),
    classList: {
      add(name) {
        root.classes.add(name);
      },
      toggle(name, force) {
        if (force) {
          root.classes.add(name);
        } else {
          root.classes.delete(name);
        }
      },
      contains(name) {
        return root.classes.has(name);
      }
    },
    style: {
      setProperty(name, value) {
        root.styleValues.set(name, value);
      },
      getPropertyValue(name) {
        return root.styleValues.get(name) ?? "";
      }
    }
  };

  mutableGlobals.document = { documentElement: root };
  return root;
}

afterEach(() => {
  delete mutableGlobals.localStorage;
  delete mutableGlobals.window;
  delete mutableGlobals.document;
});

test("이전 저장 데이터에 easyMode가 없으면 false로 읽는다", () => {
  installLocalStorage({
    [A11Y_STORAGE_KEY]: JSON.stringify({
      darkMode: true,
      highContrast: true,
      fontScale: 130,
      readAloud: true
    })
  });

  const state = loadAccessibilityState();

  assert.equal(state.easyMode, false);
  assert.equal(state.darkMode, true);
  assert.equal(state.highContrast, true);
  assert.equal(state.fontScale, 130);
  assert.equal(state.readAloud, true);
});

test("쉬운 화면은 폰트 배율과 독립적으로 저장되고 DOM 클래스에 적용된다", () => {
  const stored = installLocalStorage();
  const root = installDocument();
  const easyModeState: AccessibilityState = {
    ...DEFAULT_A11Y_STATE,
    easyMode: true,
    fontScale: 100
  };

  saveAccessibilityState(easyModeState);
  applyAccessibilityState(easyModeState);

  assert.equal(JSON.parse(stored.get(A11Y_STORAGE_KEY) ?? "{}").easyMode, true);
  assert.equal(root.classList.contains("easy-mode"), true);
  assert.equal(root.classList.contains("font-scale-large"), false);
  assert.equal(root.style.getPropertyValue("--a11y-scale"), "1");

  applyAccessibilityState({ ...easyModeState, easyMode: false, fontScale: 160 });

  assert.equal(root.classList.contains("easy-mode"), false);
  assert.equal(root.classList.contains("font-scale-large"), true);
  assert.equal(root.style.getPropertyValue("--a11y-scale"), "1.6");
});

test("DB preferences 동기화는 현재 로컬 easyMode 값을 보존한다", () => {
  const fromDb = mergeAccessibilityPreferences(
    {
      dark_mode: true,
      high_contrast: false,
      font_scale: 150,
      read_aloud: true
    },
    { ...DEFAULT_A11Y_STATE, easyMode: true, fontScale: 120 }
  );

  assert.deepEqual(fromDb, {
    darkMode: true,
    highContrast: false,
    fontScale: 150,
    readAloud: true,
    easyMode: true
  });
});

test("pre-hydration script applies the easy-mode root class from stored state", () => {
  const layout = readFileSync(path.join(process.cwd(), "src", "app", "layout.tsx"), "utf8");

  assert.match(layout, /if \(s\.easyMode\) el\.classList\.add\("easy-mode"\);/u);
});

test("입력 요소는 현재 값 또는 placeholder를 읽을 수 있는 텍스트로 반환한다", () => {
  const inputWithValue = {
    getAttribute(name: string) {
      if (name === "aria-label") return "질문 입력";
      return null;
    },
    tagName: "INPUT",
    textContent: "",
    value: "유모차 가능한 곳 알려줘",
    placeholder: "메시지를 입력하세요"
  } as unknown as Element;

  assert.equal(getSpeakableText(inputWithValue), "질문 입력, 유모차 가능한 곳 알려줘");

  const textareaWithPlaceholder = {
    getAttribute(name: string) {
      if (name === "aria-label") return "댓글 입력";
      return null;
    },
    tagName: "TEXTAREA",
    textContent: "",
    value: "",
    placeholder: "댓글을 입력하세요"
  } as unknown as Element;

  assert.equal(getSpeakableText(textareaWithPlaceholder), "댓글 입력, 댓글을 입력하세요");
});

test("비밀번호와 선택 입력은 민감하거나 무의미한 value를 읽지 않는다", () => {
  const passwordInput = {
    getAttribute(name: string) {
      if (name === "aria-label") return "비밀번호";
      if (name === "type") return "password";
      return null;
    },
    tagName: "INPUT",
    textContent: "",
    type: "password",
    value: "secret-password",
    placeholder: "비밀번호를 입력하세요"
  } as unknown as Element;

  assert.equal(getSpeakableText(passwordInput), "비밀번호, 비밀번호를 입력하세요");

  const checkbox = {
    getAttribute(name: string) {
      if (name === "aria-label") return "답변 자동 읽기";
      if (name === "type") return "checkbox";
      return null;
    },
    tagName: "INPUT",
    textContent: "",
    type: "checkbox",
    value: "on"
  } as unknown as Element;

  assert.equal(getSpeakableText(checkbox), "답변 자동 읽기");
});
