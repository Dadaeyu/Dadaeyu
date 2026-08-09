import type { SupabaseClient } from "@supabase/supabase-js";

// "후기" 게시판(board_id=1)의 별점 평균과, tb_place_like 즐겨찾기 수를
// contentid별로 모아준다. /api/search, /api/tourism/top-rated-places,
// /api/tourism/liked 에서 공통으로 쓴다.
const REVIEW_BOARD_ID = 1;

export async function getRatingsByContentId(
  supabase: SupabaseClient,
  contentIds: (string | number)[]
): Promise<Map<string, { average: number; count: number }>> {
  const ids = [...new Set(contentIds.map(Number).filter(Number.isFinite))];
  if (ids.length === 0) return new Map();

  const { data } = await supabase
    .from("tb_post")
    .select("content_id, rating")
    .eq("board_id", REVIEW_BOARD_ID)
    .eq("use_yn", true)
    .not("rating", "is", null)
    .in("content_id", ids);

  const grouped = new Map<number, { sum: number; count: number }>();
  for (const row of data ?? []) {
    if (row.content_id == null || row.rating == null) continue;
    const g = grouped.get(row.content_id) ?? { sum: 0, count: 0 };
    g.sum += row.rating;
    g.count += 1;
    grouped.set(row.content_id, g);
  }

  const result = new Map<string, { average: number; count: number }>();
  for (const [cid, g] of grouped)
    result.set(String(cid), { average: g.sum / g.count, count: g.count });
  return result;
}

// tb_place_like.place_id 는 실제로는 tb_place.contentid 값을 담는다(내부 PK가 아님).
export async function getLikeCountsByContentId(
  supabase: SupabaseClient,
  contentIds: (string | number)[]
): Promise<Map<string, number>> {
  const ids = [...new Set(contentIds.map((c) => String(c)))];
  if (ids.length === 0) return new Map();

  const { data } = await supabase.from("tb_place_like").select("place_id").in("place_id", ids);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = String(row.place_id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
