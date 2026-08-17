import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const results = [];
const targetOrigin = resolveTargetOrigin(process.argv[2] || process.env.RELEASE_ORIGIN);

checkRequiredEnvironment();
await Promise.all([checkKakaoMaps(), checkSupabaseRuntime()]);

for (const result of results) {
  const marker = result.level === "pass" ? "✓" : result.level === "warn" ? "!" : "✗";
  console.log(`${marker} ${result.message}`);
}

const blockers = results.filter((result) => result.level === "block");
if (blockers.length) {
  console.error(`\nRelease readiness: BLOCKED (${blockers.length})`);
  process.exit(1);
}

console.log("\nRelease readiness: PASS");

function checkRequiredEnvironment() {
  requireEnvironment("DEEPSEEK_API_KEY", "챗봇 답변 생성 키");
  requireEnvironment("CHAT_CLIENT_HASH_SECRET", "챗봇 익명 요청 식별 해시 시크릿");
  requireEnvironment("NEXT_PUBLIC_KAKAO_MAP_API_KEY", "카카오 지도 JavaScript 키", [
    "NEXT_PUBLIC_KAKAO_MAP_KEY"
  ]);

  if (
    process.env.GOOGLE_TTS_ENABLED !== "false" &&
    !hasEnvironment("GOOGLE_TTS_CREDENTIALS_JSON") &&
    !hasEnvironment("GOOGLE_APPLICATION_CREDENTIALS")
  ) {
    add(
      "warn",
      "Google TTS 명시 자격증명이 없습니다. 배포 런타임의 Application Default Credentials를 확인하세요."
    );
  }
}

async function checkKakaoMaps() {
  const key =
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim();
  if (!key) return;

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`,
      { headers: { Referer: `${targetOrigin}/` } }
    );
    if (response.ok) {
      add("pass", `카카오 지도 SDK가 ${targetOrigin}에서 승인되었습니다.`);
      return;
    }

    let errorType = null;
    try {
      const body = await response.json();
      errorType = typeof body?.errorType === "string" ? body.errorType : null;
    } catch {}
    add(
      "block",
      `카카오 지도 SDK가 ${response.status}${errorType ? ` ${errorType}` : ""}를 반환했습니다. JavaScript 키와 허용 도메인을 확인하세요.`
    );
  } catch (error) {
    add("block", `카카오 지도 SDK에 연결하지 못했습니다: ${getErrorMessage(error)}`);
  }
}

async function checkSupabaseRuntime() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    add("block", "Supabase 서버 URL 또는 service-role/secret 키가 없습니다.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const chatSchema = process.env.SUPABASE_SCHEMA?.trim() || "chatbot";
  const chatTable = process.env.SUPABASE_CHAT_TABLE?.trim() || "chunks";

  const checks = [
    checkTable(supabase, "public", "chat_monthly_global_usage"),
    checkTable(supabase, "public", "chat_client_daily_usage"),
    checkTable(supabase, "public", "tts_monthly_usage"),
    checkTable(supabase, "public", "tts_client_daily_usage"),
    checkTable(supabase, "public", "tts_usage_reservations"),
    checkTable(supabase, chatSchema, chatTable, true),
    checkRpc(supabase, "reserve_chat_usage", {
      p_client_key: "0".repeat(64),
      p_client_limit: 1,
      p_client_period: "2026-01-01",
      p_global_limit: 1,
      p_global_period: "2026-01",
      p_usage: 0
    }),
    checkRpc(supabase, "reserve_tts_usage", {
      p_billing_period: "2026-01",
      p_client_key: "0".repeat(64),
      p_client_limit: 1,
      p_client_period: "2026-01-01",
      p_limit: 1,
      p_provider: "probe",
      p_reservation_token: null,
      p_usage: 0
    }),
    checkRpc(supabase, "refund_tts_usage", { p_reservation_token: null }),
    checkRpc(supabase, "finalize_tts_usage", { p_reservation_token: null })
  ];

  const checkResults = await Promise.all(checks);
  for (const result of checkResults) add(result.level, result.message);
}

async function checkTable(supabase, schema, table, requireRows = false) {
  const { count, error } = await supabase
    .schema(schema)
    .from(table)
    .select("*", { count: "exact", head: true });
  const label = `${schema}.${table}`;
  if (error) return blocked(`${label} 테이블을 확인하지 못했습니다 (${error.code || "unknown"}).`);
  if (requireRows && !count) return blocked(`${label} 챗봇 지식 테이블이 비어 있습니다.`);
  return passed(`${label} 테이블을 확인했습니다${requireRows ? ` (${count}행)` : ""}.`);
}

async function checkRpc(supabase, name, args) {
  const { error } = await supabase.rpc(name, args);
  if (error?.code === "PGRST202") {
    return blocked(`${name} RPC가 없습니다. 해당 usage 스키마 SQL을 적용하세요.`);
  }
  if (error) return blocked(`${name} RPC 확인에 실패했습니다 (${error.code || "unknown"}).`);
  return passed(`${name} RPC를 확인했습니다.`);
}

function requireEnvironment(name, label, fallbacks = []) {
  if ([name, ...fallbacks].some(hasEnvironment)) {
    add("pass", `${label}가 설정되어 있습니다.`);
  } else {
    add("block", `${label}(${name})가 없습니다.`);
  }
}

function hasEnvironment(name) {
  return Boolean(process.env[name]?.trim());
}

function resolveTargetOrigin(value) {
  const candidate = value?.trim();
  if (!candidate) {
    console.error(
      "Release origin is required. Usage: node scripts/check-release-readiness.mjs https://service.example.com"
    );
    process.exit(2);
  }
  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.origin !== candidate.replace(/\/$/, "")
    ) {
      throw new Error("origin only");
    }
    return url.origin;
  } catch {
    console.error("Usage: node scripts/check-release-readiness.mjs https://service.example.com");
    process.exit(2);
  }
}

function add(level, message) {
  results.push({ level, message });
}

function passed(message) {
  return { level: "pass", message };
}

function blocked(message) {
  return { level: "block", message };
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "알 수 없는 오류";
}
