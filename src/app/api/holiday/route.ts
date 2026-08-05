import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { spcdeInfoApi } from "@/utils/api/external";

export const dynamic = "force-dynamic";

// 한국천문연구원 특일 정보 → tb_holiday 동기화 엔드포인트.
// 공휴일 정보조회(getRestDeInfo)를 올해 연도로 조회해 tb_holiday 에 넣는다.
// (국경일 정보조회 getHoliDeInfo 는 공휴일 조회와 완전히 동일한 목록을 반환하는 것을
//  확인했으므로 사용하지 않는다 — 함께 넣으면 모든 날짜가 2번씩 들어간다.)
//
// upsert 가 아니라 "올해 데이터 전체 삭제 후 다시 insert" 방식이다.
// 특일은 연간 수십 건이라 비용이 없고, 대체공휴일 변경 등도 깔끔하게 반영된다.

const NUM_OF_ROWS = "100"; // 연간 특일은 수십 건이라 한 페이지로 충분

type SpcdeResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: "" | { item?: unknown }; totalCount?: number };
  };
};

// 응답에서 item 배열 추출 (1건이면 객체, 0건이면 "" 로 온다)
function extractItems(res: SpcdeResponse): Record<string, unknown>[] {
  const items = res?.response?.body?.items;
  if (!items || typeof items === "string") return [];
  const item = items.item;
  if (!item) return [];
  const arr = Array.isArray(item) ? item : [item];
  return arr.filter((v): v is Record<string, unknown> => v != null && typeof v === "object");
}

export async function POST() {
  const serviceKey = process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: ".env에 PUBLIC_DATA_OPEN_API_SERVICE_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  if (!supabaseUrl || !secretKey) {
    return NextResponse.json(
      { error: ".env에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const year = String(new Date().getFullYear()); // 올해

  // 1) 올해 공휴일 조회
  let items: Record<string, unknown>[];
  try {
    const res = await spcdeInfoApi.restDeInfo<SpcdeResponse>({
      solYear: year,
      numOfRows: NUM_OF_ROWS
    });
    items = extractItems(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[api/holiday] 특일 정보 조회 실패 (year=${year}): ${message}`);
    return NextResponse.json({ error: `특일 정보 조회 실패: ${message}` }, { status: 502 });
  }

  const rows = items
    .filter((i) => i.locdate != null && String(i.locdate) !== "")
    .map((i) => ({
      datename: i.dateName == null ? null : String(i.dateName),
      locdate: String(i.locdate), // varchar 컬럼 — "20260101" 형태 그대로
      seq: i.seq == null ? 1 : Number(i.seq),
      datekind: i.dateKind == null ? null : String(i.dateKind),
      isholiday: i.isHoliday == null ? null : String(i.isHoliday)
    }));

  const supabase = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

  // 2) 올해 데이터 전체 삭제 (locdate 가 "YYYY..." 로 시작하는 행)
  const { data: deletedRows, error: delErr } = await supabase
    .from("tb_holiday")
    .delete()
    .like("locdate", `${year}%`)
    .select("holiday_id");
  if (delErr) {
    return NextResponse.json({ error: `삭제 실패: ${delErr.message}` }, { status: 502 });
  }

  // 3) 올해 데이터 insert (registtime 은 DB default now())
  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("tb_holiday").insert(rows);
    if (insErr) {
      return NextResponse.json(
        { error: `insert 실패: ${insErr.message}`, partial: { deleted: deletedRows?.length ?? 0 } },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    year,
    fetched: items.length,
    deleted: deletedRows?.length ?? 0,
    inserted: rows.length
  });
}
