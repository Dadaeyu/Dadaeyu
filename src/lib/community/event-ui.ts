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

/** 오늘(한국 시간) 날짜를 YYYY-MM-DD로 반환한다. */
export function getTodayKstDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
}

/** 이벤트 상태 배지 — 관리자가 입력한 배지 문구 대신, 기간(period_start~period_end)이
 * 설정된 이벤트라면 오늘 날짜와 비교해 "예정/진행중/종료"를 자동으로 계산한다.
 * 기간이 끝난 뒤에도 "진행중" 문구를 관리자가 직접 고쳐야만 없어지던 문제를 막기 위함.
 * 기간이 없는 이벤트(상시 안내 등)는 관리자가 입력한 배지를 그대로 쓴다. */
export function resolveEventStatusBadge(
  periodStart: string | null,
  periodEnd: string | null,
  fallback: { label: string; color: string },
  today: string = getTodayKstDate()
): { label: string; color: string } {
  if (!periodStart || !periodEnd) return fallback;
  if (today < periodStart) return { label: "예정", color: "bg-navy-100 text-navy-700" };
  if (today > periodEnd) return { label: "종료", color: "bg-gray-100 text-gray-700" };
  return { label: "진행중", color: "bg-brand-100 text-brand-700" };
}
