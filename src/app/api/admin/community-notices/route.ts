import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateTitleContent } from "@/lib/community/validation";
import {
  assertNonEmptyPatch,
  buildNoticePatch,
  mergeAndValidateNotice,
  normalizeOptionalDate,
  parsePatchId
} from "@/lib/community/patch";
import { applyIlikeSearch, parseListParams } from "@/lib/admin/list-query";

export const dynamic = "force-dynamic";

type NoticePayload = {
  id?: number;
  title?: string;
  content?: string;
  pinned?: boolean;
  is_visible?: boolean;
  published_at?: string | null;
  sort_order?: number;
};

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const singleId = Number(searchParams.get("id"));
  const { page, pageSize, q, from, to } = parseListParams(searchParams);
  const visibleFilter = searchParams.get("visible") ?? "all";
  const pinnedFilter = searchParams.get("pinned") ?? "all";

  try {
    const supabase = createAdminClient();

    if (Number.isFinite(singleId) && singleId > 0) {
      const { data, error } = await supabase
        .from("tb_community_notices")
        .select("*")
        .eq("id", singleId)
        .single();
      if (error || !data) {
        return NextResponse.json({ error: "공지를 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ items: [data], total: 1, page: 1, pageSize: 1 });
    }

    let query = supabase
      .from("tb_community_notices")
      .select("*", { count: "exact" })
      .order("pinned", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false });

    if (visibleFilter === "visible") query = query.eq("is_visible", true);
    else if (visibleFilter === "hidden") query = query.eq("is_visible", false);

    if (pinnedFilter === "pinned") query = query.eq("pinned", true);
    else if (pinnedFilter === "unpinned") query = query.eq("pinned", false);

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
  const validationError = validateTitleContent(title, content);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const published_at = normalizeOptionalDate(body.published_at ?? null) ?? new Date().toISOString();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tb_community_notices")
      .insert({
        title,
        content,
        pinned: !!body.pinned,
        is_visible: body.is_visible !== false,
        published_at,
        sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
        created_by: admin.id
      })
      .select("*")
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

  const id = parsePatchId(body.id);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const patch = buildNoticePatch(body);
  const emptyError = assertNonEmptyPatch(patch);
  if (emptyError) return NextResponse.json({ error: emptyError }, { status: 400 });

  try {
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("tb_community_notices")
      .select("title, content, pinned, is_visible, published_at, sort_order")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "공지를 찾을 수 없습니다." }, { status: 404 });
    }

    const { patch: validatedPatch, error: validationError } = mergeAndValidateNotice(
      existing,
      patch
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tb_community_notices")
      .update(validatedPatch)
      .eq("id", id)
      .select("*")
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

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("tb_community_notices").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete notice" },
      { status: 500 }
    );
  }
}
