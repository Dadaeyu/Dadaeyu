import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailOtpType } from "@/lib/auth/finish-auth-callback";
import { getSafeNextPath } from "@/lib/auth/paths";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function POST(request: NextRequest) {
  let body: { code?: string; token_hash?: string; type?: string; next?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다.", code: "invalid_request" },
      { status: 400 }
    );
  }

  const code = body.code?.trim();
  const tokenHash = body.token_hash?.trim();
  const type = body.type?.trim() ?? null;
  const next = getSafeNextPath(body.next, "/mypage");

  if (!code && !(tokenHash && isEmailOtpType(type))) {
    return NextResponse.json(
      { error: "유효하지 않은 인증 링크입니다.", code: "missing_params" },
      { status: 400 }
    );
  }

  const cookiesToSet: CookieToSet[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(setCookies) {
          cookiesToSet.push(...setCookies);
        }
      }
    }
  );

  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code ?? "verify_otp_failed" },
        { status: 400 }
      );
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code ?? "exchange_failed" },
        { status: 400 }
      );
    }
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "사용자 정보를 찾을 수 없습니다.", code: "no_user" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ ok: true, next });
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  return response;
}
