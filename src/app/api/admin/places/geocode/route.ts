import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const dynamic = "force-dynamic";

// 카카오 로컬 주소 검색(지오코딩) 프록시. REST API 키는 서버에서만 사용한다.
const KAKAO_ADDRESS_URL = "https://dapi.kakao.com/v2/local/search/address.json";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const kakaoRestKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoRestKey) {
    return NextResponse.json(
      { error: ".env에 KAKAO_REST_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") ?? "").trim();
  if (!query) return NextResponse.json({ error: "주소를 입력해 주세요." }, { status: 400 });

  const res = await fetch(`${KAKAO_ADDRESS_URL}?${new URLSearchParams({ query, size: "1" })}`, {
    headers: { Authorization: `KakaoAK ${kakaoRestKey}` },
    cache: "no-store"
  });
  if (!res.ok) {
    return NextResponse.json({ error: "주소 검색에 실패했습니다." }, { status: 502 });
  }

  const data = (await res.json()) as {
    documents?: {
      x: string;
      y: string;
      road_address: { address_name: string; x: string; y: string } | null;
    }[];
  };
  const hit = data.documents?.[0];
  // 도로명주소가 없는 지번 전용 결과는 다른 장소들의 addr1 형식(도로명)과 맞지 않아 받지 않는다.
  if (!hit?.road_address) {
    return NextResponse.json(
      { error: "도로명주소를 찾지 못했어요. 도로명(예: 온천로 89)으로 다시 입력해 주세요." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    mapx: Number(hit.road_address.x),
    mapy: Number(hit.road_address.y),
    address: hit.road_address.address_name
  });
}
