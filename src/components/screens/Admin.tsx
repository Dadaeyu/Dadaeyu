"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Route,
  Flag,
  Calendar,
  Database,
  Search,
  Plus,
  Trash2,
  Edit,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
  ChevronRight,
  Star,
  ShieldCheck,
  Megaphone,
  HelpCircle,
  Layers
} from "lucide-react";
import { PLACES, PLACE_COLORS } from "@/data/placesData";
import { Button } from "@/components/ui/Button";
import { DashboardSection } from "@/components/screens/admin/DashboardSection";
import { UsersSection } from "@/components/screens/admin/UsersSection";
import { BoardSection } from "@/components/screens/admin/BoardSection";
import { BoardPostsSection } from "@/components/screens/admin/BoardPostsSection";
import { ReportsSection } from "@/components/screens/admin/ReportsSection";
import { NoticesSection } from "@/components/screens/admin/NoticesSection";
import { CommunityNoticesSection } from "@/components/screens/admin/CommunityNoticesSection";
import { EventsSection } from "@/components/screens/admin/EventsSection";
import { FaqSection } from "@/components/screens/admin/FaqSection";
import { TablePagination } from "@/components/screens/admin/TablePagination";

// ── 사이드바 메뉴 ─────────────────────────────────────────
const SECTIONS = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "users", label: "사용자 관리", icon: Users },
  { key: "notices", label: "팝업 관리", icon: AlertCircle },
  { key: "community-notices", label: "공지 관리", icon: Megaphone },
  { key: "events", label: "이벤트 관리", icon: Calendar },
  { key: "faq", label: "FAQ 관리", icon: HelpCircle },
  { key: "board-settings", label: "게시판 관리", icon: Layers },
  { key: "board-posts", label: "게시글 관리", icon: FileText },
  { key: "places", label: "장소 관리", icon: MapPin },
  { key: "courses", label: "코스 관리", icon: Route },
  { key: "reports", label: "제보 확인", icon: Flag }
];

// ── 목업 데이터 (장소·코스·이벤트) ─────────────────────────
interface AdminCourse {
  id: number;
  title: string;
  author: string;
  duration: string;
  places: number;
  best: boolean;
  visible: boolean;
  date: string;
}

const INIT_COURSES: AdminCourse[] = [
  {
    id: 101,
    title: "대전 무장애 가족 나들이",
    author: "대전관광공사",
    duration: "1일",
    places: 5,
    best: true,
    visible: true,
    date: "2025.04.10"
  },
  {
    id: 102,
    title: "휠체어로 즐기는 성심당 & 수목원",
    author: "대전관광공사",
    duration: "반일",
    places: 3,
    best: true,
    visible: true,
    date: "2025.03.28"
  },
  {
    id: 103,
    title: "유성온천 힐링 코스",
    author: "대전시청 관광과",
    duration: "1일",
    places: 4,
    best: false,
    visible: true,
    date: "2025.02.15"
  },
  {
    id: 104,
    title: "엄마랑 아이랑 과학 탐험",
    author: "travel_daejeon",
    duration: "반일",
    places: 2,
    best: false,
    visible: true,
    date: "2025.05.02"
  },
  {
    id: 10,
    title: "내 여행 계획",
    author: "미대전",
    duration: "2일",
    places: 4,
    best: false,
    visible: false,
    date: "2026.05.15"
  }
];

function resolveAdminSection(sectionParam: string | string[] | undefined): string {
  if (typeof sectionParam === "string" && sectionParam.length > 0) return sectionParam;
  if (Array.isArray(sectionParam) && sectionParam.length > 0) return sectionParam[0];
  return "dashboard";
}

