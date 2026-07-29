import { createClient } from "./client";
import { T } from "./tables";
import type { TourismCoursePlace, TourismMyCourse } from "./types";
import { formatCoursePeriod } from "./course-likes";

type CourseRow = {
  course_id: number;
  course_nm: string | null;
  open_yn: string | null;
  startdate: string | null;
  enddate: string | null;
  register: string | null;
  registtime: string | null;
  delete_yn: string | null;
};

type DetailRow = {
  detail_id: number;
  course_id: number;
  day: number | null;
  place_id: number | null;
  starttime: string | null;
  endtime: string | null;
};

type PlaceRow = {
  place_id: number;
  title: string | null;
  addr1: string | null;
  firstimage: string | null;
  contentid: string | null;
  delete_yn: string | null;
};

function isActiveFlag(yn: string | null | undefined): boolean {
  return yn == null || yn === "" || yn.toUpperCase() === "N";
}

/** 내가 만든 코스: tb_course.register = userId + detail/place 조인 */
export async function fetchMyCourses(userId: string): Promise<TourismMyCourse[]> {
  const supabase = createClient();

  const { data: courses, error: coursesError } = await supabase
    .from(T.course)
    .select("course_id, course_nm, open_yn, startdate, enddate, register, registtime, delete_yn")
    .eq("register", userId)
    .order("registtime", { ascending: false });

  if (coursesError) throw coursesError;

  const activeCourses = ((courses ?? []) as CourseRow[]).filter((c) => isActiveFlag(c.delete_yn));
  if (activeCourses.length === 0) return [];

  const courseIds = activeCourses.map((c) => c.course_id);

  const { data: details, error: detailsError } = await supabase
    .from(T.courseDetail)
    .select("detail_id, course_id, day, place_id, starttime, endtime")
    .in("course_id", courseIds)
    .order("day", { ascending: true })
    .order("starttime", { ascending: true });

  if (detailsError) throw detailsError;

  const detailRows = (details ?? []) as DetailRow[];
  const placeIds = [
    ...new Set(
      detailRows
        .map((d) => d.place_id)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    )
  ];

  const placeMap = new Map<number, PlaceRow>();
  if (placeIds.length > 0) {
    const { data: places, error: placesError } = await supabase
      .from(T.place)
      .select("place_id, title, addr1, firstimage, contentid, delete_yn")
      .in("place_id", placeIds);
    if (placesError) throw placesError;
    for (const p of (places ?? []) as PlaceRow[]) {
      if (!isActiveFlag(p.delete_yn)) continue;
      placeMap.set(p.place_id, p);
    }
  }

  const detailsByCourse = new Map<number, TourismCoursePlace[]>();
  for (const d of detailRows) {
    if (d.place_id == null) continue;
    const place = placeMap.get(d.place_id);
    if (!place) continue;
    const item: TourismCoursePlace = {
      detail_id: d.detail_id,
      place_id: d.place_id,
      day: d.day ?? 1,
      starttime: d.starttime,
      endtime: d.endtime,
      title: place.title?.trim() || `장소 #${d.place_id}`,
      addr1: place.addr1,
      firstimage: place.firstimage,
      contentid: place.contentid
    };
    const list = detailsByCourse.get(d.course_id) ?? [];
    list.push(item);
    detailsByCourse.set(d.course_id, list);
  }

  return activeCourses.map((c) => {
    const places = detailsByCourse.get(c.course_id) ?? [];
    const days = new Set(places.map((p) => p.day));
    return {
      course_id: c.course_id,
      course_nm: c.course_nm?.trim() || `코스 #${c.course_id}`,
      open_yn: c.open_yn,
      startdate: c.startdate,
      enddate: c.enddate,
      register: c.register,
      registtime: c.registtime,
      places,
      day_count: days.size > 0 ? days.size : 0,
      place_count: places.length
    };
  });
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
