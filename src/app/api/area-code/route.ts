import { supabase } from "@/lib/supabase";

// 필터 패널의 "구" 드롭다운용 지역 코드 목록 조회 (tb_area_code)
export async function GET() {
  const { data, error } = await supabase
    .from("tb_area_code")
    .select("area_code, area_name")
    .order("area_code", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json((data ?? []).map((a) => ({ code: a.area_code, name: a.area_name })));
}
