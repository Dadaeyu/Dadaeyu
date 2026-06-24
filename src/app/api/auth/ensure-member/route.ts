import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureMemberExists } from "@/lib/supabase/ensure-member";

/** 온보딩 진입 시 members 행이 없으면 생성 (트리거 실패 대비) */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const member = await ensureMemberExists(user);
    if (!member) {
      return NextResponse.json({ error: "member_create_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, member });
  } catch {
    return NextResponse.json({ error: "member_create_failed" }, { status: 500 });
  }
}
