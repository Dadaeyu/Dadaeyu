/**
 * 관리자 계정 이메일 인증 완료 (auth.users)
 * SUPABASE_ACCESS_TOKEN 이 .env.local 에 있으면 자동 실행, 없으면 SQL 안내
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const PROJECT_REF = "rekemsnicqecouinmfwh";
const ADMIN_EMAIL = "alianfamily@dadaeyu.com";

const SQL = `UPDATE auth.users SET email_confirmed_at = timezone('utc', now()) WHERE lower(email) = lower('${ADMIN_EMAIL}');`;

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
  const token = env.SUPABASE_ACCESS_TOKEN;

  if (!token) {
    console.log("SUPABASE_ACCESS_TOKEN 이 없어 SQL Editor에서 직접 실행해야 합니다.\n");
    console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
    console.log(SQL);
    process.exit(1);
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    }
  );

  if (!res.ok) {
    console.error("SQL 실행 실패:", await res.text());
    process.exit(1);
  }

  console.log("✓ 이메일 인증 완료:", ADMIN_EMAIL);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
