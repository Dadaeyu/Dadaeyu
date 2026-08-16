import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBakeryPlaceIds, BAKERY_THEME_CODE } from "@/lib/theme/bakeryTheme";
import { buildPlaceReviewRankings, groupPlaceFavoriteSignals } from "./discoveryPlaceData";

export const dynamic = "force-dynamic";

const LEGACY_RESULT_COUNT = 5;
const HOME_SECTION_COUNT = 4;
// 순위 산정은 "후기" 게시판(board_id 1)의 별점 평균만 사용.
const REVIEW_BOARD_ID = 1;

export async function GET() {
  try {
    const supabase = await createClient();

    const [reviewResult, favoriteResult] = await Promise.all([
      supabase
        .from("tb_post")
        .select("content_id, rating")
        .eq("board_id", REVIEW_BOARD_ID)
        .eq("use_yn", true)
        .not("rating", "is", null)
        .not("content_id", "is", null),
      supabase.from("tb_place_like").select("place_id")
    ]);

    if (reviewResult.error) throw reviewResult.error;
    if (favoriteResult.error) throw favoriteResult.error;

    const reviewRankings = buildPlaceReviewRankings(
      reviewResult.data ?? [],
      HOME_SECTION_COUNT,
      LEGACY_RESULT_COUNT
    );
    const grouped = reviewRankings.grouped;
    const likeCounts = groupPlaceFavoriteSignals(favoriteResult.data ?? []);

    const rankedFavorites = Array.from(likeCounts.entries())
      .map(([contentId, count]) => ({ contentId, count }))
      .sort((a, b) => b.count - a.count || a.contentId.localeCompare(b.contentId))
      .slice(0, HOME_SECTION_COUNT);

    const candidateIds = [
      ...new Set([
        ...reviewRankings.legacy.map((item) => item.contentId),
        ...rankedFavorites.map((item) => item.contentId)
      ])
    ];

    type PlaceResult = {
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
      like_count: number;
    };

    const placeByContentId = new Map<
      string,
      {
        place_id: number;
        contentid: string | number;
        title: string;
        addr1: string | null;
        mapx: number | string;
        mapy: number | string;
        firstimage: string | null;
        lclssystm1: string | null;
      }
    >();

    if (candidateIds.length > 0) {
      const { data: places, error: placesError } = await supabase
        .from("tb_place")
        .select("place_id, contentid, title, addr1, mapx, mapy, firstimage, lclssystm1")
        .or("delete_yn.is.null,delete_yn.eq.N")
        .eq("use_yn", "Y")
        .in("contentid", candidateIds)
        .not("mapx", "is", null)
        .not("mapy", "is", null);

      if (placesError) throw placesError;

      // content_id와 contentid는 bigint라 문자열 기준으로 맞춘다.
      for (const place of places ?? []) placeByContentId.set(String(place.contentid), place);
    }

    const bakeryIds = await getBakeryPlaceIds();
    const bakerySet = new Set(bakeryIds);

    const toPlaceResult = (contentId: string): PlaceResult | null => {
      const place = placeByContentId.get(contentId);
      if (!place) return null;
      const rating = grouped.get(contentId);
      return {
        id: String(place.contentid),
        placeId: place.place_id,
        name: place.title,
        lat: Number(place.mapy),
        lng: Number(place.mapx),
        image: place.firstimage ?? "",
        address: place.addr1 ?? undefined,
        categoryCode: bakerySet.has(place.place_id)
          ? BAKERY_THEME_CODE
          : (place.lclssystm1 ?? undefined),
        average_rating: rating ? rating.sum / rating.count : null,
        review_count: rating?.count ?? 0,
        like_count: likeCounts.get(contentId) ?? 0
      };
    };

    const reviewPlaces = reviewRankings.home
      .map((item) => toPlaceResult(item.contentId))
      .filter((place): place is PlaceResult => place !== null);
    const legacyReviewPlaces = reviewRankings.legacy
      .map((item) => toPlaceResult(item.contentId))
      .filter((place): place is PlaceResult => place !== null);
    const favoritePlaces = rankedFavorites
      .map((item) => toPlaceResult(item.contentId))
      .filter((place): place is PlaceResult => place !== null);

    const legacyPlaces = legacyReviewPlaces.map((r) => ({
      ...r,
      // 빵지순례(BK)는 실제 LCLSSYSTM1 코드가 아니지만, 마커 색은 카테고리 하나처럼 취급한다.
      categoryCode: bakerySet.has(r.placeId) ? BAKERY_THEME_CODE : r.categoryCode
    }));

    return NextResponse.json({ places: legacyPlaces, reviewPlaces, favoritePlaces });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch top rated places" },
      { status: 500 }
    );
  }
}
