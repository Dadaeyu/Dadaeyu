import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/supabase/require-admin";
import {
  getSyncConfig,
  runFullSync,
  isSyncTarget,
  SYNC_FNS,
  TIME_BUDGET_MS
} from "@/lib/place/syncEngine";

export const dynamic = "force-dynamic";
// Vercel Hobby 플랜의 함수 실행 시간 상한(60초)에 맞춘다. 이보다 크게 잡으면 Hobby에서
// 배포가 거부되거나 더 낮은 값으로 캡된다. 전체 동기화는 한 번에 안 끝나는 게 정상이고,
// 스케줄러(/api/cron/place)가 남은 작업을 스스로 이어서 호출(체이닝)해 마저 처리한다.
export const maxDuration = 60;

// tb_place / tb_place_detail / tb_place_barrierfree / tb_place_bakery 수동 동기화 엔드포인트.
// 실제 동기화 로직은 src/lib/place/syncEngine.ts 에 있다(route.ts 는 HTTP 핸들러/설정 외의
// 값을 export 하면 안 되는 Next.js 규칙 때문에 엔진을 별도 모듈로 분리했다).
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const config = getSyncConfig();
  if (!config.ok) {
    return NextResponse.json({ error: config.error }, { status: 500 });
  }

  const target = new URL(request.url).searchParams.get("target") ?? "all";

  const supabase = createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false }
  });
  const deadline = Date.now() + TIME_BUDGET_MS;

  // 단일 테이블 동기화 — 기존 응답 형태(flat SyncResult)를 그대로 유지
  if (isSyncTarget(target)) {
    const outcome = await SYNC_FNS[target](supabase, deadline);
    return outcome.ok
      ? NextResponse.json(outcome.result)
      : NextResponse.json(
          { error: outcome.error, partial: outcome.partial },
          { status: outcome.status }
        );
  }

  // 전체 동기화 — place 선행 후 detail/barrierfree 병렬 실행, 테이블별 결과를 묶어서 반환.
  // 60초 예산 안에 다 못 끝나면 각 결과의 notDone 이 true 로 남고, 관리자가 다시 누르면 이어서
  // 처리된다(스케줄러는 자동으로 체이닝하지만, 이 수동 엔드포인트는 그렇게 안 하므로).
  if (target === "all") {
    return NextResponse.json(await runFullSync(supabase, deadline));
  }

  return NextResponse.json(
    {
      error: `알 수 없는 target: ${target} (place | detail | barrierfree | bakery | normalize | all)`
    },
    { status: 400 }
  );
}
