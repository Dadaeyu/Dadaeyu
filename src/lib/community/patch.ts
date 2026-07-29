import {
  validateEventFields,
  validateFaqFields,
  validateTitleContent
} from "@/lib/community/validation";

export function assertNonEmptyPatch(patch: Record<string, unknown>): string | null {
  if (Object.keys(patch).length === 0) {
    return "변경할 내용이 없습니다.";
  }
  return null;
}

export function normalizeOptionalDate(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(value).toISOString();
}

export function parsePatchId(id: unknown): number | null {
  const parsed = typeof id === "number" ? id : Number(id);
  if (!parsed || Number.isNaN(parsed)) return null;
  return parsed;
}

type NoticeRow = {
  title: string;
  content: string;
  pinned: boolean;
  is_visible: boolean;
  published_at: string | null;
  sort_order: number;
};

export function buildNoticePatch(body: {
  title?: string;
  content?: string;
  pinned?: boolean;
  is_visible?: boolean;
  published_at?: string | null;
  sort_order?: number;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.content !== undefined) patch.content = body.content.trim();
  if (body.pinned !== undefined) patch.pinned = body.pinned;
  if (body.is_visible !== undefined) patch.is_visible = body.is_visible;
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
  if (body.published_at !== undefined) {
    patch.published_at = normalizeOptionalDate(body.published_at);
  }
  return patch;
}

export function mergeAndValidateNotice(
  existing: NoticeRow,
  patch: Record<string, unknown>
): { merged: NoticeRow; patch: Record<string, unknown>; error: string | null } {
  const merged: NoticeRow = {
    title: (patch.title as string | undefined) ?? existing.title,
    content: (patch.content as string | undefined) ?? existing.content,
    pinned: (patch.pinned as boolean | undefined) ?? existing.pinned,
    is_visible: (patch.is_visible as boolean | undefined) ?? existing.is_visible,
    published_at:
      patch.published_at !== undefined
        ? (patch.published_at as string | null)
        : existing.published_at,
    sort_order: (patch.sort_order as number | undefined) ?? existing.sort_order
  };

  const error = validateTitleContent(merged.title, merged.content);
  return { merged, patch, error };
}

type EventRow = {
  title: string;
  summary: string;
  content: string;
  emoji: string;
  badge_label: string;
  badge_color: string;
  cover_gradient: string;
  cover_image_url: string | null;
  period_label: string;
  period_start: string | null;
  period_end: string | null;
  is_visible: boolean;
  sort_order: number;
};

export function buildEventPatch(body: {
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
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.summary !== undefined) patch.summary = body.summary.trim();
  if (body.content !== undefined) patch.content = body.content.trim();
  if (body.emoji !== undefined) patch.emoji = body.emoji.trim() || "🎉";
  if (body.badge_label !== undefined) patch.badge_label = body.badge_label.trim();
  if (body.badge_color !== undefined) patch.badge_color = body.badge_color.trim();
  if (body.cover_gradient !== undefined) patch.cover_gradient = body.cover_gradient.trim();
  if (body.cover_image_url !== undefined) {
    patch.cover_image_url =
      body.cover_image_url === null || body.cover_image_url.trim() === ""
        ? null
        : body.cover_image_url.trim();
  }
  if (body.period_label !== undefined) patch.period_label = body.period_label.trim();
  if (body.period_start !== undefined) {
    patch.period_start =
      body.period_start === null || body.period_start === "" ? null : body.period_start;
  }
  if (body.period_end !== undefined) {
    patch.period_end = body.period_end === null || body.period_end === "" ? null : body.period_end;
  }
  if (body.is_visible !== undefined) patch.is_visible = body.is_visible;
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
  return patch;
}

export function mergeAndValidateEvent(
  existing: EventRow,
  patch: Record<string, unknown>
): { merged: EventRow; patch: Record<string, unknown>; error: string | null } {
  const merged: EventRow = {
    title: (patch.title as string | undefined) ?? existing.title,
    summary: (patch.summary as string | undefined) ?? existing.summary,
    content: (patch.content as string | undefined) ?? existing.content,
    emoji: (patch.emoji as string | undefined) ?? existing.emoji,
    badge_label: (patch.badge_label as string | undefined) ?? existing.badge_label,
    badge_color: (patch.badge_color as string | undefined) ?? existing.badge_color,
    cover_gradient: (patch.cover_gradient as string | undefined) ?? existing.cover_gradient,
    cover_image_url:
      patch.cover_image_url !== undefined
        ? (patch.cover_image_url as string | null)
        : existing.cover_image_url,
    period_label: (patch.period_label as string | undefined) ?? existing.period_label,
    period_start:
      patch.period_start !== undefined
        ? (patch.period_start as string | null)
        : existing.period_start,
    period_end:
      patch.period_end !== undefined ? (patch.period_end as string | null) : existing.period_end,
    is_visible: (patch.is_visible as boolean | undefined) ?? existing.is_visible,
    sort_order: (patch.sort_order as number | undefined) ?? existing.sort_order
  };

  const error = validateEventFields({
    title: merged.title,
    summary: merged.summary,
    content: merged.content
  });
  return { merged, patch, error };
}

type FaqRow = {
  question: string;
  answer: string;
  is_visible: boolean;
  sort_order: number;
};

export function buildFaqPatch(body: {
  question?: string;
  answer?: string;
  is_visible?: boolean;
  sort_order?: number;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (body.question !== undefined) patch.question = body.question.trim();
  if (body.answer !== undefined) patch.answer = body.answer.trim();
  if (body.is_visible !== undefined) patch.is_visible = body.is_visible;
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
  return patch;
}

export function mergeAndValidateFaq(
  existing: FaqRow,
  patch: Record<string, unknown>
): { merged: FaqRow; patch: Record<string, unknown>; error: string | null } {
  const merged: FaqRow = {
    question: (patch.question as string | undefined) ?? existing.question,
    answer: (patch.answer as string | undefined) ?? existing.answer,
    is_visible: (patch.is_visible as boolean | undefined) ?? existing.is_visible,
    sort_order: (patch.sort_order as number | undefined) ?? existing.sort_order
  };

  const error = validateFaqFields(merged.question, merged.answer);
  return { merged, patch, error };
}
