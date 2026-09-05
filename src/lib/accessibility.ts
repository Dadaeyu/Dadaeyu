/**
 * 팀원 협업 규칙 (접근성 자동 적용 유지):
 * 1. 색상은 Tailwind 클래스(bg-white, text-gray-800 등) 사용 — 인라인 hex/bg-[#fff] 금지
 * 2. 아이콘만 있는 버튼에는 aria-label 필수
 * 3. 이미지 alt, 클릭 요소는 button/a 등 시맨틱 태그 사용
 */

export const A11Y_STORAGE_KEY = "dadaeyu-a11y";

export const FONT_SCALE_MIN = 100;
export const FONT_SCALE_MAX = 200;
export const FONT_SCALE_STEP = 10;

export interface AccessibilityState {
  darkMode: boolean;
  highContrast: boolean;
  fontScale: number;
  readAloud: boolean;
  easyMode: boolean;
}

export const DEFAULT_A11Y_STATE: AccessibilityState = {
  darkMode: false,
  highContrast: false,
  fontScale: 100,
  readAloud: false,
  easyMode: false
};

export type AccessibilityPreferences = {
  dark_mode: boolean;
  high_contrast: boolean;
  font_scale: number;
  read_aloud: boolean;
};

export function loadAccessibilityState(): AccessibilityState {
  if (typeof window === "undefined") return DEFAULT_A11Y_STATE;

  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return DEFAULT_A11Y_STATE;

    const parsed = JSON.parse(raw) as Partial<AccessibilityState>;
    return {
      darkMode: Boolean(parsed.darkMode),
      highContrast: Boolean(parsed.highContrast),
      fontScale: clampFontScale(parsed.fontScale ?? DEFAULT_A11Y_STATE.fontScale),
      readAloud: Boolean(parsed.readAloud),
      easyMode: Boolean(parsed.easyMode)
    };
  } catch {
    return DEFAULT_A11Y_STATE;
  }
}

export function saveAccessibilityState(state: AccessibilityState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(state));
}

export function clampFontScale(value: number): number {
  const stepped = Math.round(value / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, stepped));
}

export function applyAccessibilityState(state: AccessibilityState): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", state.darkMode);
  root.classList.toggle("high-contrast", state.highContrast);
  root.classList.toggle("easy-mode", state.easyMode);
  root.classList.toggle("font-scale-large", state.fontScale >= 150);
  root.style.setProperty("--a11y-scale", String(state.fontScale / 100));
}

export function mergeAccessibilityPreferences(
  prefs: AccessibilityPreferences,
  current: AccessibilityState
): AccessibilityState {
  return {
    darkMode: prefs.dark_mode,
    highContrast: prefs.high_contrast,
    fontScale: prefs.font_scale,
    readAloud: prefs.read_aloud,
    easyMode: current.easyMode
  };
}

const ROW_SPEAK_LIMIT = 400;
const SECTION_SPEAK_LIMIT = 800;

const CHROME_SELECTOR = "header, nav, footer, [data-a11y-chrome], [aria-hidden='true']";

const CONTENT_BLOCK_SELECTOR = [
  "[data-speakable]",
  "article",
  "section",
  "li",
  "[role='listitem']",
  "[role='dialog']",
  "dl > div",
  "dialog"
].join(", ");

/** 호버로 읽어주는 인터랙티브 요소 */
export const HOVER_SPEAK_SELECTOR =
  "button, a, [role='button'], [role='link'], input, textarea, select";

function normalizeSpeakText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * 호버 발화 중 마우스가 relatedTarget으로 이동했을 때 중지할지.
 * 창 밖·비 Element·chrome·읽을 곳 없으면 true.
 */
export function shouldStopHoverSpeech(relatedTarget: EventTarget | null): boolean {
  if (relatedTarget == null || typeof relatedTarget !== "object") return true;
  if (!("closest" in relatedTarget) || typeof (relatedTarget as Element).closest !== "function") {
    return true;
  }

  const el = relatedTarget as Element;
  if (isA11yChrome(el)) return true;
  if (el.closest(HOVER_SPEAK_SELECTOR)) return false;
  if (findSpeakableBlock(el)) return false;
  return true;
}

function speakLimitFor(element: Element): number {
  const tag = element.tagName.toLowerCase();
  if (
    tag === "section" ||
    tag === "article" ||
    tag === "dialog" ||
    element.getAttribute("role") === "dialog"
  ) {
    return SECTION_SPEAK_LIMIT;
  }
  return ROW_SPEAK_LIMIT;
}

export function isA11yChrome(element: Element): boolean {
  return Boolean(element.closest(CHROME_SELECTOR));
}

