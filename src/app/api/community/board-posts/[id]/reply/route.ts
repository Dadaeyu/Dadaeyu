import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminMember } from "@/lib/community/ownership";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
type BoardReplyRef = { reply_yn: boolean } | { reply_yn: boolean }[] | null;

type AdminCheck =
  { ok: true; userId: string } | { ok: false; response: ReturnType<typeof NextResponse.json> };

function replyYnOf(ref: BoardReplyRef): boolean {
  const b = Array.isArray(ref) ? ref[0] : ref;
  return b?.reply_yn ?? false;
}

async function requireAdminForReply(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: number
): Promise<AdminCheck> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    };
  }

  const { data: post, error: postError } = await supabase
    .from("tb_post")
    .select("post_id, tb_board(reply_yn)")
    .eq("post_id", postId)
    .maybeSingle();
  if (postError) throw postError;
  if (!post) {
    return {
      ok: false,
      response: NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 })
    };
  }
  if (!replyYnOf(post.tb_board as BoardReplyRef)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "답변을 사용하지 않는 게시판입니다." }, { status: 403 })
    };
  }

  if (!(await isAdminMember(supabase, user.id))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "관리자만 답변을 관리할 수 있습니다." }, { status: 403 })
    };
  }

  return { ok: true, userId: user.id };
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const check = await requireAdminForReply(supabase, postId);
    if (!check.ok) return check.response;

    let body: { content?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const content = (body.content ?? "").trim();
    if (!content)
      return NextResponse.json({ error: "답변 내용을 입력해 주세요." }, { status: 400 });

    const { data: member } = await supabase
      .from("tb_members")
      .select("nickname")
      .eq("id", check.userId)
      .maybeSingle();

    const { data: reply, error: insertError } = await supabase
      .from("tb_post_reply")
      .insert({
        post_id: postId,
        content,
        writer_id: check.userId,
        writer_nm: member?.nickname ?? "관리자"
      })
      .select("reply_id, content, writer_nm, created_at, updated_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "이미 등록된 답변이 있습니다." }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "답변 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const check = await requireAdminForReply(supabase, postId);
    if (!check.ok) return check.response;

    let body: { content?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const content = (body.content ?? "").trim();
    if (!content)
      return NextResponse.json({ error: "답변 내용을 입력해 주세요." }, { status: 400 });

    const { data: reply, error: updateError } = await supabase
      .from("tb_post_reply")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("post_id", postId)
      .select("reply_id, content, writer_nm, created_at, updated_at")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!reply) return NextResponse.json({ error: "등록된 답변이 없습니다." }, { status: 404 });

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "답변 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const check = await requireAdminForReply(supabase, postId);
    if (!check.ok) return check.response;

    const { error: deleteError } = await supabase
      .from("tb_post_reply")
      .delete()
      .eq("post_id", postId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "답변 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
