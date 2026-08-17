/**
 * schema-withdrawn.sql 적용 (status에 withdrawn 허용)
 *
 * .env.local 에 SUPABASE_ACCESS_TOKEN 필요
 *   → https://supabase.com/dashboard/account/tokens
 *
 * 사용: node scripts/apply-withdrawn.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const PROJECT_REF = "rekemsnicqecouinmfwh";
const SQL_FILE = "schema-withdrawn.sql";
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

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

function splitStatements(sql) {
  return sql
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);
}

async function main() {
  const env = loadEnv();
  const token = env.SUPABASE_ACCESS_TOKEN;
  const sql = readFileSync(resolve(root, "supabase", SQL_FILE), "utf8");

  if (!token) {
    console.error("SUPABASE_ACCESS_TOKEN 이 .env.local 에 없습니다.");
    console.error(`발급: https://supabase.com/dashboard/account/tokens`);
    console.error(`또는 SQL Editor에서 직접 실행: ${SQL_EDITOR_URL}\n`);
    console.log(sql);
    process.exit(1);
  }

  for (const query of splitStatements(sql)) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: query + ";" })
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`실패: ${body.slice(0, 500)}`);
    }
  }
  console.log(`✓ ${SQL_FILE} 적용 완료`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
