import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tb_board")
      .select(
        "board_id, board_nm, sort_order, rating_yn, allow_image, allow_file, max_upload_count"
      )
      .eq("use_yn", true)
      .order("sort_order", { ascending: true })
      .order("board_id", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ boards: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch boards" },
      { status: 500 }
    );
  }
}
