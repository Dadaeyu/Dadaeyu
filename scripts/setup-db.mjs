/**
 * DB 초기 설정: 스키마 적용 → 시드 삽입
 *
 * 방법 A (자동): .env.local 에 SUPABASE_ACCESS_TOKEN 추가
 *   → https://supabase.com/dashboard/account/tokens 에서 발급
 *
 * 방법 B (수동): Supabase SQL Editor 에서 supabase/schema.sql 실행 후
 *   → npm run db:seed
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

const env = loadEnv();
const PROJECT_REF = "rekemsnicqecouinmfwh";
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

async function tableExists(supabase, table) {
  const { error } = await supabase.from(table).select("id").limit(1);
  return !error;
}

async function applySchemaViaManagementApi(accessToken) {
  const schema = readFileSync(resolve(root, "supabase/schema.sql"), "utf8");
  // 주석 제거 후 statement 단위 실행
  const statements = schema
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);

  for (const query of statements) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query + ";" }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`스키마 적용 실패: ${body}`);
    }
  }
  console.log("✓ 스키마 적용 완료 (Management API)");
}

async function runSeed() {
  const { spawnSync } = await import("child_process");
  const result = spawnSync("node", ["scripts/seed-supabase.mjs"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}

async function main() {
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const exists = await tableExists(supabase, "places");

  if (!exists) {
    if (env.SUPABASE_ACCESS_TOKEN) {
      console.log("places 테이블 없음 → Management API로 스키마 적용 중...");
      await applySchemaViaManagementApi(env.SUPABASE_ACCESS_TOKEN);
    } else {
      console.log("\n❌ public.places 테이블이 아직 없습니다.\n");
      console.log("아래 SQL을 Supabase SQL Editor에서 실행하세요:\n");
      console.log(`  ${SQL_EDITOR_URL}\n`);
      console.log("실행할 파일: supabase/schema.sql\n");
      console.log("실행 후 다시 시도:");
      console.log("  npm run db:seed\n");
      console.log("─".repeat(50));
      console.log(readFileSync(resolve(root, "supabase/schema.sql"), "utf8"));
      console.log("─".repeat(50));
      process.exit(1);
    }
  } else {
    console.log("✓ places 테이블 확인됨");
  }

  await runSeed();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
