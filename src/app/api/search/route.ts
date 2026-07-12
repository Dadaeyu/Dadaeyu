import { supabase } from "@/lib/supabase";

const ACCESSIBILITY_COLS: Record<string, string[]> = {
  보행: [
    "has_parking",
    "has_route",
    "has_public_transport",
    "has_ticket_office",
    "has_wheelchair",
    "has_exit",
    "has_elevator",
    "has_restroom",
    "has_room"
  ],
  시각: ["has_braile_block", "has_help_dog", "has_guide_human", "has_audio_guide", "has_big_print"],
  청각: ["has_sign_guide", "has_video_guide"],
  영유아: ["has_stroller", "has_lactation_room"]
};

async function getAccessibleIds(types: string[]): Promise<number[] | null> {
  if (types.length === 0) return null;
  let result: number[] | null = null;
  for (const type of types) {
    const cols = ACCESSIBILITY_COLS[type] ?? [];
    if (cols.length === 0) continue;
    const { data } = await supabase
      .from("tb_tourism_accessibility")
      .select("content_id")
      .or(cols.map((c) => `${c}.eq.true`).join(","));
    const ids = (data ?? []).map((d) => d.content_id as number);
    result = result === null ? ids : result.filter((id) => ids.includes(id));
  }
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") ?? "";
  const accessTypes = (searchParams.get("accessibility") ?? "").split(",").filter(Boolean);
  const guCode = searchParams.get("gu") ?? "";

  if (!keyword.trim() && accessTypes.length === 0 && !guCode.trim()) return Response.json([]);

  const accessIds = await getAccessibleIds(accessTypes);

  let query = supabase
    .from("tb_tourism_places")
    .select("contentid, title, mapx, mapy, firstimage")
    .not("mapx", "is", null)
    .not("mapy", "is", null)
    .limit(50);

  if (keyword.trim()) query = query.ilike("title", `%${keyword}%`);
  if (guCode.trim()) query = query.eq("ldongsigngucd", guCode);
  if (accessIds !== null) {
    query = query.in("contentid", accessIds.length > 0 ? accessIds : [-1]);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(
    (data ?? []).map((p) => ({
      id: String(p.contentid),
      name: p.title,
      lat: Number(p.mapy),
      lng: Number(p.mapx),
      image: p.firstimage ?? ""
    }))
  );
}
