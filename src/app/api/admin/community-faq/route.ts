import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateFaqFields } from "@/lib/community/validation";
import {
  assertNonEmptyPatch,
  buildFaqPatch,
  mergeAndValidateFaq,
  parsePatchId
} from "@/lib/community/patch";
import { applyOrIlikeSearch, parseListParams } from "@/lib/admin/list-query";

export const dynamic = "force-dynamic";

type FaqPayload = {
  id?: number;
  question?: string;
  answer?: string;
  is_visible?: boolean;
  sort_order?: number;
};

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const singleId = Number(searchParams.get("id"));
  const { page, pageSize, q, from, to } = parseListParams(searchParams);
  const visibleFilter = searchParams.get("visible") ?? "all";

  try {
    const supabase = createAdminClient();

    if (Number.isFinite(singleId) && singleId > 0) {
      const { data, error } = await supabase
        .from("tb_community_faq")
        .select("*")
        .eq("id", singleId)
        .single();
      if (error || !data) {
        return NextResponse.json({ error: "FAQ를 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ items: [data], total: 1, page: 1, pageSize: 1 });
    }

    let query = supabase
      .from("tb_community_faq")
      .select("*", { count: "exact" })
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });

    if (visibleFilter === "visible") query = query.eq("is_visible", true);
    else if (visibleFilter === "hidden") query = query.eq("is_visible", false);

    if (q.trim()) {
      query = applyOrIlikeSearch(query, ["question", "answer"], q);
    }

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
      { error: e instanceof Error ? e.message : "Failed to fetch faqs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: FaqPayload;
  try {
    body = (await request.json()) as FaqPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  const answer = (body.answer ?? "").trim();
  const validationError = validateFaqFields(question, answer);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tb_community_faq")
      .insert({
        question,
        answer,
        is_visible: body.is_visible !== false,
        sort_order: typeof body.sort_order === "number" ? body.sort_order : 0
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ faq: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create faq" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: FaqPayload;
  try {
    body = (await request.json()) as FaqPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = parsePatchId(body.id);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const patch = buildFaqPatch(body);
  const emptyError = assertNonEmptyPatch(patch);
  if (emptyError) return NextResponse.json({ error: emptyError }, { status: 400 });

  try {
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("tb_community_faq")
      .select("question, answer, is_visible, sort_order")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "FAQ를 찾을 수 없습니다." }, { status: 404 });
    }

    const { patch: validatedPatch, error: validationError } = mergeAndValidateFaq(existing, patch);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tb_community_faq")
      .update(validatedPatch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ faq: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update faq" },
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
    const { error } = await supabase.from("tb_community_faq").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete faq" },
      { status: 500 }
    );
  }
}
