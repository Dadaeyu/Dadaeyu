import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateNoticeFields } from "@/lib/notices/validation";
import { applyIlikeSearch, parseListParams } from "@/lib/admin/list-query";

export const dynamic = "force-dynamic";

type NoticePayload = {
  id?: number;
  title?: string;
  content?: string;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  priority?: number;
};

function normalizeOptionalDate(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(value).toISOString();
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const singleId = Number(searchParams.get("id"));
  const { page, pageSize, q, from, to } = parseListParams(searchParams);
  const activeFilter = searchParams.get("active") ?? "all";

  try {
    const supabase = createAdminClient();

    if (Number.isFinite(singleId) && singleId > 0) {
      const { data, error } = await supabase
        .from("tb_notices")
        .select(
          "id, title, content, is_active, starts_at, ends_at, priority, created_at, updated_at, created_by"
        )
        .eq("id", singleId)
        .single();
      if (error || !data) {
        return NextResponse.json({ error: "팝업을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ items: [data], total: 1, page: 1, pageSize: 1 });
    }

    let query = supabase
      .from("tb_notices")
      .select(
        "id, title, content, is_active, starts_at, ends_at, priority, created_at, updated_at, created_by",
        {
          count: "exact"
        }
      )
      .order("updated_at", { ascending: false });

    if (activeFilter === "active") query = query.eq("is_active", true);
    else if (activeFilter === "inactive") query = query.eq("is_active", false);

    query = applyIlikeSearch(query, "title", q);

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch notices" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: NoticePayload;
  try {
    body = (await request.json()) as NoticePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const content = (body.content ?? "").trim();
  const priority = typeof body.priority === "number" ? body.priority : 0;
  const starts_at = normalizeOptionalDate(body.starts_at ?? null) ?? null;
  const ends_at = normalizeOptionalDate(body.ends_at ?? null) ?? null;
  const is_active = !!body.is_active;

  const validationError = validateNoticeFields({ title, content, priority, starts_at, ends_at });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("tb_notices")
      .insert({
        title,
        content,
        priority,
        starts_at,
        ends_at,
        is_active,
        created_by: admin.id
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ notice: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create notice" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: NoticePayload;
  try {
    body = (await request.json()) as NoticePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = typeof body.id === "number" ? body.id : Number(body.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.content !== undefined) updates.content = String(body.content).trim();
  if (body.priority !== undefined) updates.priority = Number(body.priority);
  if (body.starts_at !== undefined) updates.starts_at = normalizeOptionalDate(body.starts_at);
  if (body.ends_at !== undefined) updates.ends_at = normalizeOptionalDate(body.ends_at);
  if (body.is_active !== undefined) updates.is_active = !!body.is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("tb_notices")
      .select("title, content, priority, starts_at, ends_at")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "공지를 찾을 수 없습니다." }, { status: 404 });
    }

    const merged = {
      title: (updates.title as string | undefined) ?? existing.title,
      content: (updates.content as string | undefined) ?? existing.content,
      priority: (updates.priority as number | undefined) ?? existing.priority,
      starts_at: (updates.starts_at as string | null | undefined) ?? existing.starts_at,
      ends_at: (updates.ends_at as string | null | undefined) ?? existing.ends_at
    };

    const validationError = validateNoticeFields(merged);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (updates.title !== undefined && !merged.title) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }
    if (updates.content !== undefined && !merged.content) {
      return NextResponse.json({ error: "내용을 입력해 주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tb_notices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ notice: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update notice" },
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
    const { error } = await supabase.from("tb_notices").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete notice" },
      { status: 500 }
    );
  }
}
