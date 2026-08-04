import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardPoints, POINT_REASON } from "@/lib/community/points";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId) || postId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let body: { content?: string };
    try {
      body = (await request.json()) as { content?: string };
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const content = (body.content ?? "").trim();
    if (!content) {
      return NextResponse.json({ error: "댓글 내용을 입력해 주세요." }, { status: 400 });
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: "댓글은 1000자 이내로 작성해 주세요." }, { status: 400 });
    }

    const { data: post, error: postError } = await supabase
      .from("tb_community_posts")
      .select("id, comment_count")
      .eq("id", postId)
      .maybeSingle();
    if (postError) throw postError;
    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    const { data: comment, error } = await supabase
      .from("tb_community_comments")
      .insert({ post_id: postId, author_id: user.id, content })
      .select("id, content, created_at, author_id")
      .single();
    if (error) throw error;

    const admin = createAdminClient();
    const { error: countError } = await admin
      .from("tb_community_posts")
      .update({
        comment_count: (post.comment_count ?? 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", postId);
    if (countError) throw countError;

    const { data: member } = await supabase
      .from("tb_members")
      .select("nickname, community_level")
      .eq("id", user.id)
      .maybeSingle();

    try {
      await awardPoints({
        userId: user.id,
        reason: POINT_REASON.COMMENT_CREATE,
        refType: "comment",
        refId: comment.id
      });
    } catch {
      // ignore
    }

    // 적립 후 레벨이 올랐을 수 있어 최신 community_level 재조회
    const { data: memberAfter } = await supabase
      .from("tb_members")
      .select("community_level")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          author_nickname: member?.nickname ?? "알 수 없음",
          author_community_level: memberAfter?.community_level ?? member?.community_level ?? 1
        }
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create comment" },
      { status: 500 }
    );
  }
}
