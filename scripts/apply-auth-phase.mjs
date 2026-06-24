/**
 * 회원·로그인 단계별 스키마 적용
 *
 * 사용법:
 *   node scripts/apply-auth-phase.mjs 1    # phase1: members
 *   node scripts/apply-auth-phase.mjs 2    # phase2: user_preferences
 *   node scripts/apply-auth-phase.mjs 3    # phase3: phone, account recovery
 *   node scripts/apply-auth-phase.mjs all  # phase1 + phase2 + phase3
 *
 * SUPABASE_ACCESS_TOKEN 이 .env.local 에 있으면 Management API로 자동 적용.
 * 없으면 SQL 파일 내용을 출력합니다.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const PROJECT_REF = "rekemsnicqecouinmfwh";
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

const PHASE_FILES = {
  1: "schema-auth-phase1.sql",
  2: "schema-auth-phase2.sql",
  3: "schema-auth-phase3-account.sql",
};

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

async function applyViaManagementApi(accessToken, sqlFile) {
  const sql = readFileSync(resolve(root, "supabase", sqlFile), "utf8");
  const statements = splitStatements(sql);

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
      throw new Error(`실패 (${sqlFile}): ${body.slice(0, 300)}`);
    }
  }
  console.log(`✓ ${sqlFile} 적용 완료`);
}

function printManualInstructions(phases) {
  console.log("\nSUPABASE_ACCESS_TOKEN 이 없어 자동 적용을 할 수 없습니다.\n");
  console.log(`SQL Editor: ${SQL_EDITOR_URL}\n`);
  for (const p of phases) {
    const file = PHASE_FILES[p];
    console.log(`── ${file} ──`);
    console.log(readFileSync(resolve(root, "supabase", file), "utf8"));
    console.log("");
  }
}

async function main() {
  const arg = process.argv[2] ?? "1";
  const phases =
    arg === "all" ? [1, 2, 3] : [Number(arg)].filter((p) => PHASE_FILES[p]);

  if (phases.length === 0) {
    console.error("사용법: node scripts/apply-auth-phase.mjs [1|2|all]");
    process.exit(1);
  }

  const env = loadEnv();

  if (env.SUPABASE_ACCESS_TOKEN) {
    for (const p of phases) {
      console.log(`Phase ${p} 적용 중...`);
      await applyViaManagementApi(env.SUPABASE_ACCESS_TOKEN, PHASE_FILES[p]);
    }
    console.log("\n완료! npm run db:verify-auth 로 확인하세요.");
    return;
  }

  printManualInstructions(phases);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
