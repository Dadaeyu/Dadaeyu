"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties
} from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import KakaoMap, { type MapMarker, type MapPathSegment } from "@/components/KakaoMap";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Sparkles,
  Heart,
  Share2,
  SlidersHorizontal,
  ChevronDown,
  Star,
  X,
  ChevronUp,
  Trash2,
  Check,
  Pencil,
  ShieldCheck,
  User,
  RotateCcw,
  Calendar,
  Navigation,
  Footprints,
  Car
} from "lucide-react";
import { Filters, DEFAULT_FILTERS, FilterFields, useFilters } from "@/components/PlaceFilters";
import PlaceSearchSidebar from "@/components/search/PlaceSearchSidebar";
import TourismDetailPanel from "@/components/search/TourismDetailPanel";
import type { SearchPlace } from "@/lib/search/kakaoSearch";
import { usePlaceSearch, type TourismDetail } from "@/hooks/usePlaceSearch";
import { PLACE_COLORS } from "@/data/placesData";
import { shareToKakaoTalk } from "@/lib/kakao/loadKakaoShare";
import { fetchSharedCourses } from "@/lib/supabase/courses";
import type { TourismSharedCourse } from "@/lib/supabase/types";
import { requireLoginOrRedirect } from "@/lib/auth/require-login-redirect";
import {
  fetchDirectionsForStops,
  formatRouteDistance,
  formatRouteDuration,
  openKakaoMapRoute,
  type RouteMode
} from "@/lib/kakao/directions";

// 장소 검색으로 새로 추가된 장소(좌표 직접 보유)의 마커 색상 — 순서대로 순환 배정.
const MARKER_COLORS = Object.values(PLACE_COLORS).map((c) => c.color);
// Day(일정)별 경로선 색상 — Day 순서대로 순환 배정(마커 색과는 별개 팔레트).
const DAY_LINE_COLORS = [
  "#16a34a",
  "#2563eb",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777"
];

// 1시간 뒤 시각(0~23, 자정 넘어가면 랩어라운드). 새 장소의 기본 종료시각 계산용.
function addOneHour(hour: number): number {
  return (((hour + 1) % 24) + 24) % 24;
}

// 코스 편집 중 화면에 들고 있는 편집용 상태 타입 (실제 저장은 tb_course/tb_course_detail 직접 CRUD).
interface CoursePlace {
  id: number; // 코스 내 행 식별용 로컬 id
  name: string;
  startHour: number; // 0~23 (분 없음)
  endHour: number; // 0~23 (분 없음)
  placeId?: number; // tb_course_detail.place_id 로 저장되는 원본 장소 id
  lat?: number; // 장소 검색으로 추가된 경우의 좌표 (지도 마커·경로선 표시용)
  lng?: number;
  contentId?: number; // tb_place.contentid (TourAPI id) — /api/tourism/detail 조회용. placeId(내부 PK)와는 다른 값.
}

interface CourseDay {
  day: number;
  places: CoursePlace[];
}

interface MyCourse {
  id: number;
  title: string;
  duration: string;
  isPrivate: boolean;
  rating: number;
  likes: number;
  tags: string[];
  days: CourseDay[];
  startDate?: string; // 시작일 (DB: startdate)
  endDate?: string; // 종료일 (DB: enddate)
}

// <select> 시각 옵션(0~23시)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

// DB timestamptz("2026-08-03T00:00:00+00:00") 든 "YYYY-MM-DD" 든 날짜 부분만 뽑아 보여준다.
function formatDateOnly(value?: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10);
}
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

// 코스 상세 → 뒤로가기 시 "어느 탭의, 어느 코스를 보다가 들어왔는지" 복원하기 위한 저장소.
// sessionStorage 사용 (탭 닫으면 사라져도 무방, 새로고침엔 살아있어야 하므로 localStorage 는 부적합).
const COURSE_LIST_RETURN_KEY = "dadaeyu:courseListReturn";
type CourseListReturn = {
  tab: "shared" | "recommend" | "my";
  courseId: number;
  scrollY: number;
  filters?: Filters; // 카드 클릭 당시의 필터 값 — 뒤로가기 시 그대로 복원
  showFilters?: boolean; // 필터 패널 펼침/접힘 상태
};

function saveCourseListReturn(
  tab: CourseListReturn["tab"],
  courseId: number,
  filters?: Filters,
  showFilters?: boolean
) {
  if (typeof window === "undefined") return;
  try {
    const payload: CourseListReturn = {
      tab,
      courseId,
      scrollY: window.scrollY,
      filters,
      showFilters
    };
    sessionStorage.setItem(COURSE_LIST_RETURN_KEY, JSON.stringify(payload));
  } catch {
    // 저장 실패는 무시 — 스크롤/탭 복원이 안 될 뿐, 기능 자체엔 영향 없음.
  }
}

function readCourseListReturn(): CourseListReturn | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COURSE_LIST_RETURN_KEY);
    return raw ? (JSON.parse(raw) as CourseListReturn) : null;
  } catch {
    return null;
  }
}

function clearCourseListReturn() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(COURSE_LIST_RETURN_KEY);
  } catch {
    // ignore
  }
}

type AuthorType = "admin" | "user";

// 코스 카드 상단의 "등록자 · 등록일" 행 — 공유/추천/내 코스 목록에서 공통으로 사용.
function CourseAuthorRow({
  authorType,
  author,
  date,
  badgeAfter = false
}: {
  authorType: AuthorType;
  author: string;
  date?: string;
  badgeAfter?: boolean; // true면 배지를 닉네임 뒤로 보낸다(기본은 배지가 먼저).
}) {
  const badge =
    authorType === "admin" ? (
      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
        <ShieldCheck className="h-3 w-3" />
        관리자
      </span>
    ) : (
      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
        <User className="h-3 w-3" />
        유저
      </span>
    );
  return (
    <div className="mb-2 flex items-center gap-1.5">
      {!badgeAfter && badge}
      <span className="text-xs font-medium text-gray-500">{author}</span>
      {badgeAfter && badge}
      {date && <span className="ml-auto text-[10px] text-gray-300">{date}</span>}
    </div>
  );
}

const recommendedCourses = [
  {
    id: 1,
    title: "대전 하루 완전 정복",
    duration: "1일",
    places: 8,
    rating: 4.9,
    likes: 245,
    themes: ["문화예술", "먹거리", "자연힐링"],
    author: "다대유 추천단",
    authorType: "admin" as AuthorType,
    date: "2025.03.02"
  },
  {
    id: 2,
    title: "자연 속 힐링 여행",
    duration: "2일",
    places: 6,
    rating: 4.8,
    likes: 189,
    themes: ["자연힐링"],
    author: "다대유 추천단",
    authorType: "admin" as AuthorType,
    date: "2025.03.15"
  },
  {
    id: 3,
    title: "문화와 예술을 찾아서",
    duration: "1일",
    places: 5,
    rating: 4.7,
    likes: 156,
    themes: ["문화예술", "역사근대"],
    author: "다대유 추천단",
    authorType: "admin" as AuthorType,
    date: "2025.04.01"
  },
  {
    id: 4,
    title: "성심당과 빵집 투어",
    duration: "반일",
    places: 4,
    rating: 4.9,
    likes: 312,
    themes: ["빵지순례", "먹거리"],
    author: "다대유 추천단",
    authorType: "admin" as AuthorType,
    date: "2025.04.18"
  },
  {
    id: 5,
    title: "대전 과학 탐험",
    duration: "1일",
    places: 5,
    rating: 4.6,
    likes: 98,
    themes: ["과학"],
    author: "다대유 추천단",
    authorType: "admin" as AuthorType,
    date: "2025.05.09"
  },
  {
    id: 6,
    title: "역사 따라 걷는 대전",
    duration: "1일",
    places: 6,
    rating: 4.5,
    likes: 74,
    themes: ["역사근대", "문화예술"],
    author: "다대유 추천단",
    authorType: "admin" as AuthorType,
    date: "2025.05.20"
  }
];

// "YYYY-MM-DD..." / "YYYY-MM-DD" 형태의 날짜값을 "YYYY.MM.DD" 로 통일해 보여준다.
function formatDotDate(value?: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10).replaceAll("-", ".");
}

// 내 코스 목록(tb_course)에서 조회할 컬럼
type DbCourse = {
  course_id: number;
  course_nm: string;
  open_yn: string;
  startdate: string | null;
  enddate: string | null;
  registtime: string | null;
  updatetime: string | null;
};

