/** 관리자 배지 색 — CSS 직접 입력 대신 프리셋 */

export const EVENT_BADGE_COLOR_PRESETS = [
  { id: "brand", label: "민트", className: "bg-brand-100 text-brand-700" },
  { id: "navy", label: "네이비", className: "bg-navy-100 text-navy-700" },
  { id: "amber", label: "앰버", className: "bg-amber-100 text-amber-800" },
  { id: "red", label: "레드", className: "bg-red-100 text-red-700" },
  { id: "neutral", label: "회색", className: "bg-gray-100 text-gray-700" }
] as const;

export type EventBadgeColorId = (typeof EVENT_BADGE_COLOR_PRESETS)[number]["id"];

export const DEFAULT_EVENT_BADGE_COLOR = EVENT_BADGE_COLOR_PRESETS[0].className;
export const DEFAULT_EVENT_COVER_GRADIENT = "from-brand-400 to-brand-500";
export const DEFAULT_EVENT_EMOJI = "🎉";

export function resolveEventBadgeColor(className: string | null | undefined): string {
  const value = (className ?? "").trim();
  if (EVENT_BADGE_COLOR_PRESETS.some((p) => p.className === value)) return value;
  return DEFAULT_EVENT_BADGE_COLOR;
}

/** YYYY-MM-DD → YYYY.MM.DD */
export function formatEventDateDot(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return isoDate.trim();
  return `${m[1]}.${m[2]}.${m[3]}`;
}

export function buildPeriodLabel(start: string | null, end: string | null): string {
  const s = start?.trim() || "";
  const e = end?.trim() || "";
  if (s && e) return `${formatEventDateDot(s)} ~ ${formatEventDateDot(e)}`;
  if (s) return `${formatEventDateDot(s)} ~`;
  if (e) return `~ ${formatEventDateDot(e)}`;
  return "";
}

import { isEndBeforeStart } from "@/lib/date-range";

/** date input 값(YYYY-MM-DD) 검증. 빈 값은 null */
export function normalizeEventDate(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const ms = Date.parse(`${v}T00:00:00`);
  if (Number.isNaN(ms)) return null;
  return v;
}

export function validateEventPeriod(start: string | null, end: string | null): string | null {
  if (start && end && isEndBeforeStart(start, end, true)) {
    return "종료일은 시작일 이후여야 합니다.";
  }
  return null;
}
