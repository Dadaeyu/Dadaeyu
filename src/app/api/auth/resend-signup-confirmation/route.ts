import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/auth/email";

import { checkResendCooldown, getResendCooldownMs } from "@/lib/auth/resend-cooldown";

import { buildTokenHashConfirmUrl } from "@/lib/auth/email-confirm-link";

function jsonError(message: string, code: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export async function POST(request: Request) {
  let body: { email?: string; devLinkOnly?: boolean; next?: string };

  try {
    body = await request.json();
  } catch {
    return jsonError("요청 형식이 올바르지 않습니다.", "invalid_request", 400);
  }

  const normalizedEmail = normalizeEmail(body.email ?? "");

  if (!normalizedEmail) {
    return jsonError("이메일을 입력해 주세요.", "email_required", 400);
  }

  const origin = new URL(request.url).origin;

  if (body.devLinkOnly) {
    const confirmLink = await buildTokenHashConfirmUrl(normalizedEmail, origin, {
      next: body.next
    });

    if (!confirmLink) {
      return jsonError("테스트 링크를 만들지 못했습니다.", "dev_link_failed", 400);
    }

    return NextResponse.json({
      ok: true,

      sent: false,

      devLink: confirmLink,

      confirmLink,

      message: "아래 링크로 인증해 주세요. Gmail·네이버 앱 등 어떤 브라우저에서 열어도 됩니다."
    });
  }

  const cooldown = checkResendCooldown(normalizedEmail);

  if (!cooldown.allowed) {
    return jsonError(
      "잠시 후 다시 시도해 주세요.",

      "resend_cooldown",

      429,

      { retryAfterMs: cooldown.retryAfterMs }
    );
  }

  const confirmLink = await buildTokenHashConfirmUrl(normalizedEmail, origin, {
    next: body.next
  });

  return NextResponse.json({
    ok: true,

    proceed: true,

    confirmLink
  });
}

export function GET() {
  return NextResponse.json({
    cooldownMs: getResendCooldownMs()
  });
}
