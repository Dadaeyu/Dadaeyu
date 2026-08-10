import { supabase } from "@/lib/supabase";
import { getBakeryPlaceIds, splitThemeSelection, BAKERY_THEME_CODE } from "@/lib/theme/bakeryTheme";
import { getRatingsByContentId, getLikeCountsByContentId } from "@/lib/search/placeAggregates";

// 접근성 필터 값(tb_code BARRIERFREE 의 code_id) → tb_place_barrierfree 의 has_* 플래그 매핑.
// 필터 옵션은 /api/codes/filter-options 에서 오며 임산부(MT)·고령자(SN)는 데이터가 없어 제외된다.
const BARRIERFREE_COLS: Record<string, string> = {
  BD: "has_blind", // 시각장애
  DF: "has_deaf", // 청각장애
  GT: "has_gait", // 보행장애
  IF: "has_infant" // 영유아
};

// 선택된 접근성 유형들을 OR로 합친다 (예: 청각+보행 선택 시 둘 중 하나라도 true면 노출).
export async function getBarrierFreeIds(types: string[]): Promise<number[]> {
  const cols = Array.from(new Set(types.map((t) => BARRIERFREE_COLS[t]).filter(Boolean)));
  if (cols.length === 0) return [];

  const { data, error } = await supabase
    .from("tb_place_barrierfree")
    .select("contentid")
    .or(cols.map((c) => `${c}.eq.true`).join(","));

  if (error) throw error;

  return (data ?? []).map((row) => row.contentid as number);
}

// 별점 필터: 후기 게시판(board_id=1)의 장소별 평균 별점이 minRating 이상인 contentid 목록.
// 후기가 없는 장소는 목록에 없어 자연히 제외된다(포함 방식). minRating<=0 이면 필터 안 함.
const REVIEW_BOARD_ID = 1;
async function getRatedContentIds(minRating: number): Promise<number[]> {
  if (minRating <= 0) return [];
  const { data } = await supabase
    .from("tb_post")
    .select("content_id, rating")
    .eq("board_id", REVIEW_BOARD_ID)
    .eq("use_yn", true)
    .not("rating", "is", null)
    .not("content_id", "is", null);

  const grouped = new Map<number, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const cid = row.content_id as number;
    const g = grouped.get(cid) ?? { sum: 0, count: 0 };
    g.sum += row.rating as number;
    g.count += 1;
    grouped.set(cid, g);
  }
  const ids: number[] = [];
  for (const [cid, g] of grouped) {
    if (g.sum / g.count >= minRating) ids.push(cid); // 평균 별점 ≥ 선택값
  }
  return ids;
}

// 인원수 필터로 "제외"할 contentid 목록.
// 요청 인원(headcount)을 확실히 수용 못 하는 곳만 제외한다. (null = 정보 없음 → 제외 안 함)
//  - accommax < headcount : 최대 수용이 요청보다 적음 (수용 초과)
//  - accommin > headcount : 최소 인원이 요청보다 많음 (단체 전용 등, 인원 미달)
//  ※ lt/gt 는 null 을 매칭하지 않으므로 "정보 없음"은 자동으로 통과된다. 1명도 실제 값으로 취급해 필터한다.
export async function getHeadcountExcludeIds(headcount: number): Promise<number[]> {
  if (headcount < 1) return [];
  const { data } = await supabase
    .from("tb_place_detail_normalized")
    .select("contentid")
    .or(`accommax.lt.${headcount},accommin.gt.${headcount}`);
  return (data ?? []).map((row) => Number(row.contentid));
}

// "YYYY-MM-DD" → ISO 요일 (월=1 … 일=7)
function isoWeekday(dateStr: string): number {
  const g = new Date(`${dateStr}T00:00:00`).getDay(); // 0=일
  return g === 0 ? 7 : g;
}

