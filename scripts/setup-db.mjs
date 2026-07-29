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
const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ADMIN_KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_ADMIN_KEY) {
  throw new Error(
    ".env.local에 Supabase URL과 SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
  );
}
const PROJECT_REF = env.SUPABASE_PROJECT_REF || new URL(SUPABASE_URL).hostname.split(".")[0];
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;
const REQUIRED_SCHEMAS = [
  { file: "schema.sql", tables: ["tb_places"] },
  {
    file: "schema-tts-usage.sql",
    tables: ["tts_monthly_usage", "tts_client_daily_usage"]
  }
];

async function tableExists(supabase, table) {
  const { error } = await supabase.from(table).select("*").limit(1);
  return !error;
}

async function applySchemaViaManagementApi(accessToken, file) {
  const query = readFileSync(resolve(root, "supabase", file), "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${file} 적용 실패: ${body}`);
  }

  console.log(`✓ ${file} 적용 완료 (Management API)`);
}

async function runSeed() {
  const { spawnSync } = await import("child_process");
  const result = spawnSync("node", ["scripts/seed-supabase.mjs"], {
    cwd: root,
    stdio: "inherit",
    shell: true
  });
  process.exit(result.status ?? 1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const schemaStates = await Promise.all(
    REQUIRED_SCHEMAS.map(async (schema) => {
      const tableStates = await Promise.all(
        schema.tables.map((table) => tableExists(supabase, table))
      );
      return { ...schema, exists: tableStates.every(Boolean) };
    })
  );
  const missingSchemas = schemaStates.filter((schema) => !schema.exists);

  if (missingSchemas.length > 0) {
    if (env.SUPABASE_ACCESS_TOKEN) {
      console.log("누락된 DB 스키마를 Management API로 적용합니다...");
      for (const schema of missingSchemas) {
        await applySchemaViaManagementApi(env.SUPABASE_ACCESS_TOKEN, schema.file);
      }
    } else {
      console.log("\n❌ 필수 DB 스키마가 아직 적용되지 않았습니다.\n");
      console.log("아래 SQL을 Supabase SQL Editor에서 실행하세요:\n");
      console.log(`  ${SQL_EDITOR_URL}\n`);
      console.log(
        `실행할 파일:\n${missingSchemas.map((schema) => `  supabase/${schema.file}`).join("\n")}\n`
      );
      console.log("실행 후 다시 시도:");
      console.log("  npm run db:setup\n");
      process.exit(1);
    }
  }

  console.log("✓ 필수 DB 스키마 확인됨");
  await runSeed();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
