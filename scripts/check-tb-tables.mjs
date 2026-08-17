/**
 * public 스키마 테이블 tb_ 접두사 점검
 * node scripts/check-tb-tables.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const adminKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !adminKey) {
  throw new Error(
    ".env.local에 Supabase URL과 SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
  );
}

const sb = createClient(supabaseUrl, adminKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const BASE_NAMES = [
  "members",
  "user_preferences",
  "user_favorites",
  "user_point_events",
  "places",
  "place_reviews",
  "courses",
  "course_days",
  "course_day_places",
  "community_posts",
  "community_comments",
  "post_likes",
  "place_reports",
  "admin_monthly_signups"
];

async function probe(name) {
  const { error } = await sb.from(name).select("*").limit(0);
  if (!error) return "OK";
  const msg = error.message ?? "";
  if (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("Could not find")
  ) {
    return "없음";
  }
  return `오류: ${msg.slice(0, 100)}`;
}

async function main() {
  console.log("Supabase DB 테이블 tb_ 점검\n");
  console.log("프로젝트:", supabaseUrl);
  console.log("─".repeat(56));

  const legacyFound = [];
  const tbMissing = [];
  const tbFound = [];

  for (const base of BASE_NAMES) {
    const legacy = base;
    const tb = `tb_${base}`;
    const legacyStatus = await probe(legacy);
    const tbStatus = await probe(tb);

    if (legacyStatus === "OK") legacyFound.push(legacy);
    if (tbStatus === "OK") tbFound.push(tb);
    else if (tbStatus === "없음") tbMissing.push(tb);

    const flag =
      legacyStatus === "OK" && tbStatus !== "OK"
        ? "⚠️  구이름만 존재"
        : legacyStatus === "OK" && tbStatus === "OK"
          ? "⚠️  둘 다 존재"
          : tbStatus === "OK"
            ? "✓ tb_만 존재"
            : legacyStatus === "OK"
              ? "?"
              : "✗ 둘 다 없음";

    console.log(
      `${flag}  ${base.padEnd(22)} | ${legacy.padEnd(24)} ${legacyStatus.padEnd(6)} | ${tb.padEnd(26)} ${tbStatus}`
    );
  }

  console.log("\n" + "─".repeat(56));
  console.log("요약");
  console.log(`  tb_ 테이블 존재: ${tbFound.length}/${BASE_NAMES.length}`);
  if (legacyFound.length) {
    console.log(`  ⚠️  tb_ 없는 구 테이블 아직 남음: ${legacyFound.join(", ")}`);
  } else {
    console.log("  ✓ 구 이름 테이블 없음 (리네임 완료)");
  }
  if (tbMissing.length) {
    console.log(`  ✗ tb_ 테이블 미생성: ${tbMissing.join(", ")}`);
  }

  console.log("\n참고: DB 함수는 REST로 조회 불가.");
  console.log("  insert_member 오류 났다면 schema-fix-tb-functions.sql 미적용 상태입니다.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
