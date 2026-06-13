"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { Plus, Sparkles, Heart, Share2, SlidersHorizontal, ChevronDown, Star, X, ChevronUp, Trash2, Check, Pencil, ShieldCheck, User } from "lucide-react";
import { Filters, DEFAULT_FILTERS, FilterFields } from "@/components/PlaceFilters";
import { useCourseContext, type MyCourse, type CourseDay, type CoursePlace } from "@/context/CourseContext";
import PlaceDetailPanel from "@/components/PlaceDetailPanel";
import { PLACES } from "@/data/placesData";

type AuthorType = "admin" | "user";
interface SharedCourse {
  id: number; title: string; duration: string; places: number;
  rating: number; likes: number; themes: string[];
  author: string; authorType: AuthorType; date: string;
}

const sharedCourses: SharedCourse[] = [
  { id: 101, title: "대전 무장애 가족 나들이", duration: "1일", places: 5, rating: 4.8, likes: 312, themes: ["자연힐링", "먹거리"], author: "대전관광공사", authorType: "admin", date: "2025.04.10" },
  { id: 102, title: "휠체어로 즐기는 성심당 & 수목원", duration: "반일", places: 3, rating: 4.9, likes: 275, themes: ["빵지순례", "자연힐링"], author: "대전관광공사", authorType: "admin", date: "2025.03.28" },
  { id: 103, title: "유성온천 힐링 코스", duration: "1일", places: 4, rating: 4.6, likes: 198, themes: ["문화예술", "자연힐링"], author: "대전시청 관광과", authorType: "admin", date: "2025.02.15" },
  { id: 104, title: "엄마랑 아이랑 과학 탐험", duration: "반일", places: 2, rating: 4.7, likes: 142, themes: ["과학"], author: "travel_daejeon", authorType: "user", date: "2025.05.02" },
  { id: 105, title: "대청호 데크로드 산책", duration: "반일", places: 3, rating: 4.5, likes: 87, themes: ["자연힐링"], author: "힐링여행자", authorType: "user", date: "2025.04.22" },
  { id: 106, title: "역사 도심 골목 투어", duration: "1일", places: 6, rating: 4.4, likes: 63, themes: ["역사근대", "문화예술"], author: "대전토박이", authorType: "user", date: "2025.04.18" },
  { id: 107, title: "대전 빵지순례 완전판", duration: "반일", places: 4, rating: 4.8, likes: 221, themes: ["빵지순례", "먹거리"], author: "빵순이여행기", authorType: "user", date: "2025.03.30" },
];

