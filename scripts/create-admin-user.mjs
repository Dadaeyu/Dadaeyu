/**
 * 관리자 공용 계정 생성 (1회성)
 * 사용: node scripts/create-admin-user.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const ADMIN_EMAIL = "alianFamily@Dadaeyu.com";
const ADMIN_EMAIL_STORED = "alianfamily@dadaeyu.com";
const ADMIN_PASSWORD = "alian2023@)@#";
const ADMIN_NICKNAME = "다대유관리자";
const PROJECT_REF = "rekemsnicqecouinmfwh";

async function tryConfirmEmail(env, userId) {
  const sql = `UPDATE auth.users SET email_confirmed_at = timezone('utc', now()) WHERE id = '${userId}'`;

  if (env.SUPABASE_ACCESS_TOKEN) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: sql })
    });
    if (res.ok) {
      console.log("✓ 이메일 인증 완료 (Management API)");
      return;
    }
    console.warn("⚠️  Management API 인증 실패 — SQL 수동 실행 필요");
  }

  console.log("\n⚠️  로그인하려면 Supabase SQL Editor에서 아래를 실행하세요:");
  console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
  console.log(`   ${sql}`);
}

function loadEnv() {
  const envPath = resolve(root, ".env.local");
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    console.error(
      "❌ .env.local에 Supabase URL과 SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
    );
    process.exit(1);
  }

  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 기존 계정 확인
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (listError) {
    console.error("❌ 사용자 목록 조회 실패:", listError.message);
    process.exit(1);
  }

  const emailLower = ADMIN_EMAIL.toLowerCase();
  const existing = listData.users.find((u) => u.email?.toLowerCase() === emailLower);

  let userId;

  if (existing) {
    console.log("ℹ️  기존 auth 사용자 발견 → 비밀번호 갱신");
    userId = existing.id;

    const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      user_metadata: { nickname: ADMIN_NICKNAME }
    });

    if (passwordError) {
      console.error("❌ 비밀번호 갱신 실패:", passwordError.message);
      process.exit(1);
    }
  } else {
    console.log("➕ 새 auth 사용자 생성 중...");
    // email_confirm: true 는 DB 트리거 오류를 유발할 수 있어 미인증으로 생성
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: false,
      user_metadata: { nickname: ADMIN_NICKNAME }
    });

    if (createError || !created.user) {
      console.error("❌ auth 사용자 생성 실패:", createError?.message ?? "unknown");
      process.exit(1);
    }

    userId = created.user.id;
    console.log("✓ auth.users 생성 완료");
  }

  // tb_members 보장 + 관리자 권한
  const { data: member } = await supabase
    .from("tb_members")
    .select("id, role, nickname")
    .eq("id", userId)
    .maybeSingle();

  if (!member) {
    const { error: insertError } = await supabase.from("tb_members").insert({
      id: userId,
      nickname: ADMIN_NICKNAME,
      role: "admin",
      status: "active",
      onboarding_completed: true
    });

    if (insertError) {
      console.error("❌ tb_members 생성 실패:", insertError.message);
      process.exit(1);
    }

    await supabase.from("tb_user_preferences").insert({ user_id: userId }).select();
    console.log("✓ tb_members 생성 (admin)");
  } else {
    const { error: patchError } = await supabase
      .from("tb_members")
      .update({
        role: "admin",
        status: "active",
        onboarding_completed: true,
        nickname: member.nickname || ADMIN_NICKNAME
      })
      .eq("id", userId);

    if (patchError) {
      console.error("❌ tb_members 관리자 권한 부여 실패:", patchError.message);
      process.exit(1);
    }
    console.log("✓ tb_members 관리자 권한 부여");
  }

  // preferences 없으면 생성
  const { data: prefs } = await supabase
    .from("tb_user_preferences")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!prefs) {
    await supabase.from("tb_user_preferences").insert({ user_id: userId });
  }

  await tryConfirmEmail(env, userId);

  console.log("\n✅ 관리자 계정 준비 완료");
  console.log("   이메일:", ADMIN_EMAIL_STORED);
  console.log("   비밀번호:", ADMIN_PASSWORD);
  console.log("   user id:", userId);
  console.log("   로그인: /login → /admin");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
