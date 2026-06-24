/**
 * Supabase SQL API로 스키마 적용 시도
 * 실패 시 대시보드 SQL Editor에서 supabase/schema.sql 을 직접 실행하세요.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const schemaFiles = ["schema.sql", "schema-auth.sql"];
const schema = schemaFiles
  .map((f) => readFileSync(resolve(__dirname, `../supabase/${f}`), "utf8"))
  .join("\n\n");

// Supabase Management SQL endpoint (프로젝트별 지원 여부 다름)
const endpoints = [
  `${url}/pg/query`,
  `${url}/database/query`,
];

for (const endpoint of endpoints) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({ query: schema }),
    });
    const text = await res.text();
    console.log(`[${endpoint}] ${res.status}: ${text.slice(0, 200)}`);
    if (res.ok) {
      console.log("스키마 적용 성공!");
      process.exit(0);
    }
  } catch (e) {
    console.log(`[${endpoint}] 실패:`, e.message);
  }
}

console.log("\n자동 스키마 적용 불가 → Supabase 대시보드 > SQL Editor 에서 supabase/schema.sql 을 실행하세요.");
