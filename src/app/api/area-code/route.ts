import { supabase } from "@/lib/supabase";

// 필터 패널의 "구" 드롭다운용 지역 코드 목록 조회 (tb_code, code_group='LDONGSIGNGU').
// tb_code.code_id는 "30110"처럼 지역코드(대전=30)가 앞에 붙어 있지만, tb_place.ldongsigngucd에는
// "110"처럼 지역코드 없이 저장돼 있어 앞의 2자리를 잘라내 맞춰준다.
const REGION_PREFIX = "30";

export async function GET() {
  const { data, error } = await supabase
    .from("tb_code")
    .select("code_id, code_nm")
    .eq("code_group", "LDONGSIGNGU")
    .order("code_id", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(
    (data ?? []).map((c) => ({
      code: c.code_id.startsWith(REGION_PREFIX) ? c.code_id.slice(REGION_PREFIX.length) : c.code_id,
      name: c.code_nm
    }))
  );
}
