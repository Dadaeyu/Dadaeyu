const API_URL = "https://apis.data.go.kr/B551011/KorWithService2/areaBasedList2";
const SERVICE_KEY = "6bf19775de8488bbefbb5c248866a9a85dc8d4f0dfaaaa8198871f5ac8ba7e18";

export async function GET() {
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    MobileOS: "ETC",
    MobileApp: "AppTest",
    arrange: "C",
    areaCode: "3",
    numOfRows: "500",
    _type: "json"
  });

  const res = await fetch(`${API_URL}?${params}`, { cache: "no-store" });
  if (!res.ok) {
    return Response.json({ error: "upstream error" }, { status: 502 });
  }

  const data = await res.json();
  const raw = data?.response?.body?.items?.item ?? [];
  const items = Array.isArray(raw) ? raw : [raw];

  const places = items
    .filter(
      (item: Record<string, string>) =>
        item.mapx && item.mapy && parseFloat(item.mapx) && parseFloat(item.mapy)
    )
    .map((item: Record<string, string>) => ({
      id: item.contentid,
      name: item.title,
      lat: parseFloat(item.mapy),
      lng: parseFloat(item.mapx),
      addr: item.addr1 ?? "",
      typeId: item.contenttypeid
    }));

  return Response.json(places);
}
