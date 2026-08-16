import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PREVIEW_COUNT = 2;
// 리뷰로 취급하는 게시판은 "후기"(board_id 1) 게시글만.
const REVIEW_BOARD_ID = 1;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentId = (searchParams.get("contentId") ?? "").trim();
  if (!contentId) {
    return NextResponse.json({ error: "Invalid contentId" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tb_post")
      .select("post_id, title, content, rating, created_at")
      .eq("content_id", contentId)
      .eq("board_id", REVIEW_BOARD_ID)
      .eq("use_yn", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = data ?? [];
    const rated = rows.filter((r) => r.rating != null);
    const averageRating =
      rated.length > 0 ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length : null;

    return NextResponse.json({
      total: rows.length,
      average_rating: averageRating,
      reviews: rows.slice(0, PREVIEW_COUNT).map((r) => ({
        id: r.post_id,
        title: r.title,
        content: r.content,
        rating: r.rating,
        created_at: r.created_at
      }))
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
