"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from "react";
import { useSearchParams } from "next/navigation";
import { LocateFixed, X, MoreVertical, Palette, RotateCcw, ZoomIn, Check } from "lucide-react";
import { useFilters } from "@/components/PlaceFilters";
import KakaoMap, { type MapMarker, type MapPathSegment } from "@/components/KakaoMap";
import PlaceSearchSidebar from "@/components/search/PlaceSearchSidebar";
import { type PlaceRouteGuideState } from "@/components/search/TourismDetailPanel";
import {
  getCategoryColor,
  LCLSSYSTM1_COLORS,
  LCLSSYSTM1_LABELS
} from "@/lib/search/categoryColors";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { useMyLocation, type MyLocationErrorReason } from "@/hooks/useMyLocation";
import {
  fetchDirections,
  openKakaoMapRoute,
  pickRouteOption,
  buildRoutePathFromOption,
  type RouteMode,
  type RouteOption
} from "@/lib/kakao/directions";
import RouteOptionPicker from "@/components/search/RouteOptionPicker";
import TrafficLegend from "@/components/search/TrafficLegend";
import {
  formatRouteDistance,
  formatRouteDuration,
  formatRouteTollFare
} from "@/lib/kakao/directions";

// ── 메인 컴포넌트 ─────────────────────────────────────────
// 지도 화면: 사이드바(검색/필터/목록) + KakaoMap. usePlaceSearch·useMyLocation 훅으로
// DB/카카오 검색 결과와 내 위치를 지도에 반영하고, 선택한 장소의 상세 패널을 보여준다.
export default function Map() {
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get("theme");
  const initialQuery = searchParams.get("query")?.trim() ?? "";
  const initialContentId = searchParams.get("contentId");
  const mapOnly = searchParams.get("mode") === "map";

  // 모바일(및 mapOnly)에서 검색 패널을 코스 상세와 동일한 드래그 가능한 하단 시트로 띄운다.
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
  // 지도 영역 자체의 높이를 재서(헤더 등 제외) 시트가 가리는 실제 픽셀 높이를 구한다 —
  // window.innerHeight 로 계산하면 과대 추정돼서 경로 안내 시 지도가 시트에 가려진 채 맞춰진다.
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const [mapBottomOverlayPx, setMapBottomOverlayPx] = useState(0);
  useEffect(() => {
    const updateOverlay = () => {
      const isMobile = mapOnly || window.innerWidth < 768; // Tailwind md 기준
      const containerHeight = mapAreaRef.current?.clientHeight ?? window.innerHeight;
      setMapBottomOverlayPx(isMobile ? Math.round(containerHeight * (mobileSheetHeight / 100)) : 0);
    };
    updateOverlay();
    window.addEventListener("resize", updateOverlay);
    return () => window.removeEventListener("resize", updateOverlay);
  }, [mobileSheetHeight, mapOnly]);

  // 지도 오른쪽 하단 "기능 목록" 드롭다운 — 코스 상세와 동일: 초기화/내 위치/확대·축소/테마 범례.
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const mapMenuRef = useRef<HTMLDivElement>(null);
  // 전체 화면을 덮는 배경 버튼 대신 document 클릭을 직접 듣고 메뉴 영역 바깥인지만 판정한다 —
  // 그래야 드롭다운이 열려 있어도 지도 위 마우스휠/터치가 그대로 지도에 전달돼 확대·축소가 된다.
  useEffect(() => {
    if (!mapMenuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (mapMenuRef.current && !mapMenuRef.current.contains(e.target as Node)) {
        setMapMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [mapMenuOpen]);
  const [showThemeLegend, setShowThemeLegend] = useState(false);
  const [showZoomControl, setShowZoomControl] = useState(true);
  // "초기화" 메뉴 항목용 — 값을 바꿀 때마다 resetViewTrigger 가 달라져서 지도가 대전 전체 화면으로 되돌아간다.
  const [mapManualResetTrigger, setMapManualResetTrigger] = useState(0);

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
    hasActiveFilter,
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
  const routeOptionsRef = useRef<RouteOption[] | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState("0");
  const routeRequestIdRef = useRef(0);
  const pendingRouteModeRef = useRef<RouteMode | null>(null);
  const handleStartRouteRef = useRef<(mode: RouteMode) => Promise<void>>(async () => {});

  const handleSelectRoute = (id: string) => {
    const options = routeOptionsRef.current;
    if (!options) return;
    const opt = options.find((r) => r.id === id);
    if (!opt) return;
    setSelectedRouteId(id);
    setRoutePath([
      buildRoutePathFromOption(
        opt,
        routeGuide?.mode ?? "car",
        routeGuide?.mode === "walk" ? "#0d9488" : "#2563eb"
      )
    ]);
    setRouteGuide((prev) =>
      prev
        ? {
            ...prev,
            distanceM: opt.distanceM,
            durationSec: opt.durationSec,
            tollFare: opt.tollFare,
            selectedRouteId: id,
            showTrafficLegend:
              prev.mode === "car" && !opt.fallback && Boolean(opt.trafficChunks?.length)
          }
        : prev
    );
  };

  const clearRouteGuide = () => {
    routeRequestIdRef.current += 1;
    pendingRouteModeRef.current = null;
    routeOptionsRef.current = null;
    setSelectedRouteId("0");
    setRouteGuide(null);
    setRoutePath([]);
    setRouteStops(null);
  };

  const applyDirectionsResult = (
    result: Awaited<ReturnType<typeof fetchDirections>>,
    mode: RouteMode,
    stops: { lat: number; lng: number; name?: string }[],
    onOpenKakao: () => void
  ) => {
    const options = result.routes?.length ? result.routes : [pickRouteOption(result)];
    const multi = options.length > 1 ? options : null;
    routeOptionsRef.current = multi;
    const primary = pickRouteOption(result, "0");
    setSelectedRouteId(primary.id);
    setRoutePath([
      buildRoutePathFromOption(primary, mode, mode === "walk" ? "#0d9488" : "#2563eb")
    ]);
    const showTrafficLegend =
      mode === "car" && !result.fallback && Boolean(primary.trafficChunks?.length);
    setRouteGuide({
      mode,
      loading: false,
      error: result.fallback ? "대략 경로예요. 정확한 안내는 카카오맵에서 시작하세요." : null,
      distanceM: primary.distanceM,
      durationSec: primary.durationSec,
      tollFare: primary.tollFare,
      routeOptions: multi,
      selectedRouteId: primary.id,
      onSelectRoute: handleSelectRoute,
      showTrafficLegend,
      onOpenKakao,
      onClear: clearRouteGuide
    });
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
      applyDirectionsResult(result, mode, stops, () => openKakaoMapRoute(stops, mode));
    } catch (e) {
      if (requestId !== routeRequestIdRef.current) return;
      routeOptionsRef.current = null;
      setSelectedRouteId("0");
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

  // 필터/검색을 아무것도 안 켰을 때만 핫플레이스를 기본으로 보여준다.
  // 필터를 켰는데 결과가 0개면(searchPlaces=[]) 그대로 빈 목록으로 둬서 "결과 없음"이 보이게 한다.
  const displayPlaces = hasActiveFilter ? searchPlaces : topRatedPlaces;
  const markerPlaces = hasActiveFilter ? searchPlaces : topRatedPlaces;

  return (
    <div
      className="relative -mx-4 -mt-6 -mb-24 flex overflow-hidden md:-mx-6"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── 검색 패널 — 데스크톱은 왼쪽 고정 사이드바, 모바일(및 mapOnly)은 코스 상세와 동일한
          드래그 가능한 하단 시트. 검색 목록 ↔ 상세 전환도 PlaceSearchSidebar 가 내부에서 처리한다. ── */}
      <aside
        className={
          mapOnly
            ? "border-hairline absolute inset-x-0 bottom-0 z-30 flex h-[var(--sheet-h)] shrink-0 flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-2xl"
            : "border-hairline absolute inset-x-0 bottom-0 z-30 flex h-[var(--sheet-h)] shrink-0 flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-2xl md:static md:inset-auto md:z-auto md:flex md:h-auto md:w-72 md:rounded-none md:border-t-0 md:border-r md:shadow-none"
        }
        style={{ "--sheet-h": `${mobileSheetHeight}%` } as CSSProperties}
      >
        {/* 하단 시트 핸들 — 드래그해서 시트 높이 조절. mapOnly 는 항상 시트 모드라 항상 보이고,
            일반 모드는 모바일에서만 보인다(데스크톱은 고정폭 사이드바라 핸들 불필요). */}
        <div
          className={`shrink-0 touch-none justify-center py-3 ${mapOnly ? "flex" : "flex md:hidden"}`}
          onPointerDown={handleSheetDragStart}
        >
          <span className="bg-hairline h-1 w-10 rounded-full" />
        </div>
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
          hasActiveFilter={hasActiveFilter}
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
      <div ref={mapAreaRef} className="relative flex-1 overflow-hidden">
        <KakaoMap
          markers={markerPlaces.map((sp): MapMarker => {
              if (sp.source === "kakao") {
                // 눈물방울 핀(파란 배경 + 카카오 옐로우 중앙 점)으로 카카오 검색 결과임을 표시.
                return {
                  id: sp.id,
                  lat: sp.lat,
                  lng: sp.lng,
                  color: "#2563EB",
                  borderColor: "#FEE500",
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
            myLocation={myLocation}
            focusMyLocationTrigger={focusMyLocationTrigger}
            resetViewTrigger={mapResetTrigger + myLocationResetTrigger + mapManualResetTrigger}
            showZoomControl={showZoomControl}
            path={routePath}
            fitPathKey={
              routeGuide && !routeGuide.loading
                ? `${routeGuide.mode}-${routeGuide.distanceM ?? "x"}-${selectedRouteId}-${routePath.length}`
                : null
            }
            pathSummary={
              routeGuide &&
              !routeGuide.loading &&
              routeGuide.distanceM != null &&
              routeGuide.durationSec != null
                ? {
                    distanceM: routeGuide.distanceM,
                    durationSec: routeGuide.durationSec,
                    tollFare: routeGuide.tollFare ?? 0
                  }
                : null
            }
            bottomOverlayPx={mapBottomOverlayPx}
          />

          {routeGuide && !searchDetail ? (
            <div className="border-hairline bg-background absolute bottom-20 left-3 z-20 max-w-xs rounded-2xl border p-3 shadow-lg md:bottom-4">
              <p className="text-ink text-xs font-semibold">
                {routeGuide.mode === "walk" ? "도보" : "자동차"} 경로
                {routeGuide.loading ? " 불러오는 중…" : ""}
              </p>
              {routeGuide.distanceM != null && routeGuide.durationSec != null ? (
                <p className="text-stone mt-1 text-xs">
                  {formatRouteDistance(routeGuide.distanceM)} ·{" "}
                  {formatRouteDuration(routeGuide.durationSec)}
                  {routeGuide.tollFare != null && routeGuide.tollFare > 0
                    ? ` · ${formatRouteTollFare(routeGuide.tollFare)}`
                    : ""}
                </p>
              ) : null}
              {routeGuide.mode === "car" &&
              routeGuide.routeOptions &&
              routeGuide.routeOptions.length > 1 &&
              routeGuide.onSelectRoute ? (
                <div className="mt-2">
                  <RouteOptionPicker
                    options={routeGuide.routeOptions}
                    selectedId={routeGuide.selectedRouteId ?? "0"}
                    onSelect={routeGuide.onSelectRoute}
                    disabled={routeGuide.loading}
                  />
                </div>
              ) : null}
              {routeGuide.showTrafficLegend ? (
                <div className="mt-2">
                  <TrafficLegend />
                </div>
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
              className="border-hairline bg-background absolute right-4 z-[60] w-[min(16rem,calc(100%-2rem))] rounded-2xl border p-3.5 shadow-lg"
              style={{ bottom: mapBottomOverlayPx + 16 + 56 }}
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

          {/* 테마 색상 범례 — 확대/축소 컨트롤(카카오 기본 줌 컨트롤, 데스크톱에서만 오른쪽 위에 뜸)이
              켜져 있을 땐 윗변을 맞추고 바로 왼쪽에, 꺼져 있으면(모바일도 마찬가지) 오른쪽 끝에 붙인다. */}
          {showThemeLegend && (
            <div
              className={`border-hairline absolute top-0.5 right-3 z-[55] rounded-xl border bg-white/90 p-2.5 shadow-lg backdrop-blur-sm ${showZoomControl ? "md:right-11" : ""}`}
            >
              <p className="text-steel mb-1.5 text-[11px] font-semibold">테마 색상</p>
              <div className="space-y-1">
                {Object.entries(LCLSSYSTM1_COLORS).map(([code, color]) => (
                  <div key={code} className="flex items-center gap-1.5 text-xs text-gray-700">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    {LCLSSYSTM1_LABELS[code] ?? code}
                  </div>
                ))}
                {/* 카카오 검색 결과 마커는 카카오 브랜드 옐로우(#FEE500)로 표시된다 */}
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: "#FEE500" }}
                  />
                  카카오
                </div>
              </div>
            </div>
          )}

          {/* 지도 기능 드롭다운 — 초기화 / 내 위치 / 확대·축소 / 테마 범례.
              모바일(및 mapOnly)에선 검색 패널이 하단 시트로 뜨므로, 그 시트 바로 위에 버튼이 오도록
              mapBottomOverlayPx(시트가 가리는 높이)만큼 띄운다. 데스크톱은 overlay가 0이라
              기존 bottom-4(16px)와 동일하게 유지된다. */}
          <div
            ref={mapMenuRef}
            className="absolute right-4 z-[61]"
            style={{ bottom: mapBottomOverlayPx + 16 }}
          >
            {mapMenuOpen && (
              <div className="border-hairline absolute right-0 bottom-14 w-32 overflow-hidden rounded-xl border bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => setMapManualResetTrigger((n) => n + 1)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4 shrink-0 text-gray-500" />
                  초기화
                </button>
                <button
                  type="button"
                  onClick={handleLocateClick}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <LocateFixed
                      className={`h-4 w-4 shrink-0 text-gray-500 ${myLocationStatus === "locating" ? "animate-pulse" : ""}`}
                    />
                    내 위치
                  </span>
                  {myLocationStatus === "active" && (
                    <Check className="text-brand-600 h-4 w-4 shrink-0" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowZoomControl((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <ZoomIn className="h-4 w-4 shrink-0 text-gray-500" />
                    확대/축소
                  </span>
                  {showZoomControl && <Check className="text-brand-600 h-4 w-4 shrink-0" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowThemeLegend((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4 shrink-0 text-gray-500" />
                    테마 범례
                  </span>
                  {showThemeLegend && <Check className="text-brand-600 h-4 w-4 shrink-0" />}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setMapMenuOpen((v) => !v)}
              className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-colors ${
                myLocationStatus === "error"
                  ? "border-error/30 text-error border bg-white hover:bg-red-50"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              aria-label="지도 기능 목록"
              aria-expanded={mapMenuOpen}
              aria-describedby={showLocationErrorToast ? "map-location-error" : undefined}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
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
