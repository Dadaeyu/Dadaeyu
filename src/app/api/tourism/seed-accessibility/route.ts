import { supabase } from "@/lib/supabase";

const API_URL = "https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2";
const SERVICE_KEY = "6bf19775de8488bbefbb5c248866a9a85dc8d4f0dfaaaa8198871f5ac8ba7e18";

const hasValue = (v: string | null | undefined) => !!(v && v.trim().length > 0);

type DetailItem = Record<string, string>;

async function fetchAccessibility(contentId: number): Promise<DetailItem | null> {
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    MobileOS: "ETC",
    MobileApp: "AppTest",
    contentId: String(contentId),
    _type: "json"
  });

  try {
    const res = await fetch(`${API_URL}?${params}`, { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    const raw = data?.response?.body?.items?.item ?? null;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  } catch {
    return null;
  }
}

function toRow(item: DetailItem) {
  return {
    content_id: parseInt(item.contentid),

    parking: item.parking || null,
    route: item.route || null,
    public_transport: item.publictransport || null,
    ticket_office: item.ticketoffice || null,
    promotion: item.promotion || null,
    wheelchair: item.wheelchair || null,
    exit_info: item.exit || null,
    elevator: item.elevator || null,
    restroom: item.restroom || null,
    auditorium: item.auditorium || null,
    room_info: item.room || null,
    handicap_etc: item.handicapetc || null,

    braile_block: item.braileblock || null,
    help_dog: item.helpdog || null,
    guide_human: item.guidehuman || null,
    audio_guide: item.audioguide || null,
    big_print: item.bigprint || null,
    braile_promotion: item.brailepromotion || null,
    guide_system: item.guidesystem || null,
    blind_handicap_etc: item.blindhandicapetc || null,

    sign_guide: item.signguide || null,
    video_guide: item.videoguide || null,
    hearing_room: item.hearingroom || null,
    hearing_handicap_etc: item.hearinghandicapetc || null,

    stroller: item.stroller || null,
    lactation_room: item.lactationroom || null,
    baby_spare_chair: item.babysparechair || null,
    infants_family_etc: item.infantsfamilyetc || null,

    // Boolean 판단 (빈 문자열·null → false)
    has_parking: hasValue(item.parking),
    has_route: hasValue(item.route),
    has_public_transport: hasValue(item.publictransport),
    has_ticket_office: hasValue(item.ticketoffice),
    has_wheelchair: hasValue(item.wheelchair),
    has_exit: hasValue(item.exit),
    has_elevator: hasValue(item.elevator),
    has_restroom: hasValue(item.restroom),
    has_room: hasValue(item.room),

    has_braile_block: hasValue(item.braileblock),
    has_help_dog: hasValue(item.helpdog),
    has_guide_human: hasValue(item.guidehuman),
    has_audio_guide: hasValue(item.audioguide),
    has_big_print: hasValue(item.bigprint),

    has_sign_guide: hasValue(item.signguide),
    has_video_guide: hasValue(item.videoguide),

    has_stroller: hasValue(item.stroller),
    has_lactation_room: hasValue(item.lactationroom)
  };
}

// 배열을 n개씩 나누기
function chunk<T>(arr: T[], n: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += n) result.push(arr.slice(i, i + n));
  return result;
}

export async function POST() {
  // 1. tourism_places에서 content_id 전체 조회
  const { data: places, error: fetchError } = await supabase
    .from("tb_tourism_places")
    .select("content_id");

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  const contentIds = (places ?? []).map((p) => p.content_id as number);

  // 2. 5개씩 병렬 호출, 배치 사이 200ms 대기 (API 레이트 리밋 방지)
  const rows = [];
  let failed = 0;

  for (const batch of chunk(contentIds, 5)) {
    const results = await Promise.all(batch.map(fetchAccessibility));
    for (const item of results) {
      if (item) rows.push(toRow(item));
      else failed++;
    }
    if (batch.length === 5) await new Promise((r) => setTimeout(r, 200));
  }

  if (rows.length === 0) {
    return Response.json({ error: "적재할 데이터 없음", failed }, { status: 400 });
  }

  // 3. upsert
  const { error: upsertError, count } = await supabase
    .from("tb_tourism_accessibility")
    .upsert(rows, { onConflict: "content_id", count: "exact" });

  if (upsertError) {
    return Response.json({ error: upsertError.message }, { status: 500 });
  }

  return Response.json({ success: true, upserted: count, failed, total: contentIds.length });
}
