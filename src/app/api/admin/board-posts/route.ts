import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { applyOrIlikeSearch, parseListParams } from "@/lib/admin/list-query";

export const dynamic = "force-dynamic";

const LIST_COLUMNS =
  "post_id, board_id, title, writer_nm, rating, view_cnt, like_cnt, comment_cnt, notice_yn, use_yn, created_at, updated_at, tb_board(board_nm)";
const DETAIL_COLUMNS =
  "post_id, board_id, title, content, writer_id, writer_nm, rating, view_cnt, like_cnt, comment_cnt, notice_yn, use_yn, created_at, updated_at, tb_board(board_nm)";

type BoardRef = { board_nm: string } | { board_nm: string }[] | null;

function boardNameOf(ref: BoardRef): string {
  if (Array.isArray(ref)) return ref[0]?.board_nm ?? "알 수 없음";
  return ref?.board_nm ?? "알 수 없음";
}

type PostPayload = {
  id?: number;
  title?: string;
  content?: string;
  notice_yn?: boolean;
  use_yn?: boolean;
};

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const singleId = Number(searchParams.get("id"));
  const { page, pageSize, q, from, to } = parseListParams(searchParams);
  const boardIdParam = searchParams.get("boardId");

  try {
    const supabase = createAdminClient();

    if (Number.isFinite(singleId) && singleId > 0) {
      const { data, error } = await supabase
        .from("tb_post")
        .select(DETAIL_COLUMNS)
        .eq("post_id", singleId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
      }

      const { tb_board, ...rest } = data as typeof data & { tb_board: BoardRef };
      return NextResponse.json({
        items: [{ ...rest, board_nm: boardNameOf(tb_board) }],
        total: 1,
        page: 1,
        pageSize: 1
      });
    }

    let query = supabase
      .from("tb_post")
      .select(LIST_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false });

    if (boardIdParam) {
      const boardId = Number(boardIdParam);
      if (Number.isFinite(boardId)) query = query.eq("board_id", boardId);
    }

    query = applyOrIlikeSearch(query, ["title", "writer_nm"], q);

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const items = (data ?? []).map((row) => {
      const { tb_board, ...rest } = row as typeof row & { tb_board: BoardRef };
      return { ...rest, board_nm: boardNameOf(tb_board) };
    });

    return NextResponse.json({ items, total: count ?? 0, page, pageSize });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: PostPayload;
  try {
    body = (await request.json()) as PostPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const trimmed = body.title.trim();
    if (!trimmed) return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    updates.title = trimmed;
  }
  if (body.content !== undefined) {
    const trimmed = body.content.trim();
    if (!trimmed) return NextResponse.json({ error: "내용을 입력해 주세요." }, { status: 400 });
    updates.content = trimmed;
  }
  if (body.notice_yn !== undefined) updates.notice_yn = !!body.notice_yn;
  if (body.use_yn !== undefined) updates.use_yn = !!body.use_yn;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tb_post")
      .update(updates)
      .eq("post_id", id)
      .select(DETAIL_COLUMNS)
      .single();

    if (error) throw error;

    const { tb_board, ...rest } = data as typeof data & { tb_board: BoardRef };
    return NextResponse.json({ post: { ...rest, board_nm: boardNameOf(tb_board) } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const idRaw = searchParams.get("id");
  const id = idRaw ? Number(idRaw) : NaN;
  if (!idRaw || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("tb_post").delete().eq("post_id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete post" },
      { status: 500 }
    );
  }
}
