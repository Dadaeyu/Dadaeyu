import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// 좋아요 토글: 이미 눌렀으면 취소, 아니면 좋아요 등록.
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
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

    const { data: post, error: postError } = await supabase
      .from("tb_post")
      .select("post_id, like_cnt")
      .eq("post_id", postId)
      .maybeSingle();

    if (postError) throw postError;
    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    const { data: existingLike } = await supabase
      .from("tb_post_likes")
      .select("user_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingLike) {
      const { error: deleteError } = await supabase
        .from("tb_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      if (deleteError) throw deleteError;

      const { data: updated, error: updateError } = await supabase
        .from("tb_post")
        .update({ like_cnt: Math.max(0, post.like_cnt - 1) })
        .eq("post_id", postId)
        .select("like_cnt")
        .single();
      if (updateError) throw updateError;

      return NextResponse.json({ liked: false, like_cnt: updated.like_cnt });
    }

    const { error: insertError } = await supabase
      .from("tb_post_likes")
      .insert({ post_id: postId, user_id: user.id });
    if (insertError) throw insertError;

    const { data: updated, error: updateError } = await supabase
      .from("tb_post")
      .update({ like_cnt: post.like_cnt + 1 })
      .eq("post_id", postId)
      .select("like_cnt")
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ liked: true, like_cnt: updated.like_cnt });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to toggle like" },
      { status: 500 }
    );
  }
}
