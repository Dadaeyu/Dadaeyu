import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSyncConfig, runFullSync } from "@/app/api/place/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 매일 자정(KST) 실행되는 장소 테이블 동기화 스케줄러.
// vercel.json 의 crons 설정이 이 GET 라우트를 호출한다(UTC 15:00 = KST 00:00).
//
// 인증: Vercel Cron 은 CRON_SECRET 환경변수가 설정돼 있으면 요청에
//   Authorization: Bearer <CRON_SECRET>
// 헤더를 자동으로 실어 보낸다. 외부에서 임의로 호출해 동기화를 트리거하지
// 못하도록, CRON_SECRET 이 설정된 경우 이 헤더를 검증한다.
export async function GET(request: Request) {
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

  // place 선행 → detail/barrierfree/bakery 병렬 (runFullSync 내부에서 처리)
  const startedAt = new Date().toISOString();
  console.log(`[cron/place] 동기화 시작 ${startedAt}`);
  const results = await runFullSync(supabase);
  const finishedAt = new Date().toISOString();

  // 자동 실행은 응답 본문이 버려지므로, 테이블별 집계/에러를 로그로 남긴다.
  // (Vercel: 프로젝트 > Logs / Observability, 로컬: next dev 터미널에서 확인)
  const entries = Object.entries(results) as [string, Record<string, unknown>][];
  for (const [table, r] of entries) {
    if (typeof r.error === "string") {
      // 테이블 전체 실패 (예: DB 조회/insert 실패) — 원인 메시지와 부분 진행 상황
      console.error(`[cron/place] ${table} 실패: ${r.error}`, r.partial ?? "");
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
  }
  console.log(`[cron/place] 동기화 종료 ${finishedAt}`);

  return NextResponse.json({ ok: true, startedAt, finishedAt, results });
}
