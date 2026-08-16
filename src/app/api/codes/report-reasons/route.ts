import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REPORT_REASON_CODE_GROUP } from "@/lib/supabase/codes";

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("tb_code")
      .select("code_id, code_nm")
      .eq("code_group", REPORT_REASON_CODE_GROUP)
      .order("code_id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
