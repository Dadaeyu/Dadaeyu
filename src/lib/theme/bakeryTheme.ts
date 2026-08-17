import { supabase } from "@/lib/supabase";

// "빵지순례"는 TourAPI 원본 분류(lclssystm1)에 없는 자체 정의 테마라, tb_code에는 가상의
// 코드(BK)로만 등록해두고 실제 매칭은 이 파일에서 별도 로직으로 계산한다.
//  - lclssystm3='FD030100'(제과)는 무조건 포함.
//  - 카페/축제/체험 소분류(FD05/EV03/EX01/EX02)는 대전시 제과점 등록 데이터(tb_place_bakery,
//    delete_yn='N')의 상호명에 장소 title이 포함될 때만 "빵집"으로 추가 인정한다(성심당문화원처럼
//    TourAPI에서 카페로 분류된 빵집을 건지기 위함).
export const BAKERY_THEME_CODE = "BK";
const CONFECTIONERY_LCLSSYSTM3 = "FD030100";
const BAKERY_ADJACENT_LCLSSYSTM2 = ["FD05", "EV03", "EX01", "EX02"];

export function splitThemeSelection(themes: string[]): {
  officialCodes: string[];
  includeBakery: boolean;
} {
  return {
    officialCodes: themes.filter((t) => t !== BAKERY_THEME_CODE),
    includeBakery: themes.includes(BAKERY_THEME_CODE)
  };
}

export async function getBakeryPlaceIds(): Promise<number[]> {
  const [{ data: confectioneryRows }, { data: bakeryRegistryRows }, { data: adjacentRows }] =
    await Promise.all([
      supabase
        .from("tb_place")
        .select("place_id")
        .or("delete_yn.is.null,delete_yn.eq.N")
        .eq("lclssystm3", CONFECTIONERY_LCLSSYSTM3),
      supabase.from("tb_place_bakery").select("bplc_nm").eq("delete_yn", "N"),
      supabase
        .from("tb_place")
        .select("place_id, title")
        .or("delete_yn.is.null,delete_yn.eq.N")
        .in("lclssystm2", BAKERY_ADJACENT_LCLSSYSTM2)
    ]);

  const ids = new Set<number>((confectioneryRows ?? []).map((r) => r.place_id as number));

  const bakeryNames = (bakeryRegistryRows ?? [])
    .map((r) => (r.bplc_nm as string | null)?.trim())
    .filter((name): name is string => Boolean(name));

  if (bakeryNames.length > 0) {
    for (const row of (adjacentRows ?? []) as { place_id: number; title: string | null }[]) {
      const title = row.title?.trim();
      if (title && bakeryNames.some((name) => name.includes(title))) {
        ids.add(row.place_id);
      }
    }
  }

  return [...ids];
}
