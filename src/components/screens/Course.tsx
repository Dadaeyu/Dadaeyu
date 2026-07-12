"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import KakaoMap, { type MapMarker } from "@/components/KakaoMap";
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
  RotateCcw
} from "lucide-react";
import { Filters, DEFAULT_FILTERS, FilterFields } from "@/components/PlaceFilters";
import {
  useCourseContext,
  type MyCourse,
  type CourseDay,
  type CoursePlace
} from "@/context/CourseContext";
import PlaceDetailPanel from "@/components/PlaceDetailPanel";
import { PLACES, PLACE_COLORS } from "@/data/placesData";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

type AuthorType = "admin" | "user";
interface SharedCourse {
  id: number;
  title: string;
  duration: string;
  places: number;
  rating: number;
  likes: number;
  themes: string[];
  author: string;
  authorType: AuthorType;
  date: string;
}

const sharedCourses: SharedCourse[] = [
  {
    id: 101,
    title: "대전 무장애 가족 나들이",
    duration: "1일",
    places: 5,
    rating: 4.8,
    likes: 312,
    themes: ["자연힐링", "먹거리"],
    author: "대전관광공사",
    authorType: "admin",
    date: "2025.04.10"
  },
  {
    id: 102,
    title: "휠체어로 즐기는 성심당 & 수목원",
    duration: "반일",
    places: 3,
    rating: 4.9,
    likes: 275,
    themes: ["빵지순례", "자연힐링"],
    author: "대전관광공사",
    authorType: "admin",
    date: "2025.03.28"
  },
  {
    id: 103,
    title: "유성온천 힐링 코스",
    duration: "1일",
    places: 4,
    rating: 4.6,
    likes: 198,
    themes: ["문화예술", "자연힐링"],
    author: "대전시청 관광과",
    authorType: "admin",
    date: "2025.02.15"
  },
  {
    id: 104,
    title: "엄마랑 아이랑 과학 탐험",
    duration: "반일",
    places: 2,
    rating: 4.7,
    likes: 142,
    themes: ["과학"],
    author: "travel_daejeon",
    authorType: "user",
    date: "2025.05.02"
  },
  {
    id: 105,
    title: "대청호 데크로드 산책",
    duration: "반일",
    places: 3,
    rating: 4.5,
    likes: 87,
    themes: ["자연힐링"],
    author: "힐링여행자",
    authorType: "user",
    date: "2025.04.22"
  },
  {
    id: 106,
    title: "역사 도심 골목 투어",
    duration: "1일",
    places: 6,
    rating: 4.4,
    likes: 63,
    themes: ["역사근대", "문화예술"],
    author: "대전토박이",
    authorType: "user",
    date: "2025.04.18"
  },
  {
    id: 107,
    title: "대전 빵지순례 완전판",
    duration: "반일",
    places: 4,
    rating: 4.8,
    likes: 221,
    themes: ["빵지순례", "먹거리"],
    author: "빵순이여행기",
    authorType: "user",
    date: "2025.03.30"
  }
];

const recommendedCourses = [
  {
    id: 1,
    title: "대전 하루 완전 정복",
    duration: "1일",
    places: 8,
    rating: 4.9,
    likes: 245,
    themes: ["문화예술", "먹거리", "자연힐링"]
  },
  {
    id: 2,
    title: "자연 속 힐링 여행",
    duration: "2일",
    places: 6,
    rating: 4.8,
    likes: 189,
    themes: ["자연힐링"]
  },
  {
    id: 3,
    title: "문화와 예술을 찾아서",
    duration: "1일",
    places: 5,
    rating: 4.7,
    likes: 156,
    themes: ["문화예술", "역사근대"]
  },
  {
    id: 4,
    title: "성심당과 빵집 투어",
    duration: "반일",
    places: 4,
    rating: 4.9,
    likes: 312,
    themes: ["빵지순례", "먹거리"]
  },
  {
    id: 5,
    title: "대전 과학 탐험",
    duration: "1일",
    places: 5,
    rating: 4.6,
    likes: 98,
    themes: ["과학"]
  },
  {
    id: 6,
    title: "역사 따라 걷는 대전",
    duration: "1일",
    places: 6,
    rating: 4.5,
    likes: 74,
    themes: ["역사근대", "문화예술"]
  }
];