const recommendedCourses = [
  { id: 1, title: "대전 하루 완전 정복", duration: "1일", places: 8, rating: 4.9, likes: 245, themes: ["문화예술", "먹거리", "자연힐링"] },
  { id: 2, title: "자연 속 힐링 여행", duration: "2일", places: 6, rating: 4.8, likes: 189, themes: ["자연힐링"] },
  { id: 3, title: "문화와 예술을 찾아서", duration: "1일", places: 5, rating: 4.7, likes: 156, themes: ["문화예술", "역사근대"] },
  { id: 4, title: "성심당과 빵집 투어", duration: "반일", places: 4, rating: 4.9, likes: 312, themes: ["빵지순례", "먹거리"] },
  { id: 5, title: "대전 과학 탐험", duration: "1일", places: 5, rating: 4.6, likes: 98, themes: ["과학"] },
  { id: 6, title: "역사 따라 걷는 대전", duration: "1일", places: 6, rating: 4.5, likes: 74, themes: ["역사근대", "문화예술"] },
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
    setSharedFilters(prev => ({ ...prev, [key]: val }));
  const toggleSharedList = (key: "themes" | "accessibility", item: string) =>
    setSharedFilters(prev => {
      const list = prev[key] as string[];
      return { ...prev, [key]: list.includes(item) ? list.filter(x => x !== item) : [...list, item] };
    });
  const resetShared = () => setSharedFilters(DEFAULT_FILTERS);
  const sharedFilterCount = [
    sharedFilters.accessibility.length > 0, sharedFilters.gu, sharedFilters.themes.length > 0, sharedFilters.headcount > 1,
    sharedFilters.dateFrom || sharedFilters.dateTo, sharedFilters.minRating > 0, sharedFilters.favoritesOnly,
  ].filter(Boolean).length;
  const filteredShared = sharedCourses.filter(course => {
    if (sharedFilters.themes.length > 0 && !course.themes.some(t => sharedFilters.themes.includes(t))) return false;
    if (sharedFilters.minRating > 0 && course.rating < sharedFilters.minRating) return false;
    return true;
  });

  // 추천 코스 helpers
  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: val }));
  const toggleList = (key: "themes" | "accessibility", item: string) =>
    setFilters(prev => {
      const list = prev[key] as string[];
      return { ...prev, [key]: list.includes(item) ? list.filter(x => x !== item) : [...list, item] };
    });
  const resetAll = () => { setFilters(DEFAULT_FILTERS); setShowResults(false); };
  const activeFilterCount = [
    filters.accessibility.length > 0, filters.gu, filters.themes.length > 0, filters.headcount > 1,
    filters.dateFrom || filters.dateTo, filters.minRating > 0, filters.favoritesOnly,
  ].filter(Boolean).length;
  const filteredCourses = recommendedCourses.filter(course => {
    if (filters.themes.length > 0 && !course.themes.some(t => filters.themes.includes(t))) return false;
    if (filters.minRating > 0 && course.rating < filters.minRating) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(["shared", "recommend", "my"] as const).map(tab => {
          const labels = { shared: "공유 코스", recommend: "추천 코스", my: "내 코스" };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-800"
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
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setShowSharedFilters(!showSharedFilters)}
              className="flex-1 flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                <span>필터</span>
                {sharedFilterCount > 0 && (
                  <span className="w-5 h-5 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {sharedFilterCount}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSharedFilters ? "rotate-180" : ""}`} />
            </button>
            {sharedFilterCount > 0 && (
              <button
                onClick={resetShared}
                className="px-3 py-2.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors border-l border-gray-200 shrink-0"
              >
                초기화
              </button>
            )}
          </div>

          {/* 필터 패널 */}
          {showSharedFilters && (
            <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-4">
              <FilterFields filters={sharedFilters} set={setShared} toggleList={toggleSharedList} />
              <button
                onClick={() => setShowSharedFilters(false)}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
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
          {filteredShared.length > 0 ? filteredShared.map(course => (
            <Link
              key={course.id}
              href={`/course/${course.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              {/* Author row */}
              <div className="flex items-center gap-1.5 mb-2">
                {course.authorType === "admin" ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    <ShieldCheck className="w-3 h-3" />관리자
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    <User className="w-3 h-3" />유저
                  </span>
                )}
                <span className="text-xs text-gray-500 font-medium">{course.author}</span>
                <span className="ml-auto text-[10px] text-gray-300">{course.date}</span>
              </div>
              {/* Title + rating */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-800 leading-snug">{course.title}</h3>
                <div className="flex items-center gap-1 text-sm shrink-0 ml-2">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-gray-700">{course.rating}</span>
                </div>
              </div>
              {/* Meta */}
              <div className="flex gap-3 text-sm text-gray-500 mb-3">
                <span>{course.duration}</span>
                <span>•</span>
                <span>{course.places}곳</span>
              </div>
              {/* Themes + likes */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {course.themes.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">{t}</span>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Heart className="w-3.5 h-3.5" />
                  <span>{course.likes}</span>
                </div>
              </div>
            </Link>
          )) : (
            <div className="text-center py-12 text-gray-400">
              <X className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">조건에 맞는 코스가 없어요</p>
              <button onClick={resetShared} className="mt-2 text-sm text-brand-600 hover:text-brand-700 underline underline-offset-2">
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
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                <span>필터</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
            {(activeFilterCount > 0 || showResults) && (
              <button
                onClick={resetAll}
                className="px-3 py-2.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors border-l border-gray-200 shrink-0"
              >
                초기화
              </button>
            )}
          </div>

          {/* 필터 패널 */}
          {showFilters && (
            <div className="border border-gray-200 rounded-xl bg-white p-4">
              <FilterFields filters={filters} set={set} toggleList={toggleList} />
            </div>
          )}

          {/* AI 추천 배너 */}
          <div className="bg-brand-50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              <div>
                <p className="text-sm font-semibold text-brand-900">AI 코스 추천받기</p>
                <p className="text-xs text-brand-600 mt-0.5">필터 조건에 맞는 최적의 코스를 추천해드려요</p>
              </div>
            </div>
            <button
              onClick={() => setShowResults(true)}
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors shrink-0"
            >
              추천받기
            </button>
          </div>

          {/* 결과 */}
          {showResults ? (
            <>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{filteredCourses.length}개</span>의 코스를 찾았어요
              </p>
              <div className="space-y-3">
                {filteredCourses.length > 0 ? filteredCourses.map(course => (
                  <Link
                    key={course.id}
                    href={`/course/${course.id}`}
                    className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">{course.title}</h3>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-gray-700">{course.rating}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 text-sm text-gray-600 mb-3">
                      <span>{course.duration}</span>
                      <span>•</span>
                      <span>{course.places}곳</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {course.themes.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Heart className="w-3.5 h-3.5" />
                        <span>{course.likes}</span>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div className="text-center py-12 text-gray-400">
                    <X className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">조건에 맞는 코스가 없어요</p>
                    <button onClick={resetAll} className="mt-2 text-sm text-brand-600 hover:text-brand-700 underline underline-offset-2">
                      필터 초기화
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-14 text-gray-400">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-brand-300" />
              <p className="text-sm font-medium text-gray-500">원하는 조건을 설정하고</p>
              <p className="text-sm text-gray-400">AI 코스 추천받기를 눌러보세요</p>
            </div>
          )}
        </div>
      )}

      {/* My Courses Tab */}
      {activeTab === "my" && (
        <div className="space-y-4">
          <Link href="/course/new" className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            새 코스 만들기
          </Link>
          <div className="space-y-3">
            {myCourses.map(course => (
              <Link
                key={course.id}
                href={`/course/${course.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-800">{course.title}</h3>
                  {course.isPrivate && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">비공개</span>
                  )}
                </div>
                <div className="flex gap-3 text-sm text-gray-600">
                  <span>{course.duration}</span>
                  <span>•</span>
                  <span>{course.days.reduce((s, d) => s + d.places.length, 0)}곳</span>
                </div>
              </Link>
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
  "성심당":              { cx: 440, cy: 315, color: "#dc2626" },
  "대전 엑스포 과학공원": { cx: 557, cy: 165, color: "#7c3aed" },
  "한밭수목원":          { cx: 337, cy: 237, color: "#16a34a" },
  "유성온천":            { cx: 175, cy: 360, color: "#d97706" },
  "대청호 오백리길":     { cx: 800, cy: 435, color: "#2563eb" },
};

function CourseDetail({ id }: { id: string }) {
  const isNew = id === "new";
  const numId = Number(id);
  const router = useRouter();
  const { myCourses, updateCourse, addCourse } = useCourseContext();

  const contextCourse = myCourses.find(c => c.id === numId);
  const isOwned = isNew || !!contextCourse;

  const baseCourseData: MyCourse = isNew
    ? { id: 0, title: "", duration: "1일", isPrivate: true, rating: 0, likes: 0, tags: [], days: [{ day: 1, places: [] }] }
    : contextCourse ?? {
        id: numId,
        title: "대전 하루 완전 정복",
        duration: "1일",
        isPrivate: false,
        rating: 4.9,
        likes: 245,
        tags: ["문화예술", "먹거리", "자연힐링"],
        days: [{ day: 1, places: [
          { id: 1, name: "성심당", time: "09:00", duration: "1시간" },
          { id: 2, name: "대전 엑스포 과학공원", time: "11:00", duration: "2시간" },
          { id: 3, name: "한밭수목원", time: "15:00", duration: "2시간" },
        ]}],
      };

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
  const routePlaces = currentPlaces.map(p => ({
    ...PLACE_COORDS[p.name] ?? { cx: 500, cy: 350, color: "#16a34a" },
    label: p.name,
  }));
  const selectedPlace = PLACES.find(p => p.id === selectedPlaceId);

  return (
    <div
      className="relative -mx-4 md:-mx-6 -mt-6 -mb-24 flex overflow-hidden"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-gray-200 bg-white overflow-hidden">
        {selectedPlace && !isEditing ? (
          <PlaceDetailPanel place={selectedPlace} onBack={() => setSelectedPlaceId(null)} />
        ) : isEditing ? (
          /* ── 편집 패널 ── */
          <>
            {/* Edit header */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-amber-50">
              <button onClick={() => {
                if (isNew) { router.push("/course"); return; }
                setIsEditing(false); setEditTitle(baseCourseData.title); setEditIsPrivate(baseCourseData.isPrivate); setEditDays(baseCourseData.days); setShowPlacePicker(false);
              }} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                취소
              </button>
              <span className="flex-1 text-xs font-bold text-amber-700 text-center">코스 편집</span>
              <button onClick={() => {
                if (isNew) {
                  addCourse({
                    id: Date.now(),
                    title: editTitle,
                    duration: editDays.length > 1 ? `${editDays.length}일` : "반일",
                    isPrivate: editIsPrivate,
                    rating: 0, likes: 0, tags: [],
                    days: editDays,
                  });
                  router.push("/course");
                } else {
                  updateCourse({ ...baseCourseData, title: editTitle, isPrivate: editIsPrivate, days: editDays });
                  setIsEditing(false);
                  setShowPlacePicker(false);
                }
              }}
                className="flex items-center gap-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1 rounded-lg transition-colors">
                <Check className="w-3 h-3" />저장
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Title edit */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">코스 제목</p>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full text-sm font-semibold border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 공유 여부 */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700">공유 여부</p>
                  <p className="text-xs text-gray-400 mt-0.5">{editIsPrivate ? "나만 볼 수 있어요" : "모두에게 공개돼요"}</p>
                </div>
                <button
                  onClick={() => setEditIsPrivate(v => !v)}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${editIsPrivate ? "bg-gray-200" : "bg-brand-500"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${editIsPrivate ? "left-1" : "left-5"}`} />
                </button>
              </div>

              {/* Day tabs + add day */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">일정</p>
                <div className="flex flex-wrap gap-1.5">
                  {editDays.map(d => (
                    <div key={d.day} className="flex items-center gap-1">
                      <button onClick={() => setActiveDay(d.day)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          activeDay === d.day ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}>
                        Day {d.day}
                      </button>
                      {editDays.length > 1 && (
                        <button onClick={() => {
                          const next = editDays.filter(x => x.day !== d.day).map((x, i) => ({ ...x, day: i + 1 }));
                          setEditDays(next);
                          setActiveDay(Math.min(activeDay, next.length));
                        }} className="text-gray-300 hover:text-red-400 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => {
                    const newDay = editDays.length + 1;
                    setEditDays([...editDays, { day: newDay, places: [] }]);
                    setActiveDay(newDay);
                  }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 transition-colors">
                    <Plus className="w-3 h-3" />일정 추가
                  </button>
                </div>
              </div>

              {/* Place list (editable) */}
              <div className="px-3 py-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 px-1 mb-2">Day {activeDay} 장소</p>
                {(editDays.find(d => d.day === activeDay)?.places ?? []).map((place, idx, arr) => (
                  <div key={`${place.id}-${idx}`} className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-2 py-2">
                    {/* Up/down */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button disabled={idx === 0} onClick={() => setEditDays(editDays.map(d => {
                        if (d.day !== activeDay) return d;
                        const ps = [...d.places];
                        [ps[idx - 1], ps[idx]] = [ps[idx], ps[idx - 1]];
                        return { ...d, places: ps };
                      }))} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button disabled={idx === arr.length - 1} onClick={() => setEditDays(editDays.map(d => {
                        if (d.day !== activeDay) return d;
                        const ps = [...d.places];
                        [ps[idx], ps[idx + 1]] = [ps[idx + 1], ps[idx]];
                        return { ...d, places: ps };
                      }))} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Number badge */}
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: PLACE_COORDS[place.name]?.color ?? "#16a34a" }}>
                      {idx + 1}
                    </div>
                    {/* Name + time */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{place.name}</p>
                      <input value={place.time} onChange={e => setEditDays(editDays.map(d => {
                        if (d.day !== activeDay) return d;
                        const ps = d.places.map((p, i) => i === idx ? { ...p, time: e.target.value } : p);
                        return { ...d, places: ps };
                      }))} className="text-[10px] text-gray-500 bg-transparent border-b border-gray-200 focus:outline-none focus:border-brand-400 w-14" />
                    </div>
                    {/* Delete */}
                    <button onClick={() => setEditDays(editDays.map(d => {
                      if (d.day !== activeDay) return d;
                      return { ...d, places: d.places.filter((_, i) => i !== idx) };
                    }))} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add place button */}
                <button onClick={() => setShowPlacePicker(!showPlacePicker)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 border border-dashed border-brand-300 rounded-xl text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" />장소 추가
                </button>

                {/* Place picker */}
                {showPlacePicker && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden mt-1">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-600">장소 선택</p>
                      <button onClick={() => setShowPlacePicker(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {PLACES.filter(p => !(editDays.find(d => d.day === activeDay)?.places ?? []).some(ep => ep.name === p.name)).map(p => (
                      <button key={p.id} onClick={() => {
                        setEditDays(editDays.map(d => {
                          if (d.day !== activeDay) return d;
                          const newPlace: EditPlace = { id: Date.now(), name: p.name, time: "09:00", duration: "1시간" };
                          return { ...d, places: [...d.places, newPlace] };
                        }));
                        setShowPlacePicker(false);
                      }} className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: p.bg, color: p.color }}>{p.category}</span>
                          <span className="text-xs font-medium text-gray-800">{p.name}</span>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-brand-500 shrink-0" />
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
            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
              <button onClick={() => router.push("/course")}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-gray-800 truncate flex-1">{courseData.title}</h2>
            </div>

            {/* Meta */}
            {!isOwned && (
              <div className="shrink-0 px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-gray-800">{courseData.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    <span>{courseData.likes}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {courseData.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Day tabs */}
            <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
              {courseData.days.map(day => (
                <button key={day.day} onClick={() => setActiveDay(day.day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    activeDay === day.day ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                  Day {day.day}
                </button>
              ))}
            </div>

            {/* Place list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {currentPlaces.map((place, index) => (
                <div key={place.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => { const f = PLACES.find(p => p.name === place.name); if (f) setSelectedPlaceId(f.id); }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                    style={{ background: PLACE_COORDS[place.name]?.color ?? "#16a34a" }}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{place.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{place.time} · {place.duration}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="shrink-0 px-4 py-3 border-t border-gray-100 flex gap-2">
              {isOwned ? (
                <button onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors">
                  <Pencil className="w-4 h-4" />코스 편집
                </button>
              ) : (
                <button className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
                  내 코스에 추가
                </button>
              )}
              <button
                onClick={() => setFavorited(v => !v)}
                className={`px-3 py-2.5 rounded-xl border transition-colors ${favorited ? "bg-red-50 border-red-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}
              >
                <Heart className={`w-4 h-4 ${favorited ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
              </button>
              <button className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Share2 className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── MAP AREA ── */}
      <div className="flex-1 relative overflow-hidden">
        <MapCanvas
          className="w-full h-full"
          routePlaces={routePlaces}
          onPinClick={(i) => {
            const placeName = currentPlaces[i]?.name;
            if (placeName) {
              const found = PLACES.find(p => p.name === placeName);
              if (found) setSelectedPlaceId(found.id);
            }
          }}
        />

        {/* Mobile: back button */}
        <div className="md:hidden absolute top-3 left-3 z-10">
          <button onClick={() => router.push("/course")}
            className="flex items-center gap-1.5 bg-white rounded-xl shadow-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100">
            <ArrowLeft className="w-4 h-4" />
            목록
          </button>
        </div>

        {/* Mobile: bottom card */}
        {selectedPlace ? (
          <div className="md:hidden absolute inset-0 bg-white z-20 overflow-y-auto">
            <PlaceDetailPanel place={selectedPlace} onBack={() => setSelectedPlaceId(null)} />
          </div>
        ) : (
          <div className="md:hidden absolute bottom-4 left-3 right-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-10">
            <h2 className="font-bold text-gray-800 text-sm mb-2">{courseData.title}</h2>
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-gray-800">{courseData.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" /><span>{courseData.likes}</span>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              {courseData.days.map(day => (
                <button key={day.day} onClick={() => setActiveDay(day.day)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    activeDay === day.day ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"
                  }`}>
                  Day {day.day}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              {currentPlaces.map((place, index) => (
                <div
                  key={place.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    const found = PLACES.find(p => p.name === place.name);
                    if (found) setSelectedPlaceId(found.id);
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                    style={{ background: PLACE_COORDS[place.name]?.color ?? "#16a34a" }}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs font-semibold text-gray-800 truncate">{place.name}</span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">{place.time}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {isOwned ? (
                <button onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors">
                  <Pencil className="w-3.5 h-3.5" />코스 편집
                </button>
              ) : (
                <button className="flex-1 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
                  내 코스에 추가
                </button>
              )}
              <button
                onClick={() => setFavorited(v => !v)}
                className={`px-3 py-2 rounded-xl border transition-colors ${favorited ? "bg-red-50 border-red-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}
              >
                <Heart className={`w-4 h-4 ${favorited ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
              </button>
              <button className="px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Share2 className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
          <button className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 font-bold text-lg leading-none">+</button>
          <button className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 font-bold text-lg leading-none">−</button>
        </div>
      </div>
    </div>
  );
}
