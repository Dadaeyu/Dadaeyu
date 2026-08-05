import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { brfrTourInfoApi, korTourInfoApi, bakeryInfoApi } from "@/utils/api/external";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// tb_place / tb_place_detail / tb_place_barrierfree / tb_place_bakery 동기화 엔드포인트 + 엔진.
// 아래 sync 함수들이 실제 동기화 로직이고, POST 핸들러가 target 파라미터로 이를 호출한다.
// 스케줄러(/api/cron/place)는 이 파일에서 runFullSync / getSyncConfig 를 import 해서 쓴다.

// ── 공통 상수 ───────────────────────────────────────────────
const UPSERT_CHUNK = 100;
const MAX_RETRIES = 2; // 일시적 throttling/타임아웃 대비 재시도 횟수
const RETRY_BASE_DELAY = 400; // ms (재시도마다 점증)

const DAEJEON_REGN_CD = "30"; // 대전 지역 코드 (lDongRegnCd)
const ROWS_PER_PAGE = 1000; // areaBasedList2 페이지 크기 (넉넉히 잡아 호출 수 최소화; 초과분은 자동 페이지네이션)
const BF_FETCH_CONCURRENCY = 8; // detailWithTour2 동시 호출 수
const DETAIL_FETCH_CONCURRENCY = 6; // detailCommon2/detailIntro2 동시 호출 수
const DONG_FETCH_CONCURRENCY = 8; // coord2regioncode 동시 호출 수

const COORD2REGIONCODE_URL = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json";

// ── 테이블별 컬럼 매핑 ──────────────────────────────────────
// areaBasedList2 응답에서 tb_place 로 매핑할 컬럼 (하드코딩 — DB 컬럼 조회 안 함)
const PLACE_FIELD = [
  "contentid",
  "title",
  "addr1",
  "addr2",
  "lDongRegnCd", // → ldongregncd (법정동 시도 코드)
  "lDongSignguCd", // → ldongsigngucd (법정동 시군구 코드)
  "mapx",
  "mapy",
  "contenttypeid",
  "lclsSystm1",
  "lclsSystm2",
  "lclsSystm3",
  "firstimage",
  "createdtime",
  "modifiedtime"
] as const;

// tb_place_barrierfree 의 무장애 항목 컬럼 (PK contentid / 타임스탬프 제외)
const BF_FIELDS = [
  "parking",
  "publictransport",
  "route",
  "wheelchair",
  "exit",
  "elevator",
  "restroom",
  "handicapetc",
  "braileblock",
  "helpdog",
  "guidehuman",
  "audioguide",
  "bigprint",
  "brailepromotion",
  "guidesystem",
  "blindhandicapetc",
  "signguide",
  "videoguide",
  "hearingroom",
  "hearinghandicapetc",
  "stroller",
  "lactationroom",
  "babysparechair",
  "infantsfamilyetc"
] as const;

// 무장애 요약 플래그: 아래 원본 컬럼 중 하나라도 값이 있으면 해당 플래그를 true 로 설정한다.
// (장애 유형별 편의 제공 여부를 한눈에 보기 위한 파생 컬럼)
const BF_FLAG_SOURCES = {
  has_blind: [
    "braileblock",
    "helpdog",
    "guidehuman",
    "audioguide",
    "bigprint",
    "brailepromotion",
    "guidesystem",
    "blindhandicapetc"
  ],
  has_deaf: ["signguide", "videoguide", "hearingroom", "hearinghandicapetc"],
  has_gait: ["parking", "route", "wheelchair", "exit", "elevator", "restroom", "handicapetc"],
  has_infant: ["stroller", "lactationroom", "babysparechair", "infantsfamilyetc"]
} as const;

// row 의 BF_FIELDS 값(문자열)들을 보고 요약 플래그를 계산한다. 값이 하나라도 비어있지 않으면 true.
function computeBfFlags(row: Record<string, unknown>): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const [flag, sources] of Object.entries(BF_FLAG_SOURCES)) {
    flags[flag] = sources.some((field) => {
      const value = row[field];
      return typeof value === "string" ? value.trim() !== "" : value != null;
    });
  }
  return flags;
}

// detailCommon2(공통정보)에서 가져오는 컬럼 (contentid 제외)
const COMMON_FIELDS = [
  "contenttypeid",
  "homepage",
  "tel",
  "overview",
  "createdtime",
  "modifiedtime"
] as const;

// detailIntro2(소개정보)에서 채우는 컬럼 — contenttypeid 별로 응답 필드가 다르다.
const INTRO_FIELDS = [
  "accomcount",
  "chkbabycarriage",
  "expagerange",
  "infocenter",
  "opendate",
  "parking",
  "restdate",
  "useseason",
  "usetime",
  "accomcountculture",
  "chkbabycarriageculture",
  "discountinfo",
  "infocenterculture",
  "parkingculture",
  "parkingfee",
  "restdateculture",
  "usefee",
  "usetimeculture",
  "scale",
  "spendtime",
  "agelimit",
  "discountinfofestival",
  "eventenddate",
  "eventhomepage",
  "eventplace",
  "eventstartdate",
  "placeinfo",
  "playtime",
  "program",
  "spendtimefestival",
  "usetimefestival",
  "distance",
  "infocentertourcourse",
  "schedule",
  "taketime",
  "theme",
  "accomcountleports",
  "chkbabycarriageleports",
  "expagerangeleports",
  "infocenterleports",
  "openperiod",
  "parkingfeeleports",
  "parkingleports",
  "restdateleports",
  "scaleleports",
  "usefeeleports",
  "usetimeleports",
  "accomcountlodging",
  "checkintime",
  "checkouttime",
  "infocenterlodging",
  "parkinglodging",
  "pickup",
  "roomcount",
  "reservationlodging",
  "reservationurl",
  "roomtype",
  "scalelodging",
  "chkbabycarriageshopping",
  "infocentershopping",
  "opendateshopping",
  "opentime",
  "parkingshopping",
  "restdateshopping",
  "restroom",
  "saleitem",
  "saleitemcost",
  "scaleshopping",
  "shopguide",
  "discountinfofood",
  "firstmenu",
  "infocenterfood",
  "opendatefood",
  "opentimefood",
  "parkingfood",
  "restdatefood",
  "scalefood",
  "seat",
  "treatmenu"
] as const;

// ── 공통 헬퍼 ───────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 외부 API 호출을 짧은 backoff 로 재시도한다.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES) await sleep(RETRY_BASE_DELAY * (attempt + 1));
    }
  }
  throw lastError;
}

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

// insert/update 분류용 키 정규화. DB 컬럼이 int8(숫자) 이든 varchar(문자열) 이든
// 항상 문자열로 맞춰 비교한다. (숫자 4079529 와 문자열 "4079529" 를 같게 취급)
const key = (v: unknown): string => String(v);

type TourResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: "" | { item?: unknown }; totalCount?: number };
  };
};

// 목록 응답에서 item 배열 추출 (1개면 객체, 0개면 "" 로 옴)
function extractItems(res: TourResponse): Record<string, unknown>[] {
  const items = res?.response?.body?.items;
  if (!items || typeof items === "string") return [];
  const item = items.item;
  if (!item) return [];
  const arr = Array.isArray(item) ? item : [item];
  return arr.filter((v): v is Record<string, unknown> => v != null && typeof v === "object");
}

