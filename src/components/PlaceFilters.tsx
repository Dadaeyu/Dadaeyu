"use client";

// 장소 필터(접근성/인원수/테마/위치/일정/별점/즐겨찾기) 상태 훅과 필터 UI 필드 모음.
import { useState } from "react";
import { ChevronDown, Plus, Minus, Star, Heart } from "lucide-react";

export const THEMES = ["빵지순례", "먹거리", "과학", "자연힐링", "문화예술", "역사근대", "축제"];
export const AGE_GROUPS = ["영유아", "어린이", "청소년", "성인", "고령자"];
export const ACCESSIBILITY = ["시각", "청각", "보행", "영유아", "임산부", "고령자"];

export interface Filters {
  accessibility: string[];
  gu: string;
  dong: string;
  themes: string[];
  headcount: number;
  dateFrom: string;
  dateTo: string;
  minRating: number;
  favoritesOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  accessibility: [],
  gu: "",
  dong: "",
  themes: [],
  headcount: 1,
  dateFrom: "",
  dateTo: "",
  minRating: 0,
  favoritesOnly: false
};

// 필터 상태 관리 훅. hotFilter처럼 화면 고유의 필터는 activeCount에 포함하지 않으므로,
// 소비하는 쪽에서 필요 시 더해서 써야 한다.
export function useFilters(initial?: Partial<Filters>) {
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, ...initial });

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

  const reset = () => setFilters(DEFAULT_FILTERS);

  const activeCount = [
    filters.accessibility.length > 0,
    filters.gu,
    filters.dong,
    filters.themes.length > 0,
    filters.headcount > 1,
    filters.dateFrom || filters.dateTo,
    filters.minRating > 0,
    filters.favoritesOnly
  ].filter(Boolean).length;

  return { filters, setFilters, set, toggleList, reset, activeCount };
}

export function FilterFields({
  filters,
  set,
  toggleList,
  guOptions = [],
  dongOptions = [],
  compact = false
}: {
  filters: Filters;
  set: <K extends keyof Filters>(key: K, val: Filters[K]) => void;
  toggleList: (key: "themes" | "accessibility", item: string) => void;
  guOptions?: string[];
  dongOptions?: string[];
  compact?: boolean;
}) {
  const xs = compact ? "text-xs" : "text-sm";
  const chip = (active: boolean) =>
    `px-2 py-1 ${compact ? "text-xs" : "text-sm"} rounded-full border transition-colors ${
      active
        ? "bg-brand-500 text-ink border-brand-500"
        : "bg-white text-steel border-hairline hover:border-brand-400 hover:text-brand-600"
    }`;

  // wide(non-compact): 2-col grid — 접근성|인원수 / 위치|일정 / 테마(full) / 별점·즐겨찾기(full)
  const wrap = compact
    ? "space-y-3"
    : "grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 items-start";
  const full = compact ? "" : "col-span-1 sm:col-span-2";

  return (
    <div className={wrap}>
      {/* 접근성 */}
      <div>
        <p className={`${xs} text-steel mb-1.5 font-semibold`}>접근성</p>
        <div className="flex flex-wrap gap-1">
          {ACCESSIBILITY.map((a) => (
            <button
              key={a}
              onClick={() => toggleList("accessibility", a)}
              className={chip(filters.accessibility.includes(a))}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* 인원수 */}
      <div>
        <p className={`${xs} text-steel mb-1.5 font-semibold`}>인원수</p>
        <div className="border-hairline flex w-fit items-center gap-1 rounded-lg border px-1.5 py-0.5">
          <button
            onClick={() => set("headcount", Math.max(1, filters.headcount - 1))}
            className="hover:bg-surface rounded p-0.5"
          >
            <Minus className="text-steel h-3 w-3" />
          </button>
          <span className={`${xs} w-7 text-center font-medium`}>{filters.headcount}명</span>
          <button
            onClick={() => set("headcount", filters.headcount + 1)}
            className="hover:bg-surface rounded p-0.5"
          >
            <Plus className="text-steel h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 테마 */}
      <div className={full}>
        <p className={`${xs} text-steel mb-1.5 font-semibold`}>테마</p>
        <div className="flex flex-wrap gap-1">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => toggleList("themes", t)}
              className={chip(filters.themes.includes(t))}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 위치 */}
      <div>
        <p className={`${xs} text-steel mb-1.5 font-semibold`}>위치</p>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <select
              value={filters.gu}
              onChange={(e) => {
                set("gu", e.target.value);
                set("dong", "");
              }}
              className={`border-hairline w-full appearance-none rounded-lg border px-2 py-1.5 ${xs} focus:ring-brand-500 bg-white pr-6 focus:ring-2 focus:outline-none`}
            >
              <option value="">구 전체</option>
              {guOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="text-stone pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2" />
          </div>
          <div className="relative flex-1">
            <select
              value={filters.dong}
              onChange={(e) => set("dong", e.target.value)}
              disabled={!filters.gu || dongOptions.length === 0}
              className={`border-hairline w-full appearance-none rounded-lg border px-2 py-1.5 ${xs} focus:ring-brand-500 bg-white pr-6 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <option value="">동 전체</option>
              {dongOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="text-stone pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* 일정 */}
      <div>
        <p className={`${xs} text-steel mb-1.5 font-semibold`}>일정</p>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
            className={`border-hairline flex-1 rounded-lg border px-2 py-1.5 ${xs} focus:ring-brand-500 min-w-0 focus:ring-2 focus:outline-none`}
          />
          <span className="text-stone shrink-0 text-xs">~</span>
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom}
            onChange={(e) => set("dateTo", e.target.value)}
            className={`border-hairline flex-1 rounded-lg border px-2 py-1.5 ${xs} focus:ring-brand-500 min-w-0 focus:ring-2 focus:outline-none`}
          />
        </div>
      </div>

      {/* 별점 / 즐겨찾기 */}
      <div className={`${full} flex items-end justify-between gap-2`}>
        <div>
          <p className={`${xs} text-steel mb-1.5 font-semibold`}>별점</p>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => set("minRating", filters.minRating === s ? 0 : s)}>
                <Star
                  className={`h-5 w-5 transition-colors ${s <= filters.minRating ? "fill-yellow-400 text-yellow-500" : "text-hairline"}`}
                />
              </button>
            ))}
            {filters.minRating > 0 && (
              <span className="text-steel ml-1 text-xs">{filters.minRating}점↑</span>
            )}
          </div>
        </div>
        <button
          onClick={() => set("favoritesOnly", !filters.favoritesOnly)}
          className={`flex items-center gap-1 rounded-full border px-2 py-1.5 text-xs transition-colors ${
            filters.favoritesOnly
              ? "border-red-400 bg-red-50 text-red-600"
              : "border-hairline text-steel bg-white hover:border-red-300 hover:text-red-500"
          }`}
        >
          <Heart
            className={`h-3.5 w-3.5 ${filters.favoritesOnly ? "fill-red-500 text-red-500" : ""}`}
          />
          즐겨찾기
        </button>
      </div>
    </div>
  );
}
