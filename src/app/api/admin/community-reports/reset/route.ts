import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { REPORT_HIDE_THRESHOLD } from "@/lib/community/report";

export const dynamic = "force-dynamic";

type ResetPayload = { targetType?: "post" | "comment"; targetId?: number };

// 신고이력 초기화: tb_community_report에서 해당 대상의 신고 row를 전부 지우고,
// 게시글/댓글의 report_cnt를 0으로 되돌린다. use_yn(게시글의 노출 여부)은 여기서 건드리지 않고,
// 자동 숨김 상태였는지(wasHidden)만 응답으로 알려줘 프런트에서 "사용으로 전환할까요?"를 물을 수 있게 한다.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: ResetPayload;
  try {
    body = (await request.json()) as ResetPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { targetType, targetId } = body;
  if ((targetType !== "post" && targetType !== "comment") || !Number.isFinite(targetId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    if (targetType === "post") {
      const { data: post, error: postError } = await supabase
        .from("tb_post")
        .select("post_id, use_yn")
        .eq("post_id", targetId)
        .maybeSingle();
      if (postError) throw postError;
      if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

      const { error: deleteError } = await supabase
        .from("tb_community_report")
        .delete()
        .eq("post_id", targetId);
      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from("tb_post")
        .update({ report_cnt: 0 })
        .eq("post_id", targetId);
      if (updateError) throw updateError;

      return NextResponse.json({ ok: true, wasHidden: !post.use_yn });
    }

    const { data: comment, error: commentError } = await supabase
      .from("tb_community_comments")
      .select("id, report_cnt")
      .eq("id", targetId)
      .maybeSingle();
    if (commentError) throw commentError;
    if (!comment) return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });

    const { error: deleteError } = await supabase
      .from("tb_community_report")
      .delete()
      .eq("comment_id", targetId);
    if (deleteError) throw deleteError;

    const { error: updateError } = await supabase
      .from("tb_community_comments")
      .update({ report_cnt: 0 })
      .eq("id", targetId);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, wasHidden: comment.report_cnt >= REPORT_HIDE_THRESHOLD });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "초기화에 실패했습니다." },
      { status: 500 }
    );
  }
}
