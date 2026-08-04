"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, X, Navigation, LocateFixed } from "lucide-react";
import { useFilters } from "@/components/PlaceFilters";
import { PLACES, PLACE_COLORS, type Place } from "@/data/placesData";
import PlaceDetailPanel from "@/components/PlaceDetailPanel";
import KakaoMap, { type MapMarker } from "@/components/KakaoMap";
import PlaceSearchSidebar from "@/components/search/PlaceSearchSidebar";
import TourismDetailPanel from "@/components/search/TourismDetailPanel";
import SearchResultList from "@/components/search/SearchResultList";
import { FilterOverlayPanel } from "@/components/search/FilterPanel";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { useMyLocation } from "@/hooks/useMyLocation";

const MARKER_COLORS = Object.values(PLACE_COLORS).map((c) => c.color);

// ── 메인 컴포넌트 ─────────────────────────────────────────
// 지도 화면: 사이드바(검색/필터/목록) + KakaoMap. usePlaceSearch·useMyLocation 훅으로
// DB/카카오 검색 결과와 내 위치를 지도에 반영하고, 선택한 장소의 상세 패널을 보여준다.
export default function Map() {
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get("theme");
  const initialPlaceId = searchParams.get("place");
  const initialQuery = searchParams.get("query")?.trim() ?? "";
  const initialContentId = searchParams.get("contentId");
  const mapOnly = searchParams.get("mode") === "map";

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { filters, set, toggleList, reset, activeCount } = useFilters({
    themes: initialTheme ? [initialTheme] : []
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
    dongOptions,
    likedIds,
    refreshLiked,
    tourismDetail,
    isLoadingDetail,
    handleSearch,
    focusPlaceById,
    topRatedPlaces
  } = usePlaceSearch({
    accessibility: filters.accessibility,
    gu: filters.gu,
    dong: filters.dong,
    favoritesOnly: filters.favoritesOnly,
    headcount: filters.headcount,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    themes: filters.themes,
    minRating: filters.minRating,
    initialKeyword: initialQuery
  });

  useEffect(() => {
    if (initialContentId) focusPlaceById(initialContentId);
  }, [focusPlaceById, initialContentId]);

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

  const activeFilterCount = activeCount;
  const resetFilters = () => {
    reset();
  };

  const displayPlaces = searchPlaces.length > 0 ? searchPlaces : topRatedPlaces;
  // 상위 평점 장소는 목록에 5개 다 보여주되, 지도 마커는 클릭해서 선택하기 전까진 띄우지 않는다.
  const markerPlaces =
    searchPlaces.length > 0 ? searchPlaces : topRatedPlaces.filter((p) => p.id === searchDetailId);
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
        {detailPlace && !searchDetail ? (
          <PlaceDetailPanel
            place={detailPlace}
            onBack={() => setDetailId(null)}
            onNavigate={handleNavigate}
          />
        ) : (
          <PlaceSearchSidebar
            keyword={keyword}
            setKeyword={setKeyword}
            onSearch={handleSearch}
            isSearching={isSearching}
            filters={filters}
            set={set}
            toggleList={toggleList}
            guOptions={areaCodes.map((a) => a.name)}
            dongOptions={dongOptions}
            activeCount={activeFilterCount}
            onResetFilters={resetFilters}
            defaultFilterOpen
            places={displayPlaces}
            searchCount={searchPlaces.length}
            onSelectPlace={setSearchDetailId}
            searchDetail={searchDetail}
            tourismDetail={tourismDetail}
            isLoadingDetail={isLoadingDetail}
            onBackFromDetail={() => setSearchDetailId(null)}
            onLikeChange={refreshLiked}
          />
        )}
      </aside>

      {/* ── MAP AREA ── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Search + filter bar */}
        <div
          className={`${mapOnly ? "" : "md:hidden"} absolute top-3 right-3 left-3 z-20 flex gap-2`}
        >
          <div className="border-hairline bg-background relative flex-1 rounded-xl border shadow-lg">
            <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isSearching ? "검색 중..." : "장소 검색 (Enter)"}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(keyword)}
              className="text-ink placeholder:text-stone w-full rounded-xl bg-transparent py-2.5 pr-4 pl-9 text-sm focus:outline-none"
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
            dongOptions={dongOptions}
            onReset={resetFilters}
            onClose={() => setShowMobileFilters(false)}
          />
        )}

        {searchPlaces.length > 0 && !showMobileFilters && !searchDetail ? (
          <section
            className={`${mapOnly ? "" : "md:hidden"} border-hairline absolute top-20 right-3 left-3 z-20 max-h-[min(46vh,24rem)] overflow-y-auto rounded-lg border bg-white shadow-xl`}
            aria-label={`검색 결과 ${searchPlaces.length}개`}
          >
            <div className="border-hairline sticky top-0 border-b bg-white px-4 py-3">
              <p className="text-ink text-sm font-semibold">검색 결과 {searchPlaces.length}개</p>
              <p className="text-steel mt-0.5 text-xs">
                장소를 선택하면 상세 정보를 확인할 수 있습니다.
              </p>
            </div>
            <SearchResultList places={searchPlaces} onSelect={setSearchDetailId} />
          </section>
        ) : null}

        {/* Kakao Map */}
        <KakaoMap
          markers={markerPlaces.map((sp, i): MapMarker => {
            if (sp.source === "kakao") {
              return { id: sp.id, lat: sp.lat, lng: sp.lng, color: "#0891b2", shape: "dot" };
            }
            if (likedIds.has(sp.id)) {
              return { id: sp.id, lat: sp.lat, lng: sp.lng, color: "#ef4444", shape: "heart" };
            }
            return {
              id: sp.id,
              lat: sp.lat,
              lng: sp.lng,
              color: MARKER_COLORS[i % MARKER_COLORS.length]
            };
          })}
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
            <TourismDetailPanel
              sp={searchDetail}
              detail={tourismDetail}
              isLoading={isLoadingDetail}
              onBack={() => setSearchDetailId(null)}
              onLikeChange={refreshLiked}
            />
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
