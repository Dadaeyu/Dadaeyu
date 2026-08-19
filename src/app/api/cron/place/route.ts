import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSyncConfig, runFullSync, TIME_BUDGET_MS } from "@/lib/place/syncEngine";

export const dynamic = "force-dynamic";
// Vercel Hobby 플랜의 함수 실행 시간 상한(60초)에 맞춘다.
export const maxDuration = 60;

// 하루 안에 스스로를 이어 부를 수 있는 최대 횟수(무한 루프 방지 안전장치).
// TIME_BUDGET_MS(45초) 기준으로 넉넉히 잡아도 총 몇 십 분 안에는 수렴한다.
const MAX_CHAIN_DEPTH = 100;

// 매일 오전 9시 30분(KST) 실행되는 장소 테이블 동기화 스케줄러.
// vercel.json 의 crons 설정이 이 GET 라우트를 호출한다(UTC 00:30 = KST 09:30).
//
// Hobby 플랜은 크론을 하루 한 번만 트리거할 수 있고, 함수 실행도 60초로 제한된다. 그 안에
// 전체 동기화(800건 넘는 장소×API 여러 번)를 다 끝낼 수 없어서, 한 번 호출될 때마다
// TIME_BUDGET_MS(45초) 만큼만 일하고 남은 작업이 있으면 스스로를 다시 호출해 이어간다
// (after()/waitUntil 로 응답을 먼저 보낸 뒤 백그라운드에서 다음 호출을 건다).
// 크론 트리거는 하루 한 번이지만, 그 한 번이 여러 번의 짧은 호출로 자동으로 이어지는 구조다.
//
// 인증: Vercel Cron 은 CRON_SECRET 환경변수가 설정돼 있으면 요청에
//   Authorization: Bearer <CRON_SECRET>
// 헤더를 자동으로 실어 보낸다. 외부에서 임의로 호출해 동기화를 트리거하지
// 못하도록, CRON_SECRET 이 설정된 경우 이 헤더를 검증한다. 체이닝으로 스스로를 부를 때도
// 같은 헤더를 실어 보내 인증을 통과시킨다.
export async function GET(request: Request) {
  const requestStartedAt = Date.now();
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const config = getSyncConfig();
  if (!config.ok) {
    return NextResponse.json({ error: config.error }, { status: 500 });
  }

  const supabase = createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false }
  });

  const chain = Math.max(0, Number(new URL(request.url).searchParams.get("chain") ?? "0") | 0);

  // place 선행 → detail/barrierfree/bakery 병렬 (runFullSync 내부에서 처리)
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + TIME_BUDGET_MS;
  console.log(`[cron/place] 동기화 시작 ${startedAt} (chain=${chain})`);
  const results = await runFullSync(supabase, deadline);
  const finishedAt = new Date().toISOString();

  // 자동 실행은 응답 본문이 버려지므로, 테이블별 집계/에러를 로그로 남긴다.
  // (Vercel: 프로젝트 > Logs / Observability, 로컬: next dev 터미널에서 확인)
  let pendingWork = false;
  const entries = Object.entries(results) as [string, Record<string, unknown>][];
  for (const [table, r] of entries) {
    if (typeof r.error === "string") {
      // 테이블 전체 실패 (예: DB 조회/insert 실패) — 원인 메시지와 부분 진행 상황.
      // 실패한 테이블은 다음 체이닝 호출에서 처음부터 다시 시도되도록 pendingWork 로 취급한다.
      console.error(`[cron/place] ${table} 실패: ${r.error}`, r.partial ?? "");
      pendingWork = true;
      continue;
    }
    // 테이블마다 집계 필드가 다르므로(tour 계열: totalPlaces/upserted/skipped,
    // bakery: totalCount/inserted/updated/unchanged) errors 배열만 제외하고 통째로 남긴다.
    const summary = { ...r };
    delete summary.errors;
    console.log(`[cron/place] ${table}:`, summary);
    // 개별 항목 실패(콘텐츠별 API 오류 등)가 있으면 원인 목록을 함께 남긴다.
    if (typeof r.errorCount === "number" && r.errorCount > 0) {
      console.error(`[cron/place] ${table} 개별 실패 ${r.errorCount}건:`, r.errors);
    }
    if (r.notDone === true) pendingWork = true;
  }
  console.log(`[cron/place] 동기화 종료 ${finishedAt} (남은 작업: ${pendingWork})`);

  // 남은 작업이 있으면 스스로를 다시 호출해 이어간다. 응답은 먼저 보내고(after), 다음 호출은
  // 백그라운드에서 건다 — 그래야 지금 이 호출이 자기 자신의 60초 예산 안에서 안전하게 끝난다.
  if (pendingWork && chain < MAX_CHAIN_DEPTH && cronSecret) {
    const selfHost = process.env.VERCEL_URL; // 로컬(next dev)에는 없음 — 로컬에선 체이닝 안 함
    if (selfHost) {
      const nextUrl = `https://${selfHost}/api/cron/place?chain=${chain + 1}`;
      after(async () => {
        try {
          // fetch() 는 다음 함수를 "부르는" 즉시(TCP 연결 + 요청 전송) 다음 invocation 이 시작되고,
          // 그 실행은 이 함수의 커넥션과 무관하게 독립적으로 자기 예산(TIME_BUDGET_MS)만큼 계속
          // 돈다 — 그러니 우리가 응답을 오래 기다려줄 필요가 없다. 오히려 after() 안에서 대기하는
          // 시간도 이 함수 자신의 maxDuration(60초) 예산에 그대로 포함되므로, 본작업이 이미 시간을
          // 많이 썼는데 여기서도 오래 기다리면 이 함수 자체가 60초를 넘겨 타임아웃으로 죽는다
          // (실제로 본작업 41초 + 대기 58초 = 99초로 죽은 사례가 있었다). 지금까지 쓴 시간을 빼고
          // 남은 예산 안에서만, 그것도 짧게(요청이 실제로 전달됐는지 확인할 정도만) 기다린다.
          const elapsedMs = Date.now() - requestStartedAt;
          const remainingMs = maxDuration * 1000 - elapsedMs - 3000; // 3초는 안전 여유
          const waitMs = Math.max(1000, Math.min(8000, remainingMs));
          await fetch(nextUrl, {
            headers: { Authorization: `Bearer ${cronSecret}` },
            signal: AbortSignal.timeout(waitMs)
          });
        } catch {
          // 응답을 못 받았거나 시간 안에 못 기다렸어도, 요청 자체는 이미 전달돼 다음 invocation이
          // 독립적으로 실행 중일 가능성이 높다 — 조용히 넘어간다. 최악의 경우 다음날 크론이 처음부터 다시 훑는다.
          console.error(
            "[cron/place] 다음 체이닝 호출 확인 실패(전달은 됐을 수 있음) — 다음날 크론 때 재시도됨"
          );
        }
      });
    } else {
      console.log("[cron/place] VERCEL_URL 없음(로컬 실행) — 체이닝 생략, 이번 호출 결과만 반환");
    }
  }

  return NextResponse.json({ ok: true, startedAt, finishedAt, chain, pendingWork, results });
}
