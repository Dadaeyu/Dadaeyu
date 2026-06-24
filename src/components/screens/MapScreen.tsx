"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Filter, X, ChevronDown, Star,
  SlidersHorizontal, Navigation,
} from "lucide-react";
import { THEMES, Filters, DEFAULT_FILTERS, FilterFields } from "@/components/PlaceFilters";
import { type Place } from "@/data/placesData";
import { usePlaces } from "@/context/PlacesContext";
import PlaceDetailPanel from "@/components/PlaceDetailPanel";
import KakaoMap from "@/components/KakaoMap";

function PlaceList({
  places,
  onSelect,
}: {
  places: Place[];
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          장소 {places.length}개
        </span>
      </div>
      {places.map((place) => (
        <button
          key={place.id}
          type="button"
          onClick={() => onSelect(place.id)}
          className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-700 transition-colors">
                {place.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: place.bg, color: place.color }}
                >
                  {place.category}
                </span>
                <div className="flex items-center gap-0.5 text-xs text-gray-500">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {place.rating}
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-400 shrink-0 mt-0.5">{place.distance}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function Map() {
  const { places: PLACES } = usePlaces();
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get("theme");
  const initialFilter = searchParams.get("filter");
  const initialPlaceId = searchParams.get("place");

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

  const handleNavigate = (place: Place) => {
    setNavTarget(place);
    setDetailId(null);
  };

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: val }));
  const toggleList = (key: "themes" | "accessibility", item: string) =>
    setFilters((prev) => {
      const list = prev[key] as string[];
      return {
        ...prev,
        [key]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item],
      };
    });

  const activeFilterCount = [
    filters.accessibility.length > 0,
    filters.gu,
    filters.themes.length > 0,
    filters.headcount > 1,
    filters.dateFrom || filters.dateTo,
    filters.minRating > 0,
    filters.favoritesOnly,
    hotFilter,
  ].filter(Boolean).length;

  const visiblePlaces = hotFilter ? PLACES.filter((p) => p.hot) : PLACES;
  const detailPlace = PLACES.find((p) => p.id === detailId);

  return (
    <div
      className="
        relative -mx-4 md:-mx-6 -mt-6 md:-mb-6
        flex flex-col md:flex-row overflow-hidden min-h-0
        h-[calc(100dvh-4rem-1.5rem-4rem)]
        md:h-[calc(100dvh-4rem-3rem)]
      "
    >
      {/* ── LEFT SIDEBAR (desktop only) ── */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 h-full min-h-0 border-r border-gray-200 bg-white overflow-hidden relative">
        {detailPlace ? (
          <PlaceDetailPanel
            place={detailPlace}
            onBack={() => setDetailId(null)}
            onNavigate={handleNavigate}
          />
        ) : (
          <>
            <div className="shrink-0 p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="장소 검색"
                  value={hotFilter ? "핫플레이스" : undefined}
                  readOnly={hotFilter}
                  onChange={() => {}}
                  className={`w-full pl-9 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    hotFilter
                      ? "pr-8 border-orange-300 bg-orange-50 text-orange-700 font-medium"
                      : "pr-4 border-gray-200"
                  }`}
                />
                {hotFilter && (
                  <button
                    type="button"
                    onClick={() => setHotFilter(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-400 hover:text-orange-600 transition-colors"
                    aria-label="핫플레이스 필터 해제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="shrink-0 border-b border-gray-100">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex-1 flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>필터</span>
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? "rotate-180" : ""}`}
                  />
                </button>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(DEFAULT_FILTERS);
                      setHotFilter(false);
                    }}
                    className="px-3 py-2.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors border-l border-gray-100 shrink-0"
                  >
                    초기화
                  </button>
                )}
              </div>
              {showFilters && (
                <div
                  className="px-3 pb-3 pt-2 border-t border-gray-100 overflow-y-auto"
                  style={{ maxHeight: "45vh" }}
                >
                  <FilterFields filters={filters} set={set} toggleList={toggleList} compact />
                </div>
              )}
            </div>

            <PlaceList places={visiblePlaces} onSelect={setDetailId} />
          </>
        )}
      </aside>

      {/* ── MAP + MOBILE LIST ── */}
      <div className="relative flex flex-col flex-1 min-h-0 min-w-0 md:contents">
        {/* 지도 영역: 모바일 상단 50% / 데스크톱 우측 전체 */}
        <div className="relative flex-[1_1_50%] min-h-0 shrink-0 md:flex-1 md:h-full md:shrink">
          <div className="md:hidden absolute top-3 left-3 right-3 z-20 flex gap-2">
            <div className="flex-1 min-w-0 relative bg-white rounded-xl shadow-lg border border-gray-100">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="장소 검색"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-transparent focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              aria-label="필터"
              aria-expanded={showMobileFilters}
              className={`relative shrink-0 px-3.5 py-2.5 rounded-xl shadow-lg transition-colors ${
                showMobileFilters ? "bg-brand-700 text-white" : "bg-brand-600 text-white hover:bg-brand-700"
              }`}
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showMobileFilters && (
            <div className="md:hidden absolute top-16 left-3 right-3 z-30 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">필터</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(DEFAULT_FILTERS);
                      setHotFilter(false);
                    }}
                    className="text-xs text-red-400 hover:text-red-600 underline"
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <FilterFields filters={filters} set={set} toggleList={toggleList} />
            </div>
          )}

          <div className="absolute inset-0 h-full w-full">
            <KakaoMap
              places={visiblePlaces}
              selectedId={detailId}
              navTarget={navTarget}
              onSelectPlace={setDetailId}
              onDeselect={() => setDetailId(null)}
            />
          </div>

          {navTarget && !detailPlace && (
            <div className="absolute bottom-20 left-3 right-3 md:bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-20 bg-white rounded-2xl shadow-xl border border-blue-100 px-4 py-3 flex items-center gap-4 min-w-0 md:min-w-[260px]">
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
                type="button"
                onClick={() => setNavTarget(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                aria-label="경로 안내 종료"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 모바일 하단 장소 리스트 50% */}
        <section className="md:hidden flex flex-col flex-[1_1_50%] min-h-0 border-t border-gray-200 bg-white">
          <PlaceList places={visiblePlaces} onSelect={setDetailId} />
        </section>

        {detailPlace && (
          <div className="md:hidden absolute inset-0 z-50 bg-white overflow-y-auto">
            <PlaceDetailPanel
              place={detailPlace}
              onBack={() => setDetailId(null)}
              onNavigate={handleNavigate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