// ── 레이아웃 ─────────────────────────────────────────────
export default function Admin() {
  const params = useParams();
  const section = resolveAdminSection(params.section as string | string[] | undefined);
  const router = useRouter();
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.pendingReports != null) setPendingReports(data.pendingReports);
      })
      .catch(() => {});
  }, []);

  return (
    <div
      className="-mx-4 -mt-6 -mb-24 flex md:-mx-6 md:-mb-6"
      style={{ minHeight: "calc(100vh - 64px)" }}
    >
      {/* 데스크톱 사이드바 */}
      <aside className="border-hairline-soft bg-background hidden w-56 shrink-0 flex-col gap-0.5 border-r px-3 py-6 md:flex">
        <p className="text-stone mb-2 px-3 text-[10px] font-bold tracking-widest uppercase">
          관리자
        </p>
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const active = section === key;
          return (
            <button
              key={key}
              onClick={() => router.push(key === "dashboard" ? "/admin" : `/admin/${key}`)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                active
                  ? "bg-navy-50 text-navy-700"
                  : "text-steel hover:bg-surface-soft hover:text-ink"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-navy-600" : "text-stone"}`} />
              {label}
              {key === "reports" && pendingReports > 0 && (
                <span className="bg-surface-soft text-error border-error/30 ml-auto rounded-full border px-1.5 py-0.5 text-[10px] font-bold">
                  {pendingReports}
                </span>
              )}
            </button>
          );
        })}
      </aside>

      {/* 메인 영역 */}
      <div className="bg-surface-soft/40 flex min-w-0 flex-1 flex-col">
        {/* 모바일 탭바 */}
        <div className="border-hairline-soft bg-background flex gap-1 overflow-x-auto border-b px-4 py-2 md:hidden">
          {SECTIONS.map(({ key, label, icon: Icon }) => {
            const active = section === key;
            return (
              <button
                key={key}
                onClick={() => router.push(key === "dashboard" ? "/admin" : `/admin/${key}`)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active ? "bg-navy-50 text-navy-700" : "text-steel hover:bg-surface-soft"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto px-4 py-6 md:px-8">
          {section === "dashboard" && <DashboardSection />}
          {section === "users" && <UsersSection />}
          {section === "board-settings" && <BoardSection />}
          {section === "board-posts" && <BoardPostsSection />}
          {section === "notices" && <NoticesSection />}
          {section === "community-notices" && <CommunityNoticesSection />}
          {section === "places" && <PlaceManagement />}
          {section === "courses" && <CourseManagement />}
          {section === "reports" && <ReportsSection />}
          {section === "events" && <EventsSection />}
          {section === "faq" && <FaqSection />}
        </div>
      </div>
    </div>
  );
}

// ── 3. 장소 관리 ─────────────────────────────────────────
const DB_TABS = [
  { key: "place", label: "tb_place", desc: "장소 기본" },
  { key: "detail", label: "tb_place_detail", desc: "상세 정보" },
  { key: "detail_normalized", label: "tb_place_detail_normalized", desc: "상세 정보(정규화)" },
  { key: "barrierfree", label: "tb_place_barrierfree", desc: "무장애 정보" },
  { key: "bakery", label: "tb_place_bakery", desc: "제과점" },
  { key: "holiday", label: "tb_holiday", desc: "공휴일" }
] as const;
type DbTabKey = (typeof DB_TABS)[number]["key"];

// ── 각 테이블의 컬럼 헤더 (Supabase 실제 스키마 기준 하드코딩) ──
const PLACE_COLUMNS = [
  "place_id",
  "contentid",
  "title",
  "addr1",
  "addr2",
  "dong",
  "ldongregncd",
  "ldongsigngucd",
  "mapx",
  "mapy",
  "contenttypeid",
  "lclssystm1",
  "lclssystm2",
  "lclssystm3",
  "firstimage",
  "createdtime",
  "modifiedtime",
  "registtime",
  "updatetime",
  "delete_yn",
  "deletetime",
  "dong"
] as const;

const PLACE_DETAIL_COLUMNS = [
  "place_id",
  "contentid",
  "contenttypeid",
  "homepage",
  "tel",
  "overview",
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
  "treatmenu",
  "createdtime",
  "modifiedtime",
  "registtime",
  "updatetime"
] as const;

const PLACE_BF_COLUMNS = [
  "place_id",
  "contentid",
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
  "parking",
  "publictransport",
  "route",
  "wheelchair",
  "exit",
  "elevator",
  "restroom",
  "handicapetc",
  "stroller",
  "lactationroom",
  "babysparechair",
  "infantsfamilyetc",
  // 무장애 요약 플래그 (장애 유형별 편의 제공 여부)
  "has_blind",
  "has_deaf",
  "has_gait",
  "has_infant",
  "has_maternity",
  "has_senior",
  "registtime",
  "updatetime"
] as const;

const PLACE_BAKERY_COLUMNS = [
  "bakery_id",
  "bplc_nm",
  "road_nm_addr",
  "lotno_addr",
  "dat_updt_pnt",
  "dat_updt_se",
  "registtime",
  "updatetime",
  "delete_yn",
  "deletetime"
] as const;

function PlaceManagement() {
  const [places, setPlaces] = useState(PLACES);
  const [query, setQuery] = useState("");
  const [dbTab, setDbTab] = useState<DbTabKey>("place");

  const filtered = places.filter((p) => p.name.includes(query) || p.category.includes(query));

  const deletePlace = (id: number) => setPlaces((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-ink text-xl font-bold">장소 관리</h1>
        <button className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" />
          장소 등록
        </button>
      </div>

      <div className="relative">
        <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="장소명 또는 카테고리 검색"
          className="border-hairline focus:ring-navy-400 w-full rounded-lg border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-hairline-soft bg-surface-soft border-b">
                {["장소명", "카테고리", "평점", "접근성 태그", "액션"].map((h) => (
                  <th
                    key={h}
                    className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="text-ink font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: PLACE_COLORS[p.colorKey].bg,
                        color: PLACE_COLORS[p.colorKey].color
                      }}
                    >
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                      <span className="text-slate font-medium">{p.rating}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.accessibility.map((a) => (
                        <span
                          key={a}
                          className="bg-brand-50 text-brand-700 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label="수정"
                        className="text-stone hover:bg-navy-50 hover:text-navy-600 rounded-full"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => deletePlace(p.id)}
                        aria-label="삭제"
                        className="text-stone rounded-full hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-stone py-8 text-center text-sm">검색 결과가 없어요</p>
        )}
      </div>

      {/* Supabase 테이블 탭 */}
      <div className="pt-4">
        <div className="border-hairline-soft flex gap-1 overflow-x-auto border-b">
          {DB_TABS.map(({ key, label, desc }) => {
            const active = dbTab === key;
            return (
              <button
                key={key}
                onClick={() => setDbTab(key)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "border-navy-600 text-navy-700"
                    : "text-steel hover:text-ink border-transparent"
                }`}
              >
                <Database className={`h-3.5 w-3.5 ${active ? "text-navy-600" : "text-stone"}`} />
                {label}
                <span className="text-stone text-xs font-normal">{desc}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          {dbTab === "place" && <DbPlaceTable />}
          {dbTab === "detail" && <DbPlaceDetailTable />}
          {dbTab === "detail_normalized" && <DbPlaceDetailNormalizedTable />}
          {dbTab === "barrierfree" && <DbBarrierFreeTable />}
          {dbTab === "bakery" && <DbBakeryTable />}
          {dbTab === "holiday" && <DbHolidayTable />}
        </div>
      </div>
    </div>
  );
}

// ── 3-1. Supabase tb_place 조회 테이블 (페이징) ──────────
const DB_PLACE_PAGE_SIZE = 10;

function DbPlaceTable() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0); // 0-based
  const [total, setTotal] = useState(0);

  // 동기화 상태
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState("");

  // targetPage(0-based) 페이지를 10개씩 조회
  const fetchRows = async (targetPage = 0) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("error");
      setError(".env에 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const from = targetPage * DB_PLACE_PAGE_SIZE;
      const to = from + DB_PLACE_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("tb_place")
        .select("*", { count: "exact" })
        .order("place_id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      setRows((data ?? []) as Record<string, unknown>[]);
      setTotal(count ?? 0);
      setPage(targetPage);
      setStatus("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  useEffect(() => {
    // 마운트 시 첫 페이지 조회 (initial fetch on mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRows(0);
  }, []);

  // areaBasedList2(대전, lDongRegnCd=30) 전체를 조회해 tb_place 에 upsert
  const runSync = async () => {
    setSyncing(true);
    setSyncError("");
    setSyncResult(null);
    try {
      const res = await fetch("/api/place?target=place", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `동기화 실패 (HTTP ${res.status})`);
      setSyncResult(json as SyncResult);
      await fetchRows(0); // 동기화 후 첫 페이지부터 다시 조회
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  // 컬럼 헤더는 실제 스키마 기준으로 하드코딩 (데이터가 비어도 헤더 표시)
  const columns = PLACE_COLUMNS;
  const totalPages = Math.max(1, Math.ceil(total / DB_PLACE_PAGE_SIZE));
  const isLoading = status === "loading";

  const renderCell = (value: unknown) => {
    if (value === null || value === undefined) return <span className="text-stone">—</span>;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="text-navy-500 h-4 w-4" />
          <h2 className="text-ink font-bold">tb_place</h2>
          <code className="bg-surface text-steel rounded-full px-2 py-0.5 font-mono text-xs">
            Supabase
          </code>
          {status === "success" && <span className="text-stone text-sm">총 {total}건</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRows(page)}
            disabled={isLoading || syncing}
            className="border-hairline text-steel hover:bg-surface-soft rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isLoading ? "조회 중..." : "새로고침"}
          </button>
          <button
            onClick={runSync}
            disabled={syncing}
            className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {syncing ? "동기화 중... (시간이 걸려요)" : "API 동기화"}
          </button>
        </div>
      </div>

      <p className="text-stone text-xs">
        “API 동기화”를 누르면 areaBasedList2(국문 관광정보, 대전 lDongRegnCd=30)를 전체 조회해
        tb_place에 contentid 기준으로 insert/update 합니다. API 결과에 없는 기존 장소는 삭제
        처리(delete_yn=Y)됩니다.
      </p>

      {/* 동기화 결과 / 에러 */}
      {syncResult && (
        <div className="border-brand-200 bg-brand-50 text-brand-800 rounded-lg border p-4 text-sm">
          ✓ 동기화 완료 — 대전 관광정보 {syncResult.totalPlaces}건 중 {syncResult.fetched}건
          저장(upsert {syncResult.upserted}), 삭제 처리 {syncResult.deleted}건, 건너뜀{" "}
          {syncResult.skipped}건{syncResult.errorCount > 0 && `, 실패 ${syncResult.errorCount}건`}
        </div>
      )}
      {syncError && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{syncError}</p>
        </div>
      )}

      {status === "error" && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {status !== "error" && (
        <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-hairline-soft bg-surface-soft border-b">
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                  >
                    {columns.map((c) => (
                      <td key={c} className="text-steel px-4 py-3 whitespace-nowrap">
                        {renderCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <p className="text-steel animate-pulse py-8 text-center text-sm">
              Supabase에서 데이터를 불러오는 중...
            </p>
          )}
          {status === "success" && rows.length === 0 && (
            <p className="text-stone py-8 text-center text-sm">데이터가 없어요</p>
          )}

          {/* 페이지네이션 */}
          {status === "success" && total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={DB_PLACE_PAGE_SIZE}
              disabled={isLoading}
              onChange={fetchRows}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── 3-2. Supabase tb_place_barrierfree 조회 + 동기화 ─────
const DB_BF_PAGE_SIZE = 10;

interface SyncResult {
  totalPlaces: number;
  fetched: number;
  upserted: number;
  deleted: number;
  skipped: number;
  errorCount: number;
}

function DbBarrierFreeTable() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0); // 0-based
  const [total, setTotal] = useState(0);

  // 동기화 상태
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState("");

  // targetPage(0-based) 페이지를 10개씩 조회
  const fetchRows = async (targetPage = 0) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("error");
      setError(".env에 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const from = targetPage * DB_BF_PAGE_SIZE;
      const to = from + DB_BF_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("tb_place_barrierfree")
        .select("*", { count: "exact" })
        .order("place_id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      setRows((data ?? []) as Record<string, unknown>[]);
      setTotal(count ?? 0);
      setPage(targetPage);
      setStatus("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  useEffect(() => {
    // 마운트 시 첫 페이지 조회 (initial fetch on mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRows(0);
  }, []);

  // tb_place 전체를 detailWithTour2 로 조회해 tb_place_barrierfree 에 upsert
  const runSync = async () => {
    setSyncing(true);
    setSyncError("");
    setSyncResult(null);
    try {
      const res = await fetch("/api/place?target=barrierfree", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `동기화 실패 (HTTP ${res.status})`);
      setSyncResult(json as SyncResult);
      await fetchRows(0); // 동기화 후 첫 페이지부터 다시 조회
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  // 컬럼 헤더는 실제 스키마 기준으로 하드코딩 (데이터가 비어도 헤더 표시)
  const columns = PLACE_BF_COLUMNS;
  const totalPages = Math.max(1, Math.ceil(total / DB_BF_PAGE_SIZE));
  const isLoading = status === "loading";

  const renderCell = (value: unknown) => {
    if (value === null || value === undefined || value === "")
      return <span className="text-stone">—</span>;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-3 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="text-navy-500 h-4 w-4" />
          <h2 className="text-ink font-bold">tb_place_barrierfree</h2>
          <code className="bg-surface text-steel rounded-full px-2 py-0.5 font-mono text-xs">
            무장애 정보
          </code>
          {status === "success" && <span className="text-stone text-sm">총 {total}건</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRows(page)}
            disabled={isLoading || syncing}
            className="border-hairline text-steel hover:bg-surface-soft rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isLoading ? "조회 중..." : "새로고침"}
          </button>
          <button
            onClick={runSync}
            disabled={syncing}
            className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {syncing ? "동기화 중... (시간이 걸려요)" : "API 동기화"}
          </button>
        </div>
      </div>

      <p className="text-stone text-xs">
        “API 동기화”를 누르면 tb_place의 모든 contentid로 detailWithTour2를 조회해
        tb_place_barrierfree에 insert/update 합니다. (무장애 정보가 없는 장소는 건너뛰고, 기존에
        저장돼 있었다면 삭제 처리됩니다)
      </p>

      {/* 동기화 결과 / 에러 */}
      {syncResult && (
        <div className="border-brand-200 bg-brand-50 text-brand-800 rounded-lg border p-4 text-sm">
          ✓ 동기화 완료 — 대상 {syncResult.totalPlaces}건 중 무장애 정보 {syncResult.fetched}건
          저장(upsert {syncResult.upserted}), 삭제 처리 {syncResult.deleted}건, 정보 없음{" "}
          {syncResult.skipped}건{syncResult.errorCount > 0 && `, 실패 ${syncResult.errorCount}건`}
        </div>
      )}
      {syncError && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{syncError}</p>
        </div>
      )}

      {status === "error" && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {status !== "error" && (
        <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-hairline-soft bg-surface-soft border-b">
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                  >
                    {columns.map((c) => (
                      <td
                        key={c}
                        className="text-steel max-w-xs truncate px-4 py-3 whitespace-nowrap"
                        title={typeof row[c] === "string" ? (row[c] as string) : undefined}
                      >
                        {renderCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <p className="text-steel animate-pulse py-8 text-center text-sm">
              Supabase에서 데이터를 불러오는 중...
            </p>
          )}
          {status === "success" && rows.length === 0 && (
            <p className="text-stone py-8 text-center text-sm">
              데이터가 없어요. “API 동기화”를 눌러 채워보세요.
            </p>
          )}

          {/* 페이지네이션 */}
          {status === "success" && total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={DB_BF_PAGE_SIZE}
              disabled={isLoading}
              onChange={fetchRows}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── 3-2b. Supabase tb_place_bakery 조회 + 동기화 ─────────
const DB_BAKERY_PAGE_SIZE = 10;

interface BakerySyncResult {
  totalCount: number;
  fetched: number;
  inserted: number;
  updated: number;
  deleted: number;
  errorCount: number;
}

function DbBakeryTable() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0); // 0-based
  const [total, setTotal] = useState(0);

  // 동기화 상태
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<BakerySyncResult | null>(null);
  const [syncError, setSyncError] = useState("");

  // targetPage(0-based) 페이지를 10개씩 조회
  const fetchRows = async (targetPage = 0) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("error");
      setError(".env에 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const from = targetPage * DB_BAKERY_PAGE_SIZE;
      const to = from + DB_BAKERY_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("tb_place_bakery")
        .select("*", { count: "exact" })
        .order("bakery_id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      setRows((data ?? []) as Record<string, unknown>[]);
      setTotal(count ?? 0);
      setPage(targetPage);
      setStatus("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  useEffect(() => {
    // 마운트 시 첫 페이지 조회 (initial fetch on mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRows(0);
  }, []);

  // 제과점영업 조회서비스에서 대전광역시 데이터를 조회해 tb_place_bakery 와 동기화
  const runSync = async () => {
    setSyncing(true);
    setSyncError("");
    setSyncResult(null);
    try {
      const res = await fetch("/api/place?target=bakery", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `동기화 실패 (HTTP ${res.status})`);
      setSyncResult(json as BakerySyncResult);
      await fetchRows(0); // 동기화 후 첫 페이지부터 다시 조회
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  // 컬럼 헤더는 실제 스키마 기준으로 하드코딩 (데이터가 비어도 헤더 표시)
  const columns = PLACE_BAKERY_COLUMNS;
  const totalPages = Math.max(1, Math.ceil(total / DB_BAKERY_PAGE_SIZE));
  const isLoading = status === "loading";

  const renderCell = (value: unknown) => {
    if (value === null || value === undefined || value === "")
      return <span className="text-stone">—</span>;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-3 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="text-navy-500 h-4 w-4" />
          <h2 className="text-ink font-bold">tb_place_bakery</h2>
          <code className="bg-surface text-steel rounded-full px-2 py-0.5 font-mono text-xs">
            제과점
          </code>
          {status === "success" && <span className="text-stone text-sm">총 {total}건</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRows(page)}
            disabled={isLoading || syncing}
            className="border-hairline text-steel hover:bg-surface-soft rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isLoading ? "조회 중..." : "새로고침"}
          </button>
          <button
            onClick={runSync}
            disabled={syncing}
            className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {syncing ? "동기화 중... (시간이 걸려요)" : "API 동기화"}
          </button>
        </div>
      </div>

      <p className="text-stone text-xs">
        “API 동기화”를 누르면 행정안전부 제과점영업 조회서비스에서 대전광역시(영업 중) 제과점을 전부
        조회해 tb_place_bakery와 동기화합니다. (상호명 기준으로 신규는 insert, 주소·갱신정보가 바뀐
        곳은 update, API에 없는 곳은 삭제됩니다)
      </p>

      {/* 동기화 결과 / 에러 */}
      {syncResult && (
        <div className="border-brand-200 bg-brand-50 text-brand-800 rounded-lg border p-4 text-sm">
          ✓ 동기화 완료 — 대상 {syncResult.totalCount}건 조회({syncResult.fetched}건), 신규{" "}
          {syncResult.inserted}건, 수정 {syncResult.updated}건, 삭제 처리 {syncResult.deleted}건
          {syncResult.errorCount > 0 && `, 실패 ${syncResult.errorCount}건`}
        </div>
      )}
      {syncError && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{syncError}</p>
        </div>
      )}

      {status === "error" && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {status !== "error" && (
        <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-hairline-soft bg-surface-soft border-b">
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                  >
                    {columns.map((c) => (
                      <td
                        key={c}
                        className="text-steel max-w-xs truncate px-4 py-3 whitespace-nowrap"
                        title={typeof row[c] === "string" ? (row[c] as string) : undefined}
                      >
                        {renderCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <p className="text-steel animate-pulse py-8 text-center text-sm">
              Supabase에서 데이터를 불러오는 중...
            </p>
          )}
          {status === "success" && rows.length === 0 && (
            <p className="text-stone py-8 text-center text-sm">
              데이터가 없어요. “API 동기화”를 눌러 채워보세요.
            </p>
          )}

          {/* 페이지네이션 */}
          {status === "success" && total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={DB_BAKERY_PAGE_SIZE}
              disabled={isLoading}
              onChange={fetchRows}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── 3-3. Supabase tb_place_detail 조회 + 동기화 ──────────
const DB_DETAIL_PAGE_SIZE = 10;

function DbPlaceDetailTable() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0); // 0-based
  const [total, setTotal] = useState(0);

  // 동기화 상태
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState("");

  // targetPage(0-based) 페이지를 10개씩 조회
  const fetchRows = async (targetPage = 0) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("error");
      setError(".env에 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const from = targetPage * DB_DETAIL_PAGE_SIZE;
      const to = from + DB_DETAIL_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("tb_place_detail")
        .select("*", { count: "exact" })
        .order("place_id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      setRows((data ?? []) as Record<string, unknown>[]);
      setTotal(count ?? 0);
      setPage(targetPage);
      setStatus("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  useEffect(() => {
    // 마운트 시 첫 페이지 조회 (initial fetch on mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRows(0);
  }, []);

  // tb_place 전체를 detailCommon2 + detailIntro2 로 조회해 tb_place_detail 에 upsert
  const runSync = async () => {
    setSyncing(true);
    setSyncError("");
    setSyncResult(null);
    try {
      const res = await fetch("/api/place?target=detail", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `동기화 실패 (HTTP ${res.status})`);
      setSyncResult(json as SyncResult);
      await fetchRows(0); // 동기화 후 첫 페이지부터 다시 조회
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  // 컬럼 헤더는 실제 스키마 기준으로 하드코딩 (데이터가 비어도 헤더 표시)
  const columns = PLACE_DETAIL_COLUMNS;
  const totalPages = Math.max(1, Math.ceil(total / DB_DETAIL_PAGE_SIZE));
  const isLoading = status === "loading";

  const renderCell = (value: unknown) => {
    if (value === null || value === undefined || value === "")
      return <span className="text-stone">—</span>;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-3 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="text-navy-500 h-4 w-4" />
          <h2 className="text-ink font-bold">tb_place_detail</h2>
          <code className="bg-surface text-steel rounded-full px-2 py-0.5 font-mono text-xs">
            상세 정보
          </code>
          {status === "success" && <span className="text-stone text-sm">총 {total}건</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRows(page)}
            disabled={isLoading || syncing}
            className="border-hairline text-steel hover:bg-surface-soft rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isLoading ? "조회 중..." : "새로고침"}
          </button>
          <button
            onClick={runSync}
            disabled={syncing}
            className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {syncing ? "동기화 중... (시간이 걸려요)" : "API 동기화"}
          </button>
        </div>
      </div>

      <p className="text-stone text-xs">
        “API 동기화”를 누르면 tb_place의 모든 contentid로 detailCommon2(공통정보) +
        detailIntro2(소개정보)를 조회해 tb_place_detail에 insert/update 합니다. 상세정보가 조회되지
        않은 기존 행은 삭제 처리됩니다.
      </p>

      {/* 동기화 결과 / 에러 */}
      {syncResult && (
        <div className="border-brand-200 bg-brand-50 text-brand-800 rounded-lg border p-4 text-sm">
          ✓ 동기화 완료 — 대상 {syncResult.totalPlaces}건 중 {syncResult.fetched}건 저장(upsert{" "}
          {syncResult.upserted}), 삭제 처리 {syncResult.deleted}건, 정보 없음 {syncResult.skipped}건
          {syncResult.errorCount > 0 && `, 실패 ${syncResult.errorCount}건`}
        </div>
      )}
      {syncError && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{syncError}</p>
        </div>
      )}

      {status === "error" && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {status !== "error" && (
        <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-hairline-soft bg-surface-soft border-b">
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                  >
                    {columns.map((c) => (
                      <td
                        key={c}
                        className="text-steel max-w-xs truncate px-4 py-3 whitespace-nowrap"
                        title={typeof row[c] === "string" ? (row[c] as string) : undefined}
                      >
                        {renderCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <p className="text-steel animate-pulse py-8 text-center text-sm">
              Supabase에서 데이터를 불러오는 중...
            </p>
          )}
          {status === "success" && rows.length === 0 && (
            <p className="text-stone py-8 text-center text-sm">
              데이터가 없어요. “API 동기화”를 눌러 채워보세요.
            </p>
          )}

          {/* 페이지네이션 */}
          {status === "success" && total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={DB_DETAIL_PAGE_SIZE}
              disabled={isLoading}
              onChange={fetchRows}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── 3-4. Supabase tb_place_detail_normalized 조회 (조회 전용) ─────
const PLACE_DETAIL_NORMALIZED_COLUMNS = [
  "place_id",
  "contentid",
  "contenttypeid",
  "homepage",
  "tel",
  "overview",
  "accomcount",
  "accommin",
  "accommax",
  "scale",
  "agerange",
  "agemin",
  "agemax",
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
  "closed_weekdays",
  "closed_holiday",
  "has_irregular_closing",
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
  "modifiedtime",
  "registtime",
  "updatetime"
] as const;

function DbPlaceDetailNormalizedTable() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0); // 0-based
  const [total, setTotal] = useState(0);

  // 정규화(tb_place_detail → tb_place_detail_normalized 복사) 상태
  const [normalizing, setNormalizing] = useState(false);
  const [normResult, setNormResult] = useState<SyncResult | null>(null);
  const [normError, setNormError] = useState("");

  // targetPage(0-based) 페이지를 10개씩 조회
  const fetchRows = async (targetPage = 0) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("error");
      setError(".env에 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const from = targetPage * DB_DETAIL_PAGE_SIZE;
      const to = from + DB_DETAIL_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("tb_place_detail_normalized")
        .select("*", { count: "exact" })
        .order("place_id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      setRows((data ?? []) as Record<string, unknown>[]);
      setTotal(count ?? 0);
      setPage(targetPage);
      setStatus("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  useEffect(() => {
    // 마운트 시 첫 페이지 조회 (initial fetch on mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRows(0);
  }, []);

  // "정규화" — tb_place_detail 의 동일 컬럼 데이터를 tb_place_detail_normalized 로 복사(upsert)
  const runNormalize = async () => {
    setNormalizing(true);
    setNormError("");
    setNormResult(null);
    try {
      const res = await fetch("/api/place?target=normalize", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `정규화 실패 (HTTP ${res.status})`);
      setNormResult(json as SyncResult);
      await fetchRows(0); // 정규화 후 첫 페이지부터 다시 조회
    } catch (e: unknown) {
      setNormError(e instanceof Error ? e.message : String(e));
    } finally {
      setNormalizing(false);
    }
  };

  // 컬럼 헤더는 실제 스키마 기준으로 하드코딩 (데이터가 비어도 헤더 표시)
  const columns = PLACE_DETAIL_NORMALIZED_COLUMNS;
  const totalPages = Math.max(1, Math.ceil(total / DB_DETAIL_PAGE_SIZE));
  const isLoading = status === "loading";

  const renderCell = (value: unknown) => {
    if (value === null || value === undefined || value === "")
      return <span className="text-stone">—</span>;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-3 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="text-navy-500 h-4 w-4" />
          <h2 className="text-ink font-bold">tb_place_detail_normalized</h2>
          <code className="bg-surface text-steel rounded-full px-2 py-0.5 font-mono text-xs">
            상세 정보(정규화)
          </code>
          {status === "success" && <span className="text-stone text-sm">총 {total}건</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRows(page)}
            disabled={isLoading || normalizing}
            className="border-hairline text-steel hover:bg-surface-soft rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isLoading ? "조회 중..." : "새로고침"}
          </button>
          <button
            onClick={runNormalize}
            disabled={normalizing}
            className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {normalizing ? "정규화 중..." : "정규화"}
          </button>
        </div>
      </div>

      <p className="text-stone text-xs">
        “정규화”를 누르면 tb_place_detail 의 동일 컬럼 데이터를 tb_place_detail_normalized 로
        복사(place_id 기준 insert/update)합니다. accommin·accommax·agerange·agemin·agemax 등 신규
        컬럼은 아직 채우지 않습니다.
      </p>

      {/* 정규화 결과 / 에러 */}
      {normResult && (
        <div className="border-brand-200 bg-brand-50 text-brand-800 rounded-lg border p-4 text-sm">
          ✓ 정규화 완료 — tb_place_detail {normResult.totalPlaces}건에서 {normResult.upserted}건
          복사(upsert)
        </div>
      )}
      {normError && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{normError}</p>
        </div>
      )}

      {status === "error" && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {status !== "error" && (
        <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-hairline-soft bg-surface-soft border-b">
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                  >
                    {columns.map((c) => (
                      <td
                        key={c}
                        className="text-steel max-w-xs truncate px-4 py-3 whitespace-nowrap"
                        title={typeof row[c] === "string" ? (row[c] as string) : undefined}
                      >
                        {renderCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <p className="text-steel animate-pulse py-8 text-center text-sm">
              Supabase에서 데이터를 불러오는 중...
            </p>
          )}
          {status === "success" && rows.length === 0 && (
            <p className="text-stone py-8 text-center text-sm">데이터가 없어요.</p>
          )}

          {/* 페이지네이션 */}
          {status === "success" && total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={DB_DETAIL_PAGE_SIZE}
              disabled={isLoading}
              onChange={fetchRows}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── 3-5. Supabase tb_holiday 조회 + 동기화 ───────────────
const DB_HOLIDAY_PAGE_SIZE = 10;

const HOLIDAY_COLUMNS = [
  "holiday_id",
  "datename",
  "locdate",
  "seq",
  "datekind",
  "isholiday",
  "registtime",
  "updatetime"
] as const;

interface HolidaySyncResult {
  year: string;
  fetched: number;
  deleted: number;
  inserted: number;
}

function DbHolidayTable() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0); // 0-based
  const [total, setTotal] = useState(0);

  // 동기화 상태
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<HolidaySyncResult | null>(null);
  const [syncError, setSyncError] = useState("");

  // targetPage(0-based) 페이지를 10개씩 조회
  const fetchRows = async (targetPage = 0) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("error");
      setError(".env에 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const from = targetPage * DB_HOLIDAY_PAGE_SIZE;
      const to = from + DB_HOLIDAY_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("tb_holiday")
        .select("*", { count: "exact" })
        .order("locdate", { ascending: true })
        .order("seq", { ascending: true })
        .range(from, to);
      if (error) throw error;
      setRows((data ?? []) as Record<string, unknown>[]);
      setTotal(count ?? 0);
      setPage(targetPage);
      setStatus("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  useEffect(() => {
    // 마운트 시 첫 페이지 조회 (initial fetch on mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRows(0);
  }, []);

  // 특일 정보 API(공휴일 정보조회)를 올해 연도로 조회해 tb_holiday 의 올해 데이터를
  // 전부 지우고 다시 insert 한다. (upsert 아님)
  const runSync = async () => {
    setSyncing(true);
    setSyncError("");
    setSyncResult(null);
    try {
      const res = await fetch("/api/holiday", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `동기화 실패 (HTTP ${res.status})`);
      setSyncResult(json as HolidaySyncResult);
      await fetchRows(0); // 동기화 후 첫 페이지부터 다시 조회
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  // 컬럼 헤더는 실제 스키마 기준으로 하드코딩 (데이터가 비어도 헤더 표시)
  const columns = HOLIDAY_COLUMNS;
  const totalPages = Math.max(1, Math.ceil(total / DB_HOLIDAY_PAGE_SIZE));
  const isLoading = status === "loading";

  const renderCell = (value: unknown) => {
    if (value === null || value === undefined || value === "")
      return <span className="text-stone">—</span>;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-3 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="text-navy-500 h-4 w-4" />
          <h2 className="text-ink font-bold">tb_holiday</h2>
          <code className="bg-surface text-steel rounded-full px-2 py-0.5 font-mono text-xs">
            공휴일
          </code>
          {status === "success" && <span className="text-stone text-sm">총 {total}건</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRows(page)}
            disabled={isLoading || syncing}
            className="border-hairline text-steel hover:bg-surface-soft rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isLoading ? "조회 중..." : "새로고침"}
          </button>
          <button
            onClick={runSync}
            disabled={syncing}
            className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {syncing ? "동기화 중..." : "API 동기화"}
          </button>
        </div>
      </div>

      <p className="text-stone text-xs">
        “API 동기화”를 누르면 한국천문연구원 특일 정보(공휴일 정보조회)를 올해 연도로 조회해,
        tb_holiday의 올해 데이터를 전부 삭제한 뒤 조회 결과를 다시 insert 합니다.
      </p>

      {/* 동기화 결과 / 에러 */}
      {syncResult && (
        <div className="border-brand-200 bg-brand-50 text-brand-800 rounded-lg border p-4 text-sm">
          ✓ 동기화 완료 — {syncResult.year}년 {syncResult.fetched}건 조회, 기존 {syncResult.deleted}
          건 삭제 후 {syncResult.inserted}건 저장
        </div>
      )}
      {syncError && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{syncError}</p>
        </div>
      )}

      {status === "error" && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-4">
          <AlertCircle className="text-gold-500 mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-gold-800 text-sm whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {status !== "error" && (
        <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-hairline-soft bg-surface-soft border-b">
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                  >
                    {columns.map((c) => (
                      <td
                        key={c}
                        className="text-steel max-w-xs truncate px-4 py-3 whitespace-nowrap"
                        title={typeof row[c] === "string" ? (row[c] as string) : undefined}
                      >
                        {renderCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <p className="text-steel animate-pulse py-8 text-center text-sm">
              Supabase에서 데이터를 불러오는 중...
            </p>
          )}
          {status === "success" && rows.length === 0 && (
            <p className="text-stone py-8 text-center text-sm">
              데이터가 없어요. “API 동기화”를 눌러 채워보세요.
            </p>
          )}

          {/* 페이지네이션 */}
          {status === "success" && total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={DB_HOLIDAY_PAGE_SIZE}
              disabled={isLoading}
              onChange={fetchRows}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── 4. 코스 관리 ─────────────────────────────────────────
function CourseManagement() {
  const [courses, setCourses] = useState<AdminCourse[]>(INIT_COURSES);
  const [filter, setFilter] = useState<"전체" | "베스트" | "비공개">("전체");

  const filtered = courses.filter((c) =>
    filter === "전체" ? true : filter === "베스트" ? c.best : !c.visible
  );

  const toggleBest = (id: number) =>
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, best: !c.best } : c)));
  const toggleVisible = (id: number) =>
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  const deleteCourse = (id: number) => setCourses((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-ink text-xl font-bold">코스 관리</h1>
        <button className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" />
          코스 등록
        </button>
      </div>

      <div className="flex gap-2">
        {(["전체", "베스트", "비공개"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${filter === f ? "bg-navy-600 text-white" : "bg-surface text-steel hover:bg-hairline"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="border-hairline-soft flex items-center gap-4 rounded-lg border bg-white px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-ink truncate font-semibold">{c.title}</h3>
                {c.best && (
                  <span className="bg-gold-100 text-gold-700 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    BEST
                  </span>
                )}
                {!c.visible && (
                  <span className="bg-surface text-steel shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    비공개
                  </span>
                )}
              </div>
              <p className="text-stone text-xs">
                {c.author} · {c.duration} · {c.places}곳 · {c.date}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* 베스트 토글 */}
              <button
                onClick={() => toggleBest(c.id)}
                title="베스트 코스 설정"
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  c.best
                    ? "border-gold-300 bg-gold-50 text-gold-700 hover:bg-gold-100"
                    : "border-hairline text-steel hover:border-gold-300 hover:text-gold-600 bg-white"
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${c.best ? "fill-yellow-400 text-yellow-500" : ""}`}
                />
                베스트
              </button>

              {/* 노출 토글 */}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => toggleVisible(c.id)}
                title="공개 여부 변경"
                aria-label="공개 여부 변경"
                className="text-stone hover:bg-surface hover:text-steel rounded-full"
              >
                {c.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="iconSm"
                aria-label="수정"
                className="text-stone hover:bg-navy-50 hover:text-navy-600 rounded-full"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => deleteCourse(c.id)}
                aria-label="삭제"
                className="text-stone rounded-full hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-stone py-10 text-center text-sm">해당하는 코스가 없어요</p>
        )}
      </div>
    </div>
  );
}

