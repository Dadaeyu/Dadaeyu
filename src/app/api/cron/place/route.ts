import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSyncConfig, runFullSync, TIME_BUDGET_MS } from "@/lib/place/syncEngine";

export const dynamic = "force-dynamic";
// Vercel Hobby 플랜의 함수 실행 시간 상한(60초)에 맞춘다.
export const maxDuration = 60;

// 하루 안에 스스로를 이어 부를 수 있는 최대 횟수(무한 루프 방지 안전장치).
// TIME_BUDGET_MS(45초) 기준으로 넉넉히 잡아도 총 몇 십 분 안에는 수렴한다.
const MAX_CHAIN_DEPTH = 100;

// 매일 새벽 5시(KST) 실행되는 장소 테이블 동기화 스케줄러.
// vercel.json 의 crons 설정이 이 GET 라우트를 호출한다(UTC 20:00 = KST 05:00).
// 한국관광공사 콘텐츠는 국문 관광정보 새벽 4:30, 무장애 여행 정보 새벽 7:30에 갱신되므로,
// 국문 관광정보 갱신 이후인 5시로 잡아 그날 최신 데이터를 최대한 반영한다(무장애 정보는
// 7:30 갱신 전 값을 기준으로 하루 시작 — 다음날 회차에서 다시 최신화된다).
//
// Hobby 플랜은 크론을 하루 한 번만 트리거할 수 있고, 함수 실행도 60초로 제한된다. 그 안에
// 전체 동기화(800건 넘는 장소×API 여러 번)를 다 끝낼 수 없어서, 한 번 호출될 때마다
// TIME_BUDGET_MS(45초) 만큼만 일하고 남은 작업이 있으면 스스로를 다시 호출해 이어간다.
// 크론 트리거는 하루 한 번이지만, 그 한 번이 여러 번의 짧은 호출로 자동으로 이어지는 구조다.
//
// detail/barrierfree/normalize는 place_id 오름차순 고정 순서로 진행하고, 이번 회차까지 처리한
// 마지막 place_id(커서)를 다음 체이닝 호출의 쿼리 파라미터로 그대로 실어 보낸다 — updatetime
// 기준 "오래된 것부터"가 아니라, 매일 자정 새 트리거(커서 없음)는 항상 처음부터 다시 돌고,
// 같은 날 안에서의 체이닝만 커서로 이어간다.
//
// 다음 체인 호출은 응답을 보내기 "전에" 직접 기다렸다가 보낸다 — after()(응답 이후 백그라운드)
// 방식은 대시보드 수동 Run 테스트에선 됐지만 실제 스케줄 트리거에서는 1회차에서 체이닝이
// 끊기는 것으로 보였다. 함수가 아직 살아있는 상태에서 다음 체인을 확실히 쏘도록, 응답 전에
// 짧게 기다리는 방식으로 바꿨다.
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

  const searchParams = new URL(request.url).searchParams;
  const chain = Math.max(0, Number(searchParams.get("chain") ?? "0") | 0);
  const cursorParam = (name: string) => Math.max(0, Number(searchParams.get(name) ?? "0") | 0);
  const cursors = {
    detail: cursorParam("detailCursor"),
    barrierfree: cursorParam("barrierfreeCursor"),
    normalize: cursorParam("normalizeCursor")
  };

  // place 선행 → detail/barrierfree/bakery 병렬 (runFullSync 내부에서 처리)
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + TIME_BUDGET_MS;
  console.log(
    `[cron/place] 동기화 시작 ${startedAt} (chain=${chain}, cursors=${JSON.stringify(cursors)})`
  );
  const results = await runFullSync(supabase, deadline, cursors);
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

  // 다음 회차가 이어받을 커서 — 이번 회차 결과에 nextCursor 가 있으면 그 값, 없으면(예: place/bakery
  // 처럼 커서 개념이 없는 테이블, 또는 이번 회차에서 아예 안 돈 경우) 이번에 넘겨받은 값을 그대로 유지.
  const nextCursorOf = (table: "detail" | "barrierfree" | "normalize"): number => {
    const r = results[table];
    const value =
      r && typeof r === "object" ? (r as Record<string, unknown>).nextCursor : undefined;
    return typeof value === "number" ? value : cursors[table];
  };
  const nextCursors = {
    detail: nextCursorOf("detail"),
    barrierfree: nextCursorOf("barrierfree"),
    normalize: nextCursorOf("normalize")
  };

  // 남은 작업이 있으면 스스로를 다시 호출해 이어간다 — 응답을 보내기 전에, 남은 예산 안에서
  // 짧게(요청이 실제로 전달됐는지 확인할 정도만) 기다린다.
  let chainTriggered = false;
  if (pendingWork && chain < MAX_CHAIN_DEPTH && cronSecret) {
    const selfHost = process.env.VERCEL_URL; // 로컬(next dev)에는 없음 — 로컬에선 체이닝 안 함
    if (selfHost) {
      const nextUrl =
        `https://${selfHost}/api/cron/place?chain=${chain + 1}` +
        `&detailCursor=${nextCursors.detail}` +
        `&barrierfreeCursor=${nextCursors.barrierfree}` +
        `&normalizeCursor=${nextCursors.normalize}`;
      try {
        const elapsedMs = Date.now() - requestStartedAt;
        const remainingMs = maxDuration * 1000 - elapsedMs - 3000; // 3초는 안전 여유
        const waitMs = Math.max(1000, Math.min(8000, remainingMs));
        await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${cronSecret}` },
          signal: AbortSignal.timeout(waitMs)
        });
        chainTriggered = true;
      } catch {
        // 응답을 못 받았거나 시간 안에 못 기다렸어도, 요청 자체는 이미 전달돼 다음 invocation이
        // 독립적으로 실행 중일 가능성이 높다 — 조용히 넘어간다.
        console.error("[cron/place] 다음 체이닝 호출 확인 실패(전달은 됐을 수 있음)");
        chainTriggered = true;
      }
    } else {
      console.log("[cron/place] VERCEL_URL 없음(로컬 실행) — 체이닝 생략, 이번 호출 결과만 반환");
    }
  }

  return NextResponse.json({
    ok: true,
    startedAt,
    finishedAt,
    chain,
    cursors,
    nextCursors,
    pendingWork,
    chainTriggered,
    results
  });
}