// 상세 응답에서 첫 번째 item 추출 (없으면 null)
function pickItem(res: TourResponse): Record<string, unknown> | null {
  return extractItems(res)[0] ?? null;
}

// 카카오 좌표→행정구역 응답 중 필요한 필드만
type KakaoRegionDoc = { region_type: "H" | "B"; region_3depth_name: string };

// 좌표→법정동(region_type=B)의 동 이름 조회. mapx=경도(x), mapy=위도(y). 실패/미발견 시 null.
async function fetchDong(kakaoKey: string, x: string, y: string): Promise<string | null> {
  const res = await fetch(`${COORD2REGIONCODE_URL}?${new URLSearchParams({ x, y })}`, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
    cache: "no-store"
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { documents?: KakaoRegionDoc[] };
  return data.documents?.find((d) => d.region_type === "B")?.region_3depth_name || null;
}

// ── 동기화 결과 타입 ────────────────────────────────────────
type SyncResult = {
  totalPlaces: number;
  fetched: number;
  upserted: number;
  deleted: number;
  skipped: number;
  errorCount: number;
  errors: unknown[];
  // place 동기화에 딸려 실행되는 dong 백필 결과 (place 일 때만 채워짐)
  dongFilled?: number;
  dongSkipped?: number;
  dongErrorCount?: number;
};

type SyncOutcome =
  | { ok: true; result: SyncResult }
  | { ok: false; status: number; error: string; partial?: Record<string, unknown> };

// 테이블에 이미 존재하는 모든 키 값 집합 (삭제된 행 포함) — insert/update 분류용.
// keyColumn 기본은 contentid, detail 처럼 PK(place_id) 기준으로 분류할 때 지정한다.
async function fetchKnownIds(
  supabase: SupabaseClient,
  table: string,
  keyColumn = "contentid"
): Promise<Set<string> | { error: string }> {
  const { data, error } = await supabase.from(table).select(keyColumn);
  if (error) return { error: `${table} 기존 ${keyColumn} 조회 실패: ${error.message}` };
  return new Set(
    (data ?? [])
      .map((r) => (r as unknown as Record<string, unknown>)[keyColumn])
      .filter((v) => v != null)
      .map((v) => key(v))
  );
}

// 신규(knownIds 에 없는 키)는 insert, 기존은 update 한다.
//  - insert: updatetime 을 넣지 않는다(생성 시각은 registtime default now() 가 담당).
//  - update: updatetime 을 now 로 갱신한다.
// updateExtra: update 행에만 병합할 추가 필드(테이블별 특수 처리용).
//   tb_place 는 { delete_yn: "N", deletetime: null } 을 넘겨, 방금 API 에서 다시 조회된 행이면
//   소프트삭제 상태를 해제(부활)한다. (관리자 노출 플래그 use_yn 은 건드리지 않는다.)
//   detail/barrierfree 는 delete_yn 컬럼이 없으므로 넘기지 않는다.
// conflictKey: 분류·upsert 충돌 기준 컬럼(기본 contentid, detail 은 PK place_id).
async function insertOrUpdate(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  knownIds: Set<string>,
  now: string,
  conflictKey = "contentid",
  updateExtra: Record<string, unknown> = {}
): Promise<{ upserted: number; error?: string }> {
  // 페이지 경계에서 같은 키가 중복 수집될 수 있어(areaBasedList2 페이지네이션),
  // 키(conflictKey) 기준으로 중복을 먼저 제거한다 — 같은 키는 마지막 것만 남긴다.
  // 이렇게 하지 않으면 한 insert 배치에 같은 키가 2건 들어가 유니크 제약을 위반한다.
  const uniqueRows = Array.from(new Map(rows.map((r) => [key(r[conflictKey]), r])).values());

  const toInsert = uniqueRows.filter((r) => !knownIds.has(key(r[conflictKey])));
  const toUpdate = uniqueRows
    .filter((r) => knownIds.has(key(r[conflictKey])))
    .map((r) => ({ ...r, updatetime: now, ...updateExtra }));

  let upserted = 0;
  for (let i = 0; i < toInsert.length; i += UPSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) return { upserted, error: `insert 실패: ${error.message}` };
    upserted += chunk.length;
  }
  for (let i = 0; i < toUpdate.length; i += UPSERT_CHUNK) {
    const chunk = toUpdate.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflictKey });
    if (error) return { upserted, error: `upsert 실패: ${error.message}` };
    upserted += chunk.length;
  }
  return { upserted };
}

type DongFillResult = { filled: number; skipped: number; errorCount: number };

// dong 이 비어있고 좌표가 있는 활성 행을 카카오 좌표→행정구역 API 로 채운다. syncPlace 내부에서만 호출.
// 건별 실패는 skipped/errorCount 로만 집계하고 계속 진행한다.
// dong 은 카카오發 파생값이라, 채울 때 updatetime 은 건드리지 않는다(TourAPI 콘텐츠 갱신과 구분).
async function fillMissingDong(
  supabase: SupabaseClient,
  kakaoKey: string
): Promise<DongFillResult> {
  const { data, error } = await supabase
    .from("tb_place")
    .select("place_id, mapx, mapy")
    .or("delete_yn.is.null,delete_yn.eq.N")
    .is("dong", null)
    .not("mapx", "is", null)
    .not("mapy", "is", null);
  if (error) {
    console.error(`[fillMissingDong] tb_place 조회 실패: ${error.message}`);
    return { filled: 0, skipped: 0, errorCount: 1 };
  }
  const targets = (data ?? []) as { place_id: number; mapx: string; mapy: string }[];

  let filled = 0;
  let skipped = 0;
  let errorCount = 0;

  for (let i = 0; i < targets.length; i += DONG_FETCH_CONCURRENCY) {
    const batch = targets.slice(i, i + DONG_FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ place_id, mapx, mapy }) => {
        if (!mapx || !mapy) {
          skipped += 1; // 좌표가 빈 문자열인 행 방어 (헛 API 콜 방지)
          return;
        }
        try {
          const dong = await withRetry(() => fetchDong(kakaoKey, str(mapx), str(mapy)));
          if (!dong) {
            skipped += 1; // 법정동을 못 찾은 좌표는 건너뜀
            return;
          }
          const { error: upErr } = await supabase
            .from("tb_place")
            .update({ dong }) // updatetime 미포함 (의도)
            .eq("place_id", place_id);
          if (upErr) {
            errorCount += 1;
            console.error(
              `[fillMissingDong] dong 업데이트 실패 (place_id=${place_id}): ${upErr.message}`
            );
            return;
          }
          filled += 1;
        } catch (e) {
          errorCount += 1;
          const message = e instanceof Error ? e.message : String(e);
          console.error(
            `[fillMissingDong] coord2regioncode 실패 (place_id=${place_id}): ${message}`
          );
        }
      })
    );
  }
  return { filled, skipped, errorCount };
}

