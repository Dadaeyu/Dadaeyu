import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailOtpType, resolvePostAuthRedirect } from "@/lib/auth/finish-auth-callback";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function loginErrorRedirect(
  origin: string,
  searchParams: URLSearchParams,
  reason?: string
): NextResponse {
  const errorCode = searchParams.get("error_code") ?? "";
  const errorDescription = searchParams.get("error_description") ?? "";

  if (errorCode === "email_address_not_provided" || errorDescription.includes("email")) {
    return NextResponse.redirect(`${origin}/login?error=email_not_provided`);
  }

  if (errorDescription.includes("provider id")) {
    return NextResponse.redirect(`${origin}/login?error=naver_provider_id`);
  }

  const params = new URLSearchParams({ error: "auth_callback_failed" });
  if (reason) params.set("reason", reason);
  return NextResponse.redirect(`${origin}/login?${params.toString()}`);
}

function redirectWithCookies(url: string, cookiesToSet: CookieToSet[]) {
  const response = NextResponse.redirect(url);
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return loginErrorRedirect(origin, searchParams);
  }

  // 이메일 token_hash 링크 — 확인 페이지에서 버튼으로 인증
  if (tokenHash && isEmailOtpType(type)) {
    const confirmUrl = new URL("/auth/confirm", origin);
    confirmUrl.searchParams.set("token_hash", tokenHash);
    confirmUrl.searchParams.set("type", type);
    if (next) confirmUrl.searchParams.set("next", next);
    return NextResponse.redirect(confirmUrl.toString());
  }

  if (!code) {
    return loginErrorRedirect(origin, searchParams, "missing_params");
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

  let sessionError: { message: string; code?: string } | null = null;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  sessionError = error;

  if (sessionError) {
    return redirectWithCookies(
      `${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(sessionError.code ?? "exchange_failed")}`,
      cookiesToSet
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithCookies(
      `${origin}/login?error=auth_callback_failed&reason=no_user`,
      cookiesToSet
    );
  }

  const destination = await resolvePostAuthRedirect(supabase, user, next);
  return redirectWithCookies(`${origin}${destination}`, cookiesToSet);
}
