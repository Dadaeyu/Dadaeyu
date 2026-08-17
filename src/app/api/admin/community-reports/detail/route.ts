import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { REPORT_REASON_CODE_GROUP } from "@/lib/supabase/codes";

export const dynamic = "force-dynamic";

type MemberRef = { nickname: string } | { nickname: string }[] | null;
function nicknameOf(ref: MemberRef): string {
  if (Array.isArray(ref)) return ref[0]?.nickname ?? "알 수 없음";
  return ref?.nickname ?? "알 수 없음";
}

// 특정 대상(게시글/댓글)에 쌓인 개별 신고 건들을 사유와 함께 보여준다 (신고이력 상세).
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const targetId = Number(searchParams.get("id"));
  if ((type !== "post" && type !== "comment") || !Number.isFinite(targetId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const [reportsRes, reasonsRes] = await Promise.all([
      supabase
        .from("tb_community_report")
        .select("report_id, report_reason, created_at, tb_members!reporter_id(nickname)")
        .eq(type === "post" ? "post_id" : "comment_id", targetId)
        .order("created_at", { ascending: false }),
      supabase.from("tb_code").select("code_id, code_nm").eq("code_group", REPORT_REASON_CODE_GROUP)
    ]);
    if (reportsRes.error) throw reportsRes.error;
    if (reasonsRes.error) throw reasonsRes.error;

    const reasonMap = new Map((reasonsRes.data ?? []).map((r) => [r.code_id, r.code_nm]));

    const items = (reportsRes.data ?? []).map((r) => ({
      reportId: r.report_id as number,
      reporterNickname: nicknameOf(r.tb_members as MemberRef),
      reasonCode: r.report_reason as string | null,
      reasonNm: r.report_reason
        ? (reasonMap.get(r.report_reason as string) ?? r.report_reason)
        : "-",
      createdAt: r.created_at as string
    }));

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch report detail" },
      { status: 500 }
    );
  }
}
