import { createClient } from "@/lib/supabase/server";
import { supabase as anonClient } from "@/lib/supabase";
import { T } from "@/lib/supabase/tables";
import { getRatingsByContentId, getLikeCountsByContentId } from "@/lib/search/placeAggregates";

// 로그인한 사용자가 tb_place_like에 저장한 장소들을 tb_place와 조인해 반환한다.
// 필터 패널의 "즐겨찾기" 토글용.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return Response.json([]);

  const { data: likes, error: likesError } = await supabase
    .from(T.placeLikes)
    .select("place_id")
    .eq("user_id", user.id);

  if (likesError) return Response.json({ error: likesError.message }, { status: 500 });

  const placeIds = (likes ?? []).map((l) => l.place_id as number);
  if (placeIds.length === 0) return Response.json([]);

  const { data, error } = await anonClient
    .from("tb_place")
    .select("contentid, title, addr1, mapx, mapy, firstimage, lclssystm1")
    .or("delete_yn.is.null,delete_yn.eq.N")
    .in("contentid", placeIds);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = (data ?? []).map((p) => String(p.contentid));
  const [ratings, likeCounts] = await Promise.all([
    getRatingsByContentId(anonClient, ids),
    getLikeCountsByContentId(anonClient, ids)
  ]);

  return Response.json(
    (data ?? []).map((p) => {
      const cid = String(p.contentid);
      const rating = ratings.get(cid);
      return {
        id: cid,
        name: p.title,
        lat: Number(p.mapy),
        lng: Number(p.mapx),
        image: p.firstimage ?? "",
        address: p.addr1 ?? undefined,
        categoryCode: p.lclssystm1 ?? undefined,
        average_rating: rating?.average ?? null,
        review_count: rating?.count ?? 0,
        like_count: likeCounts.get(cid) ?? 0
      };
    })
  );
}
