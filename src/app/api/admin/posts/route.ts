import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { applyIlikeSearch, parseListParams } from "@/lib/admin/list-query";

export const dynamic = "force-dynamic";

const POST_TYPE_LABELS: Record<string, string> = {
  review: "리뷰",
  tip: "팁",
  share: "공유",
  question: "질문"
};

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const singleId = Number(searchParams.get("id"));
  const { page, pageSize, q, from, to } = parseListParams(searchParams);
  const typeFilter = searchParams.get("type") ?? "all";

  try {
    const supabase = createAdminClient();

    if (Number.isFinite(singleId) && singleId > 0) {
      const { data, error } = await supabase
        .from("tb_community_posts")
        .select(
          "id, title, content, post_type, like_count, comment_count, created_at, updated_at, author_id, attached_place_id, attached_course_id, tb_members!author_id(nickname)"
        )
        .eq("id", singleId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
      }

      const author = data.tb_members as { nickname: string } | { nickname: string }[] | null;
      const nickname = Array.isArray(author) ? author[0]?.nickname : author?.nickname;

      return NextResponse.json({
        items: [
          {
            id: data.id,
            title: data.title,
            content: data.content,
            post_type: data.post_type,
            post_type_label: POST_TYPE_LABELS[data.post_type] ?? data.post_type,
            author_nickname: nickname ?? "알 수 없음",
            author_id: data.author_id,
            like_count: data.like_count,
            comment_count: data.comment_count,
            created_at: data.created_at,
            updated_at: data.updated_at,
            attached_place_id: data.attached_place_id,
            attached_course_id: data.attached_course_id
          }
        ],
        total: 1,
        page: 1,
        pageSize: 1
      });
    }

    let query = supabase
      .from("tb_community_posts")
      .select(
        "id, title, post_type, like_count, comment_count, created_at, author_id, tb_members!author_id(nickname)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (typeFilter !== "all") {
      query = query.eq("post_type", typeFilter);
    }

    query = applyIlikeSearch(query, "title", q);

    const { data: posts, error, count } = await query.range(from, to);
    if (error) throw error;

    const result = (posts ?? []).map((p) => {
      const author = p.tb_members as { nickname: string } | { nickname: string }[] | null;
      const nickname = Array.isArray(author) ? author[0]?.nickname : author?.nickname;

      return {
        id: p.id,
        title: p.title,
        post_type: p.post_type,
        post_type_label: POST_TYPE_LABELS[p.post_type] ?? p.post_type,
        author_nickname: nickname ?? "알 수 없음",
        author_id: p.author_id,
        like_count: p.like_count,
        comment_count: p.comment_count,
        created_at: p.created_at
      };
    });

    return NextResponse.json({
      items: result,
      total: count ?? 0,
      page,
      pageSize
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");

  if (!idParam) {
    return NextResponse.json({ error: "Missing post id" }, { status: 400 });
  }

  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("tb_community_posts").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete post" },
      { status: 500 }
    );
  }
}