/** 눌러서 읽을 가장 가까운 내용 블록. main/body처럼 너무 큰 컨테이너는 고르지 않는다. */
export function findSpeakableBlock(start: Element): Element | null {
  if (isA11yChrome(start)) return null;

  const explicit = start.closest("[data-speakable]");
  if (explicit && !isA11yChrome(explicit)) return explicit;

  // dt/dd 묶음: 같은 행(div) 또는 dl 바로 아래 형제 쌍
  const dtOrDd = start.closest("dt, dd");
  if (dtOrDd?.parentElement) {
    const parent = dtOrDd.parentElement;
    if (
      parent.tagName.toLowerCase() === "div" &&
      parent.parentElement?.tagName.toLowerCase() === "dl"
    ) {
      return parent;
    }
    return dtOrDd;
  }

  let current: Element | null = start;
  while (current) {
    if (isA11yChrome(current)) return null;
    const tag = current.tagName.toLowerCase();
    if (tag === "main" || tag === "body" || tag === "html") return null;

    if (current.matches(CONTENT_BLOCK_SELECTOR)) {
      return current;
    }

    const role = current.getAttribute("role");
    if (
      role === "button" ||
      role === "link" ||
      tag === "button" ||
      tag === "a" ||
      tag === "h1" ||
      tag === "h2" ||
      tag === "h3" ||
      tag === "p"
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

/** 방금 읽은 블록의 다음 형제(문서 순서)를 찾는다. */
export function findNextSpeakableBlock(from: Element): Element | null {
  const root =
    from.closest("dialog, [role='dialog'], main, [data-place-section]") ?? from.parentElement;
  if (!root) return null;

  const candidates = Array.from(
    root.querySelectorAll(
      "[data-speakable], article, section, li, [role='listitem'], dl > div, h1, h2, h3, p, button, a"
    )
  ).filter((el) => !isA11yChrome(el) && normalizeSpeakText(el.textContent));

  const index = candidates.indexOf(from);
  if (index >= 0 && index < candidates.length - 1) {
    return candidates[index + 1] ?? null;
  }

  // from이 후보 목록에 없으면, 문서 순서상 from 다음에 오는 첫 후보
  for (const candidate of candidates) {
    const position = from.compareDocumentPosition(candidate);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return candidate;
    }
  }

  return null;
}

function labelledByText(element: Element): string {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (!labelledBy) return "";
  return labelledBy
    .split(/\s+/)
    .map((id) => normalizeSpeakText(document.getElementById(id)?.textContent))
    .filter(Boolean)
    .join(" ");
}

export function getSpeakableText(element: Element): string | null {
  const dataSpeak = element.getAttribute("data-speak-text")?.trim();
  if (dataSpeak) return dataSpeak.slice(0, speakLimitFor(element));

  const ariaLabel = element.getAttribute("aria-label")?.trim();
  const role = element.getAttribute("role");
  const tag = element.tagName.toLowerCase();
  const isTextarea = tag === "textarea";
  const inputType =
    tag === "input"
      ? ((element as HTMLInputElement).type || element.getAttribute("type") || "text").toLowerCase()
      : "";
  const isTextInput =
    tag === "input" && ["text", "search", "email", "tel", "url", "number"].includes(inputType);

  if (isTextarea || isTextInput || inputType === "password") {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    const readableValue = inputType === "password" ? "" : input.value;
    const inputText = (readableValue || input.placeholder || "").replace(/\s+/g, " ").trim();
    const parts = [ariaLabel, inputText].filter((part): part is string => Boolean(part));
    return parts.length ? parts.join(", ").slice(0, 200) : null;
  }

  if (tag === "input" && ariaLabel) return ariaLabel;

  // 짧은 컨트롤은 aria-label만. 섹션/카드는 본문까지.
  const isCompactControl =
    role === "button" ||
    role === "link" ||
    tag === "button" ||
    tag === "a" ||
    tag === "input" ||
    tag === "textarea" ||
    tag === "select";

  if (ariaLabel && isCompactControl) return ariaLabel;

  const label = labelledByText(element);
  const body = normalizeSpeakText(element.textContent);
  if (label) {
    const withoutRepeatedLabel = body.startsWith(label) ? body.slice(label.length).trim() : body;
    const combined = withoutRepeatedLabel ? `${label}. ${withoutRepeatedLabel}` : label;
    return combined.slice(0, speakLimitFor(element)) || null;
  }

  if (ariaLabel) return ariaLabel.slice(0, speakLimitFor(element));

  const interactive = isCompactControl;
  const isContentBlock =
    element.hasAttribute("data-speakable") ||
    tag === "section" ||
    tag === "article" ||
    tag === "li" ||
    tag === "dialog" ||
    tag === "div" ||
    tag === "dl" ||
    tag === "dt" ||
    tag === "dd" ||
    role === "dialog" ||
    role === "listitem";

  if (
    !interactive &&
    !isContentBlock &&
    tag !== "h1" &&
    tag !== "h2" &&
    tag !== "h3" &&
    tag !== "p"
  ) {
    return null;
  }

  if (!body) return null;
  return body.slice(0, speakLimitFor(element));
}
