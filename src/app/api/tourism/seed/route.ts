import { supabase } from "@/lib/supabase";
import { XMLParser } from "fast-xml-parser";

// tb_tourism_places 시딩용: 공공데이터포털 대전 지역(lDongRegnCd=30) 관광지 목록을 받아 upsert한다.
const API_URL = "https://apis.data.go.kr/B551011/KorService2/areaBasedList2";

type KTOItem = Record<string, string>;

function toRow(item: KTOItem) {
  return {
    contentid: parseInt(item.contentid),
    addr1: item.addr1 || null,
    addr2: item.addr2 || null,
    areacode: item.areacode || null,
    cat1: item.cat1 || null,
    cat2: item.cat2 || null,
    cat3: item.cat3 || null,
    contenttypeid: item.contenttypeid ? parseInt(item.contenttypeid) : null,
    createdtime: item.createdtime || null,
    firstimage: item.firstimage || null,
    firstimage2: item.firstimage2 || null,
    cpyrhtdivcd: item.cpyrhtDivCd || null,
    mapx: item.mapx ? parseFloat(item.mapx) : null,
    mapy: item.mapy ? parseFloat(item.mapy) : null,
    mlevel: item.mlevel ? parseInt(item.mlevel) : null,
    modifiedtime: item.modifiedtime || null,
    sigungucode: item.sigungucode || null,
    tel: item.tel || null,
    title: item.title,
    zipcode: item.zipcode || null,
    ldongregncd: item.lDongRegnCd || null,
    ldongsigngucd: item.lDongSignguCd || null,
    lclssystm1: item.lclsSystm1 || null,
    lclssystm2: item.lclsSystm2 || null,
    lclssystm3: item.lclsSystm3 || null
  };
}

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
    numOfRows: "1000",
    pageNo: "1",
    MobileOS: "ETC",
    MobileApp: "AppTest",
    arrange: "C",
    lDongRegnCd: "30"
  });

  const res = await fetch(`${API_URL}?${params}`, { cache: "no-store" });
  if (!res.ok) {
    return Response.json({ error: "관광 API 호출 실패" }, { status: 502 });
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
  const parsed = parser.parse(xml);

  const raw = parsed?.response?.body?.items?.item ?? [];
  const items: KTOItem[] = Array.isArray(raw) ? raw : [raw];

  const rows = items.filter((item) => item.contentid && item.title).map(toRow);

  const { error, count } = await supabase
    .from("tb_tourism_places")
    .upsert(rows, { onConflict: "contentid", count: "exact" });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, upserted: count, total: rows.length });
}
