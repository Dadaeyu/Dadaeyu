import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export const dynamic = "force-dynamic";

type ReportRow = {
  report_id: number;
  post_id: number | null;
  comment_id: number | null;
  created_at: string;
};

type ReportGroup = {
  targetType: "post" | "comment";
  targetId: number;
  reportCount: number;
  latestAt: string;
};

type ReportItem =
  | {
      targetType: "post";
      targetId: number;
      reportCount: number;
      latestAt: string;
      title: string;
      boardNm: string;
      useYn: boolean;
    }
  | {
      targetType: "comment";
      targetId: number;
      reportCount: number;
      latestAt: string;
      content: string;
      postId: number | null;
    };

type BoardRef = { board_nm: string } | { board_nm: string }[] | null;
function boardNameOf(ref: BoardRef): string {
  if (Array.isArray(ref)) return ref[0]?.board_nm ?? "알 수 없음";
  return ref?.board_nm ?? "알 수 없음";
}

// tb_community_report 는 신고자마다 별도 row가 쌓이므로, 대상(게시글/댓글)별로 묶어서
// "신고이력" 한 건처럼 보여준다. PostgREST에 GROUP BY가 없어 전체를 가져와 JS에서 묶는다
// (이 코드베이스의 다른 집계 로직들과 동일한 패턴). 검색(q)은 제목/댓글 내용 기준이라
// 페이징 전에 전체 대상 정보를 붙여서 필터링한 뒤 페이징한다.
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "all"; // all | post | comment
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE;

  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("tb_community_report")
      .select("report_id, post_id, comment_id, created_at");
    if (type === "post") query = query.not("post_id", "is", null);
    else if (type === "comment") query = query.not("comment_id", "is", null);

    const { data, error } = await query;
    if (error) throw error;

    const grouped = new Map<string, ReportGroup>();
    for (const row of (data ?? []) as ReportRow[]) {
      const targetType: "post" | "comment" | null =
        row.post_id != null ? "post" : row.comment_id != null ? "comment" : null;
      if (!targetType) continue;
      const targetId = (targetType === "post" ? row.post_id : row.comment_id) as number;
      const key = `${targetType}:${targetId}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.reportCount += 1;
        if (row.created_at > existing.latestAt) existing.latestAt = row.created_at;
      } else {
        grouped.set(key, { targetType, targetId, reportCount: 1, latestAt: row.created_at });
      }
    }

    const allGroups = Array.from(grouped.values());
    const postIds = allGroups.filter((g) => g.targetType === "post").map((g) => g.targetId);
    const commentIds = allGroups.filter((g) => g.targetType === "comment").map((g) => g.targetId);

    const [postsRes, commentsRes] = await Promise.all([
      postIds.length > 0
        ? supabase
            .from("tb_post")
            .select("post_id, title, use_yn, tb_board(board_nm)")
            .in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
      commentIds.length > 0
        ? supabase.from("tb_community_comments").select("id, content, post_id").in("id", commentIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (postsRes.error) throw postsRes.error;
    if (commentsRes.error) throw commentsRes.error;

    const postMap = new Map(
      (postsRes.data ?? []).map((p) => [
        p.post_id as number,
        {
          title: p.title as string,
          use_yn: p.use_yn as boolean,
          board_nm: boardNameOf(p.tb_board as BoardRef)
        }
      ])
    );
    const commentMap = new Map(
      (commentsRes.data ?? []).map((c) => [
        c.id as number,
        { content: c.content as string, post_id: c.post_id as number }
      ])
    );

    let items: ReportItem[] = allGroups.map((g) => {
      if (g.targetType === "post") {
        const post = postMap.get(g.targetId);
        return {
          targetType: "post" as const,
          targetId: g.targetId,
          reportCount: g.reportCount,
          latestAt: g.latestAt,
          title: post?.title ?? "(삭제된 게시글)",
          boardNm: post?.board_nm ?? "-",
          useYn: post?.use_yn ?? false
        };
      }
      const comment = commentMap.get(g.targetId);
      return {
        targetType: "comment" as const,
        targetId: g.targetId,
        reportCount: g.reportCount,
        latestAt: g.latestAt,
        content: comment?.content ?? "(삭제된 댓글)",
        postId: comment?.post_id ?? null
      };
    });

    if (q) {
      items = items.filter((item) =>
        item.targetType === "post"
          ? item.title.toLowerCase().includes(q) || item.boardNm.toLowerCase().includes(q)
          : item.content.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1));

    const total = items.length;
    const from = (page - 1) * pageSize;
    const pageItems = items.slice(from, from + pageSize);

    return NextResponse.json({ items: pageItems, total, page, pageSize });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
