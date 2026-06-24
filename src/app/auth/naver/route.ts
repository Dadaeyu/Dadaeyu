import { NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/auth/paths";
import {
  buildNaverAuthorizeUrl,
  NAVER_OAUTH_NEXT_COOKIE,
  NAVER_OAUTH_STATE_COOKIE,
} from "@/lib/auth/naver-oauth";

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = getSafeNextPath(searchParams.get("next"), "/");

  try {
    const state = crypto.randomUUID();
    const response = NextResponse.redirect(buildNaverAuthorizeUrl(origin, state));
    response.cookies.set(NAVER_OAUTH_STATE_COOKIE, state, OAUTH_COOKIE_OPTIONS);
    response.cookies.set(NAVER_OAUTH_NEXT_COOKIE, next, OAUTH_COOKIE_OPTIONS);
    return response;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=naver_config`);
  }
}
