import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateEventFields } from "@/lib/community/validation";
import {
  assertNonEmptyPatch,
  buildEventPatch,
  mergeAndValidateEvent,
  parsePatchId
} from "@/lib/community/patch";
import { applyOrIlikeSearch, parseListParams } from "@/lib/admin/list-query";
import {
  DEFAULT_EVENT_BADGE_COLOR,
  DEFAULT_EVENT_COVER_GRADIENT,
  DEFAULT_EVENT_EMOJI,
  buildPeriodLabel,
  normalizeEventDate,
  resolveEventBadgeColor,
  validateEventPeriod
} from "@/lib/community/event-ui";

export const dynamic = "force-dynamic";

type EventPayload = {
  id?: number;
  title?: string;
  summary?: string;
  content?: string;
  emoji?: string;
  badge_label?: string;
  badge_color?: string;
  cover_gradient?: string;
  cover_image_url?: string | null;
  period_label?: string;
  period_start?: string | null;
  period_end?: string | null;
  is_visible?: boolean;
  sort_order?: number;
};

const SCHEMA_HINT = " (Supabase에서 supabase/schema-community-events-ui.sql 을 실행해 주세요)";

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST204") return true;
  return /Could not find the '.*' column/i.test(error.message ?? "");
}

function dbErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message?: string }).message ?? "");
    if (isMissingColumnError(error as { code?: string; message?: string })) {
      return (msg || fallback) + SCHEMA_HINT;
    }
    if (msg) return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function normalizeEventDates(body: EventPayload): {
  period_start: string | null;
  period_end: string | null;
  period_label: string;
  error: string | null;
} {
  const period_start = normalizeEventDate(body.period_start ?? null);
  const period_end = normalizeEventDate(body.period_end ?? null);
  const error = validateEventPeriod(period_start, period_end);
  return {
    period_start,
    period_end,
    period_label: buildPeriodLabel(period_start, period_end),
    error
  };
}

