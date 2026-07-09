import { supabase } from "@/lib/supabase";

const API_URL = "https://apis.data.go.kr/B551011/KorService2/ldongCode2";
const SERVICE_KEY = "6bf19775de8488bbefbb5c248866a9a85dc8d4f0dfaaaa8198871f5ac8ba7e18";

type LdongItem = { code: string; name: string };

export async function POST() {
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
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
