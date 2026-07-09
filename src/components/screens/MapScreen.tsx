"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, X, Star, Navigation, LocateFixed } from "lucide-react";
import { THEMES, useFilters } from "@/components/PlaceFilters";
import { PLACES, PLACE_COLORS, type Place } from "@/data/placesData";
import PlaceDetailPanel from "@/components/PlaceDetailPanel";
import KakaoMap, { type MapMarker } from "@/components/KakaoMap";
import TourismDetailPanel from "@/components/search/TourismDetailPanel";
import KakaoDetailPanel from "@/components/search/KakaoDetailPanel";
import SearchResultList from "@/components/search/SearchResultList";
import { FilterToggleSection, FilterOverlayPanel } from "@/components/search/FilterPanel";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { useMyLocation } from "@/hooks/useMyLocation";

const MARKER_COLORS = PLACES.map((p) => PLACE_COLORS[p.colorKey].color);

// ── 메인 컴포넌트 ─────────────────────────────────────────
// 지도 화면: 사이드바(검색/필터/목록) + KakaoMap. usePlaceSearch·useMyLocation 훅으로
// DB/카카오 검색 결과와 내 위치를 지도에 반영하고, 선택한 장소의 상세 패널을 보여준다.
export default function Map() {
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get("theme");
  const initialFilter = searchParams.get("filter");
  const initialPlaceId = searchParams.get("place");
  const mapOnly = searchParams.get("mode") === "map";

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [hotFilter, setHotFilter] = useState(initialFilter === "hot");
  const { filters, set, toggleList, reset, activeCount } = useFilters({
    themes: initialTheme && THEMES.includes(initialTheme) ? [initialTheme] : []
  });
  const [detailId, setDetailId] = useState<number | null>(
    initialPlaceId ? Number(initialPlaceId) : null
  );
  const [navTarget, setNavTarget] = useState<Place | null>(null);

  const {
    keyword,
    setKeyword,
    searchPlaces,
    searchDetailId,
    setSearchDetailId,
    searchDetail,
    isSearching,
    areaCodes,
    tourismDetail,
    isLoadingDetail,
    handleSearch
  } = usePlaceSearch({ accessibility: filters.accessibility, gu: filters.gu });

  const {
    location: myLocation,
    status: myLocationStatus,
    start: startMyLocation,
    focusTrigger: focusMyLocationTrigger
  } = useMyLocation();

  const handleNavigate = (place: Place) => {
    setNavTarget(place);
    setDetailId(null);
  };

  const activeFilterCount = activeCount + (hotFilter ? 1 : 0);
  const resetFilters = () => {
    reset();
    setHotFilter(false);
  };

  const visiblePlaces = hotFilter ? PLACES.filter((p) => p.hot) : PLACES;
  const detailPlace = PLACES.find((p) => p.id === detailId);

  return (
    <div
      className="relative -mx-4 -mt-6 -mb-24 flex overflow-hidden md:-mx-6"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── LEFT SIDEBAR (desktop only, hidden in mapOnly mode) ── */}
      <aside
        className={`${mapOnly ? "hidden" : "hidden md:flex"} relative w-72 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white`}
      >
        {searchDetail ? (
          searchDetail.source === "kakao" ? (
            <KakaoDetailPanel sp={searchDetail} onBack={() => setSearchDetailId(null)} />
          ) : (
            <TourismDetailPanel
              sp={searchDetail}
              detail={tourismDetail}
              isLoading={isLoadingDetail}
              onBack={() => setSearchDetailId(null)}
            />
          )
        ) : detailPlace ? (
          <PlaceDetailPanel
            place={detailPlace}
            onBack={() => setDetailId(null)}
            onNavigate={handleNavigate}
          />
        ) : (
          <>
            {/* Search */}
            <div className="shrink-0 border-b border-gray-100 p-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="장소 검색 (Enter)"
                  value={hotFilter ? "핫플레이스" : keyword}
                  readOnly={hotFilter}
                  onChange={(e) => {
                    if (!hotFilter) setKeyword(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (!hotFilter && e.key === "Enter") handleSearch(keyword);
                  }}
                  className={`focus:ring-brand-500 w-full rounded-lg border py-2 pl-9 text-sm focus:ring-2 focus:outline-none ${
                    hotFilter
                      ? "border-orange-300 bg-orange-50 pr-8 font-medium text-orange-700"
                      : "border-gray-200 pr-4"
                  }`}
                />
                {hotFilter && (
                  <button
                    onClick={() => setHotFilter(false)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-orange-400 transition-colors hover:text-orange-600"
                    aria-label="핫플레이스 필터 해제"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter toggle */}
            <FilterToggleSection
              filters={filters}
              set={set}
              toggleList={toggleList}
              guOptions={areaCodes.map((a) => a.name)}
              activeCount={activeFilterCount}
              onReset={resetFilters}
              defaultOpen={!!initialTheme}
            />

            {/* 검색 결과 or 전체 장소 목록 */}
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 border-b border-gray-100 bg-gray-50 px-4 py-2">
                <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  {searchPlaces.length > 0
                    ? `검색 결과 ${searchPlaces.length}개`
                    : `장소 ${visiblePlaces.length}개`}
                </span>
              </div>

              {/* 검색 결과 목록 */}
              {searchPlaces.length > 0 ? (
                <SearchResultList places={searchPlaces} onSelect={setSearchDetailId} />
              ) : (
                visiblePlaces.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => setDetailId(place.id)}
                    className="group w-full border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="group-hover:text-brand-700 truncate text-sm font-medium text-gray-800 transition-colors">
                          {place.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className="rounded-full px-1.5 py-0.5 text-xs font-medium"
                            style={{
                              background: PLACE_COLORS[place.colorKey].bg,
                              color: PLACE_COLORS[place.colorKey].color
                            }}
                          >
                            {place.category}
                          </span>
                          <div className="flex items-center gap-0.5 text-xs text-gray-500">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {place.rating}
                          </div>
                        </div>
                      </div>
                      <span className="mt-0.5 shrink-0 text-xs text-gray-400">
                        {place.distance}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </aside>

      {/* ── MAP AREA ── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Search + filter bar */}
        <div
          className={`${mapOnly ? "" : "md:hidden"} absolute top-3 right-3 left-3 z-20 flex gap-2`}
        >
          <div className="relative flex-1 rounded-xl border border-gray-100 bg-white shadow-lg">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={isSearching ? "검색 중..." : "장소 검색 (Enter)"}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(keyword)}
              className="w-full rounded-xl bg-transparent py-2.5 pr-4 pl-9 text-sm focus:outline-none"
            />
          </div>
          {!mapOnly && (
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`relative rounded-xl px-3 shadow-lg transition-colors ${showMobileFilters ? "bg-brand-700 text-white" : "bg-brand-600 hover:bg-brand-700 text-white"}`}
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Mobile filter panel */}
        {showMobileFilters && (
          <FilterOverlayPanel
            filters={filters}
            set={set}
            toggleList={toggleList}
            guOptions={areaCodes.map((a) => a.name)}
            onReset={resetFilters}
            onClose={() => setShowMobileFilters(false)}
          />
        )}

        {/* Kakao Map */}
        <KakaoMap
          markers={searchPlaces.map(
            (sp, i): MapMarker =>
              sp.source === "kakao"
                ? { id: sp.id, lat: sp.lat, lng: sp.lng, color: "#0891b2", shape: "dot" }
                : {
                    id: sp.id,
                    lat: sp.lat,
                    lng: sp.lng,
                    color: MARKER_COLORS[i % MARKER_COLORS.length]
                  }
          )}
          selectedId={searchDetailId}
          onSelect={(id) => setSearchDetailId(id)}
          onDeselect={() => {
            setDetailId(null);
            setSearchDetailId(null);
          }}
          navTarget={navTarget}
          myLocation={myLocation}
          focusMyLocationTrigger={focusMyLocationTrigger}
        />

        {/* 내 위치 확인 버튼 */}
        <button
          onClick={startMyLocation}
          className={`absolute right-4 bottom-4 z-20 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-colors ${
            myLocationStatus === "active"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          aria-label="내 위치 확인"
        >
          <LocateFixed
            className={`h-5 w-5 ${myLocationStatus === "locating" ? "animate-pulse" : ""}`}
          />
        </button>

        {/* Mobile PlaceDetail overlay */}
        {detailPlace && (
          <div className="absolute inset-0 z-40 overflow-y-auto bg-white md:hidden">
            <PlaceDetailPanel
              place={detailPlace}
              onBack={() => setDetailId(null)}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* 검색 결과 상세 overlay (모바일 + mapOnly 데스크탑) */}
        {searchDetail && (
          <div
            className={`${mapOnly ? "" : "md:hidden"} absolute inset-0 z-40 overflow-y-auto bg-white`}
          >
            {searchDetail.source === "kakao" ? (
              <KakaoDetailPanel sp={searchDetail} onBack={() => setSearchDetailId(null)} />
            ) : (
              <TourismDetailPanel
                sp={searchDetail}
                detail={tourismDetail}
                isLoading={isLoadingDetail}
                onBack={() => setSearchDetailId(null)}
              />
            )}
          </div>
        )}

        {/* 경로 안내 정보 바 */}
        {navTarget && !detailPlace && (
          <div className="absolute bottom-4 left-1/2 z-20 flex min-w-[260px] -translate-x-1/2 items-center gap-4 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Navigation className="h-5 w-5 text-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-gray-400">목적지</p>
              <p className="truncate text-sm font-bold text-gray-800">{navTarget.name}</p>
            </div>
            <div className="shrink-0 text-center">
              <p className="text-[10px] font-medium text-gray-400">거리</p>
              <p className="text-sm font-semibold text-blue-600">{navTarget.distance}</p>
            </div>
            <button
              onClick={() => setNavTarget(null)}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="경로 안내 종료"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
