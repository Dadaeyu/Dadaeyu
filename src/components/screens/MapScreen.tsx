"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, X, Navigation, LocateFixed } from "lucide-react";
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

const MARKER_COLORS = Object.values(PLACE_COLORS).map((c) => c.color);

// ── 메인 컴포넌트 ─────────────────────────────────────────
// 지도 화면: 사이드바(검색/필터/목록) + KakaoMap. usePlaceSearch·useMyLocation 훅으로
// DB/카카오 검색 결과와 내 위치를 지도에 반영하고, 선택한 장소의 상세 패널을 보여준다.
export default function Map() {
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get("theme");
  const initialPlaceId = searchParams.get("place");
  const initialContentId = searchParams.get("contentId");
  const mapOnly = searchParams.get("mode") === "map";

  const [showMobileFilters, setShowMobileFilters] = useState(false);
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
    favoritesOnly: filters.favoritesOnly
  });

  useEffect(() => {
    if (initialContentId) focusPlaceById(initialContentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContentId]);

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
    searchPlaces.length > 0
      ? searchPlaces
      : topRatedPlaces.filter((p) => p.id === searchDetailId);
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
              onLikeChange={refreshLiked}
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
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(keyword)}
                  className="focus:ring-brand-500 w-full rounded-lg border border-gray-200 py-2 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Filter toggle */}
            <FilterToggleSection
              filters={filters}
              set={set}
              toggleList={toggleList}
              guOptions={areaCodes.map((a) => a.name)}
              dongOptions={dongOptions}
              activeCount={activeFilterCount}
              onReset={resetFilters}
              defaultOpen={!!initialTheme}
            />

            {/* 검색 결과 or 후기 평점 상위 장소 */}
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 border-b border-gray-100 bg-gray-50 px-4 py-2">
                <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  {searchPlaces.length > 0
                    ? `검색 결과 ${searchPlaces.length}개`
                    : `핫플레이스${displayPlaces.length}개`}
                </span>
              </div>

              <SearchResultList places={displayPlaces} onSelect={setSearchDetailId} />
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
            dongOptions={dongOptions}
            onReset={resetFilters}
            onClose={() => setShowMobileFilters(false)}
          />
        )}

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
            {searchDetail.source === "kakao" ? (
              <KakaoDetailPanel sp={searchDetail} onBack={() => setSearchDetailId(null)} />
            ) : (
              <TourismDetailPanel
                sp={searchDetail}
                detail={tourismDetail}
                isLoading={isLoadingDetail}
                onBack={() => setSearchDetailId(null)}
                onLikeChange={refreshLiked}
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
