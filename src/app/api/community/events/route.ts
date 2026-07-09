import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tb_community_events")
      .select("id, title, summary, emoji, badge_label, badge_color, cover_gradient, period_label")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ events: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch events" },
      { status: 500 }
    );
  }
}
