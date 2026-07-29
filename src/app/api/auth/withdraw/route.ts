import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WITHDRAW_CONFIRM_TEXT } from "@/lib/auth/withdraw";
import { T } from "@/lib/supabase/tables";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function hasEmailPassword(user: {
  email?: string | null;
  identities?: { provider: string }[] | null;
  app_metadata?: { provider?: string; providers?: string[] };
}): boolean {
  if (user.identities?.some((i) => i.provider === "email")) return true;
  const providers = user.app_metadata?.providers ?? [];
  if (providers.length > 0) return providers.includes("email");
  if (user.email) {
    const provider = user.app_metadata?.provider ?? "email";
    return provider === "email";
  }
  return false;
}

/** 회원 탈퇴: 익명화 + withdrawn + Auth 이메일 해제·ban */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return jsonError("로그인이 필요합니다.", 401);

  let body: { password?: string; confirmText?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 형식이 올바르지 않습니다.", 400);
  }

  const admin = createAdminClient();
  const { data: member, error: memberError } = await admin
    .from(T.members)
    .select("id, role, status, nickname")
    .eq("id", user.id)
    .maybeSingle();

  if (memberError || !member) {
    return jsonError("회원 정보를 찾을 수 없습니다.", 404);
  }

  if (member.role === "admin") {
    return jsonError("관리자 계정은 탈퇴할 수 없습니다. 다른 관리자에게 문의해 주세요.", 403);
  }

  if (member.status === "withdrawn") {
    return jsonError("이미 탈퇴한 계정입니다.", 400);
  }

  // 이메일 identity가 있으면 비밀번호로 확인, 소셜만 있으면 확인 문구
  const requirePassword = hasEmailPassword(user);

  if (requirePassword) {
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) return jsonError("비밀번호를 입력해 주세요.", 400);
    if (!user.email) return jsonError("이메일 정보를 확인할 수 없습니다.", 400);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return jsonError("서버 설정 오류입니다.", 500);

    const verifier = createSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password
    });
    if (verifyError) {
      return jsonError("비밀번호가 올바르지 않습니다.", 403);
    }
  } else {
    const confirmText = typeof body.confirmText === "string" ? body.confirmText.trim() : "";
    if (confirmText !== WITHDRAW_CONFIRM_TEXT) {
      return jsonError(`확인을 위해 "${WITHDRAW_CONFIRM_TEXT}"를 입력해 주세요.`, 400);
    }
  }

  const shortId = user.id.replace(/-/g, "").slice(0, 12);
  const anonNickname = `deleted_${shortId}`;
  const anonEmail = `deleted_${user.id.replace(/-/g, "")}@withdrawn.local`;

  // members 먼저 (withdrawn 제약 미적용 시 여기서 실패 → Auth 미변경)
  const { error: updateMemberError } = await admin
    .from(T.members)
    .update({
      status: "withdrawn",
      nickname: anonNickname,
      phone: null,
      avatar_url: null,
      gender: "undisclosed",
      age_group: null,
      suspended_reason: null,
      suspended_at: null,
      suspended_by: null
    })
    .eq("id", user.id);

  if (updateMemberError) {
    const hint = /check constraint|members_status/i.test(updateMemberError.message)
      ? " (Supabase에서 schema-withdrawn.sql 을 실행해 주세요)"
      : "";
    return jsonError((updateMemberError.message || "회원 정보 처리에 실패했습니다.") + hint, 500);
  }

  await admin.from(T.userPreferences).upsert(
    {
      user_id: user.id,
      accessibility_needs: [],
      theme_preferences: [],
      dark_mode: false,
      high_contrast: false,
      font_scale: 100,
      read_aloud: false
    },
    { onConflict: "user_id" }
  );

  await admin.from(T.userFavorites).delete().eq("user_id", user.id);
  await admin.from(T.placeLikes).delete().eq("user_id", user.id);
  await admin.from(T.courseLikes).delete().eq("user_id", user.id);

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    email: anonEmail,
    ban_duration: "876000h",
    user_metadata: {
      nickname: anonNickname,
      phone: null,
      withdrawn: true
    }
  });

  if (authError) {
    // Auth 실패 시 members를 되돌릴 수 없어 안내 (status는 withdrawn → 미들웨어로 차단됨)
    return jsonError(
      authError.message ||
        "계정 비활성화에 실패했습니다. 이미 탈퇴 처리된 상태일 수 있으니 관리자에게 문의해 주세요.",
      500
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
