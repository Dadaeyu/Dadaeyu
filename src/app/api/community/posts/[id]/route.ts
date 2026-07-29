import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const POST_TYPE_LABELS: Record<string, string> = {
  review: "후기",
  tip: "팁",
  share: "공유",
  question: "질문"
};

type MemberEmbed = { nickname: string; community_level?: number };

function pickMember(raw: MemberEmbed | MemberEmbed[] | null): MemberEmbed | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

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
        "id, title, content, post_type, like_count, comment_count, created_at, attached_place_id, attached_course_id, author_id, tb_members!author_id(nickname, community_level)"
      )
      .eq("id", postId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const author = pickMember(data.tb_members as MemberEmbed | MemberEmbed[] | null);

    const { data: comments, error: commentsError } = await supabase
      .from("tb_community_comments")
      .select("id, content, created_at, author_id, tb_members!author_id(nickname, community_level)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (commentsError) throw commentsError;

    const commentItems = (comments ?? []).map((c) => {
      const cAuthor = pickMember(c.tb_members as MemberEmbed | MemberEmbed[] | null);
      return {
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author_nickname: cAuthor?.nickname ?? "알 수 없음",
        author_community_level: cAuthor?.community_level ?? 1
      };
    });

    let liked = false;
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      const { data: likeRow } = await supabase
        .from("tb_post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();
      liked = !!likeRow;
    }

    return NextResponse.json({
      post: {
        id: data.id,
        title: data.title,
        content: data.content,
        post_type: data.post_type,
        post_type_label: POST_TYPE_LABELS[data.post_type] ?? data.post_type,
        author_nickname: author?.nickname ?? "알 수 없음",
        author_community_level: author?.community_level ?? 1,
        like_count: data.like_count,
        comment_count: data.comment_count,
        created_at: data.created_at,
        attached_place_id: data.attached_place_id,
        attached_course_id: data.attached_course_id,
        liked
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
