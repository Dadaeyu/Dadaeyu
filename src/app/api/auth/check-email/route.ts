import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth/email";
import { isEmailAvailable, isValidEmailFormat } from "@/lib/auth/email-availability";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));

    if (!isValidEmailFormat(email)) {
      return NextResponse.json({ available: false, error: "invalid_email" }, { status: 400 });
    }

    const available = await isEmailAvailable(email);
    return NextResponse.json({ available });
  } catch {
    return NextResponse.json({ error: "check_failed" }, { status: 500 });
  }
}
