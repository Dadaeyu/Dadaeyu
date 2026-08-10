import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLikeCountsByContentId } from "@/lib/search/placeAggregates";
import { getBakeryPlaceIds, BAKERY_THEME_CODE } from "@/lib/theme/bakeryTheme";

export const dynamic = "force-dynamic";

const RESULT_COUNT = 5;
// 순위 산정은 "후기" 게시판(board_id 1)의 별점 평균만 사용.
const REVIEW_BOARD_ID = 1;

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: rows, error } = await supabase
      .from("tb_post")
      .select("content_id, rating")
      .eq("board_id", REVIEW_BOARD_ID)
      .eq("use_yn", true)
      .not("rating", "is", null)
      .not("content_id", "is", null);

    if (error) throw error;

    const grouped = new Map<number, { sum: number; count: number }>();
    for (const row of rows ?? []) {
      if (row.content_id == null || row.rating == null) continue;
      const g = grouped.get(row.content_id) ?? { sum: 0, count: 0 };
      g.sum += row.rating;
      g.count += 1;
      grouped.set(row.content_id, g);
    }

    const ranked = Array.from(grouped.entries())
      .map(([contentId, { sum, count }]) => ({ contentId, average: sum / count, count }))
      .sort((a, b) => b.average - a.average || b.count - a.count)
      .slice(0, RESULT_COUNT);

    let result: {
      id: string;
      placeId: number;
      name: string;
      lat: number;
      lng: number;
      image: string;
      address?: string;
      categoryCode?: string;
      average_rating: number | null;
      review_count: number;
    }[] = [];

    if (ranked.length > 0) {
      const { data: places, error: placesError } = await supabase
        .from("tb_place")
        .select("place_id, contentid, title, addr1, mapx, mapy, firstimage, lclssystm1")
        .in(
          "contentid",
          ranked.map((r) => r.contentId)
        )
        .not("mapx", "is", null)
        .not("mapy", "is", null);

      if (placesError) throw placesError;

      const placeByContentId = new Map((places ?? []).map((p) => [Number(p.contentid), p]));

      result = ranked
        .map((r) => {
          const p = placeByContentId.get(r.contentId);
          if (!p) return null;
          return {
            id: String(p.contentid),
            placeId: p.place_id,
            name: p.title,
            lat: Number(p.mapy),
            lng: Number(p.mapx),
            image: p.firstimage ?? "",
            address: p.addr1 ?? undefined,
            categoryCode: p.lclssystm1 ?? undefined,
            average_rating: r.average,
            review_count: r.count
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);
    }

    // 후기가 있는 곳이 5개 미만이면, 별점 없는 실제 장소로 나머지를 채운다.
    if (result.length < RESULT_COUNT) {
      const remaining = RESULT_COUNT - result.length;
      const excludeIds = new Set(result.map((r) => r.id));

      const { data: fillerRows, error: fillerError } = await supabase
        .from("tb_place")
        .select("place_id, contentid, title, addr1, mapx, mapy, firstimage, lclssystm1")
        .or("delete_yn.is.null,delete_yn.eq.N")
        .not("mapx", "is", null)
        .not("mapy", "is", null)
        .order("place_id", { ascending: false })
        .limit(remaining + excludeIds.size);

      if (fillerError) throw fillerError;

      const filler = (fillerRows ?? [])
        .filter((p) => !excludeIds.has(String(p.contentid)))
        .slice(0, remaining)
        .map((p) => ({
          id: String(p.contentid),
          placeId: p.place_id,
          name: p.title,
          lat: Number(p.mapy),
          lng: Number(p.mapx),
          image: p.firstimage ?? "",
          address: p.addr1 ?? undefined,
          categoryCode: p.lclssystm1 ?? undefined,
          average_rating: null,
          review_count: 0
        }));

      result = [...result, ...filler];
    }

    const [likeCounts, bakeryIds] = await Promise.all([
      getLikeCountsByContentId(
        supabase,
        result.map((r) => r.id)
      ),
      getBakeryPlaceIds()
    ]);
    const bakerySet = new Set(bakeryIds);
    const resultWithLikes = result.map((r) => ({
      ...r,
      like_count: likeCounts.get(r.id) ?? 0,
      // 빵지순례(BK)는 실제 LCLSSYSTM1 코드가 아니지만, 마커 색은 카테고리 하나처럼 취급한다.
      categoryCode: bakerySet.has(r.placeId) ? BAKERY_THEME_CODE : r.categoryCode
    }));

    return NextResponse.json({ places: resultWithLikes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch top rated places" },
      { status: 500 }
    );
  }
}