// 일정(휴무일) 필터로 "제외"할 contentid 목록.
// [dateFrom ~ dateTo] 기간 "내내" 확실히 문을 닫는 곳만 제외한다. (하루라도 열면 노출 유지)
//  - 기간의 모든 요일을 매주 휴무하는 곳 (요일만으로 기간 내내 휴무)
//  - 공휴일 휴무이면서 비공휴일 날은 요일로 전부 닫는 곳 → 결국 기간 내내 휴무.
//    (기간이 전부 공휴일이면 공휴일 휴무만으로도 기간 내내 휴무이므로 제외)
// has_irregular_closing(부정기 휴무)는 특정 날짜 판정이 불가하므로 제외하지 않는다(노출 유지).
export async function getScheduleExcludeIds(dateFrom: string, dateTo: string): Promise<number[]> {
  const from = dateFrom || dateTo;
  const to = dateTo || dateFrom;
  if (!from) return [];

  const fromYmd = from.replace(/-/g, "");
  const toYmd = to.replace(/-/g, "");

  // 기간 내 공휴일 날짜(YYYYMMDD) 집합
  const { data: holis } = await supabase
    .from("tb_holiday")
    .select("locdate")
    .gte("locdate", fromYmd)
    .lte("locdate", toYmd)
    .eq("isholiday", "Y");
  const holidaySet = new Set((holis ?? []).map((h) => String(h.locdate)));

  // 기간의 요일 집합 / 비공휴일 요일 집합
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  const DAY = 86400000;
  const allWeekdays = new Set<number>();
  const nonHolidayWeekdays = new Set<number>();
  for (let t = start; t <= end; t += DAY) {
    const d = new Date(t);
    const wd = d.getDay() === 0 ? 7 : d.getDay();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    allWeekdays.add(wd);
    if (!holidaySet.has(ymd)) nonHolidayWeekdays.add(wd);
    if (allWeekdays.size === 7) break; // 한 주 이상이면 모든 요일 확정
  }
  if (allWeekdays.size === 0) allWeekdays.add(isoWeekday(from));

  const exclude = new Set<number>();

  // 1) 기간의 모든 요일을 닫는 곳 → 요일만으로 기간 내내 휴무 (closed_weekdays ⊇ 기간 요일들)
  const { data: byAllWeekdays } = await supabase
    .from("tb_place_detail_normalized")
    .select("contentid")
    .contains("closed_weekdays", [...allWeekdays]);
  for (const r of byAllWeekdays ?? []) exclude.add(Number(r.contentid));

  // 2) 공휴일 휴무이면서 비공휴일 날은 모두 요일로 닫는 곳 → 기간 내내 휴무
  //    비공휴일 요일이 없으면(기간 전부 공휴일) 공휴일 휴무만으로 제외.
  if (nonHolidayWeekdays.size === 0) {
    const { data } = await supabase
      .from("tb_place_detail_normalized")
      .select("contentid")
      .eq("closed_holiday", true);
    for (const r of data ?? []) exclude.add(Number(r.contentid));
  } else {
    const { data } = await supabase
      .from("tb_place_detail_normalized")
      .select("contentid")
      .eq("closed_holiday", true)
      .contains("closed_weekdays", [...nonHolidayWeekdays]);
    for (const r of data ?? []) exclude.add(Number(r.contentid));
  }

  return [...exclude];
}

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
    .select("place_id, contentid, title, addr1, mapx, mapy, firstimage, lclssystm1")
    .or("delete_yn.is.null,delete_yn.eq.N")
    .eq("use_yn", "Y") // 관리자가 숨기지 않은 장소만
    .not("mapx", "is", null)
    .not("mapy", "is", null)
    .limit(50);

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
  const excludeIds = new Set<number>();
  for (const id of await getHeadcountExcludeIds(headcount)) excludeIds.add(id);
  for (const id of await getScheduleExcludeIds(dateFrom, dateTo)) excludeIds.add(id);
  // 재대입 없이 조건식으로 적용 (긴 체이닝의 타입 추론 깊이 문제 회피)
  const finalQuery =
    excludeIds.size > 0 ? query.not("contentid", "in", `(${[...excludeIds].join(",")})`) : query;

  const { data, error } = await finalQuery;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = (data ?? []).map((p) => String(p.contentid));
  const [ratings, likeCounts] = await Promise.all([
    getRatingsByContentId(supabase, ids),
    getLikeCountsByContentId(supabase, ids)
  ]);
  bakeryIds ??= await getBakeryPlaceIds();
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