// ── 1. tb_place 동기화 (areaBasedList2 → tb_place) ──────────
async function syncPlace(supabase: SupabaseClient): Promise<SyncOutcome> {
  // tb_place 매핑 컬럼은 하드코딩된 PLACE_FIELD 사용 (DB 컬럼 조회 안 함).
  // PLACE_FIELD 는 contentid / updatetime 을 포함하지 않으므로 그대로 매핑 컬럼으로 쓴다.
  const mapFields = [...PLACE_FIELD];

  // 기존 contentid 목록 (삭제된 행 포함) — 두 용도로 쓴다.
  //  - knownIds: 이미 존재하는 contentid (insert / update 분류용)
  //  - existingIds: 활성 행만 (API 결과에 없는 행을 삭제 처리하기 위함)
  const { data: existingRows, error: existingErr } = await supabase
    .from("tb_place")
    .select("contentid, delete_yn, mapx, mapy");
  if (existingErr) {
    return {
      ok: false,
      status: 502,
      error: `tb_place 기존 목록 조회 실패: ${existingErr.message}`
    };
  }
  const existingRowList = (existingRows ?? []) as {
    contentid: string | number | null;
    delete_yn: string | null;
    mapx: string | number | null;
    mapy: string | number | null;
  }[];
  const knownIds = new Set<string>(
    existingRowList
      .map((r) => r.contentid)
      .filter((v): v is string | number => v != null)
      .map((v) => key(v))
  );
  // 삭제 처리(.in) 는 DB 컬럼 원본 타입 그대로 넘겨야 하므로 값은 변환하지 않는다.
  const existingIds = existingRowList
    .filter((r) => r.delete_yn == null || r.delete_yn === "N")
    .map((r) => r.contentid)
    .filter((v): v is string | number => v != null);
  // 좌표 변경 감지용: contentid → "mapx|mapy" (좌표가 바뀐 행은 아래에서 dong 을 리셋한다)
  const oldCoords = new Map<string, string>(
    existingRowList
      .filter((r) => r.contentid != null)
      .map((r) => [key(r.contentid), `${str(r.mapx)}|${str(r.mapy)}`])
  );

  // areaBasedList2 (대전, lDongRegnCd=30) 전체 페이지 조회
  const errors: { page: number; message: string }[] = [];
  const rows: Record<string, unknown>[] = [];
  const now = new Date().toISOString();
  let totalCount = Infinity;
  let pageNo = 1;
  let fetched = 0;
  let skipped = 0;

  while ((pageNo - 1) * ROWS_PER_PAGE < totalCount) {
    try {
      const res = await withRetry(() =>
        korTourInfoApi.areaBasedList<TourResponse>({
          MobileOS: "WEB",
          lDongRegnCd: DAEJEON_REGN_CD,
          numOfRows: String(ROWS_PER_PAGE),
          pageNo: String(pageNo),
          arrange: "C"
        })
      );
      totalCount = Number(res?.response?.body?.totalCount ?? 0);
      const items = extractItems(res);
      if (items.length === 0) break;

      for (const item of items) {
        const contentid = item.contentid;
        if (contentid == null || contentid === "") {
          skipped += 1;
          continue;
        }
        fetched += 1;
        const row: Record<string, unknown> = { contentid: str(contentid) };
        // API 응답 키는 카멜케이스(lclsSystm1 등)지만, DB 컬럼은 소문자로 접혀 저장됨.
        // 읽기는 원본 키로, 쓰기는 소문자 키로 매핑한다.
        for (const f of mapFields) if (f in item) row[f.toLowerCase()] = str(item[f]);
        // 기존 행인데 좌표(mapx/mapy)가 바뀌었으면 dong 을 null 로 리셋 → 아래 백필이 다시 채운다.
        const idKey = key(row.contentid);
        if (oldCoords.has(idKey) && oldCoords.get(idKey) !== `${str(row.mapx)}|${str(row.mapy)}`) {
          row.dong = null;
        }
        rows.push(row);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[syncPlace] areaBasedList2 실패 (pageNo=${pageNo}): ${message}`);
      errors.push({ page: pageNo, message });
    }
    pageNo += 1;
  }

  // 신규는 insert(updatetime 미설정), 기존은 update(updatetime 갱신).
  // 이번 API 조회에 존재하는(=update 대상) 행은 delete_yn 을 N 으로 되돌려 소프트삭제를 해제한다.
  // (예전에 API 에서 빠져 delete_yn=Y 였다가 다시 등장한 장소가 자동 복구된다.)
  const io = await insertOrUpdate(supabase, "tb_place", rows, knownIds, now, "contentid", {
    delete_yn: "N",
    deletetime: null
  });
  if (io.error) {
    return {
      ok: false,
      status: 502,
      error: io.error,
      partial: { totalPlaces: rows.length, fetched, upserted: io.upserted, skipped }
    };
  }
  const upserted = io.upserted;

  // API 결과에 없는 기존 행 삭제 처리 (delete_yn=Y, deletetime 갱신).
  // 페이지 오류가 있으면 목록이 불완전할 수 있어 삭제를 건너뛴다.
  let deleted = 0;
  if (errors.length === 0) {
    const confirmedIds = new Set(rows.map((r) => key(r.contentid)));
    const toDelete = existingIds.filter((id) => !confirmedIds.has(key(id)));
    for (let i = 0; i < toDelete.length; i += UPSERT_CHUNK) {
      const chunk = toDelete.slice(i, i + UPSERT_CHUNK);
      const { error: delErr } = await supabase
        .from("tb_place")
        .update({ delete_yn: "Y", deletetime: now })
        .in("contentid", chunk);
      if (delErr) {
        return {
          ok: false,
          status: 502,
          error: `삭제 처리 실패: ${delErr.message}`,
          partial: { totalPlaces: rows.length, fetched, upserted, deleted, skipped }
        };
      }
      deleted += chunk.length;
    }
  }

  // tb_place 갱신 후, dong 이 비어있는(신규 + 좌표변경으로 리셋된) 행을 카카오 API 로 채운다.
  // 키가 없거나 실패해도 place 동기화 자체는 완료로 취급하고 결과에만 반영한다.
  let dongFilled: number | undefined;
  let dongSkipped: number | undefined;
  let dongErrorCount: number | undefined;
  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  if (kakaoKey) {
    const dong = await fillMissingDong(supabase, kakaoKey);
    dongFilled = dong.filled;
    dongSkipped = dong.skipped;
    dongErrorCount = dong.errorCount;
    console.log(
      `[syncPlace] dong 백필: filled=${dong.filled} skipped=${dong.skipped} errors=${dong.errorCount}`
    );
  } else {
    console.error("[syncPlace] KAKAO_REST_API_KEY 미설정으로 dong 백필 건너뜀");
  }

  return {
    ok: true,
    result: {
      totalPlaces: Number.isFinite(totalCount) ? totalCount : fetched,
      fetched,
      upserted,
      deleted,
      skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 20),
      ...(dongFilled !== undefined ? { dongFilled, dongSkipped, dongErrorCount } : {})
    }
  };
}

// 활성 tb_place contentid 목록 조회 (소프트 삭제 제외). 컬럼 지정 가능.
// onlyWithContentid=true 면 contentid 가 null 인 행은 DB 단계에서 제외한다.
async function fetchActivePlaces<T>(
  supabase: SupabaseClient,
  columns: string,
  onlyWithContentid = false
): Promise<{ data: T[] } | { error: string }> {
  let query = supabase.from("tb_place").select(columns).or("delete_yn.is.null,delete_yn.eq.N");
  if (onlyWithContentid) query = query.not("contentid", "is", null);
  const { data, error } = await query;
  if (error) return { error: `tb_place 조회 실패: ${error.message}` };
  return { data: (data ?? []) as T[] };
}

// ── 2. tb_place_detail 동기화 (detailCommon2 + detailIntro2) ─
async function syncDetail(supabase: SupabaseClient): Promise<SyncOutcome> {
  // place_id 는 tb_place 에서 가져와 그대로 tb_place_detail 에 넣는다(detail 의 PK).
  const places = await fetchActivePlaces<{
    place_id: number | null;
    contentid: number | null;
    contenttypeid: string | null;
  }>(supabase, "place_id, contentid, contenttypeid", true);
  if ("error" in places) return { ok: false, status: 502, error: places.error };
  const targets = places.data.filter(
    (p): p is { place_id: number; contentid: number; contenttypeid: string | null } =>
      p.contentid != null && p.place_id != null
  );

  let fetched = 0;
  let skipped = 0;
  const errors: { contentid: number; message: string }[] = [];
  const rows: Record<string, unknown>[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < targets.length; i += DETAIL_FETCH_CONCURRENCY) {
    const batch = targets.slice(i, i + DETAIL_FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ place_id, contentid, contenttypeid }) => {
        try {
          const commonRes = await withRetry(() =>
            korTourInfoApi.detailCommon<TourResponse>({
              MobileOS: "WEB",
              contentId: String(contentid)
            })
          );
          const common = pickItem(commonRes);
          if (!common) {
            skipped += 1; // 공통정보가 없으면 건너뜀
            return;
          }

          let intro: Record<string, unknown> | null = null;
          if (contenttypeid) {
            const introRes = await withRetry(() =>
              korTourInfoApi.detailIntro<TourResponse>({
                MobileOS: "WEB",
                contentId: String(contentid),
                contentTypeId: String(contenttypeid)
              })
            );
            intro = pickItem(introRes);
          }

          fetched += 1;
          const row: Record<string, unknown> = { place_id, contentid };
          for (const f of COMMON_FIELDS) row[f] = str(common[f]);
          for (const f of INTRO_FIELDS) row[f] = str(intro?.[f]);
          rows.push(row);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error(
            `[syncDetail] detailCommon2/detailIntro2 실패 (contentid=${contentid}): ${message}`
          );
          errors.push({ contentid, message });
        }
      })
    );
  }

  // detail 은 PK(place_id) 기준으로 분류·upsert 한다(contentid 에 unique 제약이 없음).
  const known = await fetchKnownIds(supabase, "tb_place_detail", "place_id");
  if ("error" in known) {
    return {
      ok: false,
      status: 502,
      error: known.error,
      partial: { totalPlaces: targets.length, fetched, upserted: 0, skipped }
    };
  }
  const io = await insertOrUpdate(supabase, "tb_place_detail", rows, known, now, "place_id");
  if (io.error) {
    return {
      ok: false,
      status: 502,
      error: io.error,
      partial: { totalPlaces: targets.length, fetched, upserted: io.upserted, skipped }
    };
  }
  const upserted = io.upserted;

  // API 가 더는 확인해 주지 않는 행은 삭제하지 않고 그대로 둔다. 삭제 상태는 부모
  // tb_place 의 delete_yn 으로만 관리하며(화면은 delete_yn='N' 만 노출), 부모가 걸러지면
  // 남은 자식 행은 조회에 노출되지 않아 무해하다.
  return {
    ok: true,
    result: {
      totalPlaces: targets.length,
      fetched,
      upserted,
      deleted: 0,
      skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 20)
    }
  };
}

// ── 2-1. tb_place_detail → tb_place_detail_normalized 정규화 이관 ─
// tb_place_detail 과 이름이 같은 컬럼 데이터를 그대로 tb_place_detail_normalized 로 복사한다.
// (정규화 테이블에만 새로 생긴 accommin/accommax/agerange/agemin/agemax 는 아직 채우지 않는다.)
const NORMALIZED_COPY_COLUMNS = [
  "place_id",
  "contentid",
  "contenttypeid",
  "homepage",
  "tel",
  "overview",
  "accomcount",
  "scale",
  "openperiod",
  "opendate",
  "useseason",
  "usetime",
  "eventstartdate",
  "eventenddate",
  "checkintime",
  "checkouttime",
  "spendtime",
  "restdate",
  "schedule",
  "infocenter",
  "usefee",
  "discountinfo",
  "parking",
  "parkingfee",
  "chkbabycarriage",
  "eventhomepage",
  "eventplace",
  "placeinfo",
  "program",
  "distance",
  "theme",
  "pickup",
  "roomcount",
  "reservationlodging",
  "reservationurl",
  "roomtype",
  "restroom",
  "saleitem",
  "saleitemcost",
  "shopguide",
  "firstmenu",
  "seat",
  "treatmenu",
  "createdtime",
  "modifiedtime"
] as const;

// 수용인원 원본 컬럼(우선순위 순) — 한 행에 하나만 채워져 있으므로 첫 non-empty 를 accomcount 로 모은다.
const ACCOM_SOURCE_COLUMNS = [
  "accomcount",
  "accomcountculture",
  "accomcountleports",
  "accomcountlodging"
] as const;

// 연령 원본 컬럼(우선순위 순) — 첫 non-empty 를 agerange 로 모은다.
const AGERANGE_SOURCE_COLUMNS = ["expagerange", "expagerangeleports", "agelimit"] as const;

// 유모차 대여 원본 컬럼(우선순위 순) — 병합 후 boolean 으로 변환한다.
const CHKBABY_SOURCE_COLUMNS = [
  "chkbabycarriage",
  "chkbabycarriageculture",
  "chkbabycarriageleports",
  "chkbabycarriageshopping"
] as const;

// 텍스트 원본만 통합하는 패밀리 (정규 컬럼 ← 변형 컬럼들). 한 행에 하나만 채워지므로
// 첫 non-empty 를 정규 컬럼에 그대로 모으고, 변형 컬럼은 upsert 전에 제거한다.
const MERGE_FAMILIES: Record<string, readonly string[]> = {
  scale: ["scalelodging", "scaleleports", "scaleshopping", "scalefood"],
  opendate: ["opendateshopping", "opendatefood"],
  usetime: ["usetimeculture", "usetimeleports", "opentime", "opentimefood", "playtime"],
  spendtime: ["spendtimefestival", "taketime"],
  restdate: ["restdateculture", "restdateleports", "restdateshopping", "restdatefood"],
  infocenter: [
    "infocenterculture",
    "infocentertourcourse",
    "infocenterleports",
    "infocenterlodging",
    "infocentershopping",
    "infocenterfood"
  ],
  usefee: ["usefeeleports", "usetimefestival"], // usetimefestival 은 실제로 요금 데이터라 usefee 로 병합
  discountinfo: ["discountinfofestival", "discountinfofood"],
  parking: ["parkingculture", "parkingleports", "parkinglodging", "parkingshopping", "parkingfood"],
  parkingfee: ["parkingfeeleports"]
};
const MERGE_VARIANT_COLUMNS = Object.values(MERGE_FAMILIES).flat();

// 수용인원 텍스트에서 최소/최대 인원을 추출한다. (규칙)
//  1) "숫자" 또는 "숫자+명" 으로만 된 값 → max 에만 넣는다.
//  2) 하한(min): "최소 N" / "N 이상"→N / "N 초과"→N+1 (초과는 경계 미포함이라 +1)
//  3) 상한(max): "최대 N" / "N 이하"→N / "N 미만"→N-1 (미만은 경계 미포함이라 -1)
//  4) "A~B" (~ 포함) → min=A, max=B
//  위 규칙에 해당 안 되는 값(예: 시설별 나열)은 {null, null}.
function parseAccomRange(text: string): { min: number | null; max: number | null } {
  const t = (text ?? "").trim();
  const toInt = (s: string) => parseInt(s.replace(/,/g, ""), 10);
  let min: number | null = null;
  let max: number | null = null;

  // 4) 범위 "A~B" (A 뒤 인/명 유무, B 앞 '최대' 등 텍스트 허용)
  if (t.includes("~")) {
    const m = t.match(/(\d[\d,]*)\s*여?\s*[인명]?\s*~\s*[^\d]*(\d[\d,]*)/);
    if (m) {
      min = toInt(m[1]);
      max = toInt(m[2]);
    }
  }
  // 2) 하한(min): "최소 N"(키워드 앞) 또는 "N 이상/초과"(키워드 뒤, 초과는 +1)
  const mMinBefore = t.match(/최소\s*(\d[\d,]*)/);
  if (mMinBefore) {
    min = toInt(mMinBefore[1]);
  } else {
    const m = t.match(/(\d[\d,]*)\s*여?\s*[인명]?\s*(이상|초과)/);
    if (m) min = toInt(m[1]) + (m[2] === "초과" ? 1 : 0);
  }
  // 3) 상한(max): "최대 N"(키워드 앞) 또는 "N 이하/미만"(키워드 뒤, 미만은 -1)
  const mMaxBefore = t.match(/최대\s*(\d[\d,]*)/);
  if (mMaxBefore) {
    max = toInt(mMaxBefore[1]);
  } else {
    const m = t.match(/(\d[\d,]*)\s*여?\s*[인명]?\s*(이하|미만)/);
    if (m) max = toInt(m[1]) - (m[2] === "미만" ? 1 : 0);
  }
  // 1) "숫자" 또는 "숫자+명" 으로만 된 경우 → max
  if (min == null && max == null && /^\d[\d,]*\s*여?\s*명?$/.test(t)) {
    max = toInt(t);
  }

  return { min, max };
}

// 연령(agerange) 텍스트에서 최소/최대 나이(세)를 추출한다. parseAccomRange 와 같은 방식.
//  - 하한(min): "최소 N" / "N세 이상"→N / "N세 초과"→N+1
//  - 상한(max): "최대 N" / "N세 이하"→N / "N세 미만"→N-1
//  - "A세~B세" (~ 포함) → min=A, max=B
//  - "전 연령" 등 숫자/키워드 없으면 {null, null}. ('만'은 무시하고 세 앞 숫자만 사용)
function parseAgeRange(text: string): { min: number | null; max: number | null } {
  const t = (text ?? "").trim();
  const toInt = (s: string) => parseInt(s.replace(/,/g, ""), 10);
  let min: number | null = null;
  let max: number | null = null;

  // 범위 "A세~B세"
  if (t.includes("~")) {
    const m = t.match(/(\d[\d,]*)\s*세?\s*~\s*[^\d]*(\d[\d,]*)/);
    if (m) {
      min = toInt(m[1]);
      max = toInt(m[2]);
    }
  }
  // 하한(min): "최소 N" 또는 "N세 이상/초과"(초과는 +1)
  const mMinBefore = t.match(/최소\s*(\d[\d,]*)/);
  if (mMinBefore) {
    min = toInt(mMinBefore[1]);
  } else {
    const m = t.match(/(\d[\d,]*)\s*세?\s*(이상|초과)/);
    if (m) min = toInt(m[1]) + (m[2] === "초과" ? 1 : 0);
  }
  // 상한(max): "최대 N" 또는 "N세 이하/미만"(미만은 -1)
  const mMaxBefore = t.match(/최대\s*(\d[\d,]*)/);
  if (mMaxBefore) {
    max = toInt(mMaxBefore[1]);
  } else {
    const m = t.match(/(\d[\d,]*)\s*세?\s*(이하|미만)/);
    if (m) max = toInt(m[1]) - (m[2] === "미만" ? 1 : 0);
  }

  return { min, max };
}

// 유모차 대여 텍스트를 boolean 으로 변환한다.
//  "가능"→true, "없음"/"불가(능)"→false, 그 외·빈값→null(정보 없음).
//  ("불가능"은 "가능"을 포함하므로 false 판정을 먼저 한다.)
function parseBabyCarriage(text: string): boolean | null {
  const t = (text ?? "").trim();
  if (t === "") return null;
  if (t.includes("없음") || t.includes("불가")) return false;
  if (t.includes("가능")) return true;
  return null;
}

// 휴무일(restdate) 텍스트에서 파생 컬럼 3개를 추출한다. 원본 restdate 는 그대로 유지.
//  - closed_weekdays(smallint[]): 매주 반복 휴무 요일 (ISO 1=월 … 7=일). "매주 월요일"→{1}, "주말"→{6,7}
//  - closed_holiday(boolean): 명절·설날·추석·법정공휴일 휴무 여부
//  - has_irregular_closing(boolean): 월N회/격주/N째주/점포별 상이 등 → 특정 날짜 판정 불가.
//    값이 있는데 어떤 규칙에도 안 걸리는 경우(전화문의 요망 등)도 판정 불가로 true.
//  - "연중무휴" → 요일 null + 두 boolean 모두 false (휴무 없음 확정)
//  - 빈값 → 모두 null (정보 없음)
function parseRestdate(text: string): {
  closedWeekdays: number[] | null;
  closedHoliday: boolean | null;
  hasIrregularClosing: boolean | null;
} {
  const raw = (text ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (raw === "") return { closedWeekdays: null, closedHoliday: null, hasIrregularClosing: null };

  const WEEKDAY: Record<string, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 7 };

  const holiday = /명절|설날|추석|설\s*[·,]?\s*추석|공휴일/.test(raw);
  const irregular =
    /월\s*\d\s*회|격주|격월|(첫|둘|셋|넷|다섯)\s*번?째|\d\s*(,\s*\d\s*)*주|정기\s*휴|점포\s*별|공연\s*(마다|별)|백화점\s*휴|상이/.test(
      raw
    );

  // 부정기 표현(N째 주/N주/격주)에 붙은 요일은 "매주 휴무"가 아니므로 제거한 뒤 요일을 추출한다.
  // (예: "2,4주 일요일" 의 일요일을 매주 휴무로 오인하지 않도록)
  const stripped = raw
    .replace(
      /(첫|둘|셋|넷|다섯)\s*번?째\s*(주\s*)?[월화수목금토일]요일?(\s*[~-]\s*[월화수목금토일]요일?)?/g,
      " "
    )
    .replace(/\d\s*(,\s*\d\s*)*주\s*[월화수목금토일]요일?(\s*[~-]\s*[월화수목금토일]요일?)?/g, " ")
    .replace(/격주\s*[월화수목금토일]요일?/g, " ");

  const days = new Set<number>();
  // 요일 범위 "월요일~화요일" (일→월처럼 주 경계를 넘는 범위도 순환 확장)
  for (const m of stripped.matchAll(/([월화수목금토일])요일\s*[~-]\s*([월화수목금토일])요일/g)) {
    const a = WEEKDAY[m[1]];
    const b = WEEKDAY[m[2]];
    for (let i = 0; i < 7; i += 1) {
      const d = ((a - 1 + i) % 7) + 1;
      days.add(d);
      if (d === b) break;
    }
  }
  // 단일 요일 ("매주 월요일", "일요일" 등)
  for (const m of stripped.matchAll(/([월화수목금토일])요일/g)) days.add(WEEKDAY[m[1]]);
  if (/주말/.test(stripped)) {
    days.add(6);
    days.add(7);
  }

  const allYear = /연중\s*무휴/.test(raw);
  const weekdays = [...days].sort((a, b) => a - b);
  // 값이 있는데 어느 규칙에도 안 걸리면(홈페이지 참조/전화문의 등) 판정 불가로 본다.
  const nothing = !allYear && weekdays.length === 0 && !holiday && !irregular;

  return {
    closedWeekdays: weekdays.length ? weekdays : null,
    closedHoliday: holiday,
    hasIrregularClosing: irregular || nothing
  };
}

async function syncDetailNormalized(supabase: SupabaseClient): Promise<SyncOutcome> {
  // tb_place_detail 전체를 동일 컬럼 + 병합용 변형 컬럼(수용인원·연령)까지 골라 조회 (페이지네이션)
  const cols = [
    ...NORMALIZED_COPY_COLUMNS,
    "accomcountculture",
    "accomcountleports",
    "accomcountlodging",
    ...AGERANGE_SOURCE_COLUMNS,
    "chkbabycarriageculture",
    "chkbabycarriageleports",
    "chkbabycarriageshopping",
    ...MERGE_VARIANT_COLUMNS
  ].join(", ");
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("tb_place_detail")
      .select(cols)
      .order("place_id", { ascending: true })
      .range(from, from + 999);
    if (error) {
      return { ok: false, status: 502, error: `tb_place_detail 조회 실패: ${error.message}` };
    }
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  // 수용인원: 변형 컬럼을 accomcount 에 원본 그대로 모으고, 최소/최대 인원을 accommin/accommax 로 추출.
  // (normalized 테이블엔 변형 컬럼이 없으므로 upsert 전에 제거한다.)
  for (const row of rows) {
    let merged = "";
    for (const c of ACCOM_SOURCE_COLUMNS) {
      const v = row[c];
      if (typeof v === "string" && v.trim() !== "") {
        merged = v;
        break;
      }
    }
    row.accomcount = merged;
    const { min, max } = parseAccomRange(merged);
    row.accommin = min; // integer 컬럼 — 숫자(또는 null) 그대로
    row.accommax = max;
    delete row.accomcountculture;
    delete row.accomcountleports;
    delete row.accomcountlodging;

    // 연령: expagerange/expagerangeleports/agelimit 를 agerange 에 원본 그대로 모은다.
    let ageMerged = "";
    for (const c of AGERANGE_SOURCE_COLUMNS) {
      const v = row[c];
      if (typeof v === "string" && v.trim() !== "") {
        ageMerged = v;
        break;
      }
    }
    row.agerange = ageMerged;
    const age = parseAgeRange(ageMerged);
    row.agemin = age.min; // integer 컬럼 — 숫자(또는 null) 그대로
    row.agemax = age.max;
    delete row.expagerange;
    delete row.expagerangeleports;
    delete row.agelimit;

    // 유모차: 원본 4개를 모두 병합(첫 non-empty)한 뒤 boolean 으로 변환
    let babyMerged = "";
    for (const c of CHKBABY_SOURCE_COLUMNS) {
      const v = row[c];
      if (typeof v === "string" && v.trim() !== "") {
        babyMerged = v;
        break;
      }
    }
    row.chkbabycarriage = parseBabyCarriage(babyMerged);
    delete row.chkbabycarriageculture;
    delete row.chkbabycarriageleports;
    delete row.chkbabycarriageshopping;

    // 나머지 패밀리: 변형 컬럼을 정규 컬럼에 원본 그대로 통합 (정규 컬럼 값 우선, 없으면 변형에서)
    for (const [canonical, variants] of Object.entries(MERGE_FAMILIES)) {
      const cur = row[canonical];
      if (!(typeof cur === "string" && cur.trim() !== "")) {
        for (const v of variants) {
          const val = row[v];
          if (typeof val === "string" && val.trim() !== "") {
            row[canonical] = val;
            break;
          }
        }
      }
      for (const v of variants) delete row[v];
    }

    // 휴무일: 병합된 restdate 원본은 그대로 두고, 파생 컬럼 3개를 채운다.
    const rest = parseRestdate(typeof row.restdate === "string" ? row.restdate : "");
    row.closed_weekdays = rest.closedWeekdays; // smallint[] — number[] (또는 null) 그대로
    row.closed_holiday = rest.closedHoliday;
    row.has_irregular_closing = rest.hasIrregularClosing;
  }

  // place_id(PK) 기준으로 insert/update 분류해 tb_place_detail_normalized 로 upsert
  const now = new Date().toISOString();
  const known = await fetchKnownIds(supabase, "tb_place_detail_normalized", "place_id");
  if ("error" in known) {
    return { ok: false, status: 502, error: known.error };
  }
  const io = await insertOrUpdate(
    supabase,
    "tb_place_detail_normalized",
    rows,
    known,
    now,
    "place_id"
  );
  if (io.error) {
    return {
      ok: false,
      status: 502,
      error: io.error,
      partial: { totalPlaces: rows.length, fetched: rows.length, upserted: io.upserted, skipped: 0 }
    };
  }

  return {
    ok: true,
    result: {
      totalPlaces: rows.length,
      fetched: rows.length,
      upserted: io.upserted,
      deleted: 0,
      skipped: 0,
      errorCount: 0,
      errors: []
    }
  };
}

// ── 3. tb_place_barrierfree 동기화 (detailWithTour2) ────────
async function syncBarrierfree(supabase: SupabaseClient): Promise<SyncOutcome> {
  // place_id 는 tb_place 에서 가져와 그대로 tb_place_barrierfree 에 넣는다(barrierfree 의 PK).
  const places = await fetchActivePlaces<{
    place_id: number | null;
    contentid: number | null;
  }>(supabase, "place_id, contentid", true);
  if ("error" in places) return { ok: false, status: 502, error: places.error };
  const targets = places.data.filter(
    (p): p is { place_id: number; contentid: number } => p.contentid != null && p.place_id != null
  );

  let fetched = 0;
  let skipped = 0;
  const errors: { contentid: number; message: string }[] = [];
  const rows: Record<string, unknown>[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < targets.length; i += BF_FETCH_CONCURRENCY) {
    const batch = targets.slice(i, i + BF_FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ place_id, contentid }) => {
        try {
          const res = await withRetry(() =>
            brfrTourInfoApi.detailWithTour<TourResponse>({
              MobileOS: "ETC",
              contentId: String(contentid),
              numOfRows: "1",
              pageNo: "1"
            })
          );
          const item = pickItem(res);
          if (!item) {
            skipped += 1; // 무장애 정보가 없는 콘텐츠는 건너뜀
            return;
          }
          fetched += 1;
          const row: Record<string, unknown> = { place_id, contentid };
          for (const field of BF_FIELDS) {
            const value = item[field];
            row[field] = typeof value === "string" ? value : "";
          }
          // 원본 컬럼을 채운 뒤 요약 플래그(has_blind/deaf/gait/infant) 계산
          Object.assign(row, computeBfFlags(row));
          rows.push(row);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error(
            `[syncBarrierfree] detailWithTour2 실패 (contentid=${contentid}): ${message}`
          );
          errors.push({ contentid, message });
        }
      })
    );
  }

  // barrierfree 는 PK(place_id) 기준으로 분류·upsert 한다(contentid 에 unique 제약이 없음).
  const known = await fetchKnownIds(supabase, "tb_place_barrierfree", "place_id");
  if ("error" in known) {
    return {
      ok: false,
      status: 502,
      error: known.error,
      partial: { totalPlaces: targets.length, fetched, upserted: 0, skipped }
    };
  }
  const io = await insertOrUpdate(supabase, "tb_place_barrierfree", rows, known, now, "place_id");
  if (io.error) {
    return {
      ok: false,
      status: 502,
      error: io.error,
      partial: { totalPlaces: targets.length, fetched, upserted: io.upserted, skipped }
    };
  }
  const upserted = io.upserted;

  // API 가 더는 확인해 주지 않는 행은 삭제하지 않고 그대로 둔다. 삭제 상태는 부모
  // tb_place 의 delete_yn 으로만 관리하며(화면은 delete_yn='N' 만 노출), 부모가 걸러지면
  // 남은 자식 행은 조회에 노출되지 않아 무해하다.
  return {
    ok: true,
    result: {
      totalPlaces: targets.length,
      fetched,
      upserted,
      deleted: 0,
      skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 20)
    }
  };
}

// ── 4. tb_place_bakery 동기화 (bakeries/info) ───────────────
// 행정안전부 제과점영업 조회서비스에서 대전광역시(영업 상태) 제과점을 전부 조회해
// bplc_nm(상호명) 기준으로 tb_place_bakery 와 동기화한다. tb_place 에 의존하지 않는
// 독립 테이블이라 place_id/contentid 대신 상호명을 매칭 키로 쓴다. (tb_place 와 동일 정책)
//  - API 에만 있으면 insert
//  - 양쪽에 있으면 변경 여부와 무관하게 update (+ updatetime 갱신, delete_yn='N' 복구)
//  - DB 에만 있으면 소프트삭제(delete_yn='Y', deletetime 갱신)
// 응답 컬럼은 대문자(BPLC_NM 등)로 오므로 소문자 컬럼으로 매핑하고, 테이블에 실제로
// 존재하는 컬럼만 넣는다.
const BAKERY_NUM_OF_ROWS = 100; // bakeries/info 한 페이지 조회 건수
const BAKERY_COND_SALS_STTS = "01"; // 영업 상태 코드
const BAKERY_COND_ROAD_ADDR = "대전광역시"; // 도로명주소 LIKE 필터

// API(대문자) → DB(소문자) 매핑 컬럼 (테이블에 존재하는 컬럼만)
const BAKERY_FIELD_MAP: Record<string, string> = {
  bplc_nm: "BPLC_NM",
  road_nm_addr: "ROAD_NM_ADDR",
  lotno_addr: "LOTNO_ADDR",
  dat_updt_pnt: "DAT_UPDT_PNT",
  dat_updt_se: "DAT_UPDT_SE"
};

// 일반 문자열 정규화 (null/undefined → "", 앞뒤 공백 제거)
const normStr = (v: unknown): string => (v == null ? "" : String(v)).trim();

type BakeryRow = {
  bplc_nm: string;
  road_nm_addr: string;
  lotno_addr: string;
  dat_updt_pnt: string;
  dat_updt_se: string;
};

// API item(대문자) → DB row(소문자). 매핑 컬럼만 담는다. 상호명이 없으면 null.
function toBakeryRow(item: Record<string, unknown>): BakeryRow | null {
  const bplc_nm = normStr(item[BAKERY_FIELD_MAP.bplc_nm]);
  if (!bplc_nm) return null;
  return {
    bplc_nm,
    road_nm_addr: normStr(item[BAKERY_FIELD_MAP.road_nm_addr]),
    lotno_addr: normStr(item[BAKERY_FIELD_MAP.lotno_addr]),
    dat_updt_pnt: normStr(item[BAKERY_FIELD_MAP.dat_updt_pnt]),
    dat_updt_se: normStr(item[BAKERY_FIELD_MAP.dat_updt_se])
  };
}

// 제과점은 결과 형태가 tour 계열(SyncResult)과 달라 별도 타입을 쓴다.
type BakerySyncResult = {
  totalCount: number;
  fetched: number;
  inserted: number;
  updated: number;
  deleted: number;
  errorCount: number;
  errors: unknown[];
};

type BakerySyncOutcome =
  | { ok: true; result: BakerySyncResult }
  | { ok: false; status: number; error: string; partial?: Record<string, unknown> };

async function syncBakery(supabase: SupabaseClient): Promise<BakerySyncOutcome> {
  // 1) API 전체 페이지 조회 (대전광역시 / 영업). 응답 봉투는 tour 계열과 동일해
  //    TourResponse / extractItems 를 재사용한다.
  const errors: { page: number; message: string }[] = [];
  const apiRows = new Map<string, BakeryRow>(); // bplc_nm → row (중복 상호명은 마지막 것 유지)
  let totalCount = Infinity;
  let pageNo = 1;
  let fetched = 0;

  while ((pageNo - 1) * BAKERY_NUM_OF_ROWS < totalCount) {
    try {
      const res = await withRetry(() =>
        bakeryInfoApi.info<TourResponse>({
          pageNo: String(pageNo),
          numOfRows: String(BAKERY_NUM_OF_ROWS),
          "cond[SALS_STTS_CD::EQ]": BAKERY_COND_SALS_STTS,
          "cond[ROAD_NM_ADDR::LIKE]": BAKERY_COND_ROAD_ADDR
        })
      );
      totalCount = Number(res?.response?.body?.totalCount ?? 0);
      const items = extractItems(res);
      if (items.length === 0) break;
      for (const item of items) {
        const row = toBakeryRow(item);
        if (!row) continue;
        fetched += 1;
        apiRows.set(row.bplc_nm, row);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[syncBakery] bakeries/info 실패 (pageNo=${pageNo}): ${message}`);
      errors.push({ page: pageNo, message });
    }
    pageNo += 1;
  }

  // 2) DB 기존 행 조회 (분류/삭제 판정용) — 상호명 존재 여부와 활성 상태만 필요
  const { data: existing, error: existErr } = await supabase
    .from("tb_place_bakery")
    .select("bplc_nm, delete_yn");
  if (existErr) {
    return {
      ok: false,
      status: 502,
      error: `tb_place_bakery 기존 목록 조회 실패: ${existErr.message}`
    };
  }
  // knownNames: 이미 존재하는 상호명(insert/update 분류용, 소프트삭제된 행 포함)
  // activeNames: 활성 상호명(API 에 없을 때 소프트삭제 대상 판정용)
  const knownNames = new Set<string>();
  const activeNames = new Set<string>();
  for (const r of (existing ?? []) as { bplc_nm: unknown; delete_yn: string | null }[]) {
    const name = normStr(r.bplc_nm);
    if (!name) continue;
    knownNames.add(name);
    if (r.delete_yn == null || r.delete_yn === "N") activeNames.add(name);
  }

  const now = new Date().toISOString();

  // 3) insert / update 분류 — 변경 여부는 보지 않는다(존재하면 무조건 update)
  const toInsert: BakeryRow[] = [];
  const toUpdate: BakeryRow[] = [];
  for (const [name, apiRow] of apiRows) {
    if (knownNames.has(name)) toUpdate.push(apiRow);
    else toInsert.push(apiRow);
  }

  // 4) insert (배치) — registtime/updatetime/delete_yn 은 DB default(now()/null/'N')에 맡긴다
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += UPSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase.from("tb_place_bakery").insert(chunk);
    if (error) {
      return {
        ok: false,
        status: 502,
        error: `insert 실패: ${error.message}`,
        partial: { fetched, inserted, updated: 0, deleted: 0 }
      };
    }
    inserted += chunk.length;
  }

  // 5) update (존재하는 상호명 전부, bplc_nm 기준) — updatetime 갱신 + delete_yn='N' 복구
  //    (예전에 API 에서 빠져 소프트삭제됐다가 다시 등장한 제과점이 자동 복구된다.)
  let updated = 0;
  for (const row of toUpdate) {
    const { error } = await supabase
      .from("tb_place_bakery")
      .update({
        road_nm_addr: row.road_nm_addr,
        lotno_addr: row.lotno_addr,
        dat_updt_pnt: row.dat_updt_pnt,
        dat_updt_se: row.dat_updt_se,
        updatetime: now,
        delete_yn: "N",
        deletetime: null
      })
      .eq("bplc_nm", row.bplc_nm);
    if (error) {
      return {
        ok: false,
        status: 502,
        error: `update 실패: ${error.message}`,
        partial: { fetched, inserted, updated, deleted: 0 }
      };
    }
    updated += 1;
  }

  // 6) 소프트 삭제 — API 결과에 없는 활성 DB 행 (delete_yn='Y', deletetime 갱신).
  //    페이지 오류가 있으면 목록이 불완전할 수 있어 삭제를 건너뛴다.
  let deleted = 0;
  if (errors.length === 0) {
    const toDelete = [...activeNames].filter((name) => !apiRows.has(name));
    for (let i = 0; i < toDelete.length; i += UPSERT_CHUNK) {
      const chunk = toDelete.slice(i, i + UPSERT_CHUNK);
      const { error } = await supabase
        .from("tb_place_bakery")
        .update({ delete_yn: "Y", deletetime: now })
        .in("bplc_nm", chunk);
      if (error) {
        return {
          ok: false,
          status: 502,
          error: `삭제 처리 실패: ${error.message}`,
          partial: { fetched, inserted, updated, deleted }
        };
      }
      deleted += chunk.length;
    }
  }

  return {
    ok: true,
    result: {
      totalCount: Number.isFinite(totalCount) ? totalCount : fetched,
      fetched,
      inserted,
      updated,
      deleted,
      errorCount: errors.length,
      errors: errors.slice(0, 20)
    }
  };
}