export default function Course() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, member } = useAuth();
  // 코스 추가/취소 후, 혹은 코스 상세에서 뒤로가기 시 원래 보던 탭이 유지되도록 쿼리로 초기 탭을 정한다.
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "my" || tabParam === "recommend" ? tabParam : "shared";
  const [activeTab, setActiveTab] = useState<"shared" | "recommend" | "my">(initialTab);
  const [loginNotice, setLoginNotice] = useState(false);
  const showLoginNotice = () => {
    setLoginNotice(true);
    setTimeout(() => setLoginNotice(false), 2000);
  };
  const goCreateCourse = () => {
    if (!user) {
      showLoginNotice();
      return;
    }
    router.push("/course/new");
  };

  // 내 코스 — tb_course 중 register=로그인 사용자 id 인 행만 조회 (삭제 제외), 페이지 단위로 로드
  const MY_COURSES_PAGE_SIZE = 20;
  const [myDbCourses, setMyDbCourses] = useState<DbCourse[]>([]);
  const [myCoursesError, setMyCoursesError] = useState("");
  const [myCoursesLoadingMore, setMyCoursesLoadingMore] = useState(false);
  const [myHasMore, setMyHasMore] = useState(false);
  // course_id -> tb_course_like 행 개수 (즐겨찾기 수)
  const [courseLikeCounts, setCourseLikeCounts] = useState<Record<number, number>>({});
  // course_id -> 일정 요약(며칠 일정인지, 장소 몇 곳인지) — tb_course_detail 집계
  const [courseMeta, setCourseMeta] = useState<
    Record<number, { duration: string; places: number }>
  >({});
  // course_id -> 해시태그(포함된 장소들의 대분류+접근성 종합 상위 3개)
  const [courseHashtags, setCourseHashtags] = useState<Record<number, string[]>>({});

  // (offset, limit) 구간의 내 코스 + 좋아요수/일정요약/해시태그를 조회한다. 초기 로드/더보기 양쪽에서 재사용.
  const loadMyCoursesPage = useCallback(async (userId: string, offset: number, limit: number) => {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();
    // count: "exact" 는 Content-Range 응답 헤더에 담겨 오는데, 브라우저(RLS 경유) 요청에선
    // CORS 로 그 헤더가 노출 안 돼 항상 null 로 잡혀 hasMore 가 절대 true 가 안 되는 문제가 있었다.
    // (서버 API 로 호출하는 공유 코스 쪽은 Node 환경이라 CORS 제약이 없어 정상 동작함.)
    // 그래서 count 대신 "받아온 개수가 요청한 limit 와 같으면 다음 페이지가 더 있다"로 판단한다.
    const { data, error } = await supabase
      .from("tb_course")
      .select("course_id, course_nm, open_yn, startdate, enddate, registtime, updatetime")
      .eq("register", userId)
      .neq("delete_yn", "Y")
      .order("registtime", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    const courses = (data ?? []) as DbCourse[];
    const hasMore = courses.length === limit;

    const courseIds = courses.map((c) => c.course_id);
    if (courseIds.length === 0) {
      return { courses, hasMore, likeCounts: {}, meta: {}, hashtags: {} } as const;
    }

    const { data: likeRows, error: likeErr } = await supabase
      .from("tb_course_like")
      .select("course_id")
      .in("course_id", courseIds);
    if (likeErr) throw likeErr;
    const likeCounts: Record<number, number> = {};
    for (const row of likeRows ?? []) {
      likeCounts[row.course_id] = (likeCounts[row.course_id] ?? 0) + 1;
    }

    const { data: detailRows, error: detailErr } = await supabase
      .from("tb_course_detail")
      .select("course_id, day, place_id")
      .in("course_id", courseIds);
    if (detailErr) throw detailErr;
    const daysByCourse = new Map<number, Set<number>>();
    const placesByCourse = new Map<number, number>();
    const placeIdsByCourse = new Map<number, Set<number>>();
    for (const row of detailRows ?? []) {
      const days = daysByCourse.get(row.course_id) ?? new Set<number>();
      days.add(row.day);
      daysByCourse.set(row.course_id, days);
      placesByCourse.set(row.course_id, (placesByCourse.get(row.course_id) ?? 0) + 1);
      const placeIds = placeIdsByCourse.get(row.course_id) ?? new Set<number>();
      placeIds.add(row.place_id);
      placeIdsByCourse.set(row.course_id, placeIds);
    }
    const meta: Record<number, { duration: string; places: number }> = {};
    for (const cid of courseIds) {
      const dayCount = daysByCourse.get(cid)?.size ?? 0;
      meta[cid] = {
        duration: dayCount > 1 ? `${dayCount}일` : "반일",
        places: placesByCourse.get(cid) ?? 0
      };
    }

    // 해시태그 — 코스별 포함 장소들의 대분류(lclssystm1)+접근성 요약플래그를 종합해 상위 3개.
    const allPlaceIds = [...new Set((detailRows ?? []).map((r) => r.place_id))];
    const placesById = new Map<
      number,
      { contentid: string | number | null; lclssystm1: string | null }
    >();
    if (allPlaceIds.length > 0) {
      const { data: placeRows, error: placeErr } = await supabase
        .from("tb_place")
        .select("place_id, contentid, lclssystm1")
        .in("place_id", allPlaceIds);
      if (placeErr) throw placeErr;
      for (const p of placeRows ?? []) placesById.set(p.place_id, p);
    }

    const themeCodes = [...new Set([...placesById.values()].map((p) => p.lclssystm1))].filter(
      (v): v is string => v != null
    );
    const themeLabelByCode = new Map<string, string>();
    if (themeCodes.length > 0) {
      const { data: codeRows, error: codeErr } = await supabase
        .from("tb_code")
        .select("code_id, code_nm")
        .eq("code_group", "LCLSSYSTM1")
        .in("code_id", themeCodes);
      if (codeErr) throw codeErr;
      for (const c of codeRows ?? []) themeLabelByCode.set(c.code_id, c.code_nm);
    }

    const allContentIds = [
      ...new Set(
        [...placesById.values()]
          .map((p) => (p.contentid != null && p.contentid !== "" ? Number(p.contentid) : null))
          .filter((v): v is number => v != null)
      )
    ];
    const bfFlagsByContentId = new Map<
      number,
      { has_blind: boolean; has_deaf: boolean; has_gait: boolean; has_infant: boolean }
    >();
    if (allContentIds.length > 0) {
      const { data: bfRows, error: bfErr } = await supabase
        .from("tb_place_barrierfree")
        .select("contentid, has_blind, has_deaf, has_gait, has_infant")
        .in("contentid", allContentIds);
      if (bfErr) throw bfErr;
      for (const b of bfRows ?? []) bfFlagsByContentId.set(Number(b.contentid), b);
    }

    const hashtags: Record<number, string[]> = {};
    for (const cid of courseIds) {
      const badgeCounts = new Map<string, number>();
      const bump = (label: string | null | undefined) => {
        if (!label) return;
        badgeCounts.set(label, (badgeCounts.get(label) ?? 0) + 1);
      };
      for (const pid of placeIdsByCourse.get(cid) ?? []) {
        const place = placesById.get(pid);
        if (!place) continue;
        if (place.lclssystm1) bump(themeLabelByCode.get(place.lclssystm1));
        const contentId =
          place.contentid != null && place.contentid !== "" ? Number(place.contentid) : null;
        const flags = contentId != null ? bfFlagsByContentId.get(contentId) : undefined;
        if (flags?.has_blind) bump("시각장애");
        if (flags?.has_deaf) bump("청각장애");
        if (flags?.has_gait) bump("보행장애");
        if (flags?.has_infant) bump("영유아");
      }
      hashtags[cid] = [...badgeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label]) => label);
    }

    return { courses, hasMore, likeCounts, meta, hashtags } as const;
  }, []);

  // user 는 Supabase 의 onAuthStateChange(토큰 자동 리프레시, 탭 포커스 복귀 시 세션 재검증 등)가
  // 일어날 때마다 "내용은 같아도 매번 새 객체 참조"로 갱신된다. 이 effect의 deps 에 user 객체
  // 자체를 넣으면 그 재발급마다 재실행되어 무한 스크롤로 불러온 목록을 처음 20개로 계속 덮어써버린다
  // (그래서 "스크롤해도 안 늘어나는 것처럼" 보임) — 실제로 로그인 사용자가 바뀔 때만 반응하도록
  // user?.id (문자열 값)만 deps 로 쓴다.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      // 비로그인 상태에선 "내 코스" 목록을 비운다.
      setMyDbCourses([]);
      setMyCoursesError("");
      setCourseLikeCounts({});
      setCourseMeta({});
      setCourseHashtags({});
      setMyHasMore(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const page = await loadMyCoursesPage(userId, 0, MY_COURSES_PAGE_SIZE);
        if (!active) return;
        setMyDbCourses(page.courses);
        setCourseLikeCounts(page.likeCounts);
        setCourseMeta(page.meta);
        setCourseHashtags(page.hashtags);
        setMyHasMore(page.hasMore);
      } catch (e) {
        if (active) setMyCoursesError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, loadMyCoursesPage]);

  const loadMoreMyCourses = useCallback(async () => {
    if (!userId || myCoursesLoadingMore || !myHasMore) return;
    setMyCoursesLoadingMore(true);
    try {
      const page = await loadMyCoursesPage(userId, myDbCourses.length, MY_COURSES_PAGE_SIZE);
      setMyDbCourses((prev) => [...prev, ...page.courses]);
      setCourseLikeCounts((prev) => ({ ...prev, ...page.likeCounts }));
      setCourseMeta((prev) => ({ ...prev, ...page.meta }));
      setCourseHashtags((prev) => ({ ...prev, ...page.hashtags }));
      setMyHasMore(page.hasMore);
    } catch (e) {
      setMyCoursesError(e instanceof Error ? e.message : String(e));
    } finally {
      setMyCoursesLoadingMore(false);
    }
  }, [userId, myCoursesLoadingMore, myHasMore, myDbCourses.length, loadMyCoursesPage]);

  // 무한 스크롤 — 목록 하단 sentinel 이 보이면 자동으로 다음 페이지 로드.
  // sentinel 은 탭 전환(activeTab)·hasMore 변화에 따라 DOM 에 붙었다 떨어졌다 하므로,
  // useEffect + deps 로 옵저버를 붙이면 "노드는 새로 생겼는데 deps 는 그대로"인 순간
  // (예: 다른 탭에 있는 동안 hasMore 가 true 로 바뀜 → 나중에 탭을 열어도 재실행 안 됨)
  // 옵저버가 영영 안 붙거나, 이미 제거된 옛 노드를 계속 관찰하게 된다.
  // callback ref 는 노드가 붙고 떨어질 때마다 정확히 호출되므로 그 문제가 원천 차단된다.
  // loadMore 는 페이지를 불러올 때마다 정체성이 바뀌니 ref 로 최신 것만 참조한다
  // (옵저버를 매번 재생성하면 이미 보이는 sentinel 재관찰 → 즉시 재발화로 전부 로드돼버림).
  const loadMoreMyCoursesRef = useRef(loadMoreMyCourses);
  useEffect(() => {
    loadMoreMyCoursesRef.current = loadMoreMyCourses;
  }, [loadMoreMyCourses]);
  const myObserverRef = useRef<IntersectionObserver | null>(null);
  const setMySentinel = useCallback((el: HTMLDivElement | null) => {
    myObserverRef.current?.disconnect();
    myObserverRef.current = null;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreMyCoursesRef.current();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    myObserverRef.current = observer;
  }, []);

  // 코스 삭제(소프트 삭제) — 목록에서 바로 삭제, 성공하면 목록에서도 즉시 제거.
  const [deletingCourseId, setDeletingCourseId] = useState<number | null>(null);
  const handleDeleteCourse = async (e: MouseEvent, courseId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("이 코스를 삭제할까요? 되돌릴 수 없습니다.")) return;
    if (!user) return;
    setDeletingCourseId(courseId);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("tb_course")
        .update({ delete_yn: "Y", deletetime: new Date().toISOString(), deleter: user.id })
        .eq("course_id", courseId);
      if (error) throw error;
      setMyDbCourses((prev) => prev.filter((c) => c.course_id !== courseId));
    } catch (e2) {
      const message =
        e2 instanceof Error
          ? e2.message
          : typeof e2 === "object" && e2 !== null && "message" in e2
            ? String((e2 as { message: unknown }).message)
            : String(e2);
      setMyCoursesError(message);
    } finally {
      setDeletingCourseId(null);
    }
  };

  // 공유 코스 필터 (먼저 선언 — 아래 조회 로직에서 이 값을 참조한다)
  // 코스 상세 → 뒤로가기로 돌아왔을 때 카드 클릭 당시의 필터를 그대로 복원한다.
  const [showSharedFilters, setShowSharedFilters] = useState(() => {
    const saved = !id ? readCourseListReturn() : null;
    return saved?.tab === "shared" ? !!saved.showFilters : false;
  });
  const [sharedFilters, setSharedFilters] = useState<Filters>(() => {
    const saved = !id ? readCourseListReturn() : null;
    return saved?.tab === "shared" && saved.filters ? saved.filters : DEFAULT_FILTERS;
  });
  // 필터 패널에서 만지는 건 "초안(draft)" — 검색 버튼을 눌러야 실제 조회에 쓰이는 sharedFilters
  // 로 반영된다(선택할 때마다 바로 검색되지 않도록).
  const [sharedFilterDraft, setSharedFilterDraft] = useState<Filters>(sharedFilters);
  // 공유 코스 필터의 위치(구/동) 선택지 — tb_place.ldongsigngucd 는 이름이 아니라 코드로
  // 저장돼 있어서, 필터 UI(이름 기준)와 서버 조회(코드 기준) 사이를 변환해줘야 한다.
  const [sharedAreaCodes, setSharedAreaCodes] = useState<{ code: string; name: string }[]>([]);
  useEffect(() => {
    let active = true;
    fetch("/api/area-code")
      .then((r) => r.json())
      .then((data) => {
        if (active) setSharedAreaCodes(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  // 조회에 실제로 쓰이는 건 "적용된" 필터(sharedFilters) 기준 코드.
  const sharedGuCode = sharedAreaCodes.find((a) => a.name === sharedFilters.gu)?.code ?? "";
  // 반면 동 선택지는 필터 패널에서 "구"를 고르는 즉시(검색 누르기 전이라도) 바뀌어야 하므로
  // draft 기준으로 따로 계산한다.
  const sharedDraftGuCode =
    sharedAreaCodes.find((a) => a.name === sharedFilterDraft.gu)?.code ?? "";
  const [sharedDongOptions, setSharedDongOptions] = useState<string[]>([]);
  useEffect(() => {
    if (!sharedDraftGuCode) {
      setSharedDongOptions([]);
      return;
    }
    let active = true;
    fetch(`/api/area-code/dong?gu=${encodeURIComponent(sharedDraftGuCode)}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setSharedDongOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sharedDraftGuCode]);

  // 접근성/테마/위치/즐겨찾기는 서버(쿼리 파라미터)에서 필터링한다 — 무한스크롤 페이지네이션과
  // 맞물려야 해서 클라이언트에서 로드된 페이지만 걸러내면 hasMore 판정이 어긋난다.
  // 배열은 순서와 무관하게 같은 조합이면 같은 요청으로 취급하려고 정렬 후 문자열 키로 비교한다.
  // gu 는 이름이 아니라 변환된 코드(sharedGuCode)를 키에 넣어야, area-code 로딩이 늦게 끝나
  // sharedGuCode 가 나중에 채워지는 경우에도 재조회가 정확히 트리거된다.
  const sharedFilterKey = JSON.stringify({
    accessibility: [...sharedFilters.accessibility].sort(),
    themes: [...sharedFilters.themes].sort(),
    favoritesOnly: sharedFilters.favoritesOnly,
    gu: sharedGuCode,
    dong: sharedFilters.dong,
    headcount: sharedFilters.headcount,
    dateFrom: sharedFilters.dateFrom,
    dateTo: sharedFilters.dateTo
  });

  // 공유 코스 — tb_course.open_yn='Y' 를 필터 조건에 맞춰 DB에서 페이지 단위로 조회
  const SHARED_PAGE_SIZE = 20;
  const [sharedDbCourses, setSharedDbCourses] = useState<TourismSharedCourse[]>([]);
  const [sharedCoursesLoading, setSharedCoursesLoading] = useState(true);
  const [sharedCoursesLoadingMore, setSharedCoursesLoadingMore] = useState(false);
  const [sharedCoursesError, setSharedCoursesError] = useState("");
  const [sharedHasMore, setSharedHasMore] = useState(false);

  // 필터 "세대" — 필터가 바뀔 때(=처음부터 다시 조회할 때)만 증가한다.
  // "더보기"는 새 세대를 만들지 않고 현재 세대에 속한다: 더보기가 세대를 올려버리면 진행 중이던
  // 초기 조회가 stale 로 판정돼 응답이 통째로 버려지고 로딩 플래그도 못 내려 스피너가 고착된다.
  // 응답 도착 시 자기 세대가 아직 유효한지 확인한 뒤에만 상태를 반영한다.
  const sharedGenerationRef = useRef(0);

  useEffect(() => {
    const generation = ++sharedGenerationRef.current;
    setSharedCoursesLoading(true);
    // 진행 중이던 "더보기"는 이 세대에서 무효 — 응답이 와도 stale 가드에 걸려 finally 가
    // 스킵되므로 여기서 미리 꺼두지 않으면 더보기 스피너가 켜진 채 남는다.
    setSharedCoursesLoadingMore(false);
    (async () => {
      try {
        const { items, hasMore } = await fetchSharedCourses(0, SHARED_PAGE_SIZE, {
          accessibility: sharedFilters.accessibility,
          themes: sharedFilters.themes,
          favoritesOnly: sharedFilters.favoritesOnly,
          gu: sharedGuCode,
          dong: sharedFilters.dong,
          headcount: sharedFilters.headcount,
          dateFrom: sharedFilters.dateFrom,
          dateTo: sharedFilters.dateTo
        });
        if (sharedGenerationRef.current !== generation) return;
        setSharedDbCourses(items);
        setSharedHasMore(hasMore);
      } catch (e) {
        if (sharedGenerationRef.current !== generation) return;
        setSharedCoursesError(e instanceof Error ? e.message : String(e));
      } finally {
        if (sharedGenerationRef.current === generation) setSharedCoursesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedFilterKey]);

  const loadMoreSharedCourses = useCallback(async () => {
    // 초기 조회(필터 변경 등)가 진행 중이면 더보기는 건너뛴다 — 목록이 스피너로 바뀌며 페이지가
    // 짧아진 순간 sentinel 이 뷰포트에 들어와 발화하는 것을 막는다.
    if (sharedCoursesLoading || sharedCoursesLoadingMore || !sharedHasMore) return;
    const generation = sharedGenerationRef.current; // 세대를 올리지 않고 현재 세대에 속한다
    setSharedCoursesLoadingMore(true);
    try {
      const { items, hasMore } = await fetchSharedCourses(
        sharedDbCourses.length,
        SHARED_PAGE_SIZE,
        {
          accessibility: sharedFilters.accessibility,
          themes: sharedFilters.themes,
          favoritesOnly: sharedFilters.favoritesOnly,
          gu: sharedGuCode,
          dong: sharedFilters.dong,
          headcount: sharedFilters.headcount,
          dateFrom: sharedFilters.dateFrom,
          dateTo: sharedFilters.dateTo
        }
      );
      if (sharedGenerationRef.current !== generation) return;
      setSharedDbCourses((prev) => [...prev, ...items]);
      setSharedHasMore(hasMore);
    } catch (e) {
      if (sharedGenerationRef.current !== generation) return;
      setSharedCoursesError(e instanceof Error ? e.message : String(e));
    } finally {
      if (sharedGenerationRef.current === generation) setSharedCoursesLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sharedCoursesLoading,
    sharedCoursesLoadingMore,
    sharedHasMore,
    sharedDbCourses.length,
    sharedFilterKey,
    sharedGuCode
  ]);

  // 무한 스크롤 — 내 코스 쪽과 동일하게 callback ref 로 sentinel 노드에 옵저버를 붙인다.
  const loadMoreSharedCoursesRef = useRef(loadMoreSharedCourses);
  useEffect(() => {
    loadMoreSharedCoursesRef.current = loadMoreSharedCourses;
  }, [loadMoreSharedCourses]);
  const sharedObserverRef = useRef<IntersectionObserver | null>(null);
  const setSharedSentinel = useCallback((el: HTMLDivElement | null) => {
    sharedObserverRef.current?.disconnect();
    sharedObserverRef.current = null;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreSharedCoursesRef.current();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    sharedObserverRef.current = observer;
  }, []);

  // 추천 코스 필터 — 공유 코스와 동일하게 뒤로가기 시 필터 복원.
  const [showFilters, setShowFilters] = useState(() => {
    const saved = !id ? readCourseListReturn() : null;
    return saved?.tab === "recommend" ? !!saved.showFilters : false;
  });
  const [filters, setFilters] = useState<Filters>(() => {
    const saved = !id ? readCourseListReturn() : null;
    return saved?.tab === "recommend" && saved.filters ? saved.filters : DEFAULT_FILTERS;
  });
  const [showResults, setShowResults] = useState(false);

  // 코스 상세 → 뒤로가기로 돌아왔을 때, 클릭했던 코스 카드가 보이는 위치로 스크롤 복원.
  // 무한 스크롤이라 그 카드가 아직 로드 안 됐을 수 있어, 못 찾으면 다음 페이지를 더 불러와 재시도한다.
  // sessionStorage 는 "이 컴포넌트가 처음 마운트될 때" 딱 한 번만 읽어 고정한다 — 매 렌더/effect 마다
  // 다시 읽으면, 카드를 클릭해 상세로 "들어가는" 순간(아직 이 컴포넌트가 언마운트되기 전) 방금 자신이
  // 저장한 값을 곧바로 다시 읽어 스스로 소비해버리는 경쟁 상태가 생긴다(진짜 "뒤로가기"가 아닌데도).
  // 이 Course() 함수는 /course(목록)와 /course/[id](상세) 양쪽에서 재사용되므로, id 가 있을 때
  // (=상세 페이지로 새로 마운트됐을 때)는 애초에 읽지도, 복원 로직을 돌리지도 않는다.
  const [pendingRestore] = useState(() => (id ? null : readCourseListReturn()));
  useEffect(() => {
    if (id) return;
    if (!pendingRestore || pendingRestore.tab !== activeTab) return;
    if (pendingRestore.tab === "shared" && sharedCoursesLoading) return;

    const el = document.querySelector(`[data-course-id="${pendingRestore.courseId}"]`);
    if (el) {
      el.scrollIntoView({ block: "center" });
      clearCourseListReturn();
      return;
    }
    if (pendingRestore.tab === "shared" && sharedHasMore) {
      loadMoreSharedCourses();
      return;
    }
    if (pendingRestore.tab === "my" && myHasMore) {
      loadMoreMyCourses();
      return;
    }
    // 더 불러올 게 없는데도 못 찾았다면(삭제됐거나 필터에 걸림) 저장했던 좌표로라도 복원.
    window.scrollTo(0, pendingRestore.scrollY);
    clearCourseListReturn();
  }, [
    id,
    pendingRestore,
    activeTab,
    sharedCoursesLoading,
    sharedDbCourses,
    myDbCourses,
    sharedHasMore,
    myHasMore,
    loadMoreSharedCourses,
    loadMoreMyCourses
  ]);

  if (id) return <CourseDetail id={id} />;

  // 공유 코스 helpers — 필터 패널 조작은 전부 draft 에만 반영한다.
  const setShared = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setSharedFilterDraft((prev) => ({ ...prev, [key]: val }));
  const toggleSharedList = (key: "themes" | "accessibility", item: string) =>
    setSharedFilterDraft((prev) => {
      const list = prev[key] as string[];
      return {
        ...prev,
        [key]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
      };
    });
  // "검색" 버튼을 눌러야 draft 가 실제 조회에 쓰이는 sharedFilters 로 반영된다.
  const applySharedFilters = () => {
    setSharedFilters(sharedFilterDraft);
  };
  const resetShared = () => {
    setSharedFilterDraft(DEFAULT_FILTERS);
    setSharedFilters(DEFAULT_FILTERS);
  };
  const sharedFilterCount = [
    sharedFilters.accessibility.length > 0,
    sharedFilters.gu,
    sharedFilters.themes.length > 0,
    sharedFilters.headcount > 1,
    sharedFilters.dateFrom || sharedFilters.dateTo,
    sharedFilters.minRating > 0,
    sharedFilters.favoritesOnly
  ].filter(Boolean).length;
  // 접근성/테마/즐겨찾기는 서버에서 이미 필터링해 내려온다 — 여기선 아직 서버 반영 전인
  // 별점만 클라이언트에서 처리한다. 코스 단위 별점 데이터가 아직 없어 켜지면 결과 없음으로 처리.
  const filteredShared = sharedFilters.minRating > 0 ? [] : sharedDbCourses;

  // 추천 코스 helpers
  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: val }));
  const toggleList = (key: "themes" | "accessibility", item: string) =>
    setFilters((prev) => {
      const list = prev[key] as string[];
      return {
        ...prev,
        [key]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
      };
    });
  const resetAll = () => {
    setFilters(DEFAULT_FILTERS);
    setShowResults(false);
  };
  const activeFilterCount = [
    filters.accessibility.length > 0,
    filters.gu,
    filters.themes.length > 0,
    filters.headcount > 1,
    filters.dateFrom || filters.dateTo,
    filters.minRating > 0,
    filters.favoritesOnly
  ].filter(Boolean).length;
  const filteredCourses = recommendedCourses.filter((course) => {
    if (filters.themes.length > 0 && !course.themes.some((t) => filters.themes.includes(t)))
      return false;
    if (filters.minRating > 0 && course.rating < filters.minRating) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Tabs — 헤더(h-16) 바로 아래에 고정, 위쪽 여백은 살짝 줄임 */}
      <div className="bg-background sticky top-16 z-30 -mt-3 flex border-b border-gray-200">
        {(["shared", "recommend", "my"] as const).map((tab) => {
          const labels = { shared: "공유 코스", recommend: "추천 코스", my: "내 코스" };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "text-brand-600 border-brand-600 border-b-2"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Shared Courses Tab */}
      {activeTab === "shared" && (
        <div className="space-y-4">
          {/* 필터 토글 헤더 */}
          <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
            <button
              onClick={() => {
                // 열 때는 draft 를 현재 적용된 값으로 다시 맞춰서, 이전에 검색 없이 만지다 만
                // 값이 남아있지 않게 한다.
                if (!showSharedFilters) setSharedFilterDraft(sharedFilters);
                setShowSharedFilters(!showSharedFilters);
              }}
              className="flex flex-1 items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-gray-500" />
                <span>필터</span>
                {sharedFilterCount > 0 && (
                  <span className="bg-brand-600 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
                    {sharedFilterCount}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${showSharedFilters ? "rotate-180" : ""}`}
              />
            </button>
            {sharedFilterCount > 0 && (
              <button
                onClick={resetShared}
                className="shrink-0 border-l border-gray-200 px-3 py-2.5 text-xs text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                초기화
              </button>
            )}
          </div>

          {/* 필터 패널 */}
          {showSharedFilters && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
              <FilterFields
                filters={sharedFilterDraft}
                set={setShared}
                toggleList={toggleSharedList}
                guOptions={sharedAreaCodes.map((a) => a.name)}
                dongOptions={sharedDongOptions}
              />
              <button
                onClick={applySharedFilters}
                className="bg-brand-600 hover:bg-brand-700 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
              >
                검색
              </button>
            </div>
          )}

          {/* 결과 수 */}
          {sharedCoursesError ? (
            <p className="text-sm text-red-500">{sharedCoursesError}</p>
          ) : (
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{filteredShared.length}개</span>의 코스
              {sharedFilterCount > 0 && "를 찾았어요"}
            </p>
          )}

          {/* 코스 목록 */}
          {sharedCoursesLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
              <span className="border-brand-500 h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-transparent" />
              불러오는 중...
            </div>
          ) : filteredShared.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredShared.map((course) => (
                <Card key={course.course_id} asChild variant="interactive">
                  <Link
                    href={`/course/${course.course_id}`}
                    data-course-id={course.course_id}
                    onClick={() =>
                      saveCourseListReturn(
                        "shared",
                        course.course_id,
                        sharedFilters,
                        showSharedFilters
                      )
                    }
                    className="block"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <h3 className="text-ink truncate font-semibold">{course.course_nm}</h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-gray-700">0</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
                          <span>{course.like_count}</span>
                        </div>
                      </div>
                    </div>
                    <CourseAuthorRow
                      authorType={course.author_role === "admin" ? "admin" : "user"}
                      author={course.author_nickname}
                      badgeAfter
                    />
                    {course.hashtags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {course.hashtags.map((label) => (
                          <Badge key={label} tone="brand" shape="pill">
                            #{label}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-gray-500">
                      <div className="flex shrink-0 gap-2 whitespace-nowrap">
                        {(course.startdate || course.enddate) && (
                          <>
                            <span className="text-steel">
                              {course.startdate?.slice(0, 10) ?? ""}
                              {" ~ "}
                              {course.enddate?.slice(0, 10) ?? ""}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>{course.place_count}곳</span>
                      </div>
                      <span className="text-steel shrink-0 text-xs whitespace-nowrap">
                        등록 {formatDotDate(course.registtime)}
                        {course.updatetime && ` · 수정 ${formatDotDate(course.updatetime)}`}
                      </span>
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <X className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">조건에 맞는 코스가 없어요</p>
              <button
                onClick={resetShared}
                className="text-brand-600 hover:text-brand-700 mt-2 text-sm underline underline-offset-2"
              >
                필터 초기화
              </button>
            </div>
          )}

          {/* 무한 스크롤 sentinel — 화면에 보이면 자동으로 다음 페이지 로드.
              초기 조회 중에는 목록이 스피너로 바뀌어 페이지가 짧아지므로, sentinel 을 아예
              렌더하지 않아 그 순간 뷰포트에 들어와 발화하는 일이 없게 한다. */}
          {sharedHasMore && !sharedCoursesLoading && (
            <div ref={setSharedSentinel} className="flex items-center justify-center gap-2 py-6">
              {sharedCoursesLoadingMore && (
                <>
                  <span className="border-brand-500 h-6 w-6 animate-spin rounded-full border-[3px] border-gray-200 border-t-transparent" />
                  <span className="text-sm font-medium text-gray-500">불러오는 중...</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recommend Tab */}
      {activeTab === "recommend" && (
        <div className="space-y-4">
          {/* 필터 토글 헤더 */}
          <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex flex-1 items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-gray-500" />
                <span>필터</span>
                {activeFilterCount > 0 && (
                  <span className="bg-brand-600 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>
            {(activeFilterCount > 0 || showResults) && (
              <button
                onClick={resetAll}
                className="shrink-0 border-l border-gray-200 px-3 py-2.5 text-xs text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                초기화
              </button>
            )}
          </div>

          {/* 필터 패널 */}
          {showFilters && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <FilterFields filters={filters} set={set} toggleList={toggleList} />
            </div>
          )}

          {/* AI 추천 배너 */}
          <div className="bg-brand-50 flex items-center justify-between rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-brand-600 h-5 w-5" />
              <div>
                <p className="text-brand-900 text-sm font-semibold">AI 코스 추천받기</p>
                <p className="text-brand-600 mt-0.5 text-xs">
                  필터 조건에 맞는 최적의 코스를 추천해드려요
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowResults(true)}
              className="bg-brand-600 hover:bg-brand-700 shrink-0 rounded-lg px-4 py-2 text-sm text-white transition-colors"
            >
              추천받기
            </button>
          </div>

          {/* 결과 */}
          {showResults ? (
            <>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{filteredCourses.length}개</span>의
                코스를 찾았어요
              </p>
              <div className="space-y-3">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/course/${course.id}`}
                      data-course-id={course.id}
                      onClick={() =>
                        saveCourseListReturn("recommend", course.id, filters, showFilters)
                      }
                      className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                    >
                      <CourseAuthorRow
                        authorType={course.authorType}
                        author={course.author}
                        date={course.date}
                      />
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="font-semibold text-gray-800">{course.title}</h3>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-gray-700">{course.rating}</span>
                        </div>
                      </div>
                      <div className="mb-3 flex gap-3 text-sm text-gray-600">
                        <span>{course.duration}</span>
                        <span>•</span>
                        <span>{course.places}곳</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {course.themes.map((t) => (
                            <span
                              key={t}
                              className="bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-xs"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Heart className="h-3.5 w-3.5" />
                          <span>{course.likes}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-400">
                    <X className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    <p className="text-sm">조건에 맞는 코스가 없어요</p>
                    <button
                      onClick={resetAll}
                      className="text-brand-600 hover:text-brand-700 mt-2 text-sm underline underline-offset-2"
                    >
                      필터 초기화
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-14 text-center text-gray-400">
              <Sparkles className="text-brand-300 mx-auto mb-3 h-10 w-10" />
              <p className="text-sm font-medium text-gray-500">원하는 조건을 설정하고</p>
              <p className="text-sm text-gray-400">AI 코스 추천받기를 눌러보세요</p>
            </div>
          )}
        </div>
      )}

      {/* My Courses Tab */}
      {activeTab === "my" && (
        <div className="space-y-4">
          <button
            onClick={goCreateCourse}
            className="hover:border-brand-400 hover:text-brand-600 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-gray-600 transition-colors"
          >
            <Plus className="h-5 w-5" />새 코스 만들기
          </button>
          {!user && (
            <p className="text-stone py-8 text-center text-sm">
              로그인하면 내가 만든 코스를 볼 수 있어요
            </p>
          )}
          {user && myCoursesError && (
            <p className="text-sm text-red-500">목록 조회 실패: {myCoursesError}</p>
          )}
          {user && !myCoursesError && myDbCourses.length > 0 && (
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{myDbCourses.length}개</span>의 코스
            </p>
          )}
          {user && !myCoursesError && myDbCourses.length === 0 && (
            <p className="text-stone py-8 text-center text-sm">아직 만든 코스가 없어요</p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {myDbCourses.map((course) => (
              <Card key={course.course_id} asChild variant="interactive">
                <Link
                  href={`/course/${course.course_id}`}
                  data-course-id={course.course_id}
                  onClick={() => saveCourseListReturn("my", course.course_id)}
                  className="block"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <h3 className="text-ink truncate font-semibold">{course.course_nm}</h3>
                      <Badge tone={course.open_yn === "N" ? "neutral" : "brand"} shape="tag">
                        {course.open_yn === "N" ? "비공개" : "공개"}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-gray-700">0</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
                        <span>{courseLikeCounts[course.course_id] ?? 0}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteCourse(e, course.course_id)}
                        disabled={deletingCourseId === course.course_id}
                        className="rounded-lg p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-60"
                        aria-label="코스 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <CourseAuthorRow
                    authorType={member?.role === "admin" ? "admin" : "user"}
                    author={member?.nickname ?? "나"}
                    badgeAfter
                  />
                  {(courseHashtags[course.course_id]?.length ?? 0) > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {courseHashtags[course.course_id].map((label) => (
                        <Badge key={label} tone="brand" shape="pill">
                          #{label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-gray-500">
                    <div className="flex shrink-0 gap-2 whitespace-nowrap">
                      {(course.startdate || course.enddate) && (
                        <>
                          <span className="text-steel">
                            {course.startdate?.slice(0, 10) ?? ""}
                            {" ~ "}
                            {course.enddate?.slice(0, 10) ?? ""}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>{courseMeta[course.course_id]?.places ?? 0}곳</span>
                    </div>
                    <span className="text-steel shrink-0 text-xs whitespace-nowrap">
                      등록 {formatDotDate(course.registtime)}
                      {course.updatetime && ` · 수정 ${formatDotDate(course.updatetime)}`}
                    </span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>

          {/* 무한 스크롤 sentinel — 화면에 보이면 자동으로 다음 페이지 로드 */}
          {myHasMore && (
            <div ref={setMySentinel} className="flex items-center justify-center gap-2 py-6">
              {myCoursesLoadingMore && (
                <>
                  <span className="border-brand-500 h-6 w-6 animate-spin rounded-full border-[3px] border-gray-200 border-t-transparent" />
                  <span className="text-sm font-medium text-gray-500">불러오는 중...</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {loginNotice && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2.5 text-xs whitespace-nowrap text-white shadow-lg">
          로그인 후 이용 가능합니다
        </div>
      )}
    </div>
  );
}

// ── 내 코스 ──────────────────────────────────────────────
type EditPlace = CoursePlace;
type EditDay = CourseDay;

// 장소별 지도 좌표 (Map.tsx PLACES 기준) — cx/cy 는 목록/뱃지 색상 등에 사용
const PLACE_COORDS: Record<string, { cx: number; cy: number; color: string }> = {
  성심당: { cx: 440, cy: 315, color: "#dc2626" },
  "대전 엑스포 과학공원": { cx: 557, cy: 165, color: "#7c3aed" },
  한밭수목원: { cx: 337, cy: 237, color: "#16a34a" },
  유성온천: { cx: 175, cy: 360, color: "#d97706" },
  "대청호 오백리길": { cx: 800, cy: 435, color: "#2563eb" }
};

function CourseDetail({ id }: { id: string }) {
  const isNew = id === "new";
  const numId = Number(id);
  const router = useRouter();
  const { user } = useAuth();

  // 기존 코스 조회 — tb_course + tb_course_detail(+tb_place 조인)로 실제 데이터를 가져온다.
  const [dbCourse, setDbCourse] = useState<MyCourse | null>(null);
  // 소유 여부는 register(등록자 id)만 저장해두고 user 와 매번 비교해서 판단한다.
  // (로그인 상태값과 별개의 boolean 으로 한 번만 계산해두면 로그아웃해도 갱신되지 않는다.)
  const [courseRegister, setCourseRegister] = useState<string | null>(null);
  const [dbCourseLoading, setDbCourseLoading] = useState(!isNew);
  const [dbCourseError, setDbCourseError] = useState("");
  // tb_course_like 행 개수(즐겨찾기 수) — 상세화면에서 실시간 조회.
  const [likeCount, setLikeCount] = useState(0);
  // 코스 배지 — 포함된 장소들의 대분류+접근성 종합 상위 3개(개수 내림차순, 동률은 먼저 집계된 순서).
  const [courseBadges, setCourseBadges] = useState<{ label: string; count: number }[]>([]);
  // 등록자(닉네임/역할) + 등록일/수정일 — tb_course.register 를 tb_members 에서 조회.
  const [courseAuthor, setCourseAuthor] = useState<{
    nickname: string;
    role: "admin" | "user";
    registDate: string;
    updateDate: string | null;
  } | null>(null);

  // tb_course + tb_course_detail(+tb_place 조인) + tb_course_like 개수를 다시 읽어와 dbCourse/likeCount 를 갱신한다.
  // 최초 진입 시와, 편집 저장 직후(수정된 실제 데이터를 다시 반영) 둘 다에 쓴다.
  const loadCourseFromDb = useCallback(
    async (active: () => boolean) => {
      setDbCourseLoading(true);
      setDbCourseError("");
      try {
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();

        const { data: courseRow, error: courseErr } = await supabase
          .from("tb_course")
          .select(
            "course_id, course_nm, open_yn, startdate, enddate, register, registtime, updatetime"
          )
          .eq("course_id", numId)
          .single();
        if (courseErr) throw courseErr;

        const { data: ownerRow } = await supabase
          .from("tb_members")
          .select("nickname, role")
          .eq("id", courseRow.register)
          .maybeSingle();
        if (active()) {
          setCourseAuthor({
            nickname: ownerRow?.nickname ?? "알 수 없음",
            role: ownerRow?.role === "admin" ? "admin" : "user",
            registDate: formatDotDate(courseRow.registtime),
            updateDate: courseRow.updatetime ? formatDotDate(courseRow.updatetime) : null
          });
        }

        const { count: likeCountResult, error: likeErr } = await supabase
          .from("tb_course_like")
          .select("*", { count: "exact", head: true })
          .eq("course_id", numId);
        if (likeErr) throw likeErr;
        if (active()) setLikeCount(likeCountResult ?? 0);

        const { data: detailRows, error: detailErr } = await supabase
          .from("tb_course_detail")
          .select("detail_id, day, place_id, starthour, endhour")
          .eq("course_id", numId)
          .order("day", { ascending: true })
          .order("detail_id", { ascending: true });
        if (detailErr) throw detailErr;

        const placeIds = [...new Set((detailRows ?? []).map((r) => r.place_id))];
        const placesById = new Map<
          number,
          {
            title: string;
            mapx: string;
            mapy: string;
            contentid: string | number | null;
            lclssystm1: string | null;
          }
        >();
        if (placeIds.length > 0) {
          const { data: placeRows, error: placeErr } = await supabase
            .from("tb_place")
            .select("place_id, title, mapx, mapy, contentid, lclssystm1")
            .in("place_id", placeIds);
          if (placeErr) throw placeErr;
          for (const p of placeRows ?? []) placesById.set(p.place_id, p);
        }

        // 코스 배지 — 코스에 포함된(중복 없는) 장소들의 대분류(lclssystm1)와 접근성 요약플래그를
        // 종합해서 개수를 세고, 가장 많은 3개만 배지로 보여준다.
        const themeCodes = [...new Set([...placesById.values()].map((p) => p.lclssystm1))].filter(
          (v): v is string => v != null
        );
        const themeLabelByCode = new Map<string, string>();
        if (themeCodes.length > 0) {
          const { data: codeRows, error: codeErr } = await supabase
            .from("tb_code")
            .select("code_id, code_nm")
            .eq("code_group", "LCLSSYSTM1")
            .in("code_id", themeCodes);
          if (codeErr) throw codeErr;
          for (const c of codeRows ?? []) themeLabelByCode.set(c.code_id, c.code_nm);
        }

        const contentIds = [
          ...new Set(
            [...placesById.values()]
              .map((p) => (p.contentid != null && p.contentid !== "" ? Number(p.contentid) : null))
              .filter((v): v is number => v != null)
          )
        ];
        const bfFlagsByContentId = new Map<
          number,
          { has_blind: boolean; has_deaf: boolean; has_gait: boolean; has_infant: boolean }
        >();
        if (contentIds.length > 0) {
          const { data: bfRows, error: bfErr } = await supabase
            .from("tb_place_barrierfree")
            .select("contentid, has_blind, has_deaf, has_gait, has_infant")
            .in("contentid", contentIds);
          if (bfErr) throw bfErr;
          for (const b of bfRows ?? []) bfFlagsByContentId.set(Number(b.contentid), b);
        }

        const badgeCounts = new Map<string, number>();
        const bumpBadge = (label: string | null | undefined) => {
          if (!label) return;
          badgeCounts.set(label, (badgeCounts.get(label) ?? 0) + 1);
        };
        for (const p of placesById.values()) {
          if (p.lclssystm1) bumpBadge(themeLabelByCode.get(p.lclssystm1));
          const contentId = p.contentid != null && p.contentid !== "" ? Number(p.contentid) : null;
          const flags = contentId != null ? bfFlagsByContentId.get(contentId) : undefined;
          if (flags?.has_blind) bumpBadge("시각장애");
          if (flags?.has_deaf) bumpBadge("청각장애");
          if (flags?.has_gait) bumpBadge("보행장애");
          if (flags?.has_infant) bumpBadge("영유아");
        }
        const topBadges = [...badgeCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([label, count]) => ({ label, count }));
        if (active()) setCourseBadges(topBadges);

        const dayMap = new Map<number, CoursePlace[]>();
        for (const r of detailRows ?? []) {
          const place = placesById.get(r.place_id);
          const list = dayMap.get(r.day) ?? [];
          list.push({
            id: r.detail_id,
            name: place?.title ?? "알 수 없는 장소",
            startHour: r.starthour,
            endHour: r.endhour,
            placeId: r.place_id,
            lat: place ? Number(place.mapy) : undefined,
            lng: place ? Number(place.mapx) : undefined,
            // /api/tourism/detail 은 tb_place.contentid(TourAPI id)로 조회한다 — place_id(내부 PK)와는 다른 값.
            contentId:
              place?.contentid != null && place.contentid !== ""
                ? Number(place.contentid)
                : undefined
          });
          dayMap.set(r.day, list);
        }
        const days: CourseDay[] =
          dayMap.size > 0
            ? [...dayMap.entries()]
                .sort((a, b) => a[0] - b[0])
                .map(([day, places]) => ({ day, places }))
            : [{ day: 1, places: [] }];

        if (!active()) return;
        setDbCourse({
          id: courseRow.course_id,
          title: courseRow.course_nm,
          duration: days.length > 1 ? `${days.length}일` : "반일",
          isPrivate: courseRow.open_yn !== "Y",
          rating: 0,
          likes: 0,
          tags: [],
          days,
          // startdate/enddate 는 DB 에서 timestamptz("2026-08-03T00:00:00+00:00")로 오므로,
          // <input type="date"> 가 인식하는 "YYYY-MM-DD" 로 미리 잘라둔다.
          // (안 자르면 편집 화면의 기간 입력란이 값을 인식 못 해 빈 채로 보인다.)
          startDate: courseRow.startdate ? String(courseRow.startdate).slice(0, 10) : undefined,
          endDate: courseRow.enddate ? String(courseRow.enddate).slice(0, 10) : undefined
        });
        setCourseRegister(courseRow.register);
      } catch (e) {
        // Supabase/Postgrest 에러는 Error 인스턴스가 아니라 {message,...} 객체라
        // String(e) 는 "[object Object]"가 된다. message 필드를 우선 꺼낸다.
        const message =
          e instanceof Error
            ? e.message
            : typeof e === "object" && e !== null && "message" in e
              ? String((e as { message: unknown }).message)
              : String(e);
        if (active()) setDbCourseError(message);
      } finally {
        if (active()) setDbCourseLoading(false);
      }
    },
    [numId]
  );

  useEffect(() => {
    if (isNew || Number.isNaN(numId)) return;
    let alive = true;
    loadCourseFromDb(() => alive);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, numId]);

  const isOwned = isNew || (!!user && courseRegister === user.id);

  const baseCourseData: MyCourse = isNew
    ? {
        id: 0,
        title: "",
        duration: "1일",
        isPrivate: true,
        rating: 0,
        likes: 0,
        tags: [],
        days: [{ day: 1, places: [] }]
      }
    : (dbCourse ?? {
        id: numId,
        title: dbCourseLoading ? "불러오는 중..." : "코스를 찾을 수 없어요",
        duration: "1일",
        isPrivate: false,
        rating: 0,
        likes: 0,
        tags: [],
        days: [{ day: 1, places: [] }]
      });

  const [activeDay, setActiveDay] = useState(1);
  // 장소 검색으로 추가된(좌표 직접 보유) 코스 항목의 지도 노드를 클릭했을 때의 상세 보기.
  // 뒤로가기 시 코스 편집 패널로 바로 복귀한다.
  const [selectedSearchPlace, setSelectedSearchPlace] = useState<CoursePlace | null>(null);
  const [selectedSearchDetail, setSelectedSearchDetail] = useState<TourismDetail | null>(null);
  const [selectedSearchDetailLoading, setSelectedSearchDetailLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(isNew);
  const [dayGuidePickerOpen, setDayGuidePickerOpen] = useState(false);
  const [dayGuideMode, setDayGuideMode] = useState<RouteMode | null>(null);
  const [dayGuideLoading, setDayGuideLoading] = useState(false);
  const [dayGuideError, setDayGuideError] = useState<string | null>(null);
  const [dayGuideDistanceM, setDayGuideDistanceM] = useState<number | null>(null);
  const [dayGuideDurationSec, setDayGuideDurationSec] = useState<number | null>(null);
  const [dayGuidePath, setDayGuidePath] = useState<MapPathSegment[] | null>(null);
  const dayGuideRequestIdRef = useRef(0);

  // 모바일 편집 바텀시트 높이(%) — 핸들을 드래그해서 조절.
  // 하단 탭 네비게이션에 가려지는 부분은 시트를 위로 끌어올려서 볼 수 있게 한다(기본 65%, 최대 92%).
  // 핸들 자신이 드래그 도중 위치가 이동하므로(시트가 커지면 핸들도 같이 올라감), setPointerCapture 에
  // 의존하지 않고 window 에 직접 리스너를 붙여서 손가락이 핸들 밖으로 벗어나도 계속 추적한다.
  const [mobileSheetHeight, setMobileSheetHeight] = useState(65);
  const sheetDragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const handleSheetDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    // 브라우저 기본 스크롤/패닝 제스처가 같이 발동해서 지도·페이지가 스크롤되는 걸 막는다.
    e.preventDefault();
    sheetDragRef.current = { startY: e.clientY, startHeight: mobileSheetHeight };

    const onMove = (moveEvent: PointerEvent) => {
      if (!sheetDragRef.current) return;
      moveEvent.preventDefault();
      const containerHeight = window.innerHeight - 64; // calc(100vh - 64px) 와 동일한 식
      const deltaPercent =
        ((sheetDragRef.current.startY - moveEvent.clientY) / containerHeight) * 100;
      setMobileSheetHeight(
        Math.min(92, Math.max(30, sheetDragRef.current.startHeight + deltaPercent))
      );
    };
    const onUp = () => {
      sheetDragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };
  const [editTitle, setEditTitle] = useState(baseCourseData.title);
  const [editIsPrivate, setEditIsPrivate] = useState(baseCourseData.isPrivate);
  const [editStartDate, setEditStartDate] = useState(baseCourseData.startDate ?? "");
  const [editEndDate, setEditEndDate] = useState(baseCourseData.endDate ?? "");
  const [editDays, setEditDays] = useState<EditDay[]>(baseCourseData.days);

  // editXxx 상태는 useState 초기값으로만 seed 되므로(첫 렌더 시점 값), DB fetch(dbCourse)가
  // 비동기로 늦게 도착하면 반영이 안 된다. dbCourse 가 새로 도착할 때마다 편집값을 그걸로 맞춘다.
  useEffect(() => {
    if (!dbCourse) return;
    setEditTitle(dbCourse.title);
    setEditIsPrivate(dbCourse.isPrivate);
    setEditStartDate(dbCourse.startDate ?? "");
    setEditEndDate(dbCourse.endDate ?? "");
    setEditDays(dbCourse.days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbCourse]);

  // tb_course_like 즐겨찾기 — 로그인한 사용자가 이 코스를 이미 찜했는지 여부.
  const [favorited, setFavorited] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [favoriteNotice, setFavoriteNotice] = useState("");

  useEffect(() => {
    if (isNew || !user || Number.isNaN(numId)) {
      setFavorited(false);
      return;
    }
    let active = true;
    (async () => {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("tb_course_like")
        .select("like_id")
        .eq("course_id", numId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (active) setFavorited(!!data);
    })();
    return () => {
      active = false;
    };
  }, [isNew, numId, user]);

  const handleToggleFavorite = async () => {
    if (isNew || Number.isNaN(numId)) return;
    if (!user) {
      setFavoriteNotice("로그인 후 이용 가능합니다");
      setTimeout(() => setFavoriteNotice(""), 2000);
      return;
    }
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      if (favorited) {
        const { error } = await supabase
          .from("tb_course_like")
          .delete()
          .eq("course_id", numId)
          .eq("user_id", user.id);
        if (error) throw error;
        setFavorited(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        const { error } = await supabase.from("tb_course_like").insert({
          course_id: numId,
          user_id: user.id,
          registtime: new Date().toISOString()
        });
        if (error) throw error;
        setFavorited(true);
        setLikeCount((c) => c + 1);
      }
    } catch (e) {
      setFavoriteNotice(e instanceof Error ? e.message : String(e));
      setTimeout(() => setFavoriteNotice(""), 2500);
    } finally {
      setFavoriteBusy(false);
    }
  };

  // 카카오톡 공유 — 현재 코스 상세 화면 링크를 카카오톡 피드로 공유한다.
  const [sharing, setSharing] = useState(false);
  const handleShareKakao = async () => {
    if (isNew || Number.isNaN(numId) || sharing) return;
    setSharing(true);
    try {
      const url = `${window.location.origin}/course/${numId}`;
      await shareToKakaoTalk({
        title: courseData.title,
        description:
          courseBadges.length > 0
            ? courseBadges.map((b) => `#${b.label}`).join(" ")
            : "다대유에서 만든 무장애 여행 코스",
        imageUrl: `${window.location.origin}/daiyu-profile.png`,
        url
      });
    } catch (e) {
      setFavoriteNotice(e instanceof Error ? e.message : String(e));
      setTimeout(() => setFavoriteNotice(""), 2500);
    } finally {
      setSharing(false);
    }
  };

  // "내 코스에 추가" — 이 코스(장소·일정 그대로)를 내 소유의 새 코스로 복사한다.
  const [addingCourse, setAddingCourse] = useState(false);
  const handleAddToMyCourse = async () => {
    if (!requireLoginOrRedirect(user, router, `/course/${id}`)) return;
    if (!user || !dbCourse || addingCourse) return;
    setAddingCourse(true);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();

      const { data: course, error: courseErr } = await supabase
        .from("tb_course")
        .insert({
          course_nm: dbCourse.title,
          open_yn: "N", // 복사본은 기본적으로 비공개(내 코스)로 시작
          startdate: dbCourse.startDate || null,
          enddate: dbCourse.endDate || null,
          register: user.id
        })
        .select("course_id")
        .single();
      if (courseErr) throw courseErr;

      const detailRows = dbCourse.days.flatMap((d) =>
        d.places
          .filter((p) => p.placeId != null)
          .map((p) => ({
            course_id: course.course_id,
            day: d.day,
            place_id: p.placeId as number,
            starthour: p.startHour,
            endhour: p.endHour
          }))
      );
      if (detailRows.length > 0) {
        const { error: detailErr } = await supabase.from("tb_course_detail").insert(detailRows);
        if (detailErr) throw detailErr;
      }

      router.push("/course?tab=my");
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      setFavoriteNotice(message);
      setTimeout(() => setFavoriteNotice(""), 2500);
    } finally {
      setAddingCourse(false);
    }
  };

  const [showErrors, setShowErrors] = useState(false); // 저장 시 필수값 검증 표시
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── 장소 추가: 지도 화면과 공용인 PlaceSearchSidebar 로 검색/상세 → "코스에 추가" ──
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false);
  const placeFilters = useFilters();
  const ps = usePlaceSearch({
    accessibility: placeFilters.filters.accessibility,
    gu: placeFilters.filters.gu,
    dong: placeFilters.filters.dong,
    favoritesOnly: placeFilters.filters.favoritesOnly,
    headcount: placeFilters.filters.headcount,
    dateFrom: placeFilters.filters.dateFrom,
    dateTo: placeFilters.filters.dateTo,
    themes: placeFilters.filters.themes,
    minRating: placeFilters.filters.minRating
  });
  const psDisplayPlaces = ps.searchPlaces.length > 0 ? ps.searchPlaces : ps.topRatedPlaces;
  // 상세의 "내 코스에 추가" → 현재 활성 Day 에 장소 추가 후 폼으로 복귀
  const addPlaceFromSearch = () => {
    const sp = ps.searchDetail;
    if (!sp) return;
    // sp.id 는 contentid 다. tb_course_detail.place_id 는 tb_place.place_id(내부 PK)를 참조하므로
    // 반드시 sp.placeId(카카오 출처는 없음)를 써야 한다 — contentid 를 넣으면 FK 위반으로 insert 가 실패한다.
    setEditDays((days) =>
      days.map((d) => {
        if (d.day !== activeDay) return d;
        // 기본 시작시각: 첫 장소는 9시, 이후는 바로 앞 장소의 종료시각. 종료시각은 시작+1시간.
        const prev = d.places[d.places.length - 1];
        const startHour = prev ? prev.endHour : 9;
        const endHour = addOneHour(startHour);
        return {
          ...d,
          places: [
            ...d.places,
            {
              id: Date.now(),
              name: sp.name,
              startHour,
              endHour,
              placeId: sp.placeId,
              lat: sp.lat,
              lng: sp.lng,
              // sp.id 는 DB 출처일 때만 contentid(숫자 문자열)다 — /api/tourism/detail 조회용.
              contentId:
                sp.source === "db" && !Number.isNaN(Number(sp.id)) ? Number(sp.id) : undefined
            }
          ]
        };
      })
    );
    ps.setSearchDetailId(null);
    setPlaceSearchOpen(false);
  };

  const courseData = isEditing
    ? { ...baseCourseData, title: editTitle, days: editDays }
    : baseCourseData;

  const currentPlaces = courseData.days[activeDay - 1]?.places ?? [];

  const dayGuideStops = currentPlaces
    .filter(
      (p) => p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)
    )
    .map((p) => ({ lat: p.lat as number, lng: p.lng as number, name: p.name }));

  const clearDayGuide = () => {
    dayGuideRequestIdRef.current += 1;
    setDayGuideMode(null);
    setDayGuideLoading(false);
    setDayGuideError(null);
    setDayGuideDistanceM(null);
    setDayGuideDurationSec(null);
    setDayGuidePath(null);
    setDayGuidePickerOpen(false);
  };

  const startDayGuide = async (mode: RouteMode) => {
    setDayGuidePickerOpen(false);
    setDayGuideMode(mode);
    setDayGuideLoading(true);
    setDayGuideError(null);
    setDayGuideDistanceM(null);
    setDayGuideDurationSec(null);
    const requestId = ++dayGuideRequestIdRef.current;

    if (dayGuideStops.length < 2) {
      setDayGuideLoading(false);
      setDayGuidePath(null);
      setDayGuideError("이 Day에 좌표가 있는 장소가 2곳 이상 있어야 안내할 수 있어요.");
      return;
    }

    try {
      const result = await fetchDirectionsForStops(dayGuideStops, mode);
      if (requestId !== dayGuideRequestIdRef.current) return;
      setDayGuidePath([
        {
          points: result.points,
          color: DAY_LINE_COLORS[(activeDay - 1) % DAY_LINE_COLORS.length],
          dashed: Boolean(result.fallback)
        }
      ]);
      setDayGuideDistanceM(result.distanceM);
      setDayGuideDurationSec(result.durationSec);
      setDayGuideError(
        result.fallback ? "대략 경로예요. 정확한 안내는 카카오맵에서 시작하세요." : null
      );
    } catch (e) {
      if (requestId !== dayGuideRequestIdRef.current) return;
      setDayGuidePath([
        {
          points: dayGuideStops,
          color: DAY_LINE_COLORS[(activeDay - 1) % DAY_LINE_COLORS.length],
          dashed: true
        }
      ]);
      setDayGuideError(
        e instanceof Error
          ? `${e.message} 카카오맵으로 안내할 수 있어요.`
          : "경로 미리보기에 실패했어요. 카카오맵으로 안내할 수 있어요."
      );
    } finally {
      if (requestId === dayGuideRequestIdRef.current) {
        setDayGuideLoading(false);
      }
    }
  };

  // Day 탭이 바뀌면 안내 중일 때 해당 Day로 다시 계산
  useEffect(() => {
    if (!dayGuideMode || isEditing) return;
    const mode = dayGuideMode;
    const timer = window.setTimeout(() => {
      void startDayGuide(mode);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay]);

  // KakaoMap 마커·경로선 — 특정 Day 만이 아니라 "모든 일정"을 Day 순서 → 각 Day 내 장소 순서로
  // 이어서 한 번에 보여준다(Day1 마지막 장소 → Day2 첫 장소 순으로 연결).
  // 좌표(p.lat/lng)가 있는 항목(장소 검색으로 추가된 실제 장소)만 지도에 표시한다.
  type MarkerSource = {
    kind: "real";
    item: CoursePlace;
    markerId: string;
    lat: number;
    lng: number;
    color: string;
    day: number;
  };

  const markerSources: MarkerSource[] = [];
  const sortedDays = [...courseData.days].sort((a, b) => a.day - b.day);
  let colorIdx = 0;
  for (const d of sortedDays) {
    for (const p of d.places) {
      if (p.lat == null || p.lng == null) continue;
      markerSources.push({
        markerId: `real:${d.day}:${p.id}`,
        lat: p.lat,
        lng: p.lng,
        color: MARKER_COLORS[colorIdx % MARKER_COLORS.length],
        kind: "real",
        item: p,
        day: d.day
      });
      colorIdx += 1;
    }
  }

  const mapMarkers: MapMarker[] = markerSources.map((m) => ({
    id: m.markerId,
    lat: m.lat,
    lng: m.lng,
    color: m.color
  }));

  // 경로선 — Day 별로 색을 다르게 준다. 같은 Day 안의 장소끼리는 그 Day 색의 실선으로 잇고,
  // Day 가 바뀌는 경계(Day1 마지막 장소 → Day2 첫 장소)는 별도 회색 점선으로 표시한다.
  const coursePath: MapPathSegment[] = [];
  let dayIdx = 0;
  let prevDayLastPoint: { lat: number; lng: number } | null = null;
  for (const d of sortedDays) {
    const dayPoints = markerSources
      .filter((m) => m.day === d.day)
      .map((m) => ({ lat: m.lat, lng: m.lng }));
    if (dayPoints.length === 0) continue;

    if (prevDayLastPoint) {
      coursePath.push({
        points: [prevDayLastPoint, dayPoints[0]],
        color: "#9ca3af",
        dashed: true
      });
    }
    coursePath.push({
      points: dayPoints,
      color: DAY_LINE_COLORS[dayIdx % DAY_LINE_COLORS.length]
    });

    prevDayLastPoint = dayPoints[dayPoints.length - 1];
    dayIdx += 1;
  }
  const selectedMarkerId = selectedSearchPlace
    ? (markerSources.find((m) => m.item.id === selectedSearchPlace.id)?.markerId ?? null)
    : null;

  // 지도에서 검색 추가 장소의 노드를 클릭하면(selectedSearchPlace) 상세를 새로 조회한다.
  useEffect(() => {
    if (!selectedSearchPlace?.contentId) {
      setSelectedSearchDetail(null);
      return;
    }
    let active = true;
    setSelectedSearchDetailLoading(true);
    fetch(`/api/tourism/detail?contentId=${selectedSearchPlace.contentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setSelectedSearchDetail(data ?? null);
      })
      .catch(() => {
        if (active) setSelectedSearchDetail(null);
      })
      .finally(() => {
        if (active) setSelectedSearchDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedSearchPlace?.contentId]);

  // 필수값: 코스 제목(course_nm). 공유 여부(open_yn)는 기본값이 있어 항상 채워지므로 검증 불필요.
  const titleMissing = editTitle.trim().length === 0;

  const handleSave = async () => {
    // 필수값이 없으면 저장하지 않고 안내만 표시
    if (titleMissing) {
      setShowErrors(true);
      return;
    }

    // tb_course RLS 정책이 register = auth.uid() 를 요구하므로 로그인 필요.
    if (!user) {
      setSaveError("로그인 후 저장할 수 있어요.");
      return;
    }

    // 기존 코스 편집 — tb_course 는 update, tb_course_detail 은 통째로 delete 후 재삽입.
    if (!isNew) {
      setSaving(true);
      setSaveError("");
      try {
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();

        const { error: updateErr } = await supabase
          .from("tb_course")
          .update({
            course_nm: editTitle.trim(),
            open_yn: editIsPrivate ? "N" : "Y",
            startdate: editStartDate || null,
            enddate: editEndDate || null,
            updatetime: new Date().toISOString(),
            updater: user.id
          })
          .eq("course_id", numId);
        if (updateErr) throw updateErr;

        const { error: deleteErr } = await supabase
          .from("tb_course_detail")
          .delete()
          .eq("course_id", numId);
        if (deleteErr) throw deleteErr;

        const detailRows = editDays.flatMap((d) =>
          d.places
            .filter((p) => p.placeId != null)
            .map((p) => ({
              course_id: numId,
              day: d.day,
              place_id: p.placeId as number,
              starthour: p.startHour,
              endhour: p.endHour
            }))
        );
        if (detailRows.length > 0) {
          const { error: detailErr } = await supabase.from("tb_course_detail").insert(detailRows);
          if (detailErr) throw detailErr;
        }

        // DB 에서 다시 읽어와 detail_id 등 최신 상태로 갱신.
        let alive = true;
        await loadCourseFromDb(() => alive);
        alive = false;
        setIsEditing(false);
        setPlaceSearchOpen(false);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === "object" && e !== null && "message" in e
              ? String((e as { message: unknown }).message)
              : String(e);
        setSaveError(message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // 새 코스 — tb_course / tb_course_detail 에 insert (클라이언트 직접)
    setSaving(true);
    setSaveError("");
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();

      // 1) tb_course insert → course_id 반환
      const { data: course, error: courseErr } = await supabase
        .from("tb_course")
        .insert({
          course_nm: editTitle.trim(),
          open_yn: editIsPrivate ? "N" : "Y", // 공유 여부: 기본 N(공유 안 함)
          startdate: editStartDate || null,
          enddate: editEndDate || null,
          register: user.id // RLS: register = auth.uid() 이어야 insert 허용됨
        })
        .select("course_id")
        .single();
      if (courseErr) throw courseErr;

      // 2) tb_course_detail insert — 일정(day) + 장소(place_id). placeId 있는 장소만.
      const detailRows = editDays.flatMap((d) =>
        d.places
          .filter((p) => p.placeId != null)
          .map((p) => ({
            course_id: course.course_id,
            day: d.day,
            place_id: p.placeId as number,
            starthour: p.startHour,
            endhour: p.endHour
          }))
      );
      if (detailRows.length > 0) {
        const { error: detailErr } = await supabase.from("tb_course_detail").insert(detailRows);
        if (detailErr) throw detailErr;
      }

      router.push("/course?tab=my"); // 새로 만든 코스가 있는 "내 코스" 탭으로
    } catch (e) {
      // Supabase/Postgrest 에러는 Error 인스턴스가 아니라 {message,...} 객체라
      // String(e) 는 "[object Object]"가 된다. message 필드를 우선 꺼낸다.
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  // 기간(시작일/종료일) 처리 ──────────────────────────────
  //  - 둘 다 비어 있을 때 한쪽을 고르면 다른 쪽도 같은 날로 채운다.
  //  - 한쪽을 지우면 둘 다 지운다(→ 일정 수동 모드로 복귀).
  const periodSet = Boolean(editStartDate && editEndDate);

  // 기간(양 끝 포함)으로 day 개수를 계산
  const dayCountFromPeriod = (start: string, end: string) => {
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
    return diff >= 0 ? diff + 1 : 1;
  };

  // 기간에 맞춰 day 개수를 자동 구성(기존 day 의 장소는 최대한 보존)
  const applyPeriodDays = (start: string, end: string) => {
    const count = dayCountFromPeriod(start, end);
    setEditDays((prev) =>
      Array.from({ length: count }, (_, i) => ({ day: i + 1, places: prev[i]?.places ?? [] }))
    );
    setActiveDay((d) => Math.min(Math.max(d, 1), count));
  };

  // 기간 삭제 → 둘 다 비우고 일정도 Day 1 하나만 남긴다(수동 모드 + '일정 추가' 버튼 복귀).
  const clearPeriod = () => {
    setEditStartDate("");
    setEditEndDate("");
    setEditDays((prev) => [{ day: 1, places: prev[0]?.places ?? [] }]);
    setActiveDay(1);
  };

  const handleStartDateChange = (value: string) => {
    if (!value) {
      clearPeriod();
      return;
    }
    const nextEnd = editEndDate || value; // 종료일이 비었으면 같은 날로 채움
    setEditStartDate(value);
    setEditEndDate(nextEnd);
    applyPeriodDays(value, nextEnd);
  };

  const handleEndDateChange = (value: string) => {
    if (!value) {
      clearPeriod();
      return;
    }
    const nextStart = editStartDate || value; // 시작일이 비었으면 같은 날로 채움
    setEditStartDate(nextStart);
    setEditEndDate(value);
    applyPeriodDays(nextStart, value);
  };

  // 편집 취소 — 저장 없이 닫힘(신규는 목록으로, 기존은 저장값으로 복원)
  const handleCancel = () => {
    if (!window.confirm("편집을 취소할까요? 저장하지 않은 변경 사항은 사라집니다.")) return;
    if (isNew) {
      router.push("/course?tab=my"); // "새 코스 만들기"는 "내 코스" 탭에서 진입하므로 그 탭으로 복귀
      return;
    }
    setIsEditing(false);
    setEditTitle(baseCourseData.title);
    setEditIsPrivate(baseCourseData.isPrivate);
    setEditStartDate(baseCourseData.startDate ?? "");
    setEditEndDate(baseCourseData.endDate ?? "");
    setEditDays(baseCourseData.days);
    setPlaceSearchOpen(false);
    setShowErrors(false);
  };

  // 모든 입력 항목을 새 코스 기본 상태로 초기화 — 저장 없이 즉시 적용
  const handleReset = () => {
    if (!window.confirm("모든 입력을 초기화할까요? 저장 없이 바로 적용됩니다.")) return;
    setEditTitle("");
    setEditIsPrivate(true); // 기본: 공유 안 함(open_yn N)
    setEditStartDate("");
    setEditEndDate("");
    setEditDays([{ day: 1, places: [] }]);
    setActiveDay(1);
    setPlaceSearchOpen(false);
    setShowErrors(false);
  };

  // 코스 삭제 — tb_course.delete_yn = 'Y' 로 소프트 삭제(목록 조회 시 .neq("delete_yn","Y") 로 걸러짐).
  const [deleting, setDeleting] = useState(false);
  const handleDeleteCourse = async () => {
    if (isNew || Number.isNaN(numId)) return;
    if (!user) return;
    if (!window.confirm("이 코스를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    setSaveError("");
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("tb_course")
        .update({ delete_yn: "Y", deletetime: new Date().toISOString(), deleter: user.id })
        .eq("course_id", numId);
      if (error) throw error;
      router.push("/course?tab=my");
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      setSaveError(message);
      setDeleting(false);
    }
  };

  return (
    <div
      className="relative -mx-4 -mt-6 -mb-24 flex overflow-hidden md:-mx-6"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── LEFT SIDEBAR (desktop) / 모바일 바텀시트 — 보기·편집·검색·상세 모두 이 패널 하나로 관리한다 ── */}
      <aside
        className="border-hairline absolute inset-x-0 bottom-0 z-30 flex h-[var(--sheet-h)] shrink-0 flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-2xl md:static md:inset-auto md:z-auto md:flex md:h-auto md:w-72 md:rounded-none md:border-t-0 md:border-r md:shadow-none"
        style={{ "--sheet-h": `${mobileSheetHeight}%` } as CSSProperties}
      >
        {/* 모바일 바텀시트 핸들 — 드래그해서 시트 높이 조절(하단 네비게이션에 가려진 부분을 끌어올려서 볼 수 있음) */}
        <div
          className="flex shrink-0 touch-none justify-center py-3 md:hidden"
          onPointerDown={handleSheetDragStart}
        >
          <span className="bg-hairline h-1 w-10 rounded-full" />
        </div>

        {placeSearchOpen ? (
          /* ── 장소 검색 (지도 화면과 공용 PlaceSearchSidebar) — 코스 편집 사이드바 자리에 그대로 교체 ── */
          <PlaceSearchSidebar
            keyword={ps.keyword}
            setKeyword={ps.setKeyword}
            onSearch={ps.handleSearch}
            isSearching={ps.isSearching}
            filters={placeFilters.filters}
            set={placeFilters.set}
            toggleList={placeFilters.toggleList}
            guOptions={ps.areaCodes.map((a) => a.name)}
            dongOptions={ps.dongOptions}
            activeCount={placeFilters.activeCount}
            onResetFilters={placeFilters.reset}
            defaultFilterOpen
            places={psDisplayPlaces}
            searchCount={ps.searchPlaces.length}
            onSelectPlace={ps.setSearchDetailId}
            searchDetail={ps.searchDetail}
            tourismDetail={ps.tourismDetail}
            isLoadingDetail={ps.isLoadingDetail}
            onBackFromDetail={() => ps.setSearchDetailId(null)}
            onLikeChange={ps.refreshLiked}
            detailAction={addPlaceFromSearch}
            onBack={() => setPlaceSearchOpen(false)}
          />
        ) : selectedSearchPlace ? (
          /* ── 지도 노드 클릭(장소 검색으로 추가된 항목) 상세 — 뒤로가기 시 코스 편집 패널로 바로 복귀 ── */
          <TourismDetailPanel
            sp={
              {
                // TourismDetailPanel 은 sp.id 를 contentid 로 취급해 리뷰 등을 조회하므로
                // placeId(내부 PK)가 아니라 contentId 를 넣어야 한다.
                id: String(selectedSearchPlace.contentId ?? ""),
                name: selectedSearchPlace.name,
                lat: selectedSearchPlace.lat ?? 0,
                lng: selectedSearchPlace.lng ?? 0,
                image: "",
                source: "db"
              } satisfies SearchPlace
            }
            detail={selectedSearchDetail}
            isLoading={selectedSearchDetailLoading}
            onBack={() => setSelectedSearchPlace(null)}
          />
        ) : isEditing ? (
          /* ── 편집 패널 ── */
          <>
            {/* Edit header — 타이틀 + 취소·초기화·저장 */}
            <div className="border-hairline-soft bg-gold-50 shrink-0 space-y-2 border-b px-3 py-2.5">
              <p className="text-gold-700 text-sm font-bold">{isNew ? "코스 추가" : "코스 편집"}</p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  취소
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={saving}
                  className="flex-1 gap-1 text-xs hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                >
                  <RotateCcw className="h-3 w-3" />
                  초기화
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 gap-1 text-xs"
                >
                  <Check className="h-3 w-3" />
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </div>
              {saveError && <p className="mt-2 text-xs text-red-500">저장 실패: {saveError}</p>}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0">
              {/* Title edit */}
              <div className="border-hairline-soft border-b px-4 py-3">
                <p className="text-steel mb-1.5 text-xs font-semibold">
                  코스 제목 <span className="text-red-500">*</span>
                </p>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value.slice(0, 50))}
                  maxLength={50}
                  placeholder="코스 제목을 입력해 주세요"
                  className={`focus:ring-brand-500 w-full rounded-lg border px-3 py-2 text-sm font-semibold focus:ring-2 focus:outline-none ${
                    showErrors && titleMissing ? "border-red-400 bg-red-50" : "border-hairline"
                  }`}
                />
                <p className="text-steel mt-1 text-right text-xs">{editTitle.length}/50</p>
                {showErrors && titleMissing && (
                  <p className="mt-1 text-xs text-red-500">코스 제목은 필수 항목이에요.</p>
                )}
              </div>

              {/* 공유 여부 */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700">공유 여부</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {editIsPrivate ? "나만 볼 수 있어요" : "모두에게 공개돼요"}
                  </p>
                </div>
                <button
                  onClick={() => setEditIsPrivate((v) => !v)}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${editIsPrivate ? "bg-gray-200" : "bg-brand-500"}`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${editIsPrivate ? "left-1" : "left-5"}`}
                  />
                </button>
              </div>

              {/* 기간 (시작일 / 종료일) */}
              <div className="border-hairline-soft border-b px-4 py-3">
                <p className="text-steel mb-1.5 text-xs font-semibold">기간</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editStartDate}
                    max={editEndDate || undefined}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="focus:ring-brand-500 border-hairline text-slate min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs focus:ring-2 focus:outline-none"
                  />
                  <span className="text-stone shrink-0 text-xs">~</span>
                  <input
                    type="date"
                    value={editEndDate}
                    min={editStartDate || undefined}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="focus:ring-brand-500 border-hairline text-slate min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Day tabs + add day */}
              <div className="border-hairline-soft border-b px-4 py-3">
                <p className="text-steel mb-1.5 text-xs font-semibold">
                  일정
                  {periodSet && (
                    <span className="text-stone ml-1 font-normal">
                      · 기간에 맞춰 {editDays.length}일이 자동 구성돼요
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {editDays.map((d) => (
                    <div key={d.day} className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveDay(d.day)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                          activeDay === d.day
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Day {d.day}
                      </button>
                      {!periodSet && editDays.length > 1 && (
                        <button
                          onClick={() => {
                            const next = editDays
                              .filter((x) => x.day !== d.day)
                              .map((x, i) => ({ ...x, day: i + 1 }));
                            setEditDays(next);
                            setActiveDay(Math.min(activeDay, next.length));
                          }}
                          className="text-gray-300 transition-colors hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!periodSet && (
                    <button
                      onClick={() => {
                        const newDay = editDays.length + 1;
                        setEditDays([...editDays, { day: newDay, places: [] }]);
                        setActiveDay(newDay);
                      }}
                      className="text-brand-600 border-brand-200 hover:bg-brand-50 flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      일정 추가
                    </button>
                  )}
                </div>
              </div>

              {/* Place list (editable) */}
              <div className="space-y-1.5 px-3 py-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-gray-500">Day {activeDay} 장소</p>
                  <button
                    onClick={() => setPlaceSearchOpen(true)}
                    className="border-brand-300 text-brand-600 hover:bg-brand-50 flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    장소 추가
                  </button>
                </div>
                {(editDays.find((d) => d.day === activeDay)?.places ?? []).map(
                  (place, idx, arr) => (
                    <div
                      key={`${place.id}-${idx}`}
                      className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-2 py-2"
                    >
                      {/* Up/down — 배경·테두리로 버튼임을 명확히 표시 */}
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() =>
                            setEditDays(
                              editDays.map((d) => {
                                if (d.day !== activeDay) return d;
                                const ps = [...d.places];
                                [ps[idx - 1], ps[idx]] = [ps[idx], ps[idx - 1]];
                                return { ...d, places: ps };
                              })
                            )
                          }
                          aria-label="위로 이동"
                          className="hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 rounded-md border border-gray-300 bg-white p-1 text-gray-600 shadow-sm transition-colors disabled:opacity-30 disabled:shadow-none disabled:hover:border-gray-300 disabled:hover:bg-white disabled:hover:text-gray-600"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          disabled={idx === arr.length - 1}
                          onClick={() =>
                            setEditDays(
                              editDays.map((d) => {
                                if (d.day !== activeDay) return d;
                                const ps = [...d.places];
                                [ps[idx], ps[idx + 1]] = [ps[idx + 1], ps[idx]];
                                return { ...d, places: ps };
                              })
                            )
                          }
                          aria-label="아래로 이동"
                          className="hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 rounded-md border border-gray-300 bg-white p-1 text-gray-600 shadow-sm transition-colors disabled:opacity-30 disabled:shadow-none disabled:hover:border-gray-300 disabled:hover:bg-white disabled:hover:text-gray-600"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Number badge */}
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: PLACE_COORDS[place.name]?.color ?? "#16a34a" }}
                      >
                        {idx + 1}
                      </div>
                      {/* Name + start~end 시각(분 없이 시각만) */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-800">{place.name}</p>
                        <div className="mt-0.5 flex items-center gap-1">
                          <select
                            value={place.startHour}
                            onChange={(e) =>
                              setEditDays(
                                editDays.map((d) => {
                                  if (d.day !== activeDay) return d;
                                  const updated = d.places.map((p, i) =>
                                    i === idx ? { ...p, startHour: Number(e.target.value) } : p
                                  );
                                  return { ...d, places: updated };
                                })
                              )
                            }
                            className="focus:border-brand-400 rounded border border-gray-200 bg-transparent text-[10px] text-gray-500 focus:outline-none"
                          >
                            {HOUR_OPTIONS.map((h) => (
                              <option key={h} value={h}>
                                {h}시
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-gray-400">~</span>
                          <select
                            value={place.endHour}
                            onChange={(e) =>
                              setEditDays(
                                editDays.map((d) => {
                                  if (d.day !== activeDay) return d;
                                  const updated = d.places.map((p, i) =>
                                    i === idx ? { ...p, endHour: Number(e.target.value) } : p
                                  );
                                  return { ...d, places: updated };
                                })
                              )
                            }
                            className="focus:border-brand-400 rounded border border-gray-200 bg-transparent text-[10px] text-gray-500 focus:outline-none"
                          >
                            {HOUR_OPTIONS.map((h) => (
                              <option key={h} value={h}>
                                {h}시
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* Delete */}
                      <button
                        onClick={() =>
                          setEditDays(
                            editDays.map((d) => {
                              if (d.day !== activeDay) return d;
                              return { ...d, places: d.places.filter((_, i) => i !== idx) };
                            })
                          )
                        }
                        className="shrink-0 text-gray-300 transition-colors hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── 보기 패널 ── */
          <>
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2.5">
              <button
                onClick={() => {
                  const saved = readCourseListReturn();
                  router.push(saved ? `/course?tab=${saved.tab}` : "/course");
                }}
                className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="flex-1 truncate text-sm font-bold text-gray-800">
                {courseData.title}
              </h2>
            </div>

            {/* 보기 패널 본문 — 전체를 하나의 스크롤 영역으로 묶어서, 위쪽 정보란이 많아도
                항상 아래로 스크롤해서 Actions 버튼까지 도달할 수 있게 한다. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {/* 등록자 */}
              {!isNew && courseAuthor && (
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="mb-1.5 text-xs font-semibold text-gray-700">등록자</p>
                  <CourseAuthorRow
                    authorType={courseAuthor.role}
                    author={courseAuthor.nickname}
                    badgeAfter
                  />
                </div>
              )}

              {/* 등록일 / 수정일 — 한 줄을 반으로 나눠 값 있는 것만 표시 */}
              {!isNew && courseAuthor && (
                <div className="flex border-b border-gray-100 px-4 py-3">
                  <div className="flex-1">
                    <p className="mb-1.5 text-xs font-semibold text-gray-700">등록일</p>
                    <p className="text-sm text-gray-600">{courseAuthor.registDate}</p>
                  </div>
                  {courseAuthor.updateDate && (
                    <div className="flex-1">
                      <p className="mb-1.5 text-xs font-semibold text-gray-700">수정일</p>
                      <p className="text-sm text-gray-600">{courseAuthor.updateDate}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 해시태그 — 포함된 장소들의 대분류+접근성 종합 상위 3개 */}
              {courseBadges.length > 0 && (
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="mb-1.5 text-xs font-semibold text-gray-700">해시태그</p>
                  <div className="flex flex-wrap gap-1.5">
                    {courseBadges.map((b) => (
                      <Badge key={b.label} tone="brand" shape="pill">
                        #{b.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 별점 · 즐겨찾기(별점은 0점 고정 — 추후 실제 집계, 즐겨찾기는 tb_course_like 실집계) */}
              {!isNew && (
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="mb-1.5 text-xs font-semibold text-gray-700">별점 · 즐겨찾기</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" title="별점">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold text-gray-800">0</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600" title="즐겨찾기">
                      <Heart className="h-4 w-4 fill-red-400 text-red-400" />
                      <span>{likeCount}</span>
                    </div>
                  </div>
                </div>
              )}

              {!isNew && dbCourseLoading ? (
                <div className="flex flex-1 items-center justify-center py-12 text-sm text-gray-400">
                  불러오는 중...
                </div>
              ) : !isNew && !dbCourse ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-1 py-12 text-sm text-gray-400">
                  <p>코스를 찾을 수 없어요</p>
                  {dbCourseError && <p className="text-xs text-gray-300">{dbCourseError}</p>}
                </div>
              ) : (
                <>
                  {/* 공유 여부 (readonly) */}
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">공유 여부</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {courseData.isPrivate ? "나만 볼 수 있어요" : "모두에게 공개돼요"}
                      </p>
                    </div>
                    <span
                      className={`relative h-6 w-10 shrink-0 rounded-full ${courseData.isPrivate ? "bg-gray-200" : "bg-brand-500"}`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${courseData.isPrivate ? "left-1" : "left-5"}`}
                      />
                    </span>
                  </div>

                  {/* 기간 (readonly) */}
                  {(courseData.startDate || courseData.endDate) && (
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="mb-1.5 text-xs font-semibold text-gray-700">기간</p>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDateOnly(courseData.startDate)}</span>
                        <span className="text-gray-300">~</span>
                        <span>{formatDateOnly(courseData.endDate)}</span>
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  {!isOwned && (
                    <div className="shrink-0 border-b border-gray-100 px-4 py-3">
                      <div className="mb-2 flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-gray-800">{courseData.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          <span>{courseData.likes}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {courseData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-brand-100 text-brand-700 rounded-full px-2 py-0.5 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Day tabs */}
                  <div className="flex shrink-0 flex-wrap gap-2 border-b border-gray-100 px-4 py-3">
                    {courseData.days.map((day) => (
                      <button
                        key={day.day}
                        onClick={() => setActiveDay(day.day)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                          activeDay === day.day
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Day {day.day}
                      </button>
                    ))}
                  </div>

                  {/* Place list */}
                  <div className="space-y-2 px-4 py-3">
                    {currentPlaces.map((place, index) => (
                      <div
                        key={place.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                        onClick={() => {
                          if (place.lat != null && place.lng != null) setSelectedSearchPlace(place);
                        }}
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: PLACE_COORDS[place.name]?.color ?? "#16a34a" }}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {place.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {place.startHour}시 ~ {place.endHour}시
                          </p>
                        </div>
                      </div>
                    ))}
                    {currentPlaces.length === 0 && (
                      <p className="py-8 text-center text-sm text-gray-400">
                        이 Day엔 등록된 장소가 없어요
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Actions — 제목/버튼 사이만 스크롤되게, 이 줄은 하단에 고정.
                모바일에서 하단 탭 네비게이션에 가려지지 않게 여백 확보 */}
            {!((!isNew && dbCourseLoading) || (!isNew && !dbCourse)) && (
              <div className="mb-16 flex shrink-0 flex-col gap-2 border-t border-gray-100 px-4 py-3 md:mb-0">
                {dayGuidePickerOpen ? (
                  <div className="border-hairline bg-surface-soft space-y-2 rounded-xl border p-3">
                    <p className="text-ink text-xs font-semibold">
                      DAY {activeDay} 안내 · 이동 수단
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void startDayGuide("walk")}
                        className="border-hairline flex items-center justify-center gap-1.5 rounded-lg border bg-white py-2.5 text-xs font-semibold"
                      >
                        <Footprints className="h-3.5 w-3.5" />
                        도보
                      </button>
                      <button
                        type="button"
                        onClick={() => void startDayGuide("car")}
                        className="border-hairline flex items-center justify-center gap-1.5 rounded-lg border bg-white py-2.5 text-xs font-semibold"
                      >
                        <Car className="h-3.5 w-3.5" />
                        자동차
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDayGuidePickerOpen(false)}
                      className="text-stone w-full text-xs"
                    >
                      취소
                    </button>
                  </div>
                ) : null}

                {dayGuideMode ? (
                  <div className="border-brand-200 bg-brand-50/70 space-y-2 rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-ink text-xs font-semibold">
                          DAY {activeDay} · {dayGuideMode === "walk" ? "도보" : "자동차"}
                          {dayGuideLoading ? " 경로 찾는 중…" : ""}
                        </p>
                        {!dayGuideLoading &&
                        dayGuideDistanceM != null &&
                        dayGuideDurationSec != null ? (
                          <p className="text-stone mt-0.5 text-xs">
                            {dayGuideStops.length}곳 · {formatRouteDistance(dayGuideDistanceM)} ·{" "}
                            {formatRouteDuration(dayGuideDurationSec)}
                          </p>
                        ) : null}
                        {dayGuideError ? (
                          <p className="text-error mt-1 text-xs">{dayGuideError}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={clearDayGuide}
                        className="text-stone rounded-full p-1"
                        aria-label="코스 안내 닫기"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={dayGuideStops.length < 2}
                      onClick={() => dayGuideMode && openKakaoMapRoute(dayGuideStops, dayGuideMode)}
                      className="bg-brand-700 hover:bg-brand-800 w-full rounded-lg py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      카카오맵에서 안내 시작
                    </button>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  {isOwned ? (
                    <button
                      onClick={() => {
                        clearDayGuide();
                        setIsEditing(true);
                      }}
                      className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-2 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-amber-600"
                    >
                      <Pencil className="h-4 w-4 shrink-0" />
                      코스 편집
                    </button>
                  ) : (
                    <button
                      onClick={handleAddToMyCourse}
                      disabled={addingCourse}
                      className="bg-brand-600 hover:bg-brand-700 min-w-0 flex-1 rounded-xl px-2 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition-colors disabled:opacity-60"
                    >
                      {addingCourse ? "추가하는 중..." : "내 코스에 추가"}
                    </button>
                  )}
                  <button
                    onClick={handleToggleFavorite}
                    disabled={favoriteBusy}
                    className={`shrink-0 rounded-xl border px-3 py-2.5 transition-colors disabled:opacity-60 ${favorited ? "border-red-300 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                  >
                    <Heart
                      className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : "text-gray-700"}`}
                    />
                  </button>
                  <button
                    onClick={handleShareKakao}
                    disabled={sharing}
                    className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:bg-gray-50 disabled:opacity-60"
                  >
                    <Share2 className="h-4 w-4 text-gray-700" />
                  </button>
                  {isOwned && (
                    <button
                      onClick={handleDeleteCourse}
                      disabled={deleting}
                      className="shrink-0 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDayGuidePickerOpen((v) => !v);
                  }}
                  className="border-brand-200 text-brand-800 hover:bg-brand-50 flex w-full items-center justify-center gap-1.5 rounded-xl border bg-white py-2.5 text-sm font-semibold transition-colors"
                  aria-label="코스 안내"
                >
                  <Navigation className="h-4 w-4 shrink-0" />
                  안내
                </button>
              </div>
            )}
          </>
        )}
      </aside>

      {/* ── MAP AREA ── (모바일 편집 시 지도는 그대로 보이고 편집 패널이 하단 시트로 뜸) */}
      <div className="relative flex-1 overflow-hidden">
        <KakaoMap
          markers={mapMarkers}
          selectedId={selectedMarkerId}
          onSelect={(id) => {
            const src = markerSources.find((m) => m.markerId === id);
            if (!src) return;
            setSelectedSearchPlace(src.item);
          }}
          onDeselect={() => {
            setSelectedSearchPlace(null);
          }}
          path={dayGuidePath ?? coursePath}
          fitPathKey={
            dayGuideMode && dayGuidePath && !dayGuideLoading
              ? `${activeDay}-${dayGuideMode}-${dayGuideDistanceM ?? "x"}`
              : null
          }
        />
      </div>

      {favoriteNotice && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2.5 text-xs whitespace-nowrap text-white shadow-lg">
          {favoriteNotice}
        </div>
      )}
    </div>
  );
}
