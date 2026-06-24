import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth/actions";
import { mapAuthError } from "@/lib/auth/errors";
import { isValidPhone, normalizePhone } from "@/lib/auth/phone";
import { getPasswordValidationError } from "@/lib/auth/password";
import { normalizeNickname, NICKNAME_MIN_LENGTH } from "@/lib/supabase/member";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPhoneAvailable } from "@/lib/supabase/phone";
import { ensureMemberExists } from "@/lib/supabase/ensure-member";

async function isNicknameTaken(nickname: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("members")
    .select("id")
    .eq("nickname", nickname)
    .maybeSingle();
  return !!data;
}

/** 이메일 인증 메일 발송 없이 가입 (Supabase 이메일 한도 회피) */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    const nickname = normalizeNickname(String(body.nickname ?? ""));
    const phone = normalizePhone(String(body.phone ?? ""));

    if (!email) {
      return NextResponse.json({ error: "이메일을 입력해 주세요." }, { status: 400 });
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (nickname.length < NICKNAME_MIN_LENGTH) {
      return NextResponse.json({ error: "닉네임을 2자 이상 입력해 주세요." }, { status: 400 });
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "올바른 휴대폰 번호를 입력해 주세요." }, { status: 400 });
    }

    if (await isNicknameTaken(nickname)) {
      return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });
    }

    if (!(await isPhoneAvailable(phone))) {
      return NextResponse.json({ error: "이미 가입된 휴대폰 번호입니다." }, { status: 409 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname, phone },
    });

    if (error) {
      return NextResponse.json(
        { error: mapAuthError({ message: error.message }) },
        { status: 400 }
      );
    }

    if (data.user) {
      await ensureMemberExists(data.user).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("SUPABASE_SECRET_KEY")
        ? "서버 설정 오류입니다. SUPABASE_SECRET_KEY를 확인해 주세요."
        : "가입에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
