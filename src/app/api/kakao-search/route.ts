import { NextRequest } from "next/server";

// 카카오 로컬 키워드 검색 프록시. REST API 키는 서버에서만 사용하고 클라이언트에 노출하지 않는다.
const KAKAO_LOCAL_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

// 대전 중심 좌표
const DAEJEON_X = "127.443";
const DAEJEON_Y = "36.387";
const RADIUS = 20000; // 20km

export async function GET(req: NextRequest) {
  const kakaoRestKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoRestKey) {
    return Response.json(
      { error: ".env에 KAKAO_REST_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  const gu = searchParams.get("gu")?.trim();
  const dong = searchParams.get("dong")?.trim();
  if (!query) return Response.json({ documents: [] });

  const params = new URLSearchParams({
    query,
    x: DAEJEON_X,
    y: DAEJEON_Y,
    radius: String(RADIUS),
    size: "15"
  });

  const res = await fetch(`${KAKAO_LOCAL_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${kakaoRestKey}` },
    cache: "no-store"
  });

  if (!res.ok) {
    return Response.json({ documents: [], error: "Kakao API error" }, { status: res.status });
  }

  const data = await res.json();
  let documents = data.documents ?? [];

  // 카카오 API는 행정구역 필터를 지원하지 않아, 주소 문자열에 구/동 이름이
  // 포함되는지로 이중 체크(지번/도로명 주소)해서 걸러낸다.
  if (gu) {
    documents = documents.filter(
      (d: { address_name?: string; road_address_name?: string }) =>
        d.address_name?.includes(gu) || d.road_address_name?.includes(gu)
    );
  }
  if (dong) {
    documents = documents.filter(
      (d: { address_name?: string; road_address_name?: string }) =>
        d.address_name?.includes(dong) || d.road_address_name?.includes(dong)
    );
  }

  return Response.json({ documents });
}
