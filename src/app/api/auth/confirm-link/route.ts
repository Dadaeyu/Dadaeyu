import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth/email";
import { buildTokenHashConfirmUrl } from "@/lib/auth/email-confirm-link";

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

/** 미인증 사용자용 token_hash 인증 링크 발급 (브라우저·메일 앱 공통) */
export async function POST(request: Request) {
  let body: { email?: string; next?: string };

  try {
    body = await request.json();
  } catch {
    return jsonError("요청 형식이 올바르지 않습니다.", "invalid_request", 400);
  }

  const email = normalizeEmail(body.email ?? "");
  if (!email) {
    return jsonError("이메일을 입력해 주세요.", "email_required", 400);
  }

  const origin = new URL(request.url).origin;
  const confirmLink = await buildTokenHashConfirmUrl(email, origin, { next: body.next });

  if (!confirmLink) {
    return jsonError("인증 링크를 만들지 못했습니다.", "link_failed", 400);
  }

  return NextResponse.json({
    ok: true,
    confirmLink,
    message: "아래 링크로 인증할 수 있습니다. Gmail·네이버 앱에서 열어도 됩니다."
  });
}
