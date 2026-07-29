import { supabase } from "@/lib/supabase";

// tb_place_barrierfree 컬럼명 기준. route/publictransport 라벨이 뒤바뀐 것처럼 보이는 건
// TourAPI 응답 자체가 그렇게 오기 때문(place/route.ts BF_FIELDS와 동일 원본 필드).
// ticket_office(매표소)는 place/route.ts BF_FIELDS에 없어 동기화되지 않으므로 제외한다.
const ACCESSIBILITY_GROUPS = [
  {
    category: "보행",
    fields: [
      { key: "parking", label: "주차" },
      { key: "route", label: "대중교통" },
      { key: "publictransport", label: "접근로" },
      { key: "wheelchair", label: "휠체어" },
      { key: "exit", label: "출구정보" },
      { key: "elevator", label: "엘리베이터" },
      { key: "restroom", label: "화장실" },
      { key: "handicapetc", label: "기타" }
    ]
  },
  {
    category: "시각",
    fields: [
      { key: "braileblock", label: "점자블록" },
      { key: "helpdog", label: "안내견" },
      { key: "guidehuman", label: "안내인력" },
      { key: "audioguide", label: "오디오가이드" },
      { key: "bigprint", label: "큰활자" },
      { key: "brailepromotion", label: "점자안내물" },
      { key: "guidesystem", label: "유도안내시스템" },
      { key: "blindhandicapetc", label: "기타" }
    ]
  },
  {
    category: "청각",
    fields: [
      { key: "signguide", label: "수어안내" },
      { key: "videoguide", label: "동영상자막" },
      { key: "hearingroom", label: "청각장애객실" },
      { key: "hearinghandicapetc", label: "기타" }
    ]
  },
  {
    category: "영유아",
    fields: [
      { key: "stroller", label: "유모차" },
      { key: "lactationroom", label: "수유실" },
      { key: "babysparechair", label: "아기의자" },
      { key: "infantsfamilyetc", label: "기타" }
    ]
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentId = parseInt(searchParams.get("contentId") ?? "");
  if (!contentId) return Response.json({ error: "contentId required" }, { status: 400 });

  const [{ data: place }, { data: detail }, { data: acc }] = await Promise.all([
    supabase
      .from("tb_place")
      .select("title, firstimage, addr1, lclssystm3")
      .eq("contentid", contentId)
      .or("delete_yn.is.null,delete_yn.eq.N")
      .single(),
    supabase
      .from("tb_place_detail_normalized")
      .select("overview, infocenter, usetime")
      .eq("contentid", contentId)
      .maybeSingle(),
    supabase.from("tb_place_barrierfree").select("*").eq("contentid", contentId).maybeSingle()
  ]);

  if (!place) return Response.json({ error: "not found" }, { status: 404 });

  // 카카오맵의 "장소명 아래 카테고리"처럼 보여주기 위한 소분류명 (tb_code.code_group='LCLSSYSTM').
  const { data: category } = place.lclssystm3
    ? await supabase
        .from("tb_code")
        .select("code_nm")
        .eq("code_group", "LCLSSYSTM")
        .eq("code_id", place.lclssystm3)
        .maybeSingle()
    : { data: null };

  const accessibility = acc
    ? ACCESSIBILITY_GROUPS.map((group) => ({
        category: group.category,
        items: group.fields
          .filter((f) => acc[f.key as keyof typeof acc])
          .map((f) => ({ label: f.label, text: acc[f.key as keyof typeof acc] as string }))
      })).filter((group) => group.items.length > 0)
    : [];

  return Response.json({
    title: place.title,
    category: category?.code_nm ?? null,
    image: place.firstimage ?? "",
    addr1: place.addr1 ?? "",
    overview: detail?.overview ?? null,
    use_time: detail?.usetime ?? null,
    phone: detail?.infocenter ?? null,
    accessibility
  });
}
