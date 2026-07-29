import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/lib/supabase/tables";
import { POINT_REASON_LABELS } from "@/lib/community/points";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const limit = Math.min(
      50,
      Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 15)
    );

    const { data, error } = await supabase
      .from(T.userPointEvents)
      .select("id, amount, reason, ref_type, ref_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const items = (data ?? []).map((row) => ({
      id: row.id,
      amount: row.amount,
      reason: row.reason,
      reason_label: POINT_REASON_LABELS[row.reason] ?? row.reason,
      ref_type: row.ref_type,
      ref_id: row.ref_id,
      created_at: row.created_at
    }));

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch point history" },
      { status: 500 }
    );
  }
}
