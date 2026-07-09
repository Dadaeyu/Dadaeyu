import { NextRequest } from "next/server";

const KAKAO_REST_KEY = "de424a46f301a8a5b52d14ae68ce50cf";
const KAKAO_LOCAL_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

// 대전 중심 좌표
const DAEJEON_X = "127.443";
const DAEJEON_Y = "36.387";
const RADIUS = 20000; // 20km

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  const gu = searchParams.get("gu")?.trim();
  if (!query) return Response.json({ documents: [] });

  const params = new URLSearchParams({
    query,
    x: DAEJEON_X,
    y: DAEJEON_Y,
    radius: String(RADIUS),
    size: "15"
  });

  const res = await fetch(`${KAKAO_LOCAL_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
    cache: "no-store"
  });

  if (!res.ok) {
    return Response.json({ documents: [], error: "Kakao API error" }, { status: res.status });
  }

  const data = await res.json();
  let documents = data.documents ?? [];

  // 카카오 API는 행정구역 필터를 지원하지 않아, 주소 문자열에 구 이름이
  // 포함되는지로 이중 체크(지번/도로명 주소)해서 걸러낸다.
  if (gu) {
    documents = documents.filter(
      (d: { address_name?: string; road_address_name?: string }) =>
        d.address_name?.includes(gu) || d.road_address_name?.includes(gu)
    );
  }

  return Response.json({ documents });
}
