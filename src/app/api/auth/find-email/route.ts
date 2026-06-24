import { NextResponse } from "next/server";
import { maskEmail } from "@/lib/auth/phone";
import { normalizePhone, isValidPhone } from "@/lib/auth/phone";
import { normalizeNickname } from "@/lib/supabase/member";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  if (!enforceRateLimit(request)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const nickname = normalizeNickname(String(body.nickname ?? ""));
    const phone = normalizePhone(String(body.phone ?? ""));

    if (!nickname || !isValidPhone(phone)) {
      return NextResponse.json({ found: false });
    }

    const admin = createAdminClient();
    const { data: member } = await admin
      .from("members")
      .select("id")
      .eq("nickname", nickname)
      .eq("phone", phone)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ found: false });
    }

    const { data: authUser, error } = await admin.auth.admin.getUserById(member.id);
    if (error || !authUser?.user?.email) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      email: maskEmail(authUser.user.email),
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}
