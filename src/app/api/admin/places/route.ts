import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { generateAdminContentId, isAdminContentId } from "@/lib/place/adminContentId";
import { parseRestdate } from "@/lib/place/syncEngine";
import { BF_FIELDS, computeBfFlags } from "@/lib/place/accessibilityFields";

export const dynamic = "force-dynamic";

const BF_FIELD_SET = new Set<string>(BF_FIELDS);

type AdminPlaceBody = {
  id?: unknown;
  title?: unknown;
  gu?: unknown;
  dong?: unknown;
  roadName?: unknown;
  mapx?: unknown;
  mapy?: unknown;
  lclssystm1?: unknown;
  firstimage?: unknown;
  overview?: unknown;
  tel?: unknown;
  usetime?: unknown;
  restdate?: unknown;
  accessibility?: unknown;
  useYn?: unknown;
  quickAction?: unknown;
};

// 대전 법정동 시군구코드(ldongsigngucd, 예: "110")의 상위 지역코드 — 이 프로젝트는 대전만 다룬다.
const DAEJEON_REGN_CD = "30";
const DAEJEON_NAME = "대전광역시";

// 도로명만 입력받아 다른 장소들과 동일한 형식으로 addr1을 만든다: "대전광역시 {구} {도로명} ({동})".
function buildAddr1(guName: string, roadName: string, dong: string): string {
  return `${DAEJEON_NAME} ${guName} ${roadName} (${dong})`;
}

async function resolveGuName(supabase: ReturnType<typeof createAdminClient>, guCode: string) {
  const { data, error } = await supabase
    .from("tb_code")
    .select("code_nm")
    .eq("code_group", "LDONGSIGNGU")
    .eq("code_id", `${DAEJEON_REGN_CD}${guCode}`)
    .maybeSingle();
  if (error) throw error;
  return data?.code_nm as string | undefined;
}

function parseBody(body: AdminPlaceBody) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const gu = typeof body.gu === "string" ? body.gu.trim() : "";
  const lclssystm1 = typeof body.lclssystm1 === "string" ? body.lclssystm1.trim() : "";
  const mapx = Number(body.mapx);
  const mapy = Number(body.mapy);
  const dong = typeof body.dong === "string" ? body.dong.trim() : "";
  const roadName = typeof body.roadName === "string" ? body.roadName.trim() : "";
  const firstimage = typeof body.firstimage === "string" ? body.firstimage.trim() : "";
  const overview = typeof body.overview === "string" ? body.overview.trim() : "";
  const tel = typeof body.tel === "string" ? body.tel.trim() : "";
  const usetime = typeof body.usetime === "string" ? body.usetime.trim() : "";
  const restdate = typeof body.restdate === "string" ? body.restdate.trim() : "";
  const accessibility: Record<string, string> = {};
  if (body.accessibility && typeof body.accessibility === "object") {
    for (const [key, val] of Object.entries(body.accessibility as Record<string, unknown>)) {
      if (BF_FIELD_SET.has(key) && typeof val === "string" && val.trim()) {
        accessibility[key] = val.trim();
      }
    }
  }
  const useYn = body.useYn === false ? false : true;

  if (!title) return { error: "장소명을 입력해 주세요." } as const;
  if (!gu) return { error: "구를 선택해 주세요." } as const;
  if (!dong) return { error: "동을 선택해 주세요." } as const;
  if (!roadName) return { error: "도로명을 입력해 주세요." } as const;
  if (!lclssystm1) return { error: "테마를 선택해 주세요." } as const;
  if (!Number.isFinite(mapx) || !Number.isFinite(mapy)) {
    return { error: "좌표(위도/경도)를 올바르게 입력해 주세요." } as const;
  }

  return {
    value: {
      title,
      gu,
      lclssystm1,
      mapx,
      mapy,
      dong,
      roadName,
      firstimage,
      overview,
      tel,
      usetime,
      restdate,
      accessibility,
      useYn
    }
  } as const;
}

type ParsedBody = ReturnType<typeof parseBody>;

