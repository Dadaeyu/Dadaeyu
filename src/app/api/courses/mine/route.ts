import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { T } from "@/lib/supabase/tables";
import type { TourismCoursePlace, TourismMyCourse } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

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
  starthour: number | null;
  endhour: number | null;
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

function hourToTime(hour: number | null | undefined): string | null {
  if (hour == null || !Number.isFinite(Number(hour))) return null;
  const h = Math.max(0, Math.min(23, Math.floor(Number(hour))));
  return `${String(h).padStart(2, "0")}:00`;
}

/** 내 코스 목록 — tb_course RLS 미비로 service role 조회 (세션 검증 후) */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: courses, error: coursesError } = await admin
      .from(T.course)
      .select("course_id, course_nm, open_yn, startdate, enddate, register, registtime, delete_yn")
      .eq("register", user.id)
      .order("registtime", { ascending: false });

    if (coursesError) throw coursesError;

    const activeCourses = ((courses ?? []) as CourseRow[]).filter((c) => isActiveFlag(c.delete_yn));
    if (activeCourses.length === 0) {
      return NextResponse.json({ items: [] as TourismMyCourse[] });
    }

    const courseIds = activeCourses.map((c) => c.course_id);
    const { data: details, error: detailsError } = await admin
      .from(T.courseDetail)
      .select("detail_id, course_id, day, place_id, starthour, endhour")
      .in("course_id", courseIds)
      .order("day", { ascending: true })
      .order("starthour", { ascending: true });

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
      const { data: places, error: placesError } = await admin
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
        starttime: hourToTime(d.starthour),
        endtime: hourToTime(d.endhour),
        title: place.title?.trim() || `장소 #${d.place_id}`,
        addr1: place.addr1,
        firstimage: place.firstimage,
        contentid: place.contentid
      };
      const list = detailsByCourse.get(d.course_id) ?? [];
      list.push(item);
      detailsByCourse.set(d.course_id, list);
    }

    const items: TourismMyCourse[] = activeCourses.map((c) => {
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

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
