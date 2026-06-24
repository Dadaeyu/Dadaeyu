/**
 * 회원·로그인 1단계 스키마 검증
 * members / user_preferences 테이블 존재 여부 확인
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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

async function tableOk(supabase, table) {
  const { error } = await supabase.from(table).select("*").limit(0);
  return !error;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    console.error("❌ .env.local 에 SUPABASE URL/KEY 가 없습니다.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const checks = [
    { name: "members (1단계 필수)", table: "members", required: true },
    { name: "user_preferences (2단계)", table: "user_preferences", required: false },
  ];

  let failed = false;
  console.log("회원·로그인 스키마 검증\n");

  for (const { name, table, required } of checks) {
    const ok = await tableOk(supabase, table);
    const icon = ok ? "✓" : required ? "❌" : "○";
    console.log(`${icon} ${name}: ${ok ? "존재" : "없음"}`);
    if (required && !ok) failed = true;
  }

  console.log("\n프론트엔드 라우트 (빌드 시 등록됨):");
  console.log("  /login, /auth/callback, /onboarding, /mypage");

  console.log("\n수동 확인 체크리스트:");
  console.log("  1. 비로그인 /mypage → /login?next=/mypage");
  console.log("  2. 이메일 가입 → members 행 생성");
  console.log("  3. OAuth 로그인 → members 자동 생성");
  console.log("  4. /onboarding → onboarding_completed = true");

  if (failed) {
    console.log("\n→ Phase 1 적용: npm run db:auth:phase1");
    console.log("  또는 supabase/schema-auth-phase1.sql 을 SQL Editor에서 실행");
    process.exit(1);
  }

  console.log("\n✓ 1단계 스키마 준비 완료");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
