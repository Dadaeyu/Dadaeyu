import { supabase } from "@/lib/supabase";

const ACCESSIBILITY_GROUPS = [
  {
    category: "보행",
    fields: [
      { key: "parking",          label: "주차" },
      { key: "route",            label: "대중교통" },// 원래는 접근로이나 데이터 확인 상 대중교통임
      { key: "public_transport", label: "접근로" },//원래는 대중교통이나 보니까 접근로 같음
      { key: "ticket_office",    label: "매표소" },
      { key: "wheelchair",       label: "휠체어" },
      { key: "exit_info",        label: "출구정보" },
      { key: "elevator",         label: "엘리베이터" },
      { key: "restroom",         label: "화장실" },
      { key: "handicap_etc",     label: "기타" },
    ],
  },
  {
    category: "시각",
    fields: [
      { key: "braile_block",       label: "점자블록" },
      { key: "help_dog",           label: "안내견" },
      { key: "guide_human",        label: "안내인력" },
      { key: "audio_guide",        label: "오디오가이드" },
      { key: "big_print",          label: "큰활자" },
      { key: "braile_promotion",   label: "점자안내물" },
      { key: "guide_system",       label: "유도안내시스템" },
      { key: "blind_handicap_etc", label: "기타" },
    ],
  },
  {
    category: "청각",
    fields: [
      { key: "sign_guide",          label: "수어안내" },
      { key: "video_guide",         label: "동영상자막" },
      { key: "hearing_room",        label: "청각장애객실" },
      { key: "hearing_handicap_etc",label: "기타" },
    ],
  },
  {
    category: "영유아",
    fields: [
      { key: "stroller",          label: "유모차" },
      { key: "lactation_room",    label: "수유실" },
      { key: "baby_spare_chair",  label: "아기의자" },
      { key: "infants_family_etc",label: "기타" },
    ],
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentId = parseInt(searchParams.get("contentId") ?? "");
  if (!contentId) return Response.json({ error: "contentId required" }, { status: 400 });

  const [{ data: place }, { data: detail }, { data: acc }] = await Promise.all([
    supabase
      .from("tourism_places")
      .select("title, firstimage, addr1")
      .eq("contentid", contentId)
      .single(),
    supabase
      .from("tourism_detail")
      .select("overview, phone, use_time")
      .eq("content_id", contentId)
      .maybeSingle(),
    supabase
      .from("tourism_accessibility")
      .select("*")
      .eq("content_id", contentId)
      .maybeSingle(),
  ]);

  if (!place) return Response.json({ error: "not found" }, { status: 404 });

  const accessibility = acc
    ? ACCESSIBILITY_GROUPS
        .map(group => ({
          category: group.category,
          items: group.fields
            .filter(f => acc[f.key as keyof typeof acc])
            .map(f => ({ label: f.label, text: acc[f.key as keyof typeof acc] as string })),
        }))
        .filter(group => group.items.length > 0)
    : [];

  return Response.json({
    title: place.title,
    image: place.firstimage ?? "",
    addr1: place.addr1 ?? "",
    overview: detail?.overview ?? null,
    use_time: detail?.use_time ?? null,
    phone: detail?.phone ?? null,
    accessibility,
  });
}
