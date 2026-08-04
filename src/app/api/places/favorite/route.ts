import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/lib/supabase/tables";
import { awardPoints, POINT_REASON } from "@/lib/community/points";

export const dynamic = "force-dynamic";

/** 장소 즐겨찾기 토글 + 추가 시에만 포인트 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let body: { place_id?: number };
    try {
      body = (await request.json()) as { place_id?: number };
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const placeId = Number(body.place_id);
    if (!Number.isFinite(placeId) || placeId <= 0) {
      return NextResponse.json({ error: "Invalid place_id" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from(T.placeLikes)
      .select("like_id")
      .eq("user_id", user.id)
      .eq("place_id", placeId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from(T.placeLikes)
        .delete()
        .eq("user_id", user.id)
        .eq("place_id", placeId);
      if (error) throw error;
      return NextResponse.json({ favorited: false });
    }

    const { error } = await supabase
      .from(T.placeLikes)
      .insert({ user_id: user.id, place_id: placeId });
    if (error) throw error;

    try {
      await awardPoints({
        userId: user.id,
        reason: POINT_REASON.PLACE_FAVORITE,
        refType: "place",
        refId: placeId
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ favorited: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}
