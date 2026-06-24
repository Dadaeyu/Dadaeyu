"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Filter, X, ChevronDown, Star,
  SlidersHorizontal, Navigation, ChevronLeft, MapPin,
  Heart, Route, Flag, MessageCircle,
} from "lucide-react";
import { THEMES, Filters, DEFAULT_FILTERS, FilterFields } from "@/components/PlaceFilters";
import { PLACES, PLACE_COLORS, PLACE_DETAILS, type Place } from "@/data/placesData";
import PlaceDetailPanel from "@/components/PlaceDetailPanel";
import KakaoMap, { type MapMarker } from "@/components/KakaoMap";

export interface SearchPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
}

const MARKER_COLORS = PLACES.map(p => PLACE_COLORS[p.colorKey].color);

// ── 임시 하드코딩 템플릿 (리뷰·접근성 플레이스홀더) ─────────
const PLACEHOLDER_DETAIL = PLACE_DETAILS[1];

// ── 접근성 카테고리 아이콘 ────────────────────────────────
const CATEGORY_ICON: Record<string, string> = {
  "보행":   "♿",
  "시각":   "👁️",
  "청각":   "👂",
  "영유아": "🍼",
};

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").trim();
}

// ── 접근성 아코디언 섹션 ──────────────────────────────────
function AccessibilitySection({
  groups,
}: {
  groups: { category: string; items: { label: string; text: string }[] }[];
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 mb-2">접근성 정보</h4>
      <div className="space-y-2">
        {groups.map(group => {
          const icon = CATEGORY_ICON[group.category] ?? "📋";
          const isOpen = openCategory === group.category;
          const tagItems = group.items.slice(0, 3);
          const extraCount = Math.max(0, group.items.length - 3);
          const summary = group.items[0] ? stripHtml(group.items[0].text) : "";

          return (
            <div key={group.category} className="bg-brand-50 rounded-xl overflow-hidden">
              {/* 헤더 */}
              <button
                onClick={() => setOpenCategory(isOpen ? null : group.category)}
                className="w-full text-left p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{icon}</span>
                    <span className="text-xs font-semibold text-gray-800">{group.category}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>

                {/* 접힌 상태: 첫 항목 텍스트 요약 + 태그 */}
                {!isOpen && (
                  <>
                    {summary && (
                      <p className="text-xs text-gray-600 mb-2 text-left line-clamp-2">{summary}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {tagItems.map(item => (
                        <span
                          key={item.label}
                          className="text-[10px] px-2 py-0.5 bg-white/80 text-brand-700 rounded-full font-medium border border-brand-100"
                        >
                          {item.label}
                        </span>
                      ))}
                      {extraCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 bg-white/80 text-gray-500 rounded-full font-medium border border-gray-200">
                          +{extraCount}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </button>

              {/* 펼친 상태: grid-rows 트릭으로 자연스러운 애니메이션 */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="border-t border-brand-100 px-3 pb-3 pt-3 space-y-3">
                    {group.items.map(item => (
                      <div key={item.label}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                          <span className="text-xs font-semibold text-gray-800">{item.label}</span>
                        </div>
                        <p
                          className="text-xs text-gray-600 leading-relaxed pl-3"
                          dangerouslySetInnerHTML={{ __html: item.text }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 관광지 상세 패널 ──────────────────────────────────────
function TourismDetailPanel({
  sp,
  detail,
  isLoading,
  onBack,
}: {
  sp: SearchPlace;
  detail: {
    title: string; image: string; addr1: string;
    overview: string | null; use_time: string | null; phone: string | null;
    accessibility: { category: string; items: { label: string; text: string }[] }[];
  } | null;
  isLoading: boolean;
  onBack: () => void;
}) {
  const [favorited, setFavorited] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  const title = detail?.title ?? sp.name;
  const image = detail?.image ?? sp.image;
  const addr1 = detail?.addr1 || "-";
  const useTime = detail?.use_time || "-";
  const phone = detail?.phone || "-";
  const overview = detail?.overview || "상세내용이 없습니다";

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 헤더 */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-bold text-gray-800 truncate flex-1">{title}</h2>
      </div>

      {/* 이미지 */}
      {image ? (
        <img src={image} alt={title} className="shrink-0 w-full h-40 object-cover" />
      ) : (
        <div className="shrink-0 h-40 bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
          <MapPin className="w-12 h-12 text-white/60" />
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 p-4 space-y-5">
          {/* 제목 + 평점 */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-900 text-base leading-snug">{title}</h3>
              <div className="flex items-center gap-0.5 shrink-0">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-gray-800">4.5</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {PLACEHOLDER_DETAIL.tags.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">#{t}</span>
              ))}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setFavorited(v => !v); }}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                favorited ? "bg-red-50 border-red-300 text-red-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Heart className={`w-4 h-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
              즐겨찾기
            </button>
            <button className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Route className="w-4 h-4 text-brand-600" />
              내 코스
            </button>
            <button className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors">
              <Navigation className="w-4 h-4 text-blue-500" />
              경로안내
            </button>
          </div>

          {/* 기본 정보 */}
          <div className="space-y-1.5 text-xs text-gray-600">
            {[
              { label: "주소", value: addr1 },
              { label: "시간", value: useTime },
              { label: "전화", value: phone },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-2">
                <span className="font-medium text-gray-700 w-10 shrink-0">{label}</span>
                <span className="break-words min-w-0">{value}</span>
              </div>
            ))}
          </div>

          {/* 접근성 정보 */}
          {detail?.accessibility && detail.accessibility.length > 0 && (
            <AccessibilitySection groups={detail.accessibility} />
          )}

          {/* 상세 내용 (overview) */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">상세 내용</h4>
            <p className={`text-sm text-gray-600 leading-relaxed ${overviewExpanded ? "" : "line-clamp-5"}`}>
              {overview}
            </p>
            {overview !== "상세내용이 없습니다" && (
              <button
                onClick={() => setOverviewExpanded(v => !v)}
                className="text-xs text-brand-600 mt-1 hover:text-brand-800 transition-colors"
              >
                {overviewExpanded ? "접기 ▲" : "더보기 ▼"}
              </button>
            )}
          </div>

          {/* 리뷰 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-800">리뷰</h4>
              <span className="text-xs text-gray-400">{PLACEHOLDER_DETAIL.reviews.length}개</span>
            </div>
            <div className="space-y-3">
              {PLACEHOLDER_DETAIL.reviews.map(r => (
                <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-800">{r.user}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{r.content}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{r.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 제보 */}
          <div>
            {showReport ? (
              <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">정보 제보</p>
                <textarea
                  placeholder="잘못된 정보나 개선 사항을 알려주세요..."
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowReport(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">취소</button>
                  <button onClick={() => setShowReport(false)}
                    className="text-xs text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors">제출</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowReport(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                <Flag className="w-4 h-4" />
                정보 제보
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function Map() {
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get("theme");
  const initialFilter = searchParams.get("filter");
  const initialPlaceId = searchParams.get("place");
  const mapOnly = searchParams.get("mode") === "map";

  const [showFilters, setShowFilters] = useState(!!initialTheme);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [hotFilter, setHotFilter] = useState(initialFilter === "hot");
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    themes: initialTheme && THEMES.includes(initialTheme) ? [initialTheme] : [],
  }));
  const [detailId, setDetailId] = useState<number | null>(
    initialPlaceId ? Number(initialPlaceId) : null
  );
  const [navTarget, setNavTarget] = useState<Place | null>(null);

  // ── 키워드 검색 상태 ────────────────────────────────────
  const [keyword, setKeyword] = useState("");
  const [searchPlaces, setSearchPlaces] = useState<SearchPlace[]>([]);
  const [searchDetailId, setSearchDetailId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // ── 관광지 상세 상태 ─────────────────────────────────────
  const [tourismDetail, setTourismDetail] = useState<{
    title: string;
    image: string;
    addr1: string;
    overview: string | null;
    use_time: string | null;
    phone: string | null;
    accessibility: { category: string; items: { label: string; text: string }[] }[];
  } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (!searchDetailId) {
      setTourismDetail(null);
      return;
    }
    setIsLoadingDetail(true);
    fetch(`/api/tourism/detail?contentId=${searchDetailId}`)
      .then(r => r.json())
      .then(data => setTourismDetail(data))
      .catch(() => setTourismDetail(null))
      .finally(() => setIsLoadingDetail(false));
  }, [searchDetailId]);

  const handleSearch = async (kw: string) => {
    const accFilters = filters.accessibility;
    if (!kw.trim() && accFilters.length === 0) {
      setSearchPlaces([]);
      setSearchDetailId(null);
      return;
    }
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (kw.trim()) params.set("keyword", kw);
      if (accFilters.length > 0) params.set("accessibility", accFilters.join(","));
      const res = await fetch(`/api/search?${params}`);
      const data: SearchPlace[] = await res.json();
      setSearchPlaces(Array.isArray(data) ? data : []);
      setSearchDetailId(null);
    } catch {
      setSearchPlaces([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    handleSearch(keyword);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.accessibility]);

  const handleNavigate = (place: Place) => {
    setNavTarget(place);
    setDetailId(null);
  };

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: val }));
  const toggleList = (key: "themes" | "accessibility", item: string) =>
    setFilters(prev => {
      const list = prev[key] as string[];
      return { ...prev, [key]: list.includes(item) ? list.filter(x => x !== item) : [...list, item] };
    });

  const activeFilterCount = [
    filters.accessibility.length > 0, filters.gu, filters.themes.length > 0, filters.headcount > 1,
    filters.dateFrom || filters.dateTo, filters.minRating > 0, filters.favoritesOnly, hotFilter,
  ].filter(Boolean).length;

  const visiblePlaces = hotFilter ? PLACES.filter(p => p.hot) : PLACES;
  const detailPlace = PLACES.find(p => p.id === detailId);
  const searchDetail = searchDetailId ? searchPlaces.find(p => p.id === searchDetailId) : null;

  return (
    <div
      className="relative -mx-4 md:-mx-6 -mt-6 -mb-24 flex overflow-hidden"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── LEFT SIDEBAR (desktop only, hidden in mapOnly mode) ── */}
      <aside className={`${mapOnly ? "hidden" : "hidden md:flex"} flex-col w-72 shrink-0 border-r border-gray-200 bg-white overflow-hidden relative`}>

        {searchDetail ? (
          <TourismDetailPanel
            sp={searchDetail}
            detail={tourismDetail}
            isLoading={isLoadingDetail}
            onBack={() => setSearchDetailId(null)}
          />
        ) : detailPlace ? (
          <PlaceDetailPanel place={detailPlace} onBack={() => setDetailId(null)} onNavigate={handleNavigate} />
        ) : (
          <>
            {/* Search */}
            <div className="shrink-0 p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="장소 검색 (Enter)"
                  value={hotFilter ? "핫플레이스" : keyword}
                  readOnly={hotFilter}
                  onChange={e => { if (!hotFilter) setKeyword(e.target.value); }}
                  onKeyDown={e => { if (!hotFilter && e.key === "Enter") handleSearch(keyword); }}
                  className={`w-full pl-9 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    hotFilter ? "pr-8 border-orange-300 bg-orange-50 text-orange-700 font-medium" : "pr-4 border-gray-200"
                  }`}
                />
                {hotFilter && (
                  <button
                    onClick={() => setHotFilter(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-400 hover:text-orange-600 transition-colors"
                    aria-label="핫플레이스 필터 해제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter toggle */}
            <div className="shrink-0 border-b border-gray-100">
              <div className="flex items-center">
                <button onClick={() => setShowFilters(!showFilters)}
                  className="flex-1 flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>필터</span>
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </button>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setFilters(DEFAULT_FILTERS); setHotFilter(false); }}
                    className="px-3 py-2.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors border-l border-gray-100 shrink-0"
                  >
                    초기화
                  </button>
                )}
              </div>
              {showFilters && (
                <div className="px-3 pb-3 pt-2 border-t border-gray-100 overflow-y-auto" style={{ maxHeight: "45vh" }}>
                  <FilterFields filters={filters} set={set} toggleList={toggleList} compact />
                </div>
              )}
            </div>

            {/* 검색 결과 or 전체 장소 목록 */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {searchPlaces.length > 0
                    ? `검색 결과 ${searchPlaces.length}개`
                    : `장소 ${visiblePlaces.length}개`}
                </span>
              </div>

              {/* 검색 결과 목록 */}
              {searchPlaces.length > 0 ? (
                searchPlaces.map(sp => (
                  <button key={sp.id}
                    onClick={() => setSearchDetailId(sp.id)}
                    className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      {sp.image ? (
                        <img src={sp.image} alt={sp.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-700 transition-colors">{sp.name}</p>
                    </div>
                  </button>
                ))
              ) : (
                visiblePlaces.map(place => (
                  <button key={place.id}
                    onClick={() => setDetailId(place.id)}
                    className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-700 transition-colors">{place.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: PLACE_COLORS[place.colorKey].bg, color: PLACE_COLORS[place.colorKey].color }}>{place.category}</span>
                          <div className="flex items-center gap-0.5 text-xs text-gray-500">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{place.rating}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 mt-0.5">{place.distance}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </aside>

      {/* ── MAP AREA ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Search + filter bar */}
        <div className={`${mapOnly ? "" : "md:hidden"} flex absolute top-3 left-3 right-3 z-20 gap-2`}>
          <div className="flex-1 relative bg-white rounded-xl shadow-lg border border-gray-100">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={isSearching ? "검색 중..." : "장소 검색 (Enter)"}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch(keyword)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-transparent focus:outline-none"
            />
          </div>
          {!mapOnly && (
            <button onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`relative px-3 rounded-xl shadow-lg transition-colors ${showMobileFilters ? "bg-brand-700 text-white" : "bg-brand-600 text-white hover:bg-brand-700"}`}>
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
              )}
            </button>
          )}
        </div>

        {/* Mobile filter panel */}
        {showMobileFilters && (
          <div className="md:hidden absolute top-16 left-3 right-3 z-30 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800">필터</p>
              <div className="flex items-center gap-2">
                <button onClick={() => { setFilters(DEFAULT_FILTERS); setHotFilter(false); }} className="text-xs text-red-400 hover:text-red-600 underline">초기화</button>
                <button onClick={() => setShowMobileFilters(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <FilterFields filters={filters} set={set} toggleList={toggleList} />
          </div>
        )}

        {/* Kakao Map */}
        <KakaoMap
          markers={searchPlaces.map((sp, i): MapMarker => ({
            id: sp.id,
            lat: sp.lat,
            lng: sp.lng,
            color: MARKER_COLORS[i % MARKER_COLORS.length],
          }))}
          selectedId={searchDetailId}
          onSelect={id => setSearchDetailId(id)}
          onDeselect={() => { setDetailId(null); setSearchDetailId(null); }}
          navTarget={navTarget}
        />

        {/* Mobile PlaceDetail overlay */}
        {detailPlace && (
          <div className="md:hidden absolute inset-0 z-40 bg-white overflow-y-auto">
            <PlaceDetailPanel place={detailPlace} onBack={() => setDetailId(null)} onNavigate={handleNavigate} />
          </div>
        )}

        {/* 검색 결과 상세 overlay (모바일 + mapOnly 데스크탑) */}
        {searchDetail && (
          <div className={`${mapOnly ? "" : "md:hidden"} absolute inset-0 z-40 bg-white overflow-y-auto`}>
            <TourismDetailPanel
              sp={searchDetail}
              detail={tourismDetail}
              isLoading={isLoadingDetail}
              onBack={() => setSearchDetailId(null)}
            />
          </div>
        )}

        {/* 경로 안내 정보 바 */}
        {navTarget && !detailPlace && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white rounded-2xl shadow-xl border border-blue-100 px-4 py-3 flex items-center gap-4 min-w-[260px]">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 shrink-0">
              <Navigation className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-medium">목적지</p>
              <p className="text-sm font-bold text-gray-800 truncate">{navTarget.name}</p>
            </div>
            <div className="text-center shrink-0">
              <p className="text-[10px] text-gray-400 font-medium">거리</p>
              <p className="text-sm font-semibold text-blue-600">{navTarget.distance}</p>
            </div>
            <button
              onClick={() => setNavTarget(null)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              aria-label="경로 안내 종료"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
