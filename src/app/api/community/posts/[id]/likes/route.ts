import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardPoints, POINT_REASON } from "@/lib/community/points";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
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

    const { data: post, error: postError } = await supabase
      .from("tb_community_posts")
      .select("id, author_id, like_count")
      .eq("id", postId)
      .maybeSingle();
    if (postError) throw postError;
    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    const { data: existing } = await supabase
      .from("tb_post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ liked: true, like_count: post.like_count ?? 0 });
    }

    const { error: likeError } = await supabase
      .from("tb_post_likes")
      .insert({ user_id: user.id, post_id: postId });
    if (likeError) throw likeError;

    const nextCount = (post.like_count ?? 0) + 1;
    const admin = createAdminClient();
    const { error: countError } = await admin
      .from("tb_community_posts")
      .update({ like_count: nextCount, updated_at: new Date().toISOString() })
      .eq("id", postId);
    if (countError) throw countError;

    if (post.author_id && post.author_id !== user.id) {
      try {
        await awardPoints({
          userId: post.author_id,
          reason: POINT_REASON.LIKE_RECEIVED,
          refType: `liker:${user.id}`,
          refId: postId
        });
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ liked: true, like_count: nextCount });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to like post" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
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

    const { data: post, error: postError } = await supabase
      .from("tb_community_posts")
      .select("id, like_count")
      .eq("id", postId)
      .maybeSingle();
    if (postError) throw postError;
    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    const { data: existing } = await supabase
      .from("tb_post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ liked: false, like_count: post.like_count ?? 0 });
    }

    const { error: delError } = await supabase
      .from("tb_post_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);
    if (delError) throw delError;

    const nextCount = Math.max(0, (post.like_count ?? 0) - 1);
    const admin = createAdminClient();
    const { error: countError } = await admin
      .from("tb_community_posts")
      .update({ like_count: nextCount, updated_at: new Date().toISOString() })
      .eq("id", postId);
    if (countError) throw countError;

    return NextResponse.json({ liked: false, like_count: nextCount });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to unlike post" },
      { status: 500 }
    );
  }
}