// ── 동기화 대상 디스패치 ────────────────────────────────────
const SYNC_FNS = {
  place: syncPlace,
  detail: syncDetail,
  barrierfree: syncBarrierfree,
  bakery: syncBakery,
  normalize: syncDetailNormalized
} as const;
type SyncTarget = keyof typeof SYNC_FNS;

function isSyncTarget(target: string): target is SyncTarget {
  return target in SYNC_FNS;
}

// SyncOutcome → 응답에 실을 값(성공이면 result, 실패면 error/partial)으로 평탄화.
// bakery 는 결과 형태가 달라 BakerySyncOutcome 도 함께 받는다.
function outcomeToJson(
  outcome: SyncOutcome | BakerySyncOutcome
): Record<string, unknown> | SyncResult | BakerySyncResult {
  return outcome.ok ? outcome.result : { error: outcome.error, partial: outcome.partial };
}

// ── 전체 동기화 (스케줄러/전체 동기화 공용) ─────────────────
// 의존 순서상 tb_place 를 먼저 채운 뒤(자식 테이블이 place_id/contentid 를 참조),
// 서로 독립인 detail / barrierfree 는 병렬로 실행한다.
// tb_place_bakery 는 tb_place 에 의존하지 않으므로 place 시작과 동시에 병렬로 돌린다.
export async function runFullSync(
  supabase: SupabaseClient
): Promise<
  Record<
    "place" | "detail" | "barrierfree" | "bakery" | "normalize",
    Record<string, unknown> | SyncResult | BakerySyncResult
  >
