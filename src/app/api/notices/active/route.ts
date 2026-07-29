import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type NoticeRow = {
  id: number;
  title: string;
  content: string;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  updated_at: string;
};

function isWithinExposureWindow(notice: NoticeRow, nowMs: number): boolean {
  if (notice.starts_at && new Date(notice.starts_at).getTime() > nowMs) return false;
  if (notice.ends_at && new Date(notice.ends_at).getTime() <= nowMs) return false;
  return true;
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const nowMs = Date.now();

    const { data, error } = await supabase
      .from("tb_notices")
      .select("id, title, content, starts_at, ends_at, priority, updated_at")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const notices = ((data ?? []) as NoticeRow[]).filter((row) =>
      isWithinExposureWindow(row, nowMs)
    );

    return NextResponse.json({ notices });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch notice" },
      { status: 500 }
    );
  }
}
