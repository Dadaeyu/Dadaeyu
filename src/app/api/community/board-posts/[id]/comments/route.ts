import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminMember } from "@/lib/community/ownership";
import { awardPoints, POINT_REASON } from "@/lib/community/points";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type MemberRef =
  | { nickname: string; community_level?: number }
  | { nickname: string; community_level?: number }[]
  | null;

function memberOf(ref: MemberRef): { nickname: string; community_level: number } {
  const row = Array.isArray(ref) ? ref[0] : ref;
  return {
    nickname: row?.nickname ?? "알 수 없음",
    community_level: row?.community_level ?? 1
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tb_community_comments")
      .select("id, content, created_at, author_id, tb_members!author_id(nickname, community_level)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const {
      data: { user }
    } = await supabase.auth.getUser();
    const admin = user ? await isAdminMember(supabase, user.id) : false;

    const comments = (data ?? []).map((c) => {
      const author = memberOf(c.tb_members as MemberRef);
      return {
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author_nickname: author.nickname,
        author_community_level: author.community_level,
        can_edit: !!user && (user.id === c.author_id || admin)
      };
    });

    return NextResponse.json({ comments });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
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

    let body: { content?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const content = (body.content ?? "").trim();
    if (!content)
      return NextResponse.json({ error: "댓글 내용을 입력해 주세요." }, { status: 400 });

    const { data: post, error: postError } = await supabase
      .from("tb_post")
      .select("post_id, comment_cnt, board_id, tb_board(comment_yn)")
      .eq("post_id", postId)
      .maybeSingle();

    if (postError) throw postError;
    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    const boardRef = post.tb_board as { comment_yn: boolean } | { comment_yn: boolean }[] | null;
    const commentYn = Array.isArray(boardRef) ? boardRef[0]?.comment_yn : boardRef?.comment_yn;
    if (!commentYn) {
      return NextResponse.json({ error: "댓글을 사용하지 않는 게시판입니다." }, { status: 403 });
    }

    const { data: comment, error: insertError } = await supabase
      .from("tb_community_comments")
      .insert({ post_id: postId, author_id: user.id, content })
      .select("id, content, created_at")
      .single();

    if (insertError) throw insertError;

    await supabase
      .from("tb_post")
      .update({ comment_cnt: post.comment_cnt + 1 })
      .eq("post_id", postId);

    try {
      await awardPoints({
        userId: user.id,
        reason: POINT_REASON.COMMENT_CREATE,
        refType: "comment",
        refId: comment.id
      });
    } catch {
      // 댓글 등록은 유지
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create comment" },
      { status: 500 }
    );
  }
}
