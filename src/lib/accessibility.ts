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
}

export const DEFAULT_A11Y_STATE: AccessibilityState = {
  darkMode: false,
  highContrast: false,
  fontScale: 100,
  readAloud: false,
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
  const stepped =
    Math.round(value / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, stepped));
}

export function applyAccessibilityState(state: AccessibilityState): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", state.darkMode);
  root.classList.toggle("high-contrast", state.highContrast);
  root.style.setProperty("--a11y-scale", String(state.fontScale / 100));
}

export function getSpeakableText(element: Element): string | null {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl?.textContent?.trim()) return labelEl.textContent.trim();
  }

  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  const role = element.getAttribute("role");
  const tag = element.tagName.toLowerCase();
  const interactive =
    role === "button" ||
    role === "link" ||
    tag === "button" ||
    tag === "a" ||
    tag === "input" ||
    tag === "textarea" ||
    tag === "select";

  if (!interactive && tag !== "h1" && tag !== "h2" && tag !== "h3" && tag !== "p") {
    return null;
  }

  const text = element.textContent?.replace(/\s+/g, " ").trim();
  if (!text) return null;

  return text.slice(0, 200);
}