// tel/overview → tb_place_detail_normalized, 접근성 체크 → tb_place_barrierfree.
// 둘 다 PK가 place_id라 onConflict:"place_id" 로 있으면 갱신, 없으면 새로 만든다.
async function upsertPlaceExtras(
  supabase: ReturnType<typeof createAdminClient>,
  placeId: number,
  contentid: string,
  v: Extract<ParsedBody, { value: unknown }>["value"]
) {
  if (v.overview || v.tel || v.usetime || v.restdate) {
    // restdate 원문 외에, 일정(휴무일) 검색 필터가 실제로 보는 파생 컬럼(closed_weekdays 등)도
    // 정부 API 동기화와 동일한 파서로 함께 채운다 — 안 그러면 원문만 있고 필터에는 반영이 안 된다.
    const rest = parseRestdate(v.restdate);
    const { error } = await supabase.from("tb_place_detail_normalized").upsert(
      {
        place_id: placeId,
        contentid,
        overview: v.overview || null,
        infocenter: v.tel || null,
        usetime: v.usetime || null,
        restdate: v.restdate || null,
        closed_weekdays: rest.closedWeekdays,
        closed_holiday: rest.closedHoliday,
        has_irregular_closing: rest.hasIrregularClosing
      },
      { onConflict: "place_id" }
    );
    if (error) throw error;
  }

  const row: Record<string, unknown> = { place_id: placeId, contentid };
  for (const field of BF_FIELDS) row[field] = v.accessibility[field] ?? "";
  Object.assign(row, computeBfFlags(row));
  const { error } = await supabase
    .from("tb_place_barrierfree")
    .upsert(row, { onConflict: "place_id" });
  if (error) throw error;
}

const LIST_COLUMNS =
  "place_id, contentid, title, addr1, dong, ldongsigngucd, mapx, mapy, lclssystm1, firstimage, use_yn, delete_yn, registtime";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");

  try {
    const supabase = createAdminClient();

    if (idParam) {
      const placeId = Number(idParam);
      if (!Number.isFinite(placeId))
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      // tb_place ↔ tb_place_detail_normalized/tb_place_barrierfree 간에 FK 관계가 등록돼 있지 않아
      // PostgREST 임베디드 조인(select 안에서 자식 테이블 지정)을 못 쓴다 — 따로 조회해서 합친다.
      const [{ data: place, error: placeError }, { data: detail }, { data: bf }] =
        await Promise.all([
          supabase
            .from("tb_place")
            .select(LIST_COLUMNS)
            .eq("place_id", placeId)
            .ilike("contentid", "a%")
            .maybeSingle(),
          supabase
            .from("tb_place_detail_normalized")
            .select("overview, infocenter, usetime, restdate")
            .eq("place_id", placeId)
            .maybeSingle(),
          supabase
            .from("tb_place_barrierfree")
            .select(BF_FIELDS.join(", "))
            .eq("place_id", placeId)
            .maybeSingle()
        ]);
      if (placeError) throw placeError;
      if (!place) return NextResponse.json({ error: "장소를 찾을 수 없습니다." }, { status: 404 });
      return NextResponse.json({
        items: [
          {
            ...place,
            tb_place_detail_normalized: detail ? [detail] : [],
            tb_place_barrierfree: bf ? [bf] : []
          }
        ]
      });
    }

    const q = (searchParams.get("q") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 사용여부/삭제여부와 무관하게 관리자가 등록한 장소는 전부 보여준다(삭제된 것도 복구할 수 있어야 하므로).
    let query = supabase
      .from("tb_place")
      .select(LIST_COLUMNS, { count: "exact" })
      .ilike("contentid", "a%")
      .order("registtime", { ascending: false });
    if (q) query = query.ilike("title", `%${q}%`);

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return NextResponse.json({ items: data ?? [], total: count ?? 0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "장소 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as AdminPlaceBody;
  const parsed = parseBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const guName = await resolveGuName(supabase, v.gu);
    if (!guName) throw new Error("구 정보를 확인하지 못했습니다.");
    const addr1 = buildAddr1(guName, v.roadName, v.dong);

    // contentid="a"+6자리 랜덤 숫자는 완전한 유일성이 보장되지 않으므로(unique 제약 위반 시
    // 23505), 충돌하면 새 값으로 몇 번 재시도한다.
    const MAX_ATTEMPTS = 5;
    let place: { place_id: number; contentid: string } | null = null;
    let contentid = "";
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      contentid = generateAdminContentId();
      const { data, error: placeError } = await supabase
        .from("tb_place")
        .insert({
          contentid,
          title: v.title,
          addr1,
          ldongregncd: DAEJEON_REGN_CD,
          ldongsigngucd: v.gu,
          dong: v.dong || null,
          mapx: v.mapx,
          mapy: v.mapy,
          lclssystm1: v.lclssystm1,
          firstimage: v.firstimage || null,
          use_yn: v.useYn ? "Y" : "N",
          delete_yn: "N",
          registtime: now,
          updatetime: now
        })
        .select("place_id, contentid")
        .single();
      if (!placeError) {
        place = data;
        break;
      }
      if (placeError.code !== "23505") throw placeError;
    }
    if (!place) throw new Error("장소 id 생성에 반복적으로 실패했습니다. 다시 시도해 주세요.");

    await upsertPlaceExtras(supabase, place.place_id, contentid, v);

    return NextResponse.json({ place });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "장소를 등록하지 못했습니다." },
      { status: 500 }
    );
  }
}

