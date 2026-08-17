import { supabase } from "@/lib/supabase";

// tb_place 백필용: mapx/mapy 좌표를 카카오 좌표→행정구역 API로 역지오코딩해
// 법정동(region_type=B) 이름을 dong 컬럼에 채운다. dong이 비어있는 행이 없어질 때까지
// 여러 번 POST 호출하면 된다(1회 호출당 최대 BATCH_SIZE건 처리).
const COORD2REGIONCODE_URL = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json";
const BATCH_SIZE = 200;
const CONCURRENCY = 5;

interface KakaoRegionDocument {
  region_type: "H" | "B";
  region_3depth_name: string;
}

async function fetchDong(kakaoRestKey: string, x: number, y: number): Promise<string | null> {
  const params = new URLSearchParams({ x: String(x), y: String(y) });
  const res = await fetch(`${COORD2REGIONCODE_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${kakaoRestKey}` },
    cache: "no-store"
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { documents?: KakaoRegionDocument[] };
  const legal = data.documents?.find((d) => d.region_type === "B");
  return legal?.region_3depth_name || null;
}

export async function POST() {
  const kakaoRestKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoRestKey) {
    return Response.json(
      { error: ".env에 KAKAO_REST_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { data: rows, error } = await supabase
    .from("tb_place")
    .select("contentid, mapx, mapy")
    .is("dong", null)
    .not("mapx", "is", null)
    .not("mapy", "is", null)
    .limit(BATCH_SIZE);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return Response.json({ updated: 0, failed: 0, remaining: 0, done: true });
  }

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (row) => {
        try {
          const dong = await fetchDong(kakaoRestKey, Number(row.mapx), Number(row.mapy));
          if (!dong) {
            failed++;
            return;
          }
          const { error: updateError } = await supabase
            .from("tb_place")
            .update({ dong })
            .eq("contentid", row.contentid);
          if (updateError) failed++;
          else updated++;
        } catch {
          failed++;
        }
      })
    );
  }

  const { count: remaining } = await supabase
    .from("tb_place")
    .select("contentid", { count: "exact", head: true })
    .is("dong", null)
    .not("mapx", "is", null)
    .not("mapy", "is", null);

  return Response.json({
    updated,
    failed,
    remaining: remaining ?? 0,
    done: (remaining ?? 0) === 0
  });
}
