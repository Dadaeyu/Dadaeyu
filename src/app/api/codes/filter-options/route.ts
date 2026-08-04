import { supabase } from "@/lib/supabase";

// 지도 필터 옵션(접근성 / 테마)을 tb_code 에서 가져온다.
//  - 접근성: BARRIERFREE 그룹. 단, 임산부(MT)·고령자(SN)는 데이터가 없어 제외한다.
//  - 테마: LCLSSYSTM1(대분류). 단, 추천코스(C01)는 필터 대상에서 제외한다.
// 각 항목은 { code: code_id, name: code_nm } 형태. 필터 값으로는 code(코드 아이디)를 쓴다.
export async function GET() {
  const [acc, themes] = await Promise.all([
    supabase
      .from("tb_code")
      .select("code_id, code_nm")
      .eq("code_group", "BARRIERFREE")
      .not("code_id", "in", "(MT,SN)")
      .order("code_id", { ascending: true }),
    supabase
      .from("tb_code")
      .select("code_id, code_nm")
      .eq("code_group", "LCLSSYSTM1")
      .not("code_id", "in", "(C01)")
      .order("code_id", { ascending: true })
  ]);

  if (acc.error) return Response.json({ error: acc.error.message }, { status: 500 });
  if (themes.error) return Response.json({ error: themes.error.message }, { status: 500 });

  const toOptions = (rows: { code_id: string; code_nm: string }[] | null) =>
    (rows ?? []).map((c) => ({ code: c.code_id, name: c.code_nm }));

  return Response.json({
    accessibility: toOptions(acc.data),
    themes: toOptions(themes.data)
  });
}
