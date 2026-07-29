import { createClient } from "./client";
import { T } from "./tables";
import type { LikedPlace } from "./types";

type PlaceRow = {
  place_id: number;
  contentid: string | number | null;
  title: string | null;
  addr1: string | null;
  firstimage: string | null;
  mapx: string | number | null;
  mapy: string | number | null;
  delete_yn: string | null;
};

function toContentId(raw: string | number | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

function toCoord(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** 내 좋아요 목록: tb_place_like → tb_place (2단계, 좋아요 최신순)
 *  tb_place_like.place_id 는 실제로는 tb_place.contentid 값을 담음 */
export async function fetchMyPlaceLikes(userId: string): Promise<LikedPlace[]> {
  const supabase = createClient();

  const { data: likes, error: likesError } = await supabase
    .from(T.placeLikes)
    .select("like_id, place_id, registtime")
    .eq("user_id", userId)
    .order("registtime", { ascending: false });

  if (likesError) throw likesError;
  if (!likes?.length) return [];

  const contentIds = [...new Set(likes.map((l) => String(l.place_id)))];
  const { data: places, error: placesError } = await supabase
    .from(T.place)
    .select("place_id, contentid, title, addr1, firstimage, mapx, mapy, delete_yn")
    .in("contentid", contentIds);

  if (placesError) throw placesError;

  const placeMap = new Map<string, PlaceRow>();
  for (const row of (places ?? []) as PlaceRow[]) {
    if (row.delete_yn === "Y") continue;
    const contentid = toContentId(row.contentid);
    if (!contentid) continue;
    placeMap.set(contentid, row);
  }

  const result: LikedPlace[] = [];
  for (const like of likes) {
    const place = placeMap.get(String(like.place_id));
    if (!place) continue;
    const contentid = toContentId(place.contentid);
    if (!contentid) continue;

    result.push({
      like_id: like.like_id as number,
      place_id: place.place_id,
      contentid,
      title: place.title?.trim() || "이름 없음",
      addr1: place.addr1,
      firstimage: place.firstimage,
      lat: toCoord(place.mapy),
      lng: toCoord(place.mapx),
      registtime: like.registtime as string
    });
  }

  return result;
}

/** contentId로 tb_place 1건 조회 (지도 딥링크용) */
export async function fetchPlaceByContentId(contentId: string): Promise<LikedPlace | null> {
  const id = contentId.trim();
  if (!id) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from(T.place)
    .select("place_id, contentid, title, addr1, firstimage, mapx, mapy, delete_yn")
    .eq("contentid", id)
    .or("delete_yn.is.null,delete_yn.eq.N")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as PlaceRow;
  const contentid = toContentId(row.contentid);
  if (!contentid) return null;

  return {
    like_id: 0,
    place_id: row.place_id,
    contentid,
    title: row.title?.trim() || "이름 없음",
    addr1: row.addr1,
    firstimage: row.firstimage,
    lat: toCoord(row.mapy),
    lng: toCoord(row.mapx),
    registtime: ""
  };
}
