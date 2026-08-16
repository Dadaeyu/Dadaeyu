import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REPORT_HIDE_THRESHOLD } from "@/lib/community/report";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; commentId: string }> };

// 댓글 신고: 한 사용자는 같은 댓글을 한 번만 신고할 수 있고, 누적 신고가
// REPORT_HIDE_THRESHOLD 이상이 되면(tb_community_comments.report_cnt) 댓글 목록 조회 시
// 걸러진다. tb_community_comments 에는 use_yn 이 없어 조회 시 report_cnt 로 필터한다.
export async function POST(request: Request, { params }: Params) {
  const { commentId } = await params;
  const id = Number(commentId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let reportReason = "";
  try {
    const body = (await request.json()) as { reason?: string };
    reportReason = typeof body.reason === "string" ? body.reason.trim() : "";
  } catch {
    // body 없이 호출된 경우도 아래에서 필수값 검증으로 처리
  }
  if (!reportReason) {
    return NextResponse.json({ error: "신고 사유를 선택해 주세요." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: comment, error: commentError } = await supabase
      .from("tb_community_comments")
      .select("id, report_cnt, author_id")
      .eq("id", id)
      .maybeSingle();

    if (commentError) throw commentError;
    if (!comment) return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    if (comment.author_id === user.id) {
      return NextResponse.json({ error: "자신의 댓글은 신고할 수 없습니다." }, { status: 403 });
    }

    // tb_community_report 는 RLS 정책이 없어 사용자 세션 클라이언트로는 조회/삽입이 막힌다.
    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("tb_community_report")
      .select("report_id")
      .eq("reporter_id", user.id)
      .eq("comment_id", id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ error: "이미 신고한 댓글입니다." }, { status: 409 });
    }

    const { error: insertError } = await admin
      .from("tb_community_report")
      .insert({ reporter_id: user.id, comment_id: id, report_reason: reportReason });
    if (insertError) throw insertError;

    const nextCount = comment.report_cnt + 1;
    const { error: updateError } = await supabase
      .from("tb_community_comments")
      .update({ report_cnt: nextCount })
      .eq("id", id);
    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      report_cnt: nextCount,
      hidden: nextCount >= REPORT_HIDE_THRESHOLD
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "신고에 실패했습니다." },
      { status: 500 }
    );
  }
}
