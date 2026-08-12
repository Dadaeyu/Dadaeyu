import { NextResponse } from "next/server";
import { getBakeryPlaceIds } from "@/lib/theme/bakeryTheme";

export const dynamic = "force-dynamic";

// 빵지순례(BK)는 tb_code 상 가상 코드라 tb_place.lclssystm1 로는 못 걸러진다.
// getBakeryPlaceIds() 는 server-only 모듈(@/lib/supabase)을 쓰기 때문에 클라이언트 컴포넌트에서
// 직접 못 불러 이 라우트를 거쳐 place_id 목록만 내려준다.
export async function GET() {
  try {
    const placeIds = await getBakeryPlaceIds();
    return NextResponse.json({ placeIds });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch bakery place ids" },
      { status: 500 }
    );
  }
}
