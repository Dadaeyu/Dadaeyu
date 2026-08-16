import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REPORT_HIDE_THRESHOLD } from "@/lib/community/report";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// 게시글 신고: 한 사용자는 같은 글을 한 번만 신고할 수 있고, 누적 신고가
// REPORT_HIDE_THRESHOLD 이상이 되면 tb_post.use_yn 을 꺼서 목록/상세에서 자동으로 숨긴다.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
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

    const { data: post, error: postError } = await supabase
      .from("tb_post")
      .select("post_id, report_cnt, writer_id")
      .eq("post_id", postId)
      .maybeSingle();

    if (postError) throw postError;
    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    if (post.writer_id === user.id) {
      return NextResponse.json({ error: "자신의 게시글은 신고할 수 없습니다." }, { status: 403 });
    }

    // tb_community_report 는 RLS 정책이 없어 사용자 세션 클라이언트로는 조회/삽입이 막힌다.
    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("tb_community_report")
      .select("report_id")
      .eq("reporter_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ error: "이미 신고한 게시글입니다." }, { status: 409 });
    }

    const { error: insertError } = await admin
      .from("tb_community_report")
      .insert({ reporter_id: user.id, post_id: postId, report_reason: reportReason });
    if (insertError) throw insertError;

    const nextCount = post.report_cnt + 1;
    const hidden = nextCount >= REPORT_HIDE_THRESHOLD;
    const updates: Record<string, unknown> = { report_cnt: nextCount };
    if (hidden) updates.use_yn = false;

    const { error: updateError } = await supabase
      .from("tb_post")
      .update(updates)
      .eq("post_id", postId);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, report_cnt: nextCount, hidden });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "신고에 실패했습니다." },
      { status: 500 }
    );
  }
}
