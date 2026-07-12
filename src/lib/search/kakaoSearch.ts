// 카카오 로컬 검색 API(/api/kakao-search)를 호출해 DB 검색 결과와 같은 SearchPlace 형태로 변환한다.

export interface SearchPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
  source?: "db" | "kakao";
  address?: string;
  phone?: string;
  category?: string;
  placeUrl?: string;
}

export async function fetchKakaoPlaces(keyword: string, gu?: string): Promise<SearchPlace[]> {
  try {
    const params = new URLSearchParams({ query: keyword });
    if (gu) params.set("gu", gu);
    const res = await fetch(`/api/kakao-search?${params}`);
    if (!res.ok) return [];
    const { documents } = await res.json();
    return (documents ?? []).map(
      (p: {
        id: string;
        place_name: string;
        y: string;
        x: string;
        road_address_name: string;
        address_name: string;
        phone: string;
        category_name: string;
        place_url: string;
      }) => ({
        id: `kakao_${p.id}`,
        name: p.place_name,
        lat: Number(p.y),
        lng: Number(p.x),
        image: "",
        source: "kakao" as const,
        address: p.road_address_name || p.address_name,
        phone: p.phone || undefined,
        category: p.category_name,
        placeUrl: p.place_url || undefined
      })
    );
  } catch {
    return [];
  }
}
