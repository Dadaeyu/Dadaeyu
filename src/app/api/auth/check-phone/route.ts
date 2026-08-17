import { NextResponse } from "next/server";
import { isPhoneAvailable } from "@/lib/supabase/phone";
import { isValidPhone, normalizePhone } from "@/lib/auth/phone";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizePhone(String(body.phone ?? ""));

    if (!isValidPhone(phone)) {
      return NextResponse.json({ available: false, error: "invalid_phone" }, { status: 400 });
    }

    const available = await isPhoneAvailable(phone);
    return NextResponse.json({ available });
  } catch {
    return NextResponse.json({ error: "check_failed" }, { status: 500 });
  }
}