// 내 코스 목록(tb_course)에서 조회할 컬럼
type DbCourse = {
  course_id: number;
  course_nm: string;
  open_yn: string;
  startdate: string | null;
  enddate: string | null;
};

export default function Course() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const [activeTab, setActiveTab] = useState<"shared" | "recommend" | "my">("shared");

  // 내 코스 — tb_course 중 register='admin' 행만 조회 (삭제 제외)
  const [myDbCourses, setMyDbCourses] = useState<DbCourse[]>([]);
  const [myCoursesError, setMyCoursesError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();
        const { data, error } = await supabase
          .from("tb_course")
          .select("course_id, course_nm, open_yn, startdate, enddate")
          .eq("register", "admin")
          .neq("delete_yn", "Y")
          .order("registtime", { ascending: false });
        if (error) throw error;
        if (active) setMyDbCourses((data ?? []) as DbCourse[]);
      } catch (e) {
        if (active) setMyCoursesError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 공유 코스 필터
  const [showSharedFilters, setShowSharedFilters] = useState(false);
  const [sharedFilters, setSharedFilters] = useState<Filters>(DEFAULT_FILTERS);

  // 추천 코스 필터
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showResults, setShowResults] = useState(false);

  if (id) return <CourseDetail id={id} />;

  // 공유 코스 helpers
  const setShared = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setSharedFilters((prev) => ({ ...prev, [key]: val }));
  const toggleSharedList = (key: "themes" | "accessibility", item: string) =>
    setSharedFilters((prev) => {
      const list = prev[key] as string[];
      return {
        ...prev,
        [key]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
      };
    });
  const resetShared = () => setSharedFilters(DEFAULT_FILTERS);
  const sharedFilterCount = [
    sharedFilters.accessibility.length > 0,
    sharedFilters.gu,
    sharedFilters.themes.length > 0,
    sharedFilters.headcount > 1,
    sharedFilters.dateFrom || sharedFilters.dateTo,
    sharedFilters.minRating > 0,
    sharedFilters.favoritesOnly
  ].filter(Boolean).length;
  const filteredShared = sharedCourses.filter((course) => {
    if (
      sharedFilters.themes.length > 0 &&
      !course.themes.some((t) => sharedFilters.themes.includes(t))
    )
      return false;
    if (sharedFilters.minRating > 0 && course.rating < sharedFilters.minRating) return false;
    return true;
  });

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
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
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
              onClick={() => setShowSharedFilters(!showSharedFilters)}
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
              <FilterFields filters={sharedFilters} set={setShared} toggleList={toggleSharedList} />
              <button
                onClick={() => setShowSharedFilters(false)}
                className="bg-brand-600 hover:bg-brand-700 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
              >
                검색
              </button>
            </div>
          )}

          {/* 결과 수 */}
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{filteredShared.length}개</span>의 코스
            {sharedFilterCount > 0 && "를 찾았어요"}
          </p>

          {/* 코스 목록 */}
          {filteredShared.length > 0 ? (
            filteredShared.map((course) => (
              <Link
                key={course.id}
                href={`/course/${course.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                {/* Author row */}
                <div className="mb-2 flex items-center gap-1.5">
                  {course.authorType === "admin" ? (
                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      <ShieldCheck className="h-3 w-3" />
                      관리자
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                      <User className="h-3 w-3" />
                      유저
                    </span>
                  )}
                  <span className="text-xs font-medium text-gray-500">{course.author}</span>
                  <span className="ml-auto text-[10px] text-gray-300">{course.date}</span>
                </div>
                {/* Title + rating */}
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="leading-snug font-semibold text-gray-800">{course.title}</h3>
                  <div className="ml-2 flex shrink-0 items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-700">{course.rating}</span>
                  </div>
                </div>
                {/* Meta */}
                <div className="mb-3 flex gap-3 text-sm text-gray-500">
                  <span>{course.duration}</span>
                  <span>•</span>
                  <span>{course.places}곳</span>
                </div>
                {/* Themes + likes */}
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
                  <div className="flex items-center gap-1 text-sm text-gray-400">
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
                onClick={resetShared}
                className="text-brand-600 hover:text-brand-700 mt-2 text-sm underline underline-offset-2"
              >
                필터 초기화
              </button>
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
                      className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                    >
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
          <Link
            href="/course/new"
            className="hover:border-brand-400 hover:text-brand-600 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-gray-600 transition-colors"
          >
            <Plus className="h-5 w-5" />새 코스 만들기
          </Link>
          {myCoursesError && (
            <p className="text-sm text-red-500">목록 조회 실패: {myCoursesError}</p>
          )}
          {!myCoursesError && myDbCourses.length === 0 && (
            <p className="text-stone py-8 text-center text-sm">아직 만든 코스가 없어요</p>
          )}
          <div className="space-y-3">
            {myDbCourses.map((course) => (
              <Card key={course.course_id} asChild variant="interactive">
                <Link href={`/course/${course.course_id}`} className="block">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="text-ink font-semibold">{course.course_nm}</h3>
                    {course.open_yn === "N" && (
                      <Badge tone="neutral" shape="tag">
                        비공개
                      </Badge>
                    )}
                  </div>
                  {(course.startdate || course.enddate) && (
                    <div className="text-steel flex gap-1 text-sm">
                      <span>{course.startdate?.slice(0, 10) ?? ""}</span>
                      <span>~</span>
                      <span>{course.enddate?.slice(0, 10) ?? ""}</span>
                    </div>
                  )}
                </Link>
              </Card>
            ))}
          </div>
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

// 장소별 실제 위경도 — KakaoMap 마커용
const PLACE_LATLNG: Record<string, { lat: number; lng: number }> = {
  성심당: { lat: 36.3276, lng: 127.4275 },
  "대전 엑스포 과학공원": { lat: 36.3745, lng: 127.3885 },
  한밭수목원: { lat: 36.3689, lng: 127.3884 },
  유성온천: { lat: 36.3543, lng: 127.3421 },
  "대청호 오백리길": { lat: 36.4809, lng: 127.4867 }
};

function CourseDetail({ id }: { id: string }) {
  const isNew = id === "new";
  const numId = Number(id);
  const router = useRouter();
  const { myCourses, updateCourse, addCourse } = useCourseContext();

  const contextCourse = myCourses.find((c) => c.id === numId);
  const isOwned = isNew || !!contextCourse;

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
    : (contextCourse ?? {
        id: numId,
        title: "대전 하루 완전 정복",
        duration: "1일",
        isPrivate: false,
        rating: 4.9,
        likes: 245,
        tags: ["문화예술", "먹거리", "자연힐링"],
        days: [
          {
            day: 1,
            places: [
              { id: 1, name: "성심당", time: "09:00", duration: "1시간" },
              { id: 2, name: "대전 엑스포 과학공원", time: "11:00", duration: "2시간" },
              { id: 3, name: "한밭수목원", time: "15:00", duration: "2시간" }
            ]
          }
        ]
      });

  const [activeDay, setActiveDay] = useState(1);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(isNew);
  const [editTitle, setEditTitle] = useState(baseCourseData.title);
  const [editIsPrivate, setEditIsPrivate] = useState(baseCourseData.isPrivate);
  const [editStartDate, setEditStartDate] = useState(baseCourseData.startDate ?? "");
  const [editEndDate, setEditEndDate] = useState(baseCourseData.endDate ?? "");
  const [editDays, setEditDays] = useState<EditDay[]>(baseCourseData.days);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [showErrors, setShowErrors] = useState(false); // 저장 시 필수값 검증 표시
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const courseData = isEditing
    ? { ...baseCourseData, title: editTitle, days: editDays }
    : baseCourseData;

  const currentPlaces = courseData.days[activeDay - 1]?.places ?? [];
  // KakaoMap 마커 — 위경도가 있는(= PLACES 에 매칭되는) 장소만. marker.id 는 PLACES.id 로 두어
  // selectedId ↔ selectedPlaceId 가 그대로 연결되게 한다.
  const mapMarkers: MapMarker[] = currentPlaces.flatMap((p) => {
    const ll = PLACE_LATLNG[p.name];
    const found = PLACES.find((pl) => pl.name === p.name);
    if (!ll || !found) return [];
    return [
      {
        id: String(found.id),
        lat: ll.lat,
        lng: ll.lng,
        color: PLACE_COORDS[p.name]?.color ?? "#16a34a"
      }
    ];
  });
  const selectedPlace = PLACES.find((p) => p.id === selectedPlaceId);

  // 필수값: 코스 제목(course_nm). 공유 여부(open_yn)는 기본값이 있어 항상 채워지므로 검증 불필요.
  const titleMissing = editTitle.trim().length === 0;

  const handleSave = async () => {
    // 필수값이 없으면 저장하지 않고 안내만 표시
    if (titleMissing) {
      setShowErrors(true);
      return;
    }

    // 기존(메모리) 코스 편집은 course_id 가 없으므로 DB insert 없이 메모리만 갱신.
    // (추후 코스를 DB 에서 불러오게 되면 여기서 tb_course update 로 교체)
    if (!isNew) {
      updateCourse({
        ...baseCourseData,
        title: editTitle.trim(),
        isPrivate: editIsPrivate,
        days: editDays,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined
      });
      setIsEditing(false);
      setShowPlacePicker(false);
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
          register: "admin" // TODO: 로그인 사용자로 교체
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
            starttime: null,
            endtime: null
          }))
      );
      if (detailRows.length > 0) {
        const { error: detailErr } = await supabase.from("tb_course_detail").insert(detailRows);
        if (detailErr) throw detailErr;
      }

      // 내 코스 목록(현재 메모리 기반)에도 반영
      addCourse({
        id: genId(),
        title: editTitle.trim(),
        duration: editDays.length > 1 ? `${editDays.length}일` : "반일",
        isPrivate: editIsPrivate,
        rating: 0,
        likes: 0,
        tags: [],
        days: editDays,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined
      });
      router.push("/course");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
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
      router.push("/course");
      return;
    }
    setIsEditing(false);
    setEditTitle(baseCourseData.title);
    setEditIsPrivate(baseCourseData.isPrivate);
    setEditStartDate(baseCourseData.startDate ?? "");
    setEditEndDate(baseCourseData.endDate ?? "");
    setEditDays(baseCourseData.days);
    setShowPlacePicker(false);
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
    setShowPlacePicker(false);
    setShowErrors(false);
  };

  return (
    <div
      className="relative -mx-4 -mt-6 -mb-24 flex overflow-hidden md:-mx-6"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside
        className={`border-hairline shrink-0 flex-col overflow-hidden bg-white md:flex md:w-72 md:border-r ${
          isEditing
            ? "absolute inset-x-0 bottom-0 z-30 flex h-[65%] rounded-t-2xl border-t shadow-2xl md:static md:inset-auto md:z-auto md:h-auto md:rounded-none md:border-t-0 md:shadow-none"
            : "hidden"
        }`}
      >
        {selectedPlace && !isEditing ? (
          <PlaceDetailPanel place={selectedPlace} onBack={() => setSelectedPlaceId(null)} />
        ) : isEditing ? (
          /* ── 편집 패널 ── */
          <>
            {/* 모바일 바텀시트 핸들 */}
            <div className="flex shrink-0 justify-center pt-2 md:hidden">
              <span className="bg-hairline h-1 w-10 rounded-full" />
            </div>

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

            <div className="flex-1 overflow-y-auto">
              {/* Title edit */}
              <div className="border-hairline-soft border-b px-4 py-3">
                <p className="text-steel mb-1.5 text-xs font-semibold">
                  코스 제목 <span className="text-red-500">*</span>
                </p>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="코스 제목을 입력해 주세요"
                  className={`focus:ring-brand-500 w-full rounded-lg border px-3 py-2 text-sm font-semibold focus:ring-2 focus:outline-none ${
                    showErrors && titleMissing ? "border-red-400 bg-red-50" : "border-hairline"
                  }`}
                />
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
                <p className="mb-2 px-1 text-xs font-semibold text-gray-500">
                  Day {activeDay} 장소
                </p>
                {(editDays.find((d) => d.day === activeDay)?.places ?? []).map(
                  (place, idx, arr) => (
                    <div
                      key={`${place.id}-${idx}`}
                      className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-2 py-2"
                    >
                      {/* Up/down */}
                      <div className="flex shrink-0 flex-col gap-0.5">
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
                          className="text-gray-300 transition-colors hover:text-gray-600 disabled:opacity-20"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
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
                          className="text-gray-300 transition-colors hover:text-gray-600 disabled:opacity-20"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {/* Number badge */}
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: PLACE_COORDS[place.name]?.color ?? "#16a34a" }}
                      >
                        {idx + 1}
                      </div>
                      {/* Name + time */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-800">{place.name}</p>
                        <input
                          value={place.time}
                          onChange={(e) =>
                            setEditDays(
                              editDays.map((d) => {
                                if (d.day !== activeDay) return d;
                                const ps = d.places.map((p, i) =>
                                  i === idx ? { ...p, time: e.target.value } : p
                                );
                                return { ...d, places: ps };
                              })
                            )
                          }
                          className="focus:border-brand-400 w-14 border-b border-gray-200 bg-transparent text-[10px] text-gray-500 focus:outline-none"
                        />
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

                {/* Add place button */}
                <button
                  onClick={() => setShowPlacePicker(!showPlacePicker)}
                  className="border-brand-300 text-brand-600 hover:bg-brand-50 mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-xs font-semibold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  장소 추가
                </button>

                {/* Place picker */}
                {showPlacePicker && (
                  <div className="mt-1 overflow-hidden rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="text-xs font-semibold text-gray-600">장소 선택</p>
                      <button
                        onClick={() => setShowPlacePicker(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {PLACES.filter(
                      (p) =>
                        !(editDays.find((d) => d.day === activeDay)?.places ?? []).some(
                          (ep) => ep.name === p.name
                        )
                    ).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setEditDays(
                            editDays.map((d) => {
                              if (d.day !== activeDay) return d;
                              const newPlace: EditPlace = {
                                id: Date.now(),
                                name: p.name,
                                time: "09:00",
                                duration: "1시간",
                                placeId: p.id // 현재 mock PLACES.id, 추후 tb_place.place_id
                              };
                              return { ...d, places: [...d.places, newPlace] };
                            })
                          );
                          setShowPlacePicker(false);
                        }}
                        className="flex w-full items-center justify-between border-b border-gray-50 px-3 py-2 transition-colors last:border-0 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-1.5 py-0.5 text-xs font-medium"
                            style={{
                              background: PLACE_COLORS[p.colorKey].bg,
                              color: PLACE_COLORS[p.colorKey].color
                            }}
                          >
                            {p.category}
                          </span>
                          <span className="text-xs font-medium text-gray-800">{p.name}</span>
                        </div>
                        <Plus className="text-brand-500 h-3.5 w-3.5 shrink-0" />
                      </button>
                    ))}
                  </div>
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
                onClick={() => router.push("/course")}
                className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="flex-1 truncate text-sm font-bold text-gray-800">
                {courseData.title}
              </h2>
            </div>

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
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {currentPlaces.map((place, index) => (
                <div
                  key={place.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  onClick={() => {
                    const f = PLACES.find((p) => p.name === place.name);
                    if (f) setSelectedPlaceId(f.id);
                  }}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: PLACE_COORDS[place.name]?.color ?? "#16a34a" }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{place.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {place.time} · {place.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 gap-2 border-t border-gray-100 px-4 py-3">
              {isOwned ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                >
                  <Pencil className="h-4 w-4" />
                  코스 편집
                </button>
              ) : (
                <button className="bg-brand-600 hover:bg-brand-700 flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors">
                  내 코스에 추가
                </button>
              )}
              <button
                onClick={() => setFavorited((v) => !v)}
                className={`rounded-xl border px-3 py-2.5 transition-colors ${favorited ? "border-red-300 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
              >
                <Heart
                  className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : "text-gray-700"}`}
                />
              </button>
              <button className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:bg-gray-50">
                <Share2 className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── MAP AREA ── (모바일 편집 시 지도는 그대로 보이고 편집 패널이 하단 시트로 뜸) */}
      <div className="relative flex-1 overflow-hidden">
        <KakaoMap
          markers={mapMarkers}
          selectedId={selectedPlaceId != null ? String(selectedPlaceId) : null}
          onSelect={(id) => setSelectedPlaceId(Number(id))}
          onDeselect={() => setSelectedPlaceId(null)}
        />

        {/* Mobile: back button (편집 중엔 시트의 '취소'로 나가므로 숨김) */}
        <div className={`absolute top-3 left-3 z-10 ${isEditing ? "hidden" : "md:hidden"}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/course")}
            className="flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-md transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            목록
          </Button>
        </div>

        {/* Mobile: bottom card (편집 중엔 하단 시트가 대신하므로 숨김) */}
        {!isEditing &&
          (selectedPlace ? (
            <div className="absolute inset-0 z-20 overflow-y-auto bg-white md:hidden">
              <PlaceDetailPanel place={selectedPlace} onBack={() => setSelectedPlaceId(null)} />
            </div>
          ) : (
            <div className="border-hairline-soft absolute right-3 bottom-4 left-3 z-10 rounded-lg border bg-white p-4 shadow-xl md:hidden">
              <h2 className="text-ink mb-2 text-sm font-bold">{courseData.title}</h2>
              <div className="text-steel mb-3 flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                  <span className="text-ink font-semibold">{courseData.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  <span>{courseData.likes}</span>
                </div>
              </div>
              <div className="mb-3 flex gap-2">
                {courseData.days.map((day) => (
                  <button
                    key={day.day}
                    onClick={() => setActiveDay(day.day)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${activeDay === day.day ? "bg-brand-500 text-ink" : "bg-surface text-slate"}`}
                  >
                    Day {day.day}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex flex-col gap-1.5">
                {currentPlaces.map((place, index) => (
                  <div
                    key={place.id}
                    className="bg-surface-soft hover:bg-surface flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors"
                    onClick={() => {
                      const found = PLACES.find((p) => p.name === place.name);
                      if (found) setSelectedPlaceId(found.id);
                    }}
                  >
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: PLACE_COORDS[place.name]?.color ?? "#16a34a" }}
                    >
                      {index + 1}
                    </div>
                    <span className="text-ink truncate text-xs font-semibold">{place.name}</span>
                    <span className="text-stone ml-auto shrink-0 text-xs">{place.time}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {isOwned ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-gold-500 hover:bg-gold-600 flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold text-white transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    코스 편집
                  </button>
                ) : (
                  <Button variant="accent" className="flex-1 py-2">
                    내 코스에 추가
                  </Button>
                )}
                <button
                  onClick={() => setFavorited((v) => !v)}
                  className={`rounded-full border px-3 py-2 transition-colors ${favorited ? "border-red-300 bg-red-50" : "border-hairline hover:bg-surface-soft bg-white"}`}
                >
                  <Heart
                    className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : "text-slate"}`}
                  />
                </button>
                <button className="border-hairline hover:bg-surface-soft rounded-full border bg-white px-3 py-2 transition-colors">
                  <Share2 className="text-slate h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
