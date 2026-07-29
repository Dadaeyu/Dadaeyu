import { supabase } from "@/lib/supabase";

// 필터 패널의 "동" 드롭다운용 목록 조회. gu(구 코드)가 주어지면 해당 구에 속한
// 법정동만 중복 제거해 반환한다(구 선택 → 동 드롭다운 연동).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guCode = searchParams.get("gu")?.trim();

  let query = supabase
    .from("tb_place")
    .select("dong")
    .or("delete_yn.is.null,delete_yn.eq.N")
    .not("dong", "is", null)
    .limit(2000);

  if (guCode) query = query.eq("ldongsigngucd", guCode);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const dongs = Array.from(new Set((data ?? []).map((d) => d.dong as string)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ko"));

  return Response.json(dongs);
}
