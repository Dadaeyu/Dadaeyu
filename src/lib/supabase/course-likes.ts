import { createClient } from "./client";
import { T } from "./tables";
import type { LikedCourse } from "./types";

type CourseRow = {
  course_id: number;
  course_nm: string | null;
  startdate: string | null;
  enddate: string | null;
  delete_yn: string | null;
  open_yn: string | null;
};

function formatCoursePeriod(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start} ~ ${end}`;
  return start ?? end;
}

/** 내 코스 좋아요: tb_course_like → tb_course (2단계, 최신순) */
export async function fetchMyCourseLikes(userId: string): Promise<LikedCourse[]> {
  const supabase = createClient();

  const { data: likes, error: likesError } = await supabase
    .from(T.courseLikes)
    .select("like_id, course_id, registtime")
    .eq("user_id", userId)
    .order("registtime", { ascending: false });

  if (likesError) throw likesError;
  if (!likes?.length) return [];

  const courseIds = [...new Set(likes.map((l) => l.course_id as number))];
  const { data: courses, error: coursesError } = await supabase
    .from(T.course)
    .select("course_id, course_nm, startdate, enddate, delete_yn, open_yn")
    .in("course_id", courseIds);

  if (coursesError) throw coursesError;

  const courseMap = new Map<number, CourseRow>();
  for (const row of (courses ?? []) as CourseRow[]) {
    if (row.delete_yn === "Y") continue;
    courseMap.set(row.course_id, row);
  }

  const result: LikedCourse[] = [];
  for (const like of likes) {
    const course = courseMap.get(like.course_id as number);
    if (!course) continue;

    result.push({
      like_id: like.like_id as number,
      course_id: course.course_id,
      title: course.course_nm?.trim() || `코스 #${course.course_id}`,
      startdate: course.startdate,
      enddate: course.enddate,
      registtime: like.registtime as string
    });
  }

  return result;
}

export { formatCoursePeriod };
