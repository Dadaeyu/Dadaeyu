import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 게시글 조회수 +1 (상세 열람 시 클라이언트에서 세션당 1회 호출) */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId) || postId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: post, error: postError } = await supabase
      .from("tb_post")
      .select("post_id, view_cnt, use_yn")
      .eq("post_id", postId)
      .maybeSingle();

    if (postError) throw postError;
    if (!post || post.use_yn === false) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    const next = (post.view_cnt ?? 0) + 1;
    // RLS 우회해 카운트만 갱신 (읽기 권한만 있는 방문자도 반영)
    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("tb_post")
      .update({ view_cnt: next })
      .eq("post_id", postId);
    if (updateError) throw updateError;

    return NextResponse.json({ view_cnt: next });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to count view" },
      { status: 500 }
    );
  }
}
