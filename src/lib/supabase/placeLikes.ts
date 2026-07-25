import { createClient } from "./client";
import { T } from "./tables";

// tb_place(contentid) 즐겨찾기. tb_user_favorites와 별개로,
// 검색 상세 패널(TourismDetailPanel)의 "즐겨찾기" 버튼 전용으로 쓰는 테이블이다.
export async function isPlaceLiked(userId: string, placeId: number): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(T.placeLikes)
    .select("like_id")
    .eq("user_id", userId)
    .eq("place_id", placeId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function togglePlaceLike(userId: string, placeId: number): Promise<boolean> {
  const supabase = createClient();
  const liked = await isPlaceLiked(userId, placeId);

  if (liked) {
    const { error } = await supabase
      .from(T.placeLikes)
      .delete()
      .eq("user_id", userId)
      .eq("place_id", placeId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from(T.placeLikes)
    .insert({ user_id: userId, place_id: placeId });
  if (error) throw error;
  return true;
}
