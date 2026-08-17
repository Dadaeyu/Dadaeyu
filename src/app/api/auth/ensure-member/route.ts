import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeEmailSignupOnboardingIfNeeded } from "@/lib/auth/finish-auth-callback";
import { ensureMemberExists } from "@/lib/supabase/ensure-member";

/** members 보장 + 이메일 가입(닉네임·휴대폰 입력) 시 온보딩 자동 완료 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user: sessionUser }
  } = await supabase.auth.getUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: adminUserData, error: adminUserError } = await admin.auth.admin.getUserById(
      sessionUser.id
    );

    if (adminUserError || !adminUserData.user) {
      return NextResponse.json({ error: "user_lookup_failed" }, { status: 500 });
    }

    const user = adminUserData.user;

    const member = await ensureMemberExists(user);
    if (!member) {
      return NextResponse.json({ error: "member_create_failed" }, { status: 500 });
    }
    await completeEmailSignupOnboardingIfNeeded(user);
    return NextResponse.json({ ok: true, member });
  } catch {
    return NextResponse.json({ error: "member_create_failed" }, { status: 500 });
  }
}
