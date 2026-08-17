import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getBakeryPlaceIds, BAKERY_THEME_CODE } from "@/lib/theme/bakeryTheme";

export const dynamic = "force-dynamic";

const REVIEW_BOARD_ID = 1;

type AdminCourse = {
  course_id: number;
  course_nm: string;
  open_yn: string | null;
  delete_yn: string | null;
  startdate: string | null;
  enddate: string | null;
  registtime: string | null;
  updatetime: string | null;
  register: string | null;
  author_nickname: string;
  author_role: string;
  average_rating: number;
  like_count: number;
  place_count: number;
  hashtags: string[];
};

// 공유/내 코스 목록(/api/courses/shared)과 같은 방식으로 별점·좋아요·해시태그를 계산하되,
// open_yn/delete_yn/register 필터는 전혀 걸지 않는다 — 관리자는 전부 봐야 하므로.
async function buildAdminCourses(
  admin: ReturnType<typeof createAdminClient>,
  courses: { course_id: number; register: string | null }[]
): Promise<AdminCourse[]> {
  const courseIds = courses.map((c) => c.course_id);
  if (courseIds.length === 0) return [];

  const { data: details, error: detailsErr } = await admin
    .from("tb_course_detail")
    .select("course_id, place_id")
    .in("course_id", courseIds);
  if (detailsErr) throw detailsErr;

  const placeIdsByCourse = new Map<number, Set<number>>();
  for (const d of (details ?? []) as { course_id: number; place_id: number | null }[]) {
    if (d.place_id == null) continue;
    const set = placeIdsByCourse.get(d.course_id) ?? new Set<number>();
    set.add(d.place_id);
    placeIdsByCourse.set(d.course_id, set);
  }
  const allPlaceIds = [...new Set([...placeIdsByCourse.values()].flatMap((s) => [...s]))];

  const placeMap = new Map<number, { lclssystm1: string | null }>();
  if (allPlaceIds.length > 0) {
    const { data: places, error: placesErr } = await admin
      .from("tb_place")
      .select("place_id, lclssystm1")
      .in("place_id", allPlaceIds);
    if (placesErr) throw placesErr;
    for (const p of (places ?? []) as { place_id: number; lclssystm1: string | null }[]) {
      placeMap.set(p.place_id, p);
    }
  }

  const bakeryPlaceIdSet = new Set(await getBakeryPlaceIds());

  const themeCodes = [
    ...new Set(
      [...placeMap.values()].map((p) => p.lclssystm1).filter((v): v is string => v != null)
    )
  ];
  if (allPlaceIds.some((id) => bakeryPlaceIdSet.has(id))) themeCodes.push(BAKERY_THEME_CODE);
  const themeLabelByCode = new Map<string, string>();
  if (themeCodes.length > 0) {
    const { data: codeRows, error: codeErr } = await admin
      .from("tb_code")
      .select("code_id, code_nm")
      .eq("code_group", "LCLSSYSTM1")
      .in("code_id", themeCodes);
    if (codeErr) throw codeErr;
    for (const c of (codeRows ?? []) as { code_id: string; code_nm: string }[]) {
      themeLabelByCode.set(c.code_id, c.code_nm);
    }
  }

  const { data: likeRows, error: likeErr } = await admin
    .from("tb_course_like")
    .select("course_id")
    .in("course_id", courseIds);
  if (likeErr) throw likeErr;
  const likeCounts = new Map<number, number>();
  for (const row of (likeRows ?? []) as { course_id: number }[]) {
    likeCounts.set(row.course_id, (likeCounts.get(row.course_id) ?? 0) + 1);
  }

  const { data: ratingRows, error: ratingErr } = await admin
    .from("tb_post")
    .select("course_id, course_rating")
    .eq("board_id", REVIEW_BOARD_ID)
    .eq("use_yn", true)
    .not("course_rating", "is", null)
    .in("course_id", courseIds);
  if (ratingErr) throw ratingErr;
  const ratingSums = new Map<number, { sum: number; count: number }>();
  for (const row of (ratingRows ?? []) as { course_id: number; course_rating: number }[]) {
    const g = ratingSums.get(row.course_id) ?? { sum: 0, count: 0 };
    g.sum += row.course_rating;
    g.count += 1;
    ratingSums.set(row.course_id, g);
  }

  const registerIds = [...new Set(courses.map((c) => c.register).filter((v): v is string => !!v))];
  const memberMap = new Map<string, { nickname: string; role: string }>();
  if (registerIds.length > 0) {
    const { data: members, error: memberErr } = await admin
      .from("tb_members")
      .select("id, nickname, role")
      .in("id", registerIds);
    if (memberErr) throw memberErr;
    for (const m of (members ?? []) as { id: string; nickname: string; role: string }[]) {
      memberMap.set(m.id, m);
    }
  }

  return courses.map((c) => {
    const raw = c as unknown as {
      course_nm: string;
      open_yn: string | null;
      delete_yn: string | null;
      startdate: string | null;
      enddate: string | null;
      registtime: string | null;
      updatetime: string | null;
    };
    const placeIds = [...(placeIdsByCourse.get(c.course_id) ?? [])];
    const badgeCounts = new Map<string, number>();
    for (const pid of placeIds) {
      const place = placeMap.get(pid);
      if (place?.lclssystm1) {
        const label = themeLabelByCode.get(place.lclssystm1);
        if (label) badgeCounts.set(label, (badgeCounts.get(label) ?? 0) + 1);
      }
      if (bakeryPlaceIdSet.has(pid)) {
        const label = themeLabelByCode.get(BAKERY_THEME_CODE) ?? "빵지순례";
        badgeCounts.set(label, (badgeCounts.get(label) ?? 0) + 1);
      }
    }
    const hashtags = [...badgeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label);

    const rating = ratingSums.get(c.course_id);
    const member = c.register ? memberMap.get(c.register) : undefined;

    return {
      course_id: c.course_id,
      course_nm: raw.course_nm,
      open_yn: raw.open_yn,
      delete_yn: raw.delete_yn,
      startdate: raw.startdate,
      enddate: raw.enddate,
      registtime: raw.registtime,
      updatetime: raw.updatetime,
      register: c.register,
      author_nickname: member?.nickname ?? "알 수 없음",
      author_role: member?.role ?? "user",
      average_rating: rating ? Math.round((rating.sum / rating.count) * 10) / 10 : 0,
      like_count: likeCounts.get(c.course_id) ?? 0,
      place_count: placeIds.length,
      hashtags
    };
  });
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = createAdminClient();

    // 공유여부/삭제여부/작성자와 무관하게 전부 조회한다(관리자용).
    let query = supabase
      .from("tb_course")
      .select(
        "course_id, course_nm, open_yn, delete_yn, startdate, enddate, registtime, updatetime, register",
        { count: "exact" }
      )
      .order("registtime", { ascending: false });
    if (q) query = query.ilike("course_nm", `%${q}%`);

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const items = await buildAdminCourses(
      supabase,
      (data ?? []) as { course_id: number; register: string | null }[]
    );

    return NextResponse.json({ items, total: count ?? 0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "코스 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { id?: unknown; quickAction?: unknown };
  const courseId = Number(body.id);
  if (!Number.isFinite(courseId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  if (body.quickAction !== "restore") {
    return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("tb_course")
      .update({
        delete_yn: "N",
        deletetime: null,
        deleter: null,
        updatetime: new Date().toISOString()
      })
      .eq("course_id", courseId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "복구하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const courseId = Number(searchParams.get("id"));
  if (!Number.isFinite(courseId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("tb_course")
      .update({ delete_yn: "Y", deletetime: new Date().toISOString(), deleter: admin.id })
      .eq("course_id", courseId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "삭제하지 못했습니다." },
      { status: 500 }
    );
  }
}
