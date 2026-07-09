/**
 * phase4 이메일 인증 스키마 적용 여부 검증
 * - auth.users 트리거/함수 (Management API 있을 때)
 * - 미인증 이메일 가입자 members 미생성 여부 (간접 검증)
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const PROJECT_REF = "rekemsnicqecouinmfwh";

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

async function queryManagementApi(token, query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 400));
  return JSON.parse(text);
}

async function checkTriggersAndFunctions(token) {
  const triggers = await queryManagementApi(
    token,
    `SELECT t.tgname AS trigger_name, p.proname AS function_name
     FROM pg_trigger t
     JOIN pg_class c ON t.tgrelid = c.oid
     JOIN pg_namespace n ON c.relnamespace = n.oid
     JOIN pg_proc p ON t.tgfoid = p.oid
     WHERE n.nspname = 'auth'
       AND c.relname = 'users'
       AND NOT t.tgisinternal
     ORDER BY t.tgname;`
  );

  const functions = await queryManagementApi(
    token,
    `SELECT proname
     FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public'
       AND proname IN (
         'insert_member_for_auth_user',
         'handle_new_user',
         'handle_user_email_confirmed'
       )
     ORDER BY proname;`
  );

  return { triggers, functions };
}

async function checkBehavioral(supabase) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const users = data.users ?? [];
  const ids = users.map((u) => u.id);
  const { data: members, error: mErr } = await supabase
    .from("tb_members")
    .select("id")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  if (mErr) throw mErr;

  const memberIds = new Set((members ?? []).map((m) => m.id));

  const rows = users.map((u) => {
    const provider = u.app_metadata?.provider ?? "email";
    const confirmed = !!u.email_confirmed_at;
    const hasMember = memberIds.has(u.id);
    return {
      email: u.email,
      provider,
      confirmed,
      hasMember,
      created: u.created_at,
    };
  });

  const unconfirmedEmail = rows.filter((r) => r.provider === "email" && !r.confirmed);
  const unconfirmedWithMember = unconfirmedEmail.filter((r) => r.hasMember);
  const confirmedEmailNoMember = rows.filter(
    (r) => r.provider === "email" && r.confirmed && !r.hasMember
  );
  const oauthNoMember = rows.filter((r) => r.provider !== "email" && !r.hasMember);

  return {
    totalUsers: rows.length,
    unconfirmedEmail,
    unconfirmedWithMember,
    confirmedEmailNoMember,
    oauthNoMember,
    rows,
  };
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log("=== phase4 이메일 인증 스키마 검증 ===\n");

  if (env.SUPABASE_ACCESS_TOKEN) {
    const { triggers, functions } = await checkTriggersAndFunctions(
      env.SUPABASE_ACCESS_TOKEN
    );
    const triggerNames = triggers.map((t) => t.trigger_name);
    const fnNames = functions.map((f) => f.proname);

    const expectedTriggers = ["on_auth_user_created", "on_auth_user_email_confirmed"];
    const expectedFns = [
      "insert_member_for_auth_user",
      "handle_new_user",
      "handle_user_email_confirmed",
    ];

    console.log("[DB 트리거]");
    for (const name of expectedTriggers) {
      const ok = triggerNames.includes(name);
      console.log(`  ${ok ? "✓" : "❌"} ${name}`);
    }

    console.log("\n[DB 함수]");
    for (const name of expectedFns) {
      const ok = fnNames.includes(name);
      console.log(`  ${ok ? "✓" : "❌"} ${name}`);
    }

    if (triggers.length) {
      console.log("\n[auth.users 트리거 상세]");
      for (const t of triggers) {
        console.log(`  - ${t.trigger_name} → ${t.function_name}()`);
      }
    }
    console.log("");
  } else {
    console.log(
      "○ SUPABASE_ACCESS_TOKEN 없음 → 트리거/함수 직접 조회 생략 (행동 검증만 수행)\n"
    );
  }

  const behavior = await checkBehavioral(supabase);

  console.log("[사용자 ↔ members 매칭] (총", behavior.totalUsers, "명)");
  console.log(
    "  미인증 이메일 가입:",
    behavior.unconfirmedEmail.length,
    "명"
  );

  if (behavior.unconfirmedEmail.length === 0) {
    console.log(
      "  ○ 미인증 이메일 계정 없음 — 트리거 적용 여부는 가입 테스트로 확인 필요"
    );
  } else if (behavior.unconfirmedWithMember.length === 0) {
    console.log(
      "  ✓ 미인증 이메일 가입자 모두 members 없음 → phase4 동작과 일치"
    );
  } else {
    console.log(
      "  ❌ 미인증 이메일인데 members 있음:",
      behavior.unconfirmedWithMember.length,
      "명"
    );
    for (const r of behavior.unconfirmedWithMember) {
      console.log(`     - ${r.email}`);
    }
    console.log(
      "     → phase4 미적용이거나, 적용 전에 가입된 계정일 수 있음"
    );
  }

  if (behavior.confirmedEmailNoMember.length > 0) {
    console.log(
      "\n  ⚠ 인증 완료 이메일인데 members 없음:",
      behavior.confirmedEmailNoMember.length,
      "명"
    );
    for (const r of behavior.confirmedEmailNoMember) {
      console.log(`     - ${r.email}`);
    }
  }

  if (behavior.oauthNoMember.length > 0) {
    console.log("\n  ⚠ OAuth 계정인데 members 없음:");
    for (const r of behavior.oauthNoMember) {
      console.log(`     - ${r.email} (${r.provider})`);
    }
  }

  console.log("\n[계정별 요약]");
  for (const r of behavior.rows) {
    const status = r.hasMember ? "members O" : "members X";
    const auth = r.confirmed ? "인증됨" : "미인증";
    console.log(`  ${r.email} | ${r.provider} | ${auth} | ${status}`);
  }

  const phase4LikelyOk =
    behavior.unconfirmedWithMember.length === 0 &&
    behavior.oauthNoMember.length === 0;

  console.log(
    phase4LikelyOk
      ? "\n✓ phase4 적용 상태로 보입니다."
      : "\n⚠ 일부 계정이 phase4 설계와 맞지 않습니다. 위 목록을 확인하세요."
  );
}

main().catch((err) => {
  console.error("오류:", err.message);
  process.exit(1);
});