// place_id 로 관리자 등록 장소인지 확인한다(contentid="a..." 접두인 행만 이 API로 수정/삭제 가능 —
// 정부 API 동기화 장소는 다음 동기화 때 원본 데이터로 덮어써지므로 여기서 건드리면 안 된다).
async function loadAdminPlace(supabase: ReturnType<typeof createAdminClient>, placeId: number) {
  const { data, error } = await supabase
    .from("tb_place")
    .select("place_id, contentid")
    .eq("place_id", placeId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !isAdminContentId(String(data.contentid))) return null;
  return data;
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as AdminPlaceBody;
  const placeId = Number(body.id);
  if (!Number.isFinite(placeId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // 목록에서 바로 누르는 가벼운 액션(사용여부 토글/삭제 복구) — 전체 폼 검증 없이 바로 처리한다.
  if (body.quickAction === "set-use-yn" || body.quickAction === "restore") {
    try {
      const supabase = createAdminClient();
      const existing = await loadAdminPlace(supabase, placeId);
      if (!existing) {
        return NextResponse.json(
          { error: "관리자가 등록한 장소만 변경할 수 있습니다." },
          { status: 404 }
        );
      }
      const updates: Record<string, unknown> =
        body.quickAction === "restore"
          ? { delete_yn: "N", deletetime: null, updatetime: new Date().toISOString() }
          : { use_yn: body.useYn === false ? "N" : "Y", updatetime: new Date().toISOString() };
      const { error } = await supabase.from("tb_place").update(updates).eq("place_id", placeId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "변경하지 못했습니다." },
        { status: 500 }
      );
    }
  }

  const parsed = parseBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;

  try {
    const supabase = createAdminClient();
    const existing = await loadAdminPlace(supabase, placeId);
    if (!existing) {
      return NextResponse.json(
        { error: "관리자가 등록한 장소만 수정할 수 있습니다." },
        { status: 404 }
      );
    }
    const guName = await resolveGuName(supabase, v.gu);
    if (!guName) throw new Error("구 정보를 확인하지 못했습니다.");
    const addr1 = buildAddr1(guName, v.roadName, v.dong);

    const { data: place, error } = await supabase
      .from("tb_place")
      .update({
        title: v.title,
        addr1,
        ldongregncd: DAEJEON_REGN_CD,
        ldongsigngucd: v.gu,
        dong: v.dong || null,
        mapx: v.mapx,
        mapy: v.mapy,
        lclssystm1: v.lclssystm1,
        firstimage: v.firstimage || null,
        use_yn: v.useYn ? "Y" : "N",
        updatetime: new Date().toISOString()
      })
      .eq("place_id", placeId)
      .select("place_id, contentid")
      .single();
    if (error) throw error;

    await upsertPlaceExtras(supabase, placeId, existing.contentid as string, v);

    return NextResponse.json({ place });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "장소를 수정하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const placeId = Number(searchParams.get("id"));
  if (!Number.isFinite(placeId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const existing = await loadAdminPlace(supabase, placeId);
    if (!existing) {
      return NextResponse.json(
        { error: "관리자가 등록한 장소만 삭제할 수 있습니다." },
        { status: 404 }
      );
    }

    // 다른 장소들과 동일하게 소프트 삭제한다(코스/게시글에서 참조 중이어도 FK 위반 없이 안전).
    const { error } = await supabase
      .from("tb_place")
      .update({ delete_yn: "Y", deletetime: new Date().toISOString() })
      .eq("place_id", placeId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "장소를 삭제하지 못했습니다." },
      { status: 500 }
    );
  }
}
