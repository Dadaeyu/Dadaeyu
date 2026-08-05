import type { TourismMyCourse } from "./types";
import { formatCoursePeriod } from "./course-likes";

/** 내가 만든 코스 — 서버 API 경유 (tb_course RLS 우회·세션 검증) */
export async function fetchMyCourses(_userId?: string): Promise<TourismMyCourse[]> {
  const res = await fetch("/api/courses/mine", { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "내 코스를 불러오지 못했습니다.");
  }
  const json = (await res.json()) as { items?: TourismMyCourse[] };
  return json.items ?? [];
}

export function courseDurationLabel(course: TourismMyCourse): string {
  const period = formatCoursePeriod(course.startdate, course.enddate);
  if (period) return period;
  if (course.day_count > 0) return `${course.day_count}일`;
  return "일정 미정";
}

export function isCoursePublic(course: TourismMyCourse): boolean {
  return (course.open_yn ?? "Y").toUpperCase() === "Y";
}