> {
  // 0) tb_place 와 무관한 bakery 동기화를 먼저 시작(await 하지 않고 병렬 진행)
  const bakeryPromise = syncBakery(supabase);

  // 1) 원본 테이블 tb_place 선행 동기화
  console.log("[sync] tb_place 동기화 시작");
  const placeOutcome = await syncPlace(supabase);
  console.log("[sync] tb_place 완료 → detail/barrierfree 병렬 시작");

  // 2) tb_place_detail / tb_place_barrierfree 병렬 동기화 (서로 독립) + bakery 수거
  const [detailOutcome, barrierfreeOutcome, bakeryOutcome] = await Promise.all([
    syncDetail(supabase),
    syncBarrierfree(supabase),
    bakeryPromise
  ]);
  console.log("[sync] detail/barrierfree/bakery 완료 → detail_normalized 정규화 시작");

  // 3) detail 완료 후 정규화 (tb_place_detail → tb_place_detail_normalized 의존이라 순차 실행)
  const normalizeOutcome = await syncDetailNormalized(supabase);
  console.log("[sync] detail_normalized 정규화 완료");

  return {
    place: outcomeToJson(placeOutcome),
    detail: outcomeToJson(detailOutcome),
    barrierfree: outcomeToJson(barrierfreeOutcome),
    bakery: outcomeToJson(bakeryOutcome),
    normalize: outcomeToJson(normalizeOutcome)
  };
}

