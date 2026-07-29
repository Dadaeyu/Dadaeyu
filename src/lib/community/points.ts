import { createAdminClient } from "@/lib/supabase/admin";
import { T } from "@/lib/supabase/tables";

/** 일일 캡에 포함되는 일반 활동 */
export const POINT_REASON = {
  POST_CREATE: "post_create",
  COMMENT_CREATE: "comment_create",
  LIKE_RECEIVED: "like_received",
  PLACE_FAVORITE: "place_favorite",
  REPORT_APPROVED: "report_approved"
} as const;

export type PointReason = (typeof POINT_REASON)[keyof typeof POINT_REASON];

export const POINT_AMOUNT: Record<PointReason, number> = {
  post_create: 15,
  comment_create: 3,
  like_received: 2,
  place_favorite: 1,
  report_approved: 50
};

/** 일반 활동 일일 총상한 (제보 승인은 제외) */
export const DAILY_POINT_CAP = 60;

export const DAILY_COUNT_CAP: Partial<Record<PointReason, number>> = {
  post_create: 3,
  comment_create: 10,
  place_favorite: 5
};

/** 게시글당 하루 받을 수 있는 좋아요 점수 횟수 */
export const LIKE_RECEIVED_PER_POST_DAILY = 20;

const CAP_EXEMPT = new Set<PointReason>([POINT_REASON.REPORT_APPROVED]);

export const POINT_REASON_LABELS: Record<string, string> = {
  post_create: "게시글 작성",
  comment_create: "댓글 작성",
  like_received: "좋아요 받음",
  place_favorite: "장소 즐겨찾기",
  report_approved: "정보 제보 승인"
};

function startOfTodayKstIso(): string {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  // KST 00:00 = UTC 전날 15:00
  return new Date(`${y}-${m}-${d}T00:00:00+09:00`).toISOString();
}

export type AwardPointsInput = {
  userId: string;
  reason: PointReason;
  refType?: string | null;
  refId?: number | null;
  /** 기본값: POINT_AMOUNT[reason] */
  amount?: number;
  /** 동일 reason+ref 중복 적립 허용 (기본 false) */
  allowDuplicateRef?: boolean;
};

export type AwardPointsResult = {
  awarded: number;
  skipped: boolean;
  reason?: string;
};

/**
 * tb_user_point_events INSERT → 트리거가 community_points/level 갱신.
 * service role 전용. 실패해도 호출측 핵심 로직을 막지 않도록 try 안에서 사용 권장.
 */
export async function awardPoints(input: AwardPointsInput): Promise<AwardPointsResult> {
  const amount = input.amount ?? POINT_AMOUNT[input.reason];
  if (!Number.isFinite(amount) || amount <= 0) {
    return { awarded: 0, skipped: true, reason: "invalid_amount" };
  }

  const supabase = createAdminClient();
  const since = startOfTodayKstIso();

  if (!input.allowDuplicateRef && input.refType != null && input.refId != null) {
    const { data: dup } = await supabase
      .from(T.userPointEvents)
      .select("id")
      .eq("user_id", input.userId)
      .eq("reason", input.reason)
      .eq("ref_type", input.refType)
      .eq("ref_id", input.refId)
      .limit(1)
      .maybeSingle();
    if (dup) {
      return { awarded: 0, skipped: true, reason: "duplicate_ref" };
    }
  }

  const countCap = DAILY_COUNT_CAP[input.reason];
  if (countCap != null) {
    const { count } = await supabase
      .from(T.userPointEvents)
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .eq("reason", input.reason)
      .gte("created_at", since);
    if ((count ?? 0) >= countCap) {
      return { awarded: 0, skipped: true, reason: "daily_count_cap" };
    }
  }

  // like_received: ref_id=postId, ref_type=liker:uuid → 글당 일일 횟수는 ref_id만으로 집계
  if (input.reason === POINT_REASON.LIKE_RECEIVED && input.refId != null) {
    const { count: postDayCount } = await supabase
      .from(T.userPointEvents)
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .eq("reason", POINT_REASON.LIKE_RECEIVED)
      .eq("ref_id", input.refId)
      .gte("created_at", since);
    if ((postDayCount ?? 0) >= LIKE_RECEIVED_PER_POST_DAILY) {
      return { awarded: 0, skipped: true, reason: "per_post_like_cap" };
    }
  }

  let awardAmount = amount;
  if (!CAP_EXEMPT.has(input.reason)) {
    const { data: todayRows } = await supabase
      .from(T.userPointEvents)
      .select("amount, reason")
      .eq("user_id", input.userId)
      .gte("created_at", since);

    const used = (todayRows ?? [])
      .filter((r) => !CAP_EXEMPT.has(r.reason as PointReason))
      .reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const remaining = DAILY_POINT_CAP - used;
    if (remaining <= 0) {
      return { awarded: 0, skipped: true, reason: "daily_cap" };
    }
    awardAmount = Math.min(amount, remaining);
  }

  const { error } = await supabase.from(T.userPointEvents).insert({
    user_id: input.userId,
    amount: awardAmount,
    reason: input.reason,
    ref_type: input.refType ?? null,
    ref_id: input.refId ?? null
  });

  if (error) throw error;
  return { awarded: awardAmount, skipped: false };
}
