import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyIlikeSearch } from "@/lib/admin/list-query";
import { T } from "@/lib/supabase/tables";

export const dynamic = "force-dynamic";

type CourseRow = { course_id: number; course_nm: string };

// 게시글에 코스를 첨부할 때 쓰는 이름 검색 — 공개(open_yn=Y)·삭제 안 됨(delete_yn=N) 코스만 대상.
// tb_course는 RLS로 보호돼 있어 다른 사용자의 공개 코스를 보려면 admin 클라이언트가 필요하다
// (공유코스 목록(/api/courses/shared)과 동일한 이유). 로그인 사용자라면 검색어가 없어도
// 내 코스(공개된 것만)·좋아요한 코스를 먼저 보여주고(미리보기), 검색어를 넣으면 이름 검색
// 결과에도 내 코스/좋아요 여부를 배지로 표시한다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get("keyword") ?? "").trim();

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    const admin = createAdminClient();

    let mineRows: CourseRow[] = [];
    let likedRows: CourseRow[] = [];

    if (userId) {
      const { data: mine, error: mineError } = await admin
        .from(T.course)
        .select("course_id, course_nm")
        .eq("register", userId)
        .eq("open_yn", "Y")
        .or("delete_yn.is.null,delete_yn.eq.N")
        .order("registtime", { ascending: false })
        .limit(30);
      if (mineError) throw mineError;
      mineRows = mine ?? [];

      const { data: likes, error: likesError } = await admin
        .from(T.courseLikes)
        .select("course_id")
        .eq("user_id", userId);
      if (likesError) throw likesError;

      const likedIds = (likes ?? []).map((l) => l.course_id);
      if (likedIds.length > 0) {
        const { data: liked, error: likedError } = await admin
          .from(T.course)
          .select("course_id, course_nm")
          .in("course_id", likedIds)
          .eq("open_yn", "Y")
          .or("delete_yn.is.null,delete_yn.eq.N")
          .order("course_id", { ascending: false })
          .limit(30);
        if (likedError) throw likedError;
        likedRows = liked ?? [];
      }
    }

    const mineIdSet = new Set(mineRows.map((r) => r.course_id));
    const likedIdSet = new Set(likedRows.map((r) => r.course_id));

    if (!keyword) {
      const seen = new Set<number>();
      const preview: { id: number; name: string; isMine: boolean; isLiked: boolean }[] = [];
      for (const r of mineRows) {
        if (seen.has(r.course_id)) continue;
        seen.add(r.course_id);
        preview.push({ id: r.course_id, name: r.course_nm, isMine: true, isLiked: false });
      }
      for (const r of likedRows) {
        if (seen.has(r.course_id)) continue;
        seen.add(r.course_id);
        preview.push({ id: r.course_id, name: r.course_nm, isMine: false, isLiked: true });
      }
      return NextResponse.json(preview.slice(0, 20));
    }

    let query = admin
      .from(T.course)
      .select("course_id, course_nm")
      .eq("open_yn", "Y")
      .or("delete_yn.is.null,delete_yn.eq.N")
      .order("registtime", { ascending: false })
      .limit(20);

    query = applyIlikeSearch(query, "course_nm", keyword);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((c) => ({
        id: c.course_id,
        name: c.course_nm,
        isMine: mineIdSet.has(c.course_id),
        isLiked: likedIdSet.has(c.course_id)
      }))
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "코스를 검색하지 못했습니다." },
      { status: 500 }
    );
  }
}
