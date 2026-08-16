import { supabase } from "@/lib/supabase";
import { getBakeryPlaceIds, splitThemeSelection, BAKERY_THEME_CODE } from "@/lib/theme/bakeryTheme";
import { getRatingsByContentId, getLikeCountsByContentId } from "@/lib/search/placeAggregates";
import {
  getBarrierFreeIds,
  getRatedContentIds,
  getHeadcountExcludeIds,
  getScheduleExcludeIds
} from "@/lib/search/placeFilters";

// 지도 검색 페이지당 결과 수. page 파라미터가 있을 때만 { places, total } 형태로 응답한다
// (기존 호출부와의 하위 호환을 위해 page 없이 호출하면 예전처럼 배열만 반환).
const SEARCH_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") ?? "";
  const accessTypes = (searchParams.get("accessibility") ?? "").split(",").filter(Boolean);
  const guCode = searchParams.get("gu") ?? "";
  const dong = searchParams.get("dong") ?? "";
  const themes = (searchParams.get("themes") ?? "").split(",").filter(Boolean); // LCLSSYSTM1 code_id 들
  const minRating = Number(searchParams.get("minRating") ?? "0");
  const headcount = Number(searchParams.get("headcount") ?? "0");
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const contentId = searchParams.get("id") ?? "";
  const pageParam = searchParams.get("page");
  const usePagination = pageParam !== null;
  const page = usePagination ? Math.max(0, parseInt(pageParam, 10) || 0) : 0;

  // 특정 contentid 단건 조회 (게시글 첨부 장소를 지도에서 다시 찾을 때 사용)
  if (contentId.trim()) {
    const { data, error } = await supabase
      .from("tb_place")
      .select("place_id, contentid, title, addr1, mapx, mapy, firstimage, lclssystm1")
      .eq("contentid", contentId.trim())
      .not("mapx", "is", null)
      .not("mapy", "is", null)
      .limit(1);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const ids = (data ?? []).map((p) => String(p.contentid));
    const [ratings, likeCounts, bakeryIds] = await Promise.all([
      getRatingsByContentId(supabase, ids),
      getLikeCountsByContentId(supabase, ids),
      getBakeryPlaceIds()
    ]);
    const bakerySet = new Set(bakeryIds);

    return Response.json(
      (data ?? []).map((p) => {
        const cid = String(p.contentid);
        const rating = ratings.get(cid);
        return {
          id: cid,
          placeId: p.place_id,
          name: p.title,
          lat: Number(p.mapy),
          lng: Number(p.mapx),
          image: p.firstimage ?? "",
          address: p.addr1 ?? undefined,
          // 빵지순례(BK)는 실제 LCLSSYSTM1 코드가 아니지만, 마커 색은 카테고리 하나처럼 취급한다.
          categoryCode: bakerySet.has(p.place_id) ? BAKERY_THEME_CODE : (p.lclssystm1 ?? undefined),
          average_rating: rating?.average ?? null,
          review_count: rating?.count ?? 0,
          like_count: likeCounts.get(cid) ?? 0
        };
      })
    );
  }

  const hasFilter =
    keyword.trim() ||
    accessTypes.length > 0 ||
    guCode.trim() ||
    dong.trim() ||
    themes.length > 0 ||
    minRating > 0 ||
    headcount > 1 ||
    dateFrom.trim() ||
    dateTo.trim();
  if (!hasFilter) return Response.json([]);

  let query = supabase
    .from("tb_place")
    .select(
      "place_id, contentid, title, addr1, mapx, mapy, firstimage, lclssystm1",
      usePagination ? { count: "exact" } : undefined
    )
    .or("delete_yn.is.null,delete_yn.eq.N")
    .eq("use_yn", "Y") // 관리자가 숨기지 않은 장소만
    .not("mapx", "is", null)
    .not("mapy", "is", null);

  if (keyword.trim()) query = query.ilike("title", `%${keyword}%`);
  if (guCode.trim()) query = query.eq("ldongsigngucd", guCode);
  if (dong.trim()) query = query.eq("dong", dong.trim());

  // 검색 경로(테마/키워드/필터)와 무관하게 빵집 판정 결과를 마커 색에 쓰므로, 테마 필터에서
  // 이미 조회했으면 재사용하고 아니면 응답을 만들 때 한 번만 조회한다.
  let bakeryIds: number[] | null = null;

  try {
    // 테마(대분류) — 선택 중 하나라도 해당. "빵지순례"(BK)는 tb_code 상 가상 코드라
    // lclssystm1로 못 걸러서 별도 로직(getBakeryPlaceIds)으로 place_id를 구해 합친다.
    if (themes.length > 0) {
      const { officialCodes, includeBakery } = splitThemeSelection(themes);
      if (includeBakery) bakeryIds = await getBakeryPlaceIds();
      const activeBakeryIds = bakeryIds ?? [];
      if (officialCodes.length > 0 && includeBakery) {
        query = query.or(
          `lclssystm1.in.(${officialCodes.join(",")}),place_id.in.(${activeBakeryIds.length ? activeBakeryIds.join(",") : "-1"})`
        );
      } else if (officialCodes.length > 0) {
        query = query.in("lclssystm1", officialCodes);
      } else {
        query = query.in("place_id", activeBakeryIds.length > 0 ? activeBakeryIds : [-1]);
      }
    }

    if (accessTypes.length > 0) {
      const accessIds = await getBarrierFreeIds(accessTypes);
      query = query.in("contentid", accessIds.length > 0 ? accessIds : [-1]);
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "접근성 정보를 조회하지 못했습니다." },
      { status: 500 }
    );
  }
  if (minRating > 0) {
    const ratedIds = await getRatedContentIds(minRating);
    query = query.in("contentid", ratedIds.length > 0 ? ratedIds : [-1]); // 후기 평균 별점 ≥ minRating
  }

  // 인원수 · 일정 필터: 조건에 어긋나는 contentid 를 모아 한 번에 제외 (null 허용)
  const excludeIds = new Set<string>();
  for (const id of await getHeadcountExcludeIds(headcount)) excludeIds.add(id);
  for (const id of await getScheduleExcludeIds(dateFrom, dateTo)) excludeIds.add(id);
  // 재대입 없이 조건식으로 적용 (긴 체이닝의 타입 추론 깊이 문제 회피)
  const filteredQuery =
    excludeIds.size > 0 ? query.not("contentid", "in", `(${[...excludeIds].join(",")})`) : query;
  const finalQuery = usePagination
    ? filteredQuery.range(page * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE + SEARCH_PAGE_SIZE - 1)
    : filteredQuery.limit(SEARCH_PAGE_SIZE);

  const { data, error, count } = await finalQuery;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = (data ?? []).map((p) => String(p.contentid));
  const [ratings, likeCounts] = await Promise.all([
    getRatingsByContentId(supabase, ids),
    getLikeCountsByContentId(supabase, ids)
  ]);
  bakeryIds ??= await getBakeryPlaceIds();
  const bakerySet = new Set(bakeryIds);

  const places = (data ?? []).map((p) => {
    const cid = String(p.contentid);
    const rating = ratings.get(cid);
    return {
      id: cid,
      placeId: p.place_id,
      name: p.title,
      lat: Number(p.mapy),
      lng: Number(p.mapx),
      image: p.firstimage ?? "",
      address: p.addr1 ?? undefined,
      // 빵지순례(BK)는 실제 LCLSSYSTM1 코드가 아니지만, 마커 색은 카테고리 하나처럼 취급한다.
      categoryCode: bakerySet.has(p.place_id) ? BAKERY_THEME_CODE : (p.lclssystm1 ?? undefined),
      average_rating: rating?.average ?? null,
      review_count: rating?.count ?? 0,
      like_count: likeCounts.get(cid) ?? 0
    };
  });

  return Response.json(usePagination ? { places, total: count ?? places.length } : places);
}