// ── 환경변수 확인 (스케줄러와 공용) ─────────────────────────
// 동기화에 필요한 env(관광공사 서비스키 / Supabase URL·시크릿)를 검증한다.
export function getSyncConfig():
  { ok: true; supabaseUrl: string; secretKey: string } | { ok: false; error: string } {
  const serviceKey =
    process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY ?? process.env.TOUR_API_SERVICE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!serviceKey) {
    return {
      ok: false,
      error: ".env에 PUBLIC_DATA_OPEN_API_SERVICE_KEY 또는 TOUR_API_SERVICE_KEY가 필요합니다."
    };
  }
  if (!supabaseUrl || !secretKey) {
    return {
      ok: false,
      error: ".env에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY가 설정되지 않았습니다."
    };
  }
  return { ok: true, supabaseUrl, secretKey };
}

// ── 핸들러 ──────────────────────────────────────────────────
// tb_place / tb_place_detail / tb_place_barrierfree / tb_place_bakery 수동 동기화 엔드포인트.
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

  // 단일 테이블 동기화 — 기존 응답 형태(flat SyncResult)를 그대로 유지
  if (isSyncTarget(target)) {
    const outcome = await SYNC_FNS[target](supabase);
    return outcome.ok
      ? NextResponse.json(outcome.result)
      : NextResponse.json(
          { error: outcome.error, partial: outcome.partial },
          { status: outcome.status }
        );
  }

  // 전체 동기화 — place 선행 후 detail/barrierfree 병렬 실행, 테이블별 결과를 묶어서 반환
  if (target === "all") {
    return NextResponse.json(await runFullSync(supabase));
  }

  return NextResponse.json(
    {
      error: `알 수 없는 target: ${target} (place | detail | barrierfree | bakery | normalize | all)`
    },
    { status: 400 }
  );
}
