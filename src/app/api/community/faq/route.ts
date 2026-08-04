import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCommunityListParams } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, from, to } = parseCommunityListParams(searchParams);

  try {
    const supabase = await createClient();
    const { data, error, count } = await supabase
      .from("tb_community_faq")
      .select("id, question", { count: "exact" })
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch faqs" },
      { status: 500 }
    );
  }
}
