import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/auth/email";

import { getSafeNextPath } from "@/lib/auth/paths";

import { normalizePhone } from "@/lib/auth/phone";

import { normalizeNickname } from "@/lib/supabase/member";

import { buildTokenHashConfirmUrl } from "@/lib/auth/email-confirm-link";

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

/** SMTP 실패 시 token_hash 테스트 링크 발급 */

export async function POST(request: Request) {
  let body: {
    email?: string;

    password?: string;

    profile?: {
      nickname?: string;
      phone?: string;
      theme_preferences?: string[];
      accessibility_needs?: string[];
    };

    next?: string;

    devLinkOnly?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("요청 형식이 올바르지 않습니다.", "invalid_request", 400);
  }

  if (!body.devLinkOnly) {
    return jsonError(
      "가입은 브라우저에서 처리됩니다. devLinkOnly 요청만 지원합니다.",

      "invalid_request",

      400
    );
  }

  if (process.env.NODE_ENV !== "development") {
    return jsonError("개발 환경에서만 사용할 수 있습니다.", "forbidden", 403);
  }

  const email = normalizeEmail(body.email ?? "");

  const password = body.password ?? "";

  const nickname = normalizeNickname(body.profile?.nickname ?? "");

  const phone = normalizePhone(body.profile?.phone ?? "");
  const themePreferences = Array.isArray(body.profile?.theme_preferences)
    ? body.profile.theme_preferences.filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0
      )
    : [];
  const accessibilityNeeds = Array.isArray(body.profile?.accessibility_needs)
    ? body.profile.accessibility_needs.filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0
      )
    : [];

  if (!email || !password || !nickname || !phone) {
    return jsonError("가입 정보가 올바르지 않습니다.", "invalid_request", 400);
  }

  const origin = new URL(request.url).origin;

  const safeNext = getSafeNextPath(body.next, "/mypage");

  const confirmLink = await buildTokenHashConfirmUrl(email, origin, {
    next: safeNext,

    password,

    profile: {
      nickname,
      phone,
      ...(themePreferences.length > 0 ? { theme_preferences: themePreferences } : {}),
      ...(accessibilityNeeds.length > 0 ? { accessibility_needs: accessibilityNeeds } : {})
    }
  });

  if (!confirmLink) {
    return jsonError("테스트 링크를 만들지 못했습니다.", "dev_link_failed", 400);
  }

  return NextResponse.json({
    ok: true,

    sent: false,

    devLink: confirmLink,

    confirmLink,

    message:
      "아래 링크로 가입을 마무리해 주세요. Gmail·네이버 앱에서 열어도 됩니다. (로컬 테스트용)"
  });
}
