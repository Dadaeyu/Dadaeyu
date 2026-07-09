import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyIlikeSearch, parseListParams } from "@/lib/admin/list-query";

export const dynamic = "force-dynamic";

const POST_TYPE_LABELS: Record<string, string> = {
  review: "후기",
  tip: "팁",
  share: "공유",
  question: "질문"
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, q, from, to } = parseListParams(searchParams);
  const typeFilter = searchParams.get("type") ?? "all";

  try {
    const supabase = await createClient();

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

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const items = (data ?? []).map((p) => {
      const author = p.tb_members as { nickname: string } | { nickname: string }[] | null;
      const nickname = Array.isArray(author) ? author[0]?.nickname : author?.nickname;

      return {
        id: p.id,
        title: p.title,
        post_type: p.post_type,
        post_type_label: POST_TYPE_LABELS[p.post_type] ?? p.post_type,
        author_nickname: nickname ?? "알 수 없음",
        like_count: p.like_count,
        comment_count: p.comment_count,
        created_at: p.created_at
      };
    });

    return NextResponse.json({
      items,
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let body: {
      title?: string;
      content?: string;
      post_type?: string;
      attached_place_id?: number | null;
      attached_course_id?: number | null;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const title = (body.title ?? "").trim();
    const content = (body.content ?? "").trim();
    const post_type = (body.post_type ?? "review").trim();

    if (!title) return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    if (!content) return NextResponse.json({ error: "내용을 입력해 주세요." }, { status: 400 });
    if (!["review", "tip", "share", "question"].includes(post_type)) {
      return NextResponse.json({ error: "유효하지 않은 게시글 유형입니다." }, { status: 400 });
    }

    const { data: member, error: memberError } = await supabase
      .from("tb_members")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!member) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 403 });
    }

    const insertPayload: Record<string, unknown> = {
      author_id: user.id,
      title,
      content,
      post_type
    };

    if (body.attached_place_id != null) {
      insertPayload.attached_place_id = body.attached_place_id;
    }
    if (body.attached_course_id != null) {
      insertPayload.attached_course_id = body.attached_course_id;
    }

    const { data, error } = await supabase
      .from("tb_community_posts")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create post" },
      { status: 500 }
    );
  }
}
