import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { brfrTourInfoApi, korTourInfoApi } from "@/utils/api/external";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// tb_place / tb_place_detail / tb_place_barrierfree 동기화 엔드포인트 + 엔진.
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

// ── 테이블별 컬럼 매핑 ──────────────────────────────────────
// areaBasedList2 응답에서 tb_place 로 매핑할 컬럼 (하드코딩 — DB 컬럼 조회 안 함)
const PLACE_FIELD = [
  "contentid",
  "title",
  "addr1",
  "addr2",
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

// ── 동기화 결과 타입 ────────────────────────────────────────
type SyncResult = {
  totalPlaces: number;
  fetched: number;
  upserted: number;
  deleted: number;
  skipped: number;
  errorCount: number;
  errors: unknown[];
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
//  - update: updatetime 을 now 로 갱신한다. (tb_place 는 delete_yn/deletetime 을 payload 에
//            넣지 않아 소프트삭제 상태가 보존된다. detail/barrierfree 에는 해당 컬럼이 없다.)
// conflictKey: 분류·upsert 충돌 기준 컬럼(기본 contentid, detail 은 PK place_id).
async function insertOrUpdate(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  knownIds: Set<string>,
  now: string,
  conflictKey = "contentid"
): Promise<{ upserted: number; error?: string }> {
  // 페이지 경계에서 같은 키가 중복 수집될 수 있어(areaBasedList2 페이지네이션),
  // 키(conflictKey) 기준으로 중복을 먼저 제거한다 — 같은 키는 마지막 것만 남긴다.
  // 이렇게 하지 않으면 한 insert 배치에 같은 키가 2건 들어가 유니크 제약을 위반한다.
  const uniqueRows = Array.from(new Map(rows.map((r) => [key(r[conflictKey]), r])).values());

  const toInsert = uniqueRows.filter((r) => !knownIds.has(key(r[conflictKey])));
  const toUpdate = uniqueRows
    .filter((r) => knownIds.has(key(r[conflictKey])))
    .map((r) => ({ ...r, updatetime: now }));

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
    .select("contentid, delete_yn");
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
        rows.push(row);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[syncPlace] areaBasedList2 실패 (pageNo=${pageNo}): ${message}`);
      errors.push({ page: pageNo, message });
    }
    pageNo += 1;
  }

  // 신규는 insert(updatetime 미설정), 기존은 update(updatetime 갱신, delete_yn/deletetime 보존).
  const io = await insertOrUpdate(supabase, "tb_place", rows, knownIds, now);
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

  return {
    ok: true,
    result: {
      totalPlaces: Number.isFinite(totalCount) ? totalCount : fetched,
      fetched,
      upserted,
      deleted,
      skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 20)
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

// ── 동기화 대상 디스패치 ────────────────────────────────────
const SYNC_FNS = {
  place: syncPlace,
  detail: syncDetail,
  barrierfree: syncBarrierfree
} as const;
type SyncTarget = keyof typeof SYNC_FNS;

function isSyncTarget(target: string): target is SyncTarget {
  return target in SYNC_FNS;
}

// SyncOutcome → 응답에 실을 값(성공이면 result, 실패면 error/partial)으로 평탄화.
function outcomeToJson(outcome: SyncOutcome): Record<string, unknown> | SyncResult {
  return outcome.ok ? outcome.result : { error: outcome.error, partial: outcome.partial };
}

// ── 전체 동기화 (스케줄러/전체 동기화 공용) ─────────────────
// 의존 순서상 tb_place 를 먼저 채운 뒤(자식 테이블이 place_id/contentid 를 참조),
// 서로 독립인 detail / barrierfree 는 병렬로 실행한다.
export async function runFullSync(
  supabase: SupabaseClient
): Promise<Record<"place" | "detail" | "barrierfree", Record<string, unknown> | SyncResult>> {
  // 1) 원본 테이블 tb_place 선행 동기화
  console.log("[sync] tb_place 동기화 시작");
  const placeOutcome = await syncPlace(supabase);
  console.log("[sync] tb_place 완료 → detail/barrierfree 병렬 시작");

  // 2) tb_place_detail / tb_place_barrierfree 병렬 동기화 (서로 독립)
  const [detailOutcome, barrierfreeOutcome] = await Promise.all([
    syncDetail(supabase),
    syncBarrierfree(supabase)
  ]);
  console.log("[sync] detail/barrierfree 완료");

  return {
    place: outcomeToJson(placeOutcome),
    detail: outcomeToJson(detailOutcome),
    barrierfree: outcomeToJson(barrierfreeOutcome)
  };
}

// ── 환경변수 확인 (스케줄러와 공용) ─────────────────────────
// 동기화에 필요한 env(관광공사 서비스키 / Supabase URL·시크릿)를 검증한다.
export function getSyncConfig():
  | { ok: true; supabaseUrl: string; secretKey: string }
  | { ok: false; error: string } {
  const serviceKey = process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!serviceKey) {
    return { ok: false, error: ".env에 PUBLIC_DATA_OPEN_API_SERVICE_KEY가 설정되지 않았습니다." };
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
// tb_place / tb_place_detail / tb_place_barrierfree 수동 동기화 엔드포인트.
export async function POST(request: Request) {
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
    { error: `알 수 없는 target: ${target} (place | detail | barrierfree | all)` },
    { status: 400 }
  );
}
