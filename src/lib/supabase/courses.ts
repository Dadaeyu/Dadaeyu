import type { TourismMyCourse, TourismSharedCourse } from "./types";
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

export interface SharedCourseFilters {
  accessibility?: string[]; // tb_code BARRIERFREE code_id 들 — 코스에 해당 접근성 장소가 하나라도 있으면 매치
  themes?: string[]; // tb_code LCLSSYSTM1 code_id 들 — 코스에 해당 테마 장소가 하나라도 있으면 매치
  favoritesOnly?: boolean; // 로그인 사용자가 즐겨찾기한 코스만
  gu?: string; // 코스에 포함된 "모든" 장소가 이 구(+동)에 속해야 매치
  dong?: string;
  headcount?: number; // 코스에 포함된 장소 중 하나라도 이 인원을 수용 못 하면 코스 제외
  dateFrom?: string; // 코스에 포함된 장소 중 하나라도 이 기간 내내 휴무면 코스 제외
  dateTo?: string;
}

/** 공유 코스 — tb_course.open_yn='Y' (서버 API 경유, tb_course RLS 우회), limit/offset 페이징 + 필터 */
export async function fetchSharedCourses(
  offset = 0,
  limit = 10,
  filters?: SharedCourseFilters
): Promise<{ items: TourismSharedCourse[]; hasMore: boolean }> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (filters?.accessibility?.length) params.set("accessibility", filters.accessibility.join(","));
  if (filters?.themes?.length) params.set("themes", filters.themes.join(","));
  if (filters?.favoritesOnly) params.set("favoritesOnly", "1");
  if (filters?.gu) params.set("gu", filters.gu);
  if (filters?.dong) params.set("dong", filters.dong);
  if (filters?.headcount && filters.headcount >= 1) params.set("headcount", String(filters.headcount));
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);

  const res = await fetch(`/api/courses/shared?${params.toString()}`, {
    credentials: "same-origin",
    cache: "no-store"
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "공유 코스를 불러오지 못했습니다.");
  }
  const json = (await res.json()) as { items?: TourismSharedCourse[]; hasMore?: boolean };
  return { items: json.items ?? [], hasMore: json.hasMore ?? false };
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
