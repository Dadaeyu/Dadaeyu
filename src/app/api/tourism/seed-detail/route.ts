import { supabase } from "@/lib/supabase";
import { XMLParser } from "fast-xml-parser";

const SERVICE_KEY = "6bf19775de8488bbefbb5c248866a9a85dc8d4f0dfaaaa8198871f5ac8ba7e18";
const COMMON_API = "https://apis.data.go.kr/B551011/KorService2/detailCommon2";
const INTRO_API = "https://apis.data.go.kr/B551011/KorService2/detailIntro2";

// parseTagValue: false → "0000" 같은 값이 숫자 0으로 변환되지 않음
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

type KTOItem = Record<string, string>;

// overview/homepage는 CDATA·HTML 포함 → 정규식으로 직접 추출
function extractXmlField(xml: string, tag: string): string | null {
  const cdata = xml.match(
    new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`)
  );
  if (cdata) return cdata[1].trim() || null;
  const plain = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (plain) return plain[1].trim() || null;
  return null;
}

async function fetchCommon(
  contentId: number
): Promise<{ overview: string | null; homepage: string | null } | null> {
  try {
    const params = new URLSearchParams({
      serviceKey: SERVICE_KEY,
      MobileOS: "ETC",
      MobileApp: "AppTest",
      contentId: String(contentId),
      numOfRows: "1",
      pageNo: "1"
    });
    const res = await fetch(`${COMMON_API}?${params}`, { cache: "no-store" });
    if (!res.ok) return null;
    const xml = await res.text();
    if (!xml.includes("<resultCode>0000</resultCode>")) return null;
    return {
      overview: extractXmlField(xml, "overview"),
      homepage: extractXmlField(xml, "homepage")
    };
  } catch {
    return null;
  }
}

async function fetchIntro(contentId: number, contentTypeId: number): Promise<KTOItem | null> {
  try {
    const params = new URLSearchParams({
      serviceKey: SERVICE_KEY,
      MobileOS: "ETC",
      MobileApp: "AppTest",
      contentId: String(contentId),
      contentTypeId: String(contentTypeId),
      numOfRows: "1",
      pageNo: "1"
    });
    const res = await fetch(`${INTRO_API}?${params}`, { cache: "no-store" });
    if (!res.ok) return null;
    const xml = await res.text();
    const parsed = parser.parse(xml);
    if (parsed?.response?.header?.resultCode !== "0000") return null;
    const raw = parsed?.response?.body?.items?.item ?? null;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  } catch {
    return null;
  }
}

// contentTypeId별 소개정보 필드 → 공통 컬럼 매핑
function extractIntroFields(item: KTOItem, typeId: number) {
  switch (typeId) {
    case 12: // 관광지
      return {
        phone: item.infocenter || null,
        use_time: item.usetime || null,
        rest_date: item.restdate || null,
        parking: item.parking || null,
        use_fee: null,
        reservation: null,
        open_date: item.opendate || null
      };
    case 14: // 문화시설
      return {
        phone: item.infocenterculture || null,
        use_time: item.usetimeculture || null,
        rest_date: item.restdateculture || null,
        parking: item.parkingculture || null,
        use_fee: item.usefee || null,
        reservation: null,
        open_date: null
      };
    case 15: // 축제/공연/행사
      return {
        phone: null,
        use_time: item.playtime || null,
        rest_date: null,
        parking: null,
        use_fee: item.usetimefestival || null,
        reservation: null,
        open_date: item.eventstartdate || null
      };
    case 25: // 여행코스
      return {
        phone: item.infocentertourcourse || null,
        use_time: null,
        rest_date: null,
        parking: null,
        use_fee: null,
        reservation: null,
        open_date: null
      };
    case 28: // 레포츠
      return {
        phone: item.infocenterleports || null,
        use_time: item.usetimeleports || null,
        rest_date: item.restdateleports || null,
        parking: item.parkingleports || null,
        use_fee: item.usefeeleports || null,
        reservation: item.reservation || null,
        open_date: null
      };
    case 32: // 숙박
      return {
        phone: item.infocenterlodging || null,
        use_time: null,
        rest_date: null,
        parking: item.parkinglodging || null,
        use_fee: null,
        reservation: item.reservationlodging || null,
        open_date: null
      };
    case 38: // 쇼핑
      return {
        phone: item.infocentershopping || null,
        use_time: item.opentime || null,
        rest_date: item.restdateshopping || null,
        parking: item.parkingshopping || null,
        use_fee: null,
        reservation: null,
        open_date: item.opendateshopping || null
      };
    case 39: // 음식점
      return {
        phone: item.infocenterfood || null,
        use_time: item.opentimefood || null,
        rest_date: item.restdatefood || null,
        parking: item.parkingfood || null,
        use_fee: null,
        reservation: item.reservationfood || null,
        open_date: item.opendatefood || null
      };
    default:
      return {
        phone: null,
        use_time: null,
        rest_date: null,
        parking: null,
        use_fee: null,
        reservation: null,
        open_date: null
      };
  }
}

const NULL_INTRO = {
  phone: null,
  use_time: null,
  rest_date: null,
  parking: null,
  use_fee: null,
  reservation: null,
  open_date: null
};

async function fetchPlaceDetail(contentId: number, contentTypeId: number) {
  const [common, introItem] = await Promise.all([
    fetchCommon(contentId),
    fetchIntro(contentId, contentTypeId)
  ]);

  return {
    content_id: contentId,
    content_type_id: contentTypeId,
    overview: common?.overview ?? null,
    homepage: common?.homepage ?? null,
    ...(introItem ? extractIntroFields(introItem, contentTypeId) : NULL_INTRO)
  };
}

function chunk<T>(arr: T[], n: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += n) result.push(arr.slice(i, i + n));
  return result;
}

export async function POST() {
  const { data: places, error: fetchError } = await supabase
    .from("tb_tourism_places")
    .select("contentid, contenttypeid");

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  const placeList = (places ?? []).filter((p) => p.contentid && p.contenttypeid) as {
    contentid: number;
    contenttypeid: number;
  }[];

  const rows = [];
  let failed = 0;

  for (const batch of chunk(placeList, 5)) {
    const results = await Promise.all(
      batch.map((p) => fetchPlaceDetail(p.contentid, p.contenttypeid).catch(() => null))
    );
    for (const row of results) {
      if (row) rows.push(row);
      else failed++;
    }
    if (batch.length === 5) await new Promise((r) => setTimeout(r, 200));
  }

  if (rows.length === 0) {
    return Response.json({ error: "적재할 데이터 없음", failed }, { status: 400 });
  }

  const { error: upsertError, count } = await supabase
    .from("tb_tourism_detail")
    .upsert(rows, { onConflict: "content_id", count: "exact" });

  if (upsertError) {
    return Response.json({ error: upsertError.message }, { status: 500 });
  }

  return Response.json({ success: true, upserted: count, failed, total: placeList.length });
}

// GET /api/tourism/seed-detail?contentId=130420&contentTypeId=14
// 한 건 테스트용 (쿼터 확인 후 사용)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contentId = Number(searchParams.get("contentId"));
  const contentTypeId = Number(searchParams.get("contentTypeId"));
  if (!contentId || !contentTypeId) {
    return Response.json({ error: "contentId, contentTypeId 파라미터 필요" }, { status: 400 });
  }

  const [common, introItem] = await Promise.all([
    fetchCommon(contentId),
    fetchIntro(contentId, contentTypeId)
  ]);

  return Response.json({
    common,
    intro: introItem,
    mapped: {
      content_id: contentId,
      content_type_id: contentTypeId,
      overview: common?.overview ?? null,
      homepage: common?.homepage ?? null,
      ...(introItem ? extractIntroFields(introItem, contentTypeId) : NULL_INTRO)
    }
  });
}
