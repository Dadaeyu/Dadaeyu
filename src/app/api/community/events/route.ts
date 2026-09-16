import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCommunityListParams } from "@/lib/pagination";
import { resolveEventStatusBadge } from "@/lib/community/event-ui";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, from, to } = parseCommunityListParams(searchParams);

  try {
    const supabase = await createClient();
    const { data, error, count } = await supabase
      .from("tb_community_events")
      .select(
        "id, title, summary, emoji, badge_label, badge_color, cover_gradient, cover_image_url, period_label, period_start, period_end",
        { count: "exact" }
      )
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    const items = (data ?? []).map(({ period_start, period_end, ...rest }) => {
      const badge = resolveEventStatusBadge(period_start, period_end, {
        label: rest.badge_label,
        color: rest.badge_color
      });
      return { ...rest, badge_label: badge.label, badge_color: badge.color };
    });
    return NextResponse.json({
      items,
      total: count ?? 0,
      page,
      pageSize
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch events" },
      { status: 500 }
    );
  }
}