function stripExtendedEventFields<T extends Record<string, unknown>>(
  row: T,
  error?: { message?: string } | null
): T {
  const next = { ...row };
  const msg = error?.message ?? "";
  const mentionsCover = /cover_image_url/i.test(msg);
  const mentionsPeriod = /period_start|period_end/i.test(msg);
  // 에러에 언급된 컬럼만 제거 — 썸네일만 있는 경우 period만 빠져도 cover는 유지
  if (!mentionsCover && !mentionsPeriod) {
    delete next.cover_image_url;
    delete next.period_start;
    delete next.period_end;
    return next;
  }
  if (mentionsCover) delete next.cover_image_url;
  if (mentionsPeriod) {
    delete next.period_start;
    delete next.period_end;
  }
  return next;
}

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
        .from("tb_community_events")
        .select("*")
        .eq("id", singleId)
        .single();
      if (error || !data) {
        return NextResponse.json(
          { error: dbErrorMessage(error, "이벤트를 찾을 수 없습니다.") },
          { status: 404 }
        );
      }
      return NextResponse.json({ items: [data], total: 1, page: 1, pageSize: 1 });
    }

    let query = supabase
      .from("tb_community_events")
      .select("*", { count: "exact" })
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });

    if (visibleFilter === "visible") query = query.eq("is_visible", true);
    else if (visibleFilter === "hidden") query = query.eq("is_visible", false);

    if (q.trim()) {
      query = applyOrIlikeSearch(query, ["title", "summary"], q);
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
      { error: dbErrorMessage(e, "Failed to fetch events") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: EventPayload;
  try {
    body = (await request.json()) as EventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const summary = (body.summary ?? "").trim();
  const content = (body.content ?? "").trim();
  const validationError = validateEventFields({ title, summary, content });
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const dates = normalizeEventDates(body);
  if (dates.error) return NextResponse.json({ error: dates.error }, { status: 400 });

  const coverImage =
    body.cover_image_url === null || body.cover_image_url === undefined
      ? null
      : body.cover_image_url.trim() || null;

  const fullRow = {
    title,
    summary,
    content,
    emoji: DEFAULT_EVENT_EMOJI,
    badge_label: (body.badge_label ?? "").trim(),
    badge_color: resolveEventBadgeColor(body.badge_color ?? DEFAULT_EVENT_BADGE_COLOR),
    cover_gradient: DEFAULT_EVENT_COVER_GRADIENT,
    cover_image_url: coverImage,
    period_label: dates.period_label,
    period_start: dates.period_start,
    period_end: dates.period_end,
    is_visible: body.is_visible !== false,
    sort_order: typeof body.sort_order === "number" ? body.sort_order : 0
  };

  try {
    const supabase = createAdminClient();
    let { data, error } = await supabase
      .from("tb_community_events")
      .insert(fullRow)
      .select("*")
      .single();

    // 원격 DB에 썸네일/기간 컬럼이 아직 없으면 period_label만 저장하는 레거시 경로
    if (error && isMissingColumnError(error)) {
      const legacy = stripExtendedEventFields(fullRow, error);
      const retry = await supabase.from("tb_community_events").insert(legacy).select("*").single();
      data = retry.data;
      error = retry.error;
      if (!error && (coverImage || dates.period_start || dates.period_end)) {
        // 저장은 됐지만 확장 컬럼 미적용 — 클라이언트에 안내
        return NextResponse.json({
          event: data,
          warning: "이벤트가 저장되었습니다." + SCHEMA_HINT
        });
      }
    }

    if (error) throw error;
    return NextResponse.json({ event: data });
  } catch (e) {
    return NextResponse.json(
      { error: dbErrorMessage(e, "Failed to create event") },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: EventPayload;
  try {
    body = (await request.json()) as EventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = parsePatchId(body.id);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  if (body.badge_color !== undefined) {
    body = { ...body, badge_color: resolveEventBadgeColor(body.badge_color) };
  }

  const patch = buildEventPatch(body);
  const emptyError = assertNonEmptyPatch(patch);
  if (emptyError) return NextResponse.json({ error: emptyError }, { status: 400 });

  try {
    const supabase = createAdminClient();

    // select('*') — 확장 컬럼이 없어도 조회 가능 (명시 컬럼 목록은 PGRST204 → 가짜 404 유발)
    const { data: existing, error: fetchError } = await supabase
      .from("tb_community_events")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: dbErrorMessage(fetchError, "이벤트를 찾을 수 없습니다.") },
        { status: 404 }
      );
    }

    if (body.period_start !== undefined || body.period_end !== undefined) {
      const start =
        body.period_start !== undefined
          ? normalizeEventDate(body.period_start)
          : normalizeEventDate((existing.period_start as string | null) ?? null);
      const end =
        body.period_end !== undefined
          ? normalizeEventDate(body.period_end)
          : normalizeEventDate((existing.period_end as string | null) ?? null);
      const periodError = validateEventPeriod(start, end);
      if (periodError) return NextResponse.json({ error: periodError }, { status: 400 });
      patch.period_start = start;
      patch.period_end = end;
      patch.period_label = buildPeriodLabel(start, end);
    }

    const { patch: validatedPatch, error: validationError } = mergeAndValidateEvent(
      {
        title: existing.title,
        summary: existing.summary,
        content: existing.content,
        emoji: existing.emoji,
        badge_label: existing.badge_label,
        badge_color: existing.badge_color,
        cover_gradient: existing.cover_gradient,
        cover_image_url: (existing.cover_image_url as string | null) ?? null,
        period_label: existing.period_label,
        period_start: (existing.period_start as string | null) ?? null,
        period_end: (existing.period_end as string | null) ?? null,
        is_visible: existing.is_visible,
        sort_order: existing.sort_order
      },
      patch
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    let { data, error } = await supabase
      .from("tb_community_events")
      .update(validatedPatch)
      .eq("id", id)
      .select("*")
      .single();

    if (error && isMissingColumnError(error)) {
      const legacyPatch = stripExtendedEventFields(validatedPatch, error);
      // period_label은 레거시에도 있음
      const retry = await supabase
        .from("tb_community_events")
        .update(legacyPatch)
        .eq("id", id)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
      if (!error) {
        return NextResponse.json({
          event: data,
          warning: "이벤트가 저장되었습니다." + SCHEMA_HINT
        });
      }
    }

    if (error) throw error;
    return NextResponse.json({ event: data });
  } catch (e) {
    return NextResponse.json(
      { error: dbErrorMessage(e, "Failed to update event") },
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
    const { error } = await supabase.from("tb_community_events").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: dbErrorMessage(e, "Failed to delete event") },
      { status: 500 }
    );
  }
}
