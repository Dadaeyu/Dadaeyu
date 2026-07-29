import { supabase } from "@/lib/supabase";

// tb_place_barrierfree의 has_* 편의시설 정보 존재 여부 플래그 기준 (PlaceFilters.tsx ACCESSIBILITY와 동일 목록).
const BARRIERFREE_COLS: Record<string, string> = {
  시각: "has_blind",
  청각: "has_deaf",
  보행: "has_gait",
  영유아: "has_infant",
  임산부: "has_maternity",
  고령자: "has_senior"
};

// 선택된 접근성 유형들을 OR로 합친다 (예: 청각+보행 선택 시 둘 중 하나라도 true면 노출).
async function getBarrierFreeIds(types: string[]): Promise<number[]> {
  const cols = Array.from(new Set(types.map((t) => BARRIERFREE_COLS[t]).filter(Boolean)));
  if (cols.length === 0) return [];

  const { data, error } = await supabase
    .from("tb_place_barrierfree")
    .select("contentid")
    .or(cols.map((c) => `${c}.eq.true`).join(","));

  if (error) throw error;

  return (data ?? []).map((row) => row.contentid as number);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") ?? "";
  const accessTypes = (searchParams.get("accessibility") ?? "").split(",").filter(Boolean);
  const guCode = searchParams.get("gu") ?? "";
  const dong = searchParams.get("dong") ?? "";
  const contentId = searchParams.get("id") ?? "";

  // 특정 contentid 단건 조회 (게시글 첨부 장소를 지도에서 다시 찾을 때 사용)
  if (contentId.trim()) {
    const { data, error } = await supabase
      .from("tb_place")
      .select("contentid, title, mapx, mapy, firstimage")
      .eq("contentid", contentId.trim())
      .not("mapx", "is", null)
      .not("mapy", "is", null)
      .limit(1);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json(
      (data ?? []).map((p) => ({
        id: String(p.contentid),
        name: p.title,
        lat: Number(p.mapy),
        lng: Number(p.mapx),
        image: p.firstimage ?? ""
      }))
    );
  }

  if (!keyword.trim() && accessTypes.length === 0 && !guCode.trim() && !dong.trim())
    return Response.json([]);

  let query = supabase
    .from("tb_place")
    .select("contentid, title, mapx, mapy, firstimage")
    .or("delete_yn.is.null,delete_yn.eq.N")
    .not("mapx", "is", null)
    .not("mapy", "is", null)
    .limit(50);

  if (keyword.trim()) query = query.ilike("title", `%${keyword}%`);
  if (guCode.trim()) query = query.eq("ldongsigngucd", guCode);
  if (dong.trim()) query = query.eq("dong", dong.trim());

  try {
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

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(
    (data ?? []).map((p) => ({
      id: String(p.contentid),
      name: p.title,
      lat: Number(p.mapy),
      lng: Number(p.mapx),
      image: p.firstimage ?? ""
    }))
  );
}
