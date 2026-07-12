import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const POST_TYPE_LABELS: Record<string, string> = {
  review: "후기",
  tip: "팁",
  share: "공유",
  question: "질문"
};

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tb_community_posts")
      .select(
        "id, title, content, post_type, like_count, comment_count, created_at, attached_place_id, attached_course_id, author_id, tb_members!author_id(nickname)"
      )
      .eq("id", postId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const author = data.tb_members as { nickname: string } | { nickname: string }[] | null;
    const nickname = Array.isArray(author) ? author[0]?.nickname : author?.nickname;

    const { data: comments, error: commentsError } = await supabase
      .from("tb_community_comments")
      .select("id, content, created_at, author_id, tb_members!author_id(nickname)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (commentsError) throw commentsError;

    const commentItems = (comments ?? []).map((c) => {
      const cAuthor = c.tb_members as { nickname: string } | { nickname: string }[] | null;
      const cNickname = Array.isArray(cAuthor) ? cAuthor[0]?.nickname : cAuthor?.nickname;
      return {
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author_nickname: cNickname ?? "알 수 없음"
      };
    });

    return NextResponse.json({
      post: {
        id: data.id,
        title: data.title,
        content: data.content,
        post_type: data.post_type,
        post_type_label: POST_TYPE_LABELS[data.post_type] ?? data.post_type,
        author_nickname: nickname ?? "알 수 없음",
        like_count: data.like_count,
        comment_count: data.comment_count,
        created_at: data.created_at,
        attached_place_id: data.attached_place_id,
        attached_course_id: data.attached_course_id
      },
      comments: commentItems
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch post" },
      { status: 500 }
    );
  }
}
