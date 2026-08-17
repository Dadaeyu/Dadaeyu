import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminMember } from "@/lib/community/ownership";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { commentId } = await params;
  const id = Number(commentId);
  if (!Number.isFinite(id)) {
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

    const { data: existing, error: fetchError } = await supabase
      .from("tb_community_comments")
      .select("id, author_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });

    const owner = existing.author_id === user.id;
    if (!owner && !(await isAdminMember(supabase, user.id))) {
      return NextResponse.json({ error: "본인 댓글만 수정할 수 있습니다." }, { status: 403 });
    }

    let body: { content?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const content = (body.content ?? "").trim();
    if (!content)
      return NextResponse.json({ error: "댓글 내용을 입력해 주세요." }, { status: 400 });

    const { data: comment, error: updateError } = await supabase
      .from("tb_community_comments")
      .update({ content })
      .eq("id", id)
      .select("id, content, created_at")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ comment });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: postIdParam, commentId } = await params;
  const id = Number(commentId);
  const postId = Number(postIdParam);
  if (!Number.isFinite(id) || !Number.isFinite(postId)) {
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

    const { data: existing, error: fetchError } = await supabase
      .from("tb_community_comments")
      .select("id, author_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });

    const owner = existing.author_id === user.id;
    if (!owner && !(await isAdminMember(supabase, user.id))) {
      return NextResponse.json({ error: "본인 댓글만 삭제할 수 있습니다." }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from("tb_community_comments")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;

    const { data: post } = await supabase
      .from("tb_post")
      .select("comment_cnt")
      .eq("post_id", postId)
      .maybeSingle();

    if (post) {
      await supabase
        .from("tb_post")
        .update({ comment_cnt: Math.max(0, post.comment_cnt - 1) })
        .eq("post_id", postId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete comment" },
      { status: 500 }
    );
  }
}
