import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tb_community_faq")
      .select("id, question")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ faqs: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch faqs" },
      { status: 500 }
    );
  }
}
