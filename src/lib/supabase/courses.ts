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
  minRating?: number; // 코스 평균 별점(tb_post.course_rating)이 이 값 이상이어야 매치
  mine?: boolean; // true면 open_yn='Y' 전체가 아니라 로그인한 내 코스(register=나)만 대상으로 조회
  sort?: CourseSort;
}

// 등록일/제목/별점 각각 오름·내림차순. 서버 기본값은 registtime_desc(최신순).
export type CourseSort =
  "registtime_desc" | "registtime_asc" | "title_asc" | "title_desc" | "rating_desc" | "rating_asc";

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
  // headcount 기본값(1명)도 실제 값으로 취급해 항상 서버에 보낸다 — 최소 인원(accommin) > 1인
  // 단체 전용 장소가 낀 코스는 기본 상태에서도 제외되도록 하는 의도된 동작이다(/api/search 의
  // getHeadcountExcludeIds 와 동일 설계). FilterFields 배지가 headcount > 1일 때만 "필터 켜짐"으로
  // 세는 건 이 값이 UI상 "필터 안 씀"으로 보여야 한다는 뜻일 뿐, 실제 조회 조건과는 별개다.
  if (filters?.headcount && filters.headcount >= 1)
    params.set("headcount", String(filters.headcount));
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  if (filters?.minRating && filters.minRating > 0)
    params.set("minRating", String(filters.minRating));
  if (filters?.mine) params.set("mine", "1");
  if (filters?.sort && filters.sort !== "registtime_desc") params.set("sort", filters.sort);

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
