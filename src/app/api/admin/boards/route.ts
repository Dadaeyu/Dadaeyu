import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { applyIlikeSearch, parseListParams } from "@/lib/admin/list-query";

export const dynamic = "force-dynamic";

const BOARD_COLUMNS =
  "board_id, board_nm, board_desc, board_type, sort_order, use_yn, comment_yn, reply_yn, rating_yn, allow_image, allow_file, allow_secret, max_upload_count, created_at, updated_at";

type BoardPayload = {
  id?: number;
  board_nm?: string;
  board_desc?: string | null;
  board_type?: string;
  sort_order?: number;
  use_yn?: boolean;
  comment_yn?: boolean;
  reply_yn?: boolean;
  rating_yn?: boolean;
  allow_image?: boolean;
  allow_file?: boolean;
  allow_secret?: boolean;
  max_upload_count?: number;
};

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const singleId = Number(searchParams.get("id"));
  const { page, pageSize, q, from, to } = parseListParams(searchParams);

  try {
    const supabase = createAdminClient();

    if (Number.isFinite(singleId) && singleId > 0) {
      const { data, error } = await supabase
        .from("tb_board")
        .select(BOARD_COLUMNS)
        .eq("board_id", singleId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "게시판을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ items: [data], total: 1, page: 1, pageSize: 1 });
    }

    let query = supabase
      .from("tb_board")
      .select(BOARD_COLUMNS, { count: "exact" })
      .order("sort_order", { ascending: true })
      .order("board_id", { ascending: true });

    query = applyIlikeSearch(query, "board_nm", q);

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return NextResponse.json({ items: data ?? [], total: count ?? 0, page, pageSize });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch boards" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: BoardPayload;
  try {
    body = (await request.json()) as BoardPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const board_nm = (body.board_nm ?? "").trim();
  if (!board_nm) {
    return NextResponse.json({ error: "게시판명을 입력해 주세요." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tb_board")
      .insert({
        board_nm,
        board_desc: body.board_desc?.trim() || null,
        board_type: (body.board_type ?? "NORMAL").trim() || "NORMAL",
        sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
        use_yn: body.use_yn ?? true,
        comment_yn: body.comment_yn ?? true,
        reply_yn: body.reply_yn ?? false,
        rating_yn: body.rating_yn ?? false,
        allow_image: body.allow_image ?? true,
        allow_file: body.allow_file ?? false,
        allow_secret: body.allow_secret ?? false,
        max_upload_count: typeof body.max_upload_count === "number" ? body.max_upload_count : 5
      })
      .select(BOARD_COLUMNS)
      .single();

    if (error) throw error;
    return NextResponse.json({ board: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create board" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: BoardPayload;
  try {
    body = (await request.json()) as BoardPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.board_nm !== undefined) {
    const trimmed = body.board_nm.trim();
    if (!trimmed) return NextResponse.json({ error: "게시판명을 입력해 주세요." }, { status: 400 });
    updates.board_nm = trimmed;
  }
  if (body.board_desc !== undefined) updates.board_desc = body.board_desc?.trim() || null;
  if (body.board_type !== undefined) updates.board_type = (body.board_type || "NORMAL").trim();
  if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order);
  if (body.use_yn !== undefined) updates.use_yn = !!body.use_yn;
  if (body.comment_yn !== undefined) updates.comment_yn = !!body.comment_yn;
  if (body.reply_yn !== undefined) updates.reply_yn = !!body.reply_yn;
  if (body.rating_yn !== undefined) updates.rating_yn = !!body.rating_yn;
  if (body.allow_image !== undefined) updates.allow_image = !!body.allow_image;
  if (body.allow_file !== undefined) updates.allow_file = !!body.allow_file;
  if (body.allow_secret !== undefined) updates.allow_secret = !!body.allow_secret;
  if (body.max_upload_count !== undefined) updates.max_upload_count = Number(body.max_upload_count);
  updates.updated_at = new Date().toISOString();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tb_board")
      .update(updates)
      .eq("board_id", id)
      .select(BOARD_COLUMNS)
      .single();

    if (error) throw error;
    return NextResponse.json({ board: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update board" },
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
    const { error } = await supabase.from("tb_board").delete().eq("board_id", id);
    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "게시글이 있는 게시판은 삭제할 수 없습니다. 먼저 게시글을 모두 삭제해 주세요." },
          { status: 409 }
        );
      }
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete board" },
      { status: 500 }
    );
  }
}
