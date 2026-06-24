import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthDestination } from "@/lib/auth/post-login";
import { ensureMemberExists } from "@/lib/supabase/ensure-member";

function loginErrorRedirect(origin: string, searchParams: URLSearchParams): NextResponse {
  const errorCode = searchParams.get("error_code") ?? "";
  const errorDescription = searchParams.get("error_description") ?? "";

  if (
    errorCode === "email_address_not_provided" ||
    errorDescription.includes("email")
  ) {
    return NextResponse.redirect(`${origin}/login?error=email_not_provided`);
  }

  if (errorDescription.includes("provider id")) {
    return NextResponse.redirect(`${origin}/login?error=naver_provider_id`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return loginErrorRedirect(origin, searchParams);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        try {
          await ensureMemberExists(user);
        } catch {
          // 온보딩 페이지 /api/auth/ensure-member 에서 재시도
        }
        const destination = await resolveAuthDestination(supabase, user.id, next);
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
