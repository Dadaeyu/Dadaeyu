"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, LocateFixed, X, ChevronDown } from "lucide-react";
import { useFilters } from "@/components/PlaceFilters";
import KakaoMap, {
  type MapMarker,
  type MapPathSegment,
  type TooltipInfo
} from "@/components/KakaoMap";
import PlaceSearchSidebar from "@/components/search/PlaceSearchSidebar";
import TourismDetailPanel, {
  type PlaceRouteGuideState
} from "@/components/search/TourismDetailPanel";
import SearchResultList from "@/components/search/SearchResultList";
import { FilterOverlayPanel } from "@/components/search/FilterPanel";
import { getCategoryColor } from "@/lib/search/categoryColors";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { useMyLocation, type MyLocationErrorReason } from "@/hooks/useMyLocation";
import { fetchDirections, openKakaoMapRoute, type RouteMode } from "@/lib/kakao/directions";

// ── 메인 컴포넌트 ─────────────────────────────────────────
// 지도 화면: 사이드바(검색/필터/목록) + KakaoMap. usePlaceSearch·useMyLocation 훅으로
// DB/카카오 검색 결과와 내 위치를 지도에 반영하고, 선택한 장소의 상세 패널을 보여준다.
export default function Map() {
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get("theme");
  const initialQuery = searchParams.get("query")?.trim() ?? "";
  const initialContentId = searchParams.get("contentId");
  const mapOnly = searchParams.get("mode") === "map";

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [resultsMinimized, setResultsMinimized] = useState(false);
  const { filters, set, toggleList, reset, activeCount } = useFilters({
    themes: initialTheme ? [initialTheme] : []
  });

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
    topRatedPlaces,
    mapResetTrigger
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
    errorReason: myLocationError,
    start: startMyLocation,
    reset: resetMyLocation,
    focusTrigger: focusMyLocationTrigger,
    resetTrigger: myLocationResetTrigger
  } = useMyLocation();

  const [locationToastDismissed, setLocationToastDismissed] = useState(false);
  const locationErrorCopy =
    myLocationStatus === "error" ? getMyLocationErrorCopy(myLocationError) : null;
  const showLocationErrorToast = Boolean(locationErrorCopy) && !locationToastDismissed;

  useEffect(() => {
    if (myLocationStatus !== "error") return;
    const timer = window.setTimeout(() => setLocationToastDismissed(true), 5000);
    return () => window.clearTimeout(timer);
  }, [myLocationStatus, myLocationError]);

  const handleStartMyLocation = () => {
    setLocationToastDismissed(false);
    startMyLocation();
  };

  // 내 위치 버튼 토글: 켜져 있으면 끄면서 대전 전체 화면으로, 꺼져 있으면 내 위치를 조회한다.
  const handleLocateClick = () => {
    if (myLocationStatus === "active") {
      resetMyLocation();
    } else {
      handleStartMyLocation();
    }
  };

  const [routePath, setRoutePath] = useState<MapPathSegment[]>([]);
  const [routeGuide, setRouteGuide] = useState<PlaceRouteGuideState | null>(null);
  const [routeStops, setRouteStops] = useState<
    { lat: number; lng: number; name?: string }[] | null
  >(null);
  const routeRequestIdRef = useRef(0);
  const pendingRouteModeRef = useRef<RouteMode | null>(null);
  const handleStartRouteRef = useRef<(mode: RouteMode) => Promise<void>>(async () => {});

  const clearRouteGuide = () => {
    routeRequestIdRef.current += 1;
    pendingRouteModeRef.current = null;
    setRouteGuide(null);
    setRoutePath([]);
    setRouteStops(null);
  };

  const handleStartRoute = async (mode: RouteMode) => {
    if (!searchDetail) {
      pendingRouteModeRef.current = null;
      return;
    }

    if (!myLocation || myLocationStatus !== "active") {
      pendingRouteModeRef.current = mode;
      handleStartMyLocation();
      setRouteGuide({
        mode,
        loading: true,
        error: null,
        distanceM: null,
        durationSec: null,
        onOpenKakao: () => {},
        onClear: clearRouteGuide
      });
      return;
    }

    pendingRouteModeRef.current = null;
    const origin = {
      lat: myLocation.lat,
      lng: myLocation.lng,
      name: "내 위치"
    };
    const destination = {
      lat: searchDetail.lat,
      lng: searchDetail.lng,
      name: searchDetail.name
    };
    const stops = [origin, destination];
    const requestId = ++routeRequestIdRef.current;
    setRouteStops(stops);
    setRouteGuide({
      mode,
      loading: true,
      error: null,
      distanceM: null,
      durationSec: null,
      onOpenKakao: () => openKakaoMapRoute(stops, mode),
      onClear: clearRouteGuide
    });

    try {
      const result = await fetchDirections({ origin, destination, mode });
      if (requestId !== routeRequestIdRef.current) return;
      setRoutePath([
        {
          points: result.points,
          color: mode === "walk" ? "#0d9488" : "#2563eb",
          dashed: Boolean(result.fallback)
        }
      ]);
      setRouteGuide({
        mode,
        loading: false,
        error: result.fallback ? "대략 경로예요. 정확한 안내는 카카오맵에서 시작하세요." : null,
        distanceM: result.distanceM,
        durationSec: result.durationSec,
        onOpenKakao: () => openKakaoMapRoute(stops, mode),
        onClear: clearRouteGuide
      });
    } catch (e) {
      if (requestId !== routeRequestIdRef.current) return;
      setRoutePath([{ points: stops, color: "#94a3b8", dashed: true }]);
      setRouteGuide({
        mode,
        loading: false,
        error:
          e instanceof Error
            ? `${e.message} 카카오맵으로 안내할 수 있어요.`
            : "경로 미리보기에 실패했어요. 카카오맵으로 안내할 수 있어요.",
        distanceM: null,
        durationSec: null,
        onOpenKakao: () => openKakaoMapRoute(stops, mode),
        onClear: clearRouteGuide
      });
    }
  };

  useEffect(() => {
    handleStartRouteRef.current = handleStartRoute;
  });

  // 경로안내 중 GPS가 준비되면 자동으로 길찾기 재시도
  useEffect(() => {
    const pending = pendingRouteModeRef.current;
    if (!pending) return;

    if (myLocationStatus === "active" && myLocation) {
      const timer = window.setTimeout(() => {
        void handleStartRouteRef.current(pending);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (myLocationStatus === "error") {
      const timer = window.setTimeout(() => {
        pendingRouteModeRef.current = null;
        const copy = getMyLocationErrorCopy(myLocationError);
        setRouteGuide((prev) =>
          prev
            ? {
                ...prev,
                loading: false,
                error: `${copy.title} ${copy.help}`
              }
            : null
        );
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [myLocation, myLocationStatus, myLocationError]);

  const activeFilterCount = activeCount;
  const resetFilters = () => {
    reset();
  };

  const selectPlace = (id: string) => {
    clearRouteGuide();
    setSearchDetailId(id);
  };

  const backFromDetail = () => {
    clearRouteGuide();
    setSearchDetailId(null);
  };

  const displayPlaces = searchPlaces.length > 0 ? searchPlaces : topRatedPlaces;
  // 검색 전에는 핫플레이스 5곳을 목록·지도 마커 모두에 바로 보여준다.
  const markerPlaces = searchPlaces.length > 0 ? searchPlaces : topRatedPlaces;

  // 카카오 검색 마커를 선택했을 때만 지도 위에 미니 정보 카드를 띄운다.
  // 카카오 검색 결과에는 썸네일/평점/배리어프리 데이터가 없으므로 해당 필드는 비워 두면 카드에서 자동으로 생략된다.
  const selectedKakaoPlace = markerPlaces.find(
    (sp) => sp.id === searchDetailId && sp.source === "kakao"
  );
  const kakaoTooltip: TooltipInfo | null = selectedKakaoPlace
    ? {
        lat: selectedKakaoPlace.lat,
        lng: selectedKakaoPlace.lng,
        name: selectedKakaoPlace.name,
        category: selectedKakaoPlace.category?.split(" > ").pop(),
        accentColor: "#FEE500"
      }
    : null;

  // 모바일/mapOnly: 상세 열리면 지도·시트를 실제 상·하 50%로 분할 (오버레이 아님)
  const splitMapForDetail = Boolean(searchDetail);

  return (
    <div
      className="relative -mx-4 -mt-6 -mb-24 flex overflow-hidden md:-mx-6"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── LEFT SIDEBAR (desktop only, hidden in mapOnly mode) ── */}
      <aside
        className={`${mapOnly ? "hidden" : "hidden md:flex"} relative w-72 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white`}
      >
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
          onSelectPlace={selectPlace}
          searchDetail={searchDetail}
          tourismDetail={tourismDetail}
          isLoadingDetail={isLoadingDetail}
          onBackFromDetail={backFromDetail}
          onLikeChange={refreshLiked}
          onStartRoute={handleStartRoute}
          routeGuide={routeGuide}
        />
      </aside>

      {/* ── MAP AREA ── */}
      <div
        className={`relative flex-1 overflow-hidden ${
          splitMapForDetail ? (mapOnly ? "flex flex-col" : "flex flex-col md:block") : ""
        }`}
      >
        {/* 상단 지도 뷰포트 — 상세 열림(모바일) 시 높이 50%로 실제 축소 */}
        <div
          className={`relative min-h-0 overflow-hidden ${
            splitMapForDetail ? (mapOnly ? "h-1/2" : "h-1/2 md:h-full") : "h-full"
          }`}
        >
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
              className={`${mapOnly ? "" : "md:hidden"} border-hairline absolute top-20 right-3 left-3 z-20 overflow-hidden rounded-lg border bg-white shadow-xl`}
              aria-label={`검색 결과 ${searchPlaces.length}개`}
            >
              <button
                type="button"
                onClick={() => setResultsMinimized((v) => !v)}
                className="border-hairline flex w-full items-center justify-between gap-2 border-b bg-white px-4 py-3 text-left"
                aria-expanded={!resultsMinimized}
              >
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold">
                    검색 결과 {searchPlaces.length}개
                  </p>
                  {!resultsMinimized && (
                    <p className="text-steel mt-0.5 text-xs">
                      장소를 선택하면 상세 정보를 확인할 수 있습니다.
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={`text-steel h-4 w-4 shrink-0 transition-transform ${resultsMinimized ? "" : "rotate-180"}`}
                />
              </button>
              {!resultsMinimized && (
                <div className="max-h-[min(46vh,24rem)] overflow-y-auto">
                  <SearchResultList places={searchPlaces} onSelect={selectPlace} />
                </div>
              )}
            </section>
          ) : null}

          <KakaoMap
            markers={markerPlaces.map((sp): MapMarker => {
              if (sp.source === "kakao") {
                // 눈물방울 핀 + 카카오 브랜드 컬러(노랑 + 검정 중앙 점)로 카카오 검색 결과임을 표시.
                return {
                  id: sp.id,
                  lat: sp.lat,
                  lng: sp.lng,
                  color: "#FEE500",
                  borderColor: "#191919",
                  shape: "teardrop"
                };
              }
              if (likedIds.has(sp.id)) {
                return { id: sp.id, lat: sp.lat, lng: sp.lng, color: "#ef4444", shape: "heart" };
              }
              return {
                id: sp.id,
                lat: sp.lat,
                lng: sp.lng,
                color: getCategoryColor(sp.categoryCode)
              };
            })}
            selectedId={searchDetailId}
            onSelect={(id) => selectPlace(id)}
            onDeselect={() => {
              backFromDetail();
            }}
            tooltip={kakaoTooltip}
            onCloseTooltip={backFromDetail}
            myLocation={myLocation}
            focusMyLocationTrigger={focusMyLocationTrigger}
            resetViewTrigger={mapResetTrigger + myLocationResetTrigger}
            path={routePath}
            fitPathKey={
              routeGuide && !routeGuide.loading
                ? `${routeGuide.mode}-${routeGuide.distanceM ?? "x"}-${routePath.length}`
                : null
            }
          />

          {routeGuide && !searchDetail ? (
            <div className="border-hairline bg-background absolute bottom-20 left-3 z-20 max-w-xs rounded-2xl border p-3 shadow-lg md:bottom-4">
              <p className="text-ink text-xs font-semibold">
                {routeGuide.mode === "walk" ? "도보" : "자동차"} 경로
                {routeGuide.loading ? " 불러오는 중…" : ""}
              </p>
              {routeGuide.distanceM != null && routeGuide.durationSec != null ? (
                <p className="text-stone mt-1 text-xs">지도에 경로를 표시했어요</p>
              ) : null}
              <button
                type="button"
                onClick={() => routeStops && openKakaoMapRoute(routeStops, routeGuide.mode)}
                className="bg-brand-700 mt-2 w-full rounded-lg py-2 text-xs font-semibold text-white"
              >
                카카오맵에서 안내 시작
              </button>
            </div>
          ) : null}
          {showLocationErrorToast && locationErrorCopy ? (
            <div
              id="map-location-error"
              role="alert"
              className="border-hairline bg-background absolute right-4 bottom-[9.25rem] z-[60] w-[min(16rem,calc(100%-2rem))] rounded-2xl border p-3.5 shadow-lg md:bottom-16"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-ink text-sm font-semibold tracking-[-0.01em]">
                    {locationErrorCopy.title}
                  </p>
                  <p className="text-stone mt-1 text-xs leading-relaxed">
                    {locationErrorCopy.help}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocationToastDismissed(true)}
                  className="text-stone hover:text-ink hover:bg-surface-soft -mt-0.5 -mr-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
                  aria-label="안내 닫기"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : null}

          {/* 내 위치 확인 버튼 — 켜져 있을 때 다시 누르면 대전 전체 화면으로 되돌아간다 */}
          <button
            type="button"
            onClick={handleLocateClick}
            className={`absolute right-4 bottom-20 z-[60] flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-colors md:bottom-4 ${
              myLocationStatus === "active"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : myLocationStatus === "error"
                  ? "border-error/30 text-error border bg-white hover:bg-red-50"
                  : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-label={myLocationStatus === "active" ? "대전 전체 보기" : "내 위치 확인"}
            aria-pressed={myLocationStatus === "active"}
            aria-describedby={showLocationErrorToast ? "map-location-error" : undefined}
          >
            <LocateFixed
              className={`h-5 w-5 ${myLocationStatus === "locating" ? "animate-pulse" : ""}`}
            />
          </button>
        </div>

        {/* 하단 상세 — flow로 하단 50% (지도 위에 덮지 않음) */}
        {searchDetail ? (
          <div
            className={`${mapOnly ? "flex" : "flex md:hidden"} border-hairline h-1/2 min-h-0 flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-2xl`}
          >
            <div className="flex justify-center pt-2 pb-1">
              <span className="bg-hairline h-1 w-10 rounded-full" aria-hidden />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TourismDetailPanel
                sp={searchDetail}
                detail={tourismDetail}
                isLoading={isLoadingDetail}
                onBack={backFromDetail}
                onLikeChange={refreshLiked}
                onStartRoute={handleStartRoute}
                routeGuide={routeGuide}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getMyLocationErrorCopy(errorReason: MyLocationErrorReason): {
  title: string;
  help: string;
} {
  if (errorReason === "denied") {
    return {
      title: "위치 권한이 꺼져 있어요",
      help: "브라우저에서 위치 권한을 켜면 내 위치를 지도에 표시할 수 있어요."
    };
  }
  if (errorReason === "outside_daejeon") {
    return {
      title: "대전 밖 위치예요",
      help: "내 위치는 대전 안에서만 표시해요. 위치 없이도 장소 검색은 가능해요."
    };
  }
  return {
    title: "위치를 다시 확인해 주세요",
    help: "위치를 확인하지 못했어요. 위치 없이 계속 둘러볼 수 있어요."
  };
}
