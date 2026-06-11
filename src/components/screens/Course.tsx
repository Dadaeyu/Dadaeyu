"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
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
  User
} from "lucide-react";
import { Filters, DEFAULT_FILTERS, FilterFields } from "@/components/PlaceFilters";
import {
  useCourseContext,
  type MyCourse,
  type CourseDay,
  type CoursePlace
} from "@/context/CourseContext";
import PlaceDetailPanel from "@/components/PlaceDetailPanel";
import { PLACES } from "@/data/placesData";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { genId } from "@/utils/id";

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

export default function Course() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const { myCourses } = useCourseContext();
  const [activeTab, setActiveTab] = useState<"shared" | "recommend" | "my">("shared");

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
      <Tabs
        variant="segmented"
        value={activeTab}
        onValueChange={(k) => setActiveTab(k as typeof activeTab)}
        items={[
          { key: "shared", label: "공유 코스" },
          { key: "recommend", label: "추천 코스" },
          { key: "my", label: "내 코스" }
        ]}
      />

      {/* Shared Courses Tab */}
      {activeTab === "shared" && (
        <div className="space-y-4">
          {/* 필터 토글 헤더 */}
          <div className="border-hairline flex items-center overflow-hidden rounded-lg border bg-white">
            <button
              onClick={() => setShowSharedFilters(!showSharedFilters)}
              className="text-slate hover:bg-surface-soft flex flex-1 items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="text-steel h-4 w-4" />
                <span>필터</span>
                {sharedFilterCount > 0 && (
                  <span className="bg-brand-500 text-ink flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                    {sharedFilterCount}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`text-stone h-4 w-4 transition-transform ${showSharedFilters ? "rotate-180" : ""}`}
              />
            </button>
            {sharedFilterCount > 0 && (
              <button
                onClick={resetShared}
                className="border-hairline shrink-0 border-l px-3 py-2.5 text-xs text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                초기화
              </button>
            )}
          </div>

          {/* 필터 패널 */}
          {showSharedFilters && (
            <div className="border-hairline space-y-4 rounded-lg border bg-white p-4">
              <FilterFields filters={sharedFilters} set={setShared} toggleList={toggleSharedList} />
              <Button
                variant="accent"
                onClick={() => setShowSharedFilters(false)}
                className="w-full"
              >
                검색
              </Button>
            </div>
          )}

          {/* 결과 수 */}
          <p className="text-steel text-sm">
            <span className="text-ink font-semibold">{filteredShared.length}개</span>의 코스
            {sharedFilterCount > 0 && "를 찾았어요"}
          </p>

          {/* 코스 목록 */}
          {filteredShared.length > 0 ? (
            filteredShared.map((course) => (
              <Card key={course.id} asChild variant="interactive">
                <Link href={`/course/${course.id}`} className="block">
                  {/* Author row */}
                  <div className="mb-2 flex items-center gap-1.5">
                    {course.authorType === "admin" ? (
                      <Badge tone="tag" className="text-[10px] font-bold">
                        <ShieldCheck className="h-3 w-3" />
                        관리자
                      </Badge>
                    ) : (
                      <Badge tone="neutral" className="text-[10px] font-bold">
                        <User className="h-3 w-3" />
                        유저
                      </Badge>
                    )}
                    <span className="text-steel text-xs font-medium">{course.author}</span>
                    <span className="text-stone ml-auto text-[10px]">{course.date}</span>
                  </div>
                  {/* Title + rating */}
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="text-ink leading-snug font-semibold">{course.title}</h3>
                    <div className="ml-2 flex shrink-0 items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                      <span className="text-slate">{course.rating}</span>
                    </div>
                  </div>
                  {/* Meta */}
                  <div className="text-steel mb-3 flex gap-3 text-sm">
                    <span>{course.duration}</span>
                    <span>•</span>
                    <span>{course.places}곳</span>
                  </div>
                  {/* Themes + likes */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {course.themes.map((t) => (
                        <Badge key={t} tone="brand">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-stone flex items-center gap-1 text-sm">
                      <Heart className="h-3.5 w-3.5" />
                      <span>{course.likes}</span>
                    </div>
                  </div>
                </Link>
              </Card>
            ))
          ) : (
            <div className="text-stone py-12 text-center">
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
          <div className="border-hairline flex items-center overflow-hidden rounded-lg border bg-white">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-slate hover:bg-surface-soft flex flex-1 items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="text-steel h-4 w-4" />
                <span>필터</span>
                {activeFilterCount > 0 && (
                  <span className="bg-brand-500 text-ink flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`text-stone h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>
            {(activeFilterCount > 0 || showResults) && (
              <button
                onClick={resetAll}
                className="border-hairline shrink-0 border-l px-3 py-2.5 text-xs text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                초기화
              </button>
            )}
          </div>

          {/* 필터 패널 */}
          {showFilters && (
            <div className="border-hairline rounded-lg border bg-white p-4">
              <FilterFields filters={filters} set={set} toggleList={toggleList} />
            </div>
          )}

          {/* AI 추천 배너 */}
          <div className="bg-brand-50 flex items-center justify-between rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-brand-600 h-5 w-5" />
              <div>
                <p className="text-brand-900 text-sm font-semibold">AI 코스 추천받기</p>
                <p className="text-brand-600 mt-0.5 text-xs">
                  필터 조건에 맞는 최적의 코스를 추천해드려요
                </p>
              </div>
            </div>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setShowResults(true)}
              className="shrink-0"
            >
              추천받기
            </Button>
          </div>

          {/* 결과 */}
          {showResults ? (
            <>
              <p className="text-steel text-sm">
                <span className="text-ink font-semibold">{filteredCourses.length}개</span>의 코스를
                찾았어요
              </p>
              <div className="space-y-3">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <Card key={course.id} asChild variant="interactive">
                      <Link href={`/course/${course.id}`} className="block">
                        <div className="mb-2 flex items-start justify-between">
                          <h3 className="text-ink font-semibold">{course.title}</h3>
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                            <span className="text-slate">{course.rating}</span>
                          </div>
                        </div>
                        <div className="text-steel mb-3 flex gap-3 text-sm">
                          <span>{course.duration}</span>
                          <span>•</span>
                          <span>{course.places}곳</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {course.themes.map((t) => (
                              <Badge key={t} tone="brand">
                                {t}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-steel flex items-center gap-1 text-sm">
                            <Heart className="h-3.5 w-3.5" />
                            <span>{course.likes}</span>
                          </div>
                        </div>
                      </Link>
                    </Card>
                  ))
                ) : (
                  <div className="text-stone py-12 text-center">
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
            <div className="text-stone py-14 text-center">
              <Sparkles className="text-brand-300 mx-auto mb-3 h-10 w-10" />
              <p className="text-steel text-sm font-medium">원하는 조건을 설정하고</p>
              <p className="text-stone text-sm">AI 코스 추천받기를 눌러보세요</p>
            </div>
          )}
        </div>
      )}

      {/* My Courses Tab */}
      {activeTab === "my" && (
        <div className="space-y-4">
          <Link
            href="/course/new"
            className="hover:border-brand-400 hover:text-brand-600 border-hairline text-steel flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 transition-colors"
          >
            <Plus className="h-5 w-5" />새 코스 만들기
          </Link>
          <div className="space-y-3">
            {myCourses.map((course) => (
              <Card key={course.id} asChild variant="interactive">
                <Link href={`/course/${course.id}`} className="block">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="text-ink font-semibold">{course.title}</h3>
                    {course.isPrivate && (
                      <Badge tone="neutral" shape="tag">
                        비공개
                      </Badge>
                    )}
                  </div>
                  <div className="text-steel flex gap-3 text-sm">
                    <span>{course.duration}</span>
                    <span>•</span>
                    <span>{course.days.reduce((s, d) => s + d.places.length, 0)}곳</span>
                  </div>
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

// 장소별 지도 좌표 (Map.tsx PLACES 기준)
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
  const [editDays, setEditDays] = useState<EditDay[]>(baseCourseData.days);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const courseData = isEditing
    ? { ...baseCourseData, title: editTitle, days: editDays }
    : baseCourseData;

  const currentPlaces = courseData.days[activeDay - 1]?.places ?? [];
  const routePlaces = currentPlaces.map((p) => ({
    ...(PLACE_COORDS[p.name] ?? { cx: 500, cy: 350, color: "#16a34a" }),
    label: p.name
  }));
  const selectedPlace = PLACES.find((p) => p.id === selectedPlaceId);

  return (
    <div
      className="relative -mx-4 -mt-6 -mb-24 flex overflow-hidden md:-mx-6"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className="border-hairline hidden w-72 shrink-0 flex-col overflow-hidden border-r bg-white md:flex">
        {selectedPlace && !isEditing ? (
          <PlaceDetailPanel place={selectedPlace} onBack={() => setSelectedPlaceId(null)} />
        ) : isEditing ? (
          /* ── 편집 패널 ── */
          <>
            {/* Edit header */}
            <div className="border-hairline-soft bg-gold-50 flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
              <button
                onClick={() => {
                  if (isNew) {
                    router.push("/course");
                    return;
                  }
                  setIsEditing(false);
                  setEditTitle(baseCourseData.title);
                  setEditIsPrivate(baseCourseData.isPrivate);
                  setEditDays(baseCourseData.days);
                  setShowPlacePicker(false);
                }}
                className="text-steel hover:bg-surface hover:text-ink rounded-full px-2 py-1 text-xs transition-colors"
              >
                취소
              </button>
              <span className="text-gold-700 flex-1 text-center text-xs font-bold">코스 편집</span>
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  if (isNew) {
                    addCourse({
                      id: genId(),
                      title: editTitle,
                      duration: editDays.length > 1 ? `${editDays.length}일` : "반일",
                      isPrivate: editIsPrivate,
                      rating: 0,
                      likes: 0,
                      tags: [],
                      days: editDays
                    });
                    router.push("/course");
                  } else {
                    updateCourse({
                      ...baseCourseData,
                      title: editTitle,
                      isPrivate: editIsPrivate,
                      days: editDays
                    });
                    setIsEditing(false);
                    setShowPlacePicker(false);
                  }
                }}
                className="gap-1 px-2.5 py-1 text-xs"
              >
                <Check className="h-3 w-3" />
                저장
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Title edit */}
              <div className="border-hairline-soft border-b px-4 py-3">
                <p className="text-steel mb-1.5 text-xs font-semibold">코스 제목</p>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="focus:ring-brand-500 border-hairline w-full rounded-lg border px-3 py-2 text-sm font-semibold focus:ring-2 focus:outline-none"
                />
              </div>

              {/* 공유 여부 */}
              <div className="border-hairline-soft flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-slate text-xs font-semibold">공유 여부</p>
                  <p className="text-stone mt-0.5 text-xs">
                    {editIsPrivate ? "나만 볼 수 있어요" : "모두에게 공개돼요"}
                  </p>
                </div>
                <button
                  onClick={() => setEditIsPrivate((v) => !v)}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${editIsPrivate ? "bg-hairline" : "bg-brand-500"}`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${editIsPrivate ? "left-1" : "left-5"}`}
                  />
                </button>
              </div>

              {/* Day tabs + add day */}
              <div className="border-hairline-soft border-b px-4 py-3">
                <p className="text-steel mb-1.5 text-xs font-semibold">일정</p>
                <div className="flex flex-wrap gap-1.5">
                  {editDays.map((d) => (
                    <div key={d.day} className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveDay(d.day)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${activeDay === d.day ? "bg-brand-500 text-ink" : "bg-surface text-slate hover:bg-hairline"}`}
                      >
                        Day {d.day}
                      </button>
                      {editDays.length > 1 && (
                        <button
                          onClick={() => {
                            const next = editDays
                              .filter((x) => x.day !== d.day)
                              .map((x, i) => ({ ...x, day: i + 1 }));
                            setEditDays(next);
                            setActiveDay(Math.min(activeDay, next.length));
                          }}
                          className="text-stone transition-colors hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
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
                </div>
              </div>

              {/* Place list (editable) */}
              <div className="space-y-1.5 px-3 py-3">
                <p className="text-steel mb-2 px-1 text-xs font-semibold">Day {activeDay} 장소</p>
                {(editDays.find((d) => d.day === activeDay)?.places ?? []).map(
                  (place, idx, arr) => (
                    <div
                      key={`${place.id}-${idx}`}
                      className="bg-surface-soft flex items-center gap-1.5 rounded-lg px-2 py-2"
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
                          className="text-stone hover:text-steel transition-colors disabled:opacity-20"
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
                          className="text-stone hover:text-steel transition-colors disabled:opacity-20"
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
                        <p className="text-ink truncate text-xs font-semibold">{place.name}</p>
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
                          className="focus:border-brand-400 border-hairline text-steel w-14 border-b bg-transparent text-[10px] focus:outline-none"
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
                        className="text-stone shrink-0 transition-colors hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                )}

                {/* Add place button */}
                <button
                  onClick={() => setShowPlacePicker(!showPlacePicker)}
                  className="border-brand-300 text-brand-600 hover:bg-brand-50 mt-1 flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed py-2 text-xs font-semibold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  장소 추가
                </button>

                {/* Place picker */}
                {showPlacePicker && (
                  <div className="border-hairline mt-1 overflow-hidden rounded-lg border">
                    <div className="border-hairline-soft bg-surface-soft flex items-center justify-between border-b px-3 py-2">
                      <p className="text-steel text-xs font-semibold">장소 선택</p>
                      <button
                        onClick={() => setShowPlacePicker(false)}
                        className="text-stone hover:text-steel"
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
                                id: genId(),
                                name: p.name,
                                time: "09:00",
                                duration: "1시간"
                              };
                              return { ...d, places: [...d.places, newPlace] };
                            })
                          );
                          setShowPlacePicker(false);
                        }}
                        className="border-hairline-soft hover:bg-surface-soft flex w-full items-center justify-between border-b px-3 py-2 transition-colors last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-1.5 py-0.5 text-xs font-medium"
                            style={{ background: p.bg, color: p.color }}
                          >
                            {p.category}
                          </span>
                          <span className="text-ink text-xs font-medium">{p.name}</span>
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
            <div className="border-hairline-soft flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/course")}
                aria-label="뒤로"
                className="text-steel rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-ink flex-1 truncate text-sm font-bold">{courseData.title}</h2>
            </div>

            {/* Meta */}
            {!isOwned && (
              <div className="border-hairline-soft shrink-0 border-b px-4 py-3">
                <div className="text-steel mb-2 flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                    <span className="text-ink font-semibold">{courseData.rating}</span>
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
            <div className="border-hairline-soft flex shrink-0 flex-wrap gap-2 border-b px-4 py-3">
              {courseData.days.map((day) => (
                <button
                  key={day.day}
                  onClick={() => setActiveDay(day.day)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${activeDay === day.day ? "bg-brand-500 text-ink" : "bg-surface text-slate hover:bg-hairline"}`}
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
                  className="bg-surface-soft hover:bg-surface flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors"
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
                    <p className="text-ink truncate text-sm font-semibold">{place.name}</p>
                    <p className="text-steel mt-0.5 text-xs">
                      {place.time} · {place.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="border-hairline-soft flex shrink-0 gap-2 border-t px-4 py-3">
              {isOwned ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-gold-500 hover:bg-gold-600 flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  코스 편집
                </button>
              ) : (
                <Button variant="accent" className="flex-1">
                  내 코스에 추가
                </Button>
              )}
              <button
                onClick={() => setFavorited((v) => !v)}
                className={`rounded-full border px-3 py-2.5 transition-colors ${favorited ? "border-red-300 bg-red-50" : "border-hairline hover:bg-surface-soft bg-white"}`}
              >
                <Heart
                  className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : "text-slate"}`}
                />
              </button>
              <button className="border-hairline hover:bg-surface-soft rounded-full border bg-white px-3 py-2.5 transition-colors">
                <Share2 className="text-slate h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── MAP AREA ── */}
      <div className="relative flex-1 overflow-hidden">
        <MapCanvas
          className="h-full w-full"
          routePlaces={routePlaces}
          onPinClick={(i) => {
            const placeName = currentPlaces[i]?.name;
            if (placeName) {
              const found = PLACES.find((p) => p.name === placeName);
              if (found) setSelectedPlaceId(found.id);
            }
          }}
        />

        {/* Mobile: back button */}
        <div className="absolute top-3 left-3 z-10 md:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/course")}
            className="bg-white shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            목록
          </Button>
        </div>

        {/* Mobile: bottom card */}
        {selectedPlace ? (
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
        )}

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button className="border-hairline text-slate hover:bg-surface-soft flex h-8 w-8 items-center justify-center rounded-full border bg-white text-lg leading-none font-bold">
            +
          </button>
          <button className="border-hairline text-slate hover:bg-surface-soft flex h-8 w-8 items-center justify-center rounded-full border bg-white text-lg leading-none font-bold">
            −
          </button>
        </div>
      </div>
    </div>
  );
}
