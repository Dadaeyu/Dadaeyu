import { NextResponse } from "next/server";
import { resolveNaverUserinfo } from "@/lib/auth/naver-userinfo";

/** Supabase custom:naver OAuth — Naver userinfo를 표준 OAuth2 형식으로 변환 */
export async function GET(request: Request) {
  const result = await resolveNaverUserinfo({
    authorization: request.headers.get("authorization"),
  });

  if (result.kind === "unauthorized") {
    return NextResponse.json({ error: "missing_authorization" }, { status: 401 });
  }

  if (result.kind === "failed") {
    return NextResponse.json({ error: "naver_userinfo_failed" }, { status: 502 });
  }

  return NextResponse.json(result.profile);
}
