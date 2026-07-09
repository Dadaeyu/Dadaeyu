import { supabase } from "@/lib/supabase";

// tb_area_code 시딩용: 공공데이터포털 대전(lDongRegnCd=30) 행정구역 코드를 받아 upsert한다.
const API_URL = "https://apis.data.go.kr/B551011/KorService2/ldongCode2";

type LdongItem = { code: string; name: string };

export async function POST() {
  const serviceKey = process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY;
  if (!serviceKey) {
    return Response.json(
      { error: ".env에 PUBLIC_DATA_OPEN_API_SERVICE_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    serviceKey,
    pageNo: "1",
    numOfRows: "50",
    MobileOS: "ETC",
    MobileApp: "APP",
    _type: "json",
    lDongRegnCd: "30",
    lDongListYn: "N"
  });

  const res = await fetch(`${API_URL}?${params}`, { cache: "no-store" });
  if (!res.ok) {
    return Response.json({ error: "지역 코드 API 호출 실패" }, { status: 502 });
  }

  const data = await res.json();
  const raw = data?.response?.body?.items?.item ?? [];
  const items: LdongItem[] = Array.isArray(raw) ? raw : [raw];

  const rows = items
    .filter((item) => item.code && item.name)
    .map((item) => ({ area_code: item.code, area_name: item.name }));

  if (rows.length === 0) {
    return Response.json({ error: "적재할 지역 코드 없음" }, { status: 400 });
  }

  const { error, count } = await supabase
    .from("tb_area_code")
    .upsert(rows, { onConflict: "area_code", count: "exact" });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, upserted: count, total: rows.length });
}
