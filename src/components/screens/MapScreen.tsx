"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, X, ChevronDown, SlidersHorizontal, Navigation, Star } from "lucide-react";
import { THEMES, Filters, DEFAULT_FILTERS, FilterFields } from "@/components/PlaceFilters";
import { PLACES, type Place } from "@/data/placesData";
import PlaceDetailPanel from "@/components/PlaceDetailPanel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const MY_LOCATION = { cx: 130, cy: 510 };

const BLOCKS = [
  [100, 145, 85, 80],
  [100, 255, 85, 90],
  [100, 375, 85, 65],
  [100, 460, 85, 65],
  [215, 145, 90, 80],
  [215, 375, 90, 65],
  [215, 465, 90, 65],
  [335, 145, 90, 80],
  [335, 375, 90, 65],
  [335, 465, 90, 65],
  [460, 255, 70, 90],
  [460, 375, 70, 65],
  [460, 465, 70, 65],
  [565, 145, 80, 80],
  [565, 255, 80, 90],
  [565, 375, 80, 65],
  [565, 465, 80, 65],
  [675, 145, 70, 80],
  [675, 255, 70, 90],
  [780, 145, 75, 80],
  [780, 255, 75, 90],
  [780, 375, 75, 65],
  [780, 465, 75, 65],
  [885, 145, 70, 80],
  [885, 255, 70, 90],
  [885, 375, 70, 65],
  [885, 465, 70, 65]
];

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function Map() {
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get("theme");
  const initialFilter = searchParams.get("filter"); // "hot"
  const initialPlaceId = searchParams.get("place"); // place id

  const [showFilters, setShowFilters] = useState(!!initialTheme);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [hotFilter, setHotFilter] = useState(initialFilter === "hot");
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    themes: initialTheme && THEMES.includes(initialTheme) ? [initialTheme] : []
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
        [key]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
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
    hotFilter
  ].filter(Boolean).length;

  const visiblePlaces = hotFilter ? PLACES.filter((p) => p.hot) : PLACES;
  const detailPlace = PLACES.find((p) => p.id === detailId);

  return (
    <div
      className="relative -mx-4 -mt-6 -mb-24 flex overflow-hidden md:-mx-6"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── LEFT SIDEBAR (desktop only) ── */}
      <aside className="border-hairline relative hidden w-72 shrink-0 flex-col overflow-hidden border-r bg-white md:flex">
        {detailPlace ? (
          /* 상세 패널 */
          <PlaceDetailPanel
            place={detailPlace}
            onBack={() => setDetailId(null)}
            onNavigate={handleNavigate}
          />
        ) : (
          /* 목록 패널 */
          <>
            {/* Search */}
            <div className="border-hairline-soft shrink-0 border-b p-3">
              <div className="relative">
                <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="장소 검색"
                  value={hotFilter ? "핫플레이스" : undefined}
                  readOnly={hotFilter}
                  onChange={() => {}}
                  className={`focus:ring-brand-500 w-full rounded-lg border py-2 pl-9 text-sm focus:ring-2 focus:outline-none ${
                    hotFilter
                      ? "border-orange-300 bg-orange-50 pr-8 font-medium text-orange-700"
                      : "border-hairline pr-4"
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
            <div className="border-hairline-soft shrink-0 border-b">
              <div className="flex items-center">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-slate hover:bg-surface-soft flex flex-1 items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>필터</span>
                    {activeFilterCount > 0 && (
                      <span className="bg-brand-500 text-ink flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`text-stone h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
                  />
                </button>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setFilters(DEFAULT_FILTERS);
                      setHotFilter(false);
                    }}
                    className="border-hairline-soft shrink-0 border-l px-3 py-2.5 text-xs text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    초기화
                  </button>
                )}
              </div>
              {showFilters && (
                <div
                  className="border-hairline-soft overflow-y-auto border-t px-3 pt-2 pb-3"
                  style={{ maxHeight: "45vh" }}
                >
                  <FilterFields filters={filters} set={set} toggleList={toggleList} compact />
                </div>
              )}
            </div>

            {/* Place list */}
            <div className="flex-1 overflow-y-auto">
              <div className="border-hairline-soft bg-surface-soft sticky top-0 border-b px-4 py-2">
                <span className="text-stone text-xs font-semibold tracking-wide uppercase">
                  장소 {visiblePlaces.length}개
                </span>
              </div>
              {visiblePlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => setDetailId(place.id)}
                  className="group border-hairline-soft hover:bg-surface-soft w-full border-b px-4 py-3 text-left transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="group-hover:text-brand-700 text-ink truncate text-sm font-medium transition-colors">
                        {place.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone="custom" style={{ background: place.bg, color: place.color }}>
                          {place.category}
                        </Badge>
                        <div className="text-steel flex items-center gap-0.5 text-xs">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                          {place.rating}
                        </div>
                      </div>
                    </div>
                    <span className="text-stone mt-0.5 shrink-0 text-xs">{place.distance}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* ── MAP AREA ── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Mobile search + filter bar */}
        <div className="absolute top-3 right-3 left-3 z-20 flex gap-2 md:hidden">
          <div className="relative flex-1 rounded-lg shadow-lg">
            <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="장소 검색"
              className="focus:ring-brand-500 border-hairline w-full rounded-lg border bg-white py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
            />
          </div>
          <Button
            variant="accent"
            size="icon"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="relative shadow-lg"
            aria-label="필터"
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="bg-error absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Mobile filter panel */}
        {showMobileFilters && (
          <div className="border-hairline-soft absolute top-16 right-3 left-3 z-30 max-h-[60vh] overflow-y-auto rounded-lg border bg-white p-4 shadow-2xl md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-ink text-sm font-bold">필터</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setHotFilter(false);
                  }}
                  className="text-xs text-red-400 underline hover:text-red-600"
                >
                  초기화
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-stone hover:text-steel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <FilterFields filters={filters} set={set} toggleList={toggleList} />
          </div>
        )}

        {/* SVG Map */}
        <svg
          viewBox="0 0 1000 700"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          onClick={() => setDetailId(null)}
        >
          <rect width="1000" height="700" fill="#f2efe9" />
          <rect x="245" y="160" width="185" height="155" rx="8" fill="#c8e6c9" />
          <rect x="470" y="90" width="175" height="155" rx="8" fill="#c8e6c9" />
          <rect x="685" y="385" width="145" height="115" rx="8" fill="#c8e6c9" />
          <path
            d="M 152 0 C 144 110,170 195,160 305 C 150 390,128 445,150 535 C 162 582,156 642,146 700"
            stroke="#aedcf8"
            strokeWidth="26"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 0 458 C 52 442,104 462,150 452"
            stroke="#aedcf8"
            strokeWidth="18"
            fill="none"
            strokeLinecap="round"
          />
          <line x1="0" y1="130" x2="1000" y2="130" stroke="#fff" strokeWidth="14" />
          <line x1="0" y1="360" x2="1000" y2="360" stroke="#fff" strokeWidth="16" />
          <line x1="0" y1="540" x2="1000" y2="540" stroke="#fff" strokeWidth="12" />
          <line x1="200" y1="0" x2="200" y2="700" stroke="#fff" strokeWidth="12" />
          <line x1="440" y1="0" x2="440" y2="700" stroke="#fff" strokeWidth="16" />
          <line x1="660" y1="0" x2="660" y2="700" stroke="#fff" strokeWidth="12" />
          <line x1="870" y1="0" x2="870" y2="700" stroke="#fff" strokeWidth="10" />
          <line x1="0" y1="240" x2="1000" y2="240" stroke="#fff" strokeWidth="7" />
          <line x1="0" y1="450" x2="1000" y2="450" stroke="#fff" strokeWidth="7" />
          <line x1="0" y1="630" x2="1000" y2="630" stroke="#fff" strokeWidth="6" />
          <line x1="90" y1="0" x2="90" y2="700" stroke="#fff" strokeWidth="6" />
          <line x1="320" y1="0" x2="320" y2="700" stroke="#fff" strokeWidth="7" />
          <line x1="550" y1="0" x2="550" y2="700" stroke="#fff" strokeWidth="7" />
          <line x1="760" y1="0" x2="760" y2="700" stroke="#fff" strokeWidth="7" />
          <line x1="960" y1="0" x2="960" y2="700" stroke="#fff" strokeWidth="5" />
          <line x1="200" y1="360" x2="440" y2="130" stroke="#fff" strokeWidth="9" />
          <line x1="660" y1="360" x2="870" y2="130" stroke="#fff" strokeWidth="8" />
          <line x1="200" y1="360" x2="90" y2="540" stroke="#fff" strokeWidth="7" />
          {BLOCKS.map(([x, y, w, h], i) => (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={2}
              fill="#e2ddd6"
              pointerEvents="none"
            />
          ))}
          <text
            x="337"
            y="244"
            fontSize="12"
            fill="#388e3c"
            fontFamily="sans-serif"
            textAnchor="middle"
            fontWeight="600"
            pointerEvents="none"
          >
            한밭수목원
          </text>
          <text
            x="557"
            y="170"
            fontSize="12"
            fill="#388e3c"
            fontFamily="sans-serif"
            textAnchor="middle"
            fontWeight="600"
            pointerEvents="none"
          >
            엑스포과학공원
          </text>
          <text
            x="757"
            y="447"
            fontSize="11"
            fill="#388e3c"
            fontFamily="sans-serif"
            textAnchor="middle"
            pointerEvents="none"
          >
            대청호
          </text>
          <text
            x="148"
            y="295"
            fontSize="11"
            fill="#5ba8d4"
            fontFamily="sans-serif"
            textAnchor="middle"
            transform="rotate(-80 148 295)"
            pointerEvents="none"
          >
            갑천
          </text>
          <text
            x="72"
            y="450"
            fontSize="11"
            fill="#5ba8d4"
            fontFamily="sans-serif"
            textAnchor="middle"
            pointerEvents="none"
          >
            유등천
          </text>
          <text
            x="620"
            y="122"
            fontSize="11"
            fill="#bbb"
            fontFamily="sans-serif"
            textAnchor="middle"
            pointerEvents="none"
          >
            충남대로
          </text>
          <text
            x="620"
            y="350"
            fontSize="11"
            fill="#bbb"
            fontFamily="sans-serif"
            textAnchor="middle"
            pointerEvents="none"
          >
            대덕대로
          </text>
          {/* 경로 선 */}
          {navTarget &&
            (() => {
              const dest = PLACES.find((p) => p.id === navTarget.id);
              if (!dest) return null;
              const cpx = (MY_LOCATION.cx + dest.cx) / 2;
              const cpy = Math.min(MY_LOCATION.cy, dest.cy - 14) - 60;
              return (
                <path
                  d={`M ${MY_LOCATION.cx} ${MY_LOCATION.cy} Q ${cpx} ${cpy} ${dest.cx} ${dest.cy - 14}`}
                  stroke="#2563eb"
                  strokeWidth="3.5"
                  strokeDasharray="10 6"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              );
            })()}

          {/* 현재 위치 마커 */}
          <circle cx={MY_LOCATION.cx} cy={MY_LOCATION.cy} r="20" fill="#3b82f6" opacity="0.12" />
          <circle cx={MY_LOCATION.cx} cy={MY_LOCATION.cy} r="12" fill="#3b82f6" opacity="0.2" />
          <circle cx={MY_LOCATION.cx} cy={MY_LOCATION.cy} r="7" fill="#2563eb" />
          <circle cx={MY_LOCATION.cx} cy={MY_LOCATION.cy} r="3" fill="white" />
          <text
            x={MY_LOCATION.cx}
            y={MY_LOCATION.cy + 22}
            fontSize="10"
            fill="#1d4ed8"
            fontFamily="sans-serif"
            textAnchor="middle"
            fontWeight="600"
          >
            현재 위치
          </text>

          {PLACES.map(({ id, cx, cy, color }) => {
            const sel = detailId === id;
            const isNav = navTarget?.id === id;
            return (
              <g
                key={id}
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailId(id);
                }}
                style={{ cursor: "pointer" }}
              >
                {sel && <circle cx={cx} cy={cy - 14} r={28} fill={color} opacity="0.15" />}
                {sel && <circle cx={cx} cy={cy - 14} r={20} fill={color} opacity="0.2" />}
                {isNav && <circle cx={cx} cy={cy - 14} r={24} fill="#2563eb" opacity="0.15" />}
                <ellipse cx={cx} cy={cy + 4} rx={9} ry={5} fill="rgba(0,0,0,0.2)" />
                <circle cx={cx} cy={cy - 14} r={13} fill={color} />
                <polygon
                  points={`${cx - 7},${cy - 5} ${cx + 7},${cy - 5} ${cx},${cy + 6}`}
                  fill={color}
                />
                <circle cx={cx} cy={cy - 14} r={5} fill="white" />
              </g>
            );
          })}
        </svg>

        {/* Mobile detail overlay */}
        {detailPlace && (
          <div className="absolute inset-0 z-40 overflow-y-auto bg-white md:hidden">
            <PlaceDetailPanel
              place={detailPlace}
              onBack={() => setDetailId(null)}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <Button
            variant="outline"
            size="icon"
            className="text-slate h-8 w-8 bg-white text-lg leading-none font-bold"
            aria-label="확대"
          >
            +
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-slate h-8 w-8 bg-white text-lg leading-none font-bold"
            aria-label="축소"
          >
            −
          </Button>
        </div>

        {/* 경로 안내 정보 바 */}
        {navTarget && !detailPlace && (
          <div className="border-navy-100 absolute bottom-4 left-1/2 z-20 flex min-w-[260px] -translate-x-1/2 items-center gap-4 rounded-lg border bg-white px-4 py-3 shadow-xl">
            <div className="bg-navy-50 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <Navigation className="text-navy-500 h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-stone text-[10px] font-medium">목적지</p>
              <p className="text-ink truncate text-sm font-bold">{navTarget.name}</p>
            </div>
            <div className="shrink-0 text-center">
              <p className="text-stone text-[10px] font-medium">거리</p>
              <p className="text-navy-600 text-sm font-semibold">{navTarget.distance}</p>
            </div>
            <button
              onClick={() => setNavTarget(null)}
              className="text-stone hover:bg-surface hover:text-steel shrink-0 rounded-full p-1.5 transition-colors"
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
