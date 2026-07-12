import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tb_community_notices")
      .select("id, title, pinned, published_at")
      .eq("is_visible", true)
      .order("pinned", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ notices: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch notices" },
      { status: 500 }
    );
  }
}
