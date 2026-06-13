"use client";

import { ChevronDown, Plus, Minus, Star, Heart } from "lucide-react";

export const DISTRICTS: Record<string, string[]> = {
  동구: ["대동", "용전동", "판암동", "삼성동", "홍도동", "대성동", "가오동", "신하동", "성남동", "원동", "인동", "소제동", "천동", "용운동", "자양동", "중동"],
  중구: ["은행동", "선화동", "목동", "중촌동", "대흥동", "문화동", "부사동", "석교동", "태평동", "유천동", "문창동", "산성동", "오류동", "용두동", "안영동", "무수동"],
  서구: ["갈마동", "월평동", "둔산동", "용문동", "탄방동", "삼천동", "괴정동", "가장동", "내동", "변동", "도마동", "정림동", "복수동", "관저동", "기성동", "가수원동", "도안동"],
  유성구: ["진잠동", "원신흥동", "관평동", "신성동", "노은동", "지족동", "반석동", "구즉동", "봉명동", "장대동", "전민동", "외삼동", "원촌동", "대정동", "학하동", "자운동"],
  대덕구: ["오정동", "읍내동", "중리동", "신탄진동", "덕암동", "목상동", "법동", "송촌동", "석봉동", "비래동", "장동", "삼정동", "와동", "이현동", "회덕동", "연축동"],
};

export const THEMES = ["빵지순례", "먹거리", "과학", "자연힐링", "문화예술", "역사근대", "축제"];
export const AGE_GROUPS = ["영유아", "어린이", "청소년", "성인", "고령자"];
export const ACCESSIBILITY = ["시각", "청각", "보행", "영유아", "임산부", "고령자"];

export interface Filters {
  accessibility: string[];
  gu: string; dong: string; themes: string[]; headcount: number;
  dateFrom: string; dateTo: string;
  minRating: number; favoritesOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  accessibility: [],
  gu: "", dong: "", themes: [], headcount: 1,
  dateFrom: "", dateTo: "", minRating: 0, favoritesOnly: false,
};

export function FilterFields({
  filters, set, toggleList, compact = false,
}: {
  filters: Filters;
  set: <K extends keyof Filters>(key: K, val: Filters[K]) => void;
  toggleList: (key: "themes" | "accessibility", item: string) => void;
  compact?: boolean;
}) {
  const xs = compact ? "text-xs" : "text-sm";
  const chip = (active: boolean) =>
    `px-2 py-1 ${compact ? "text-xs" : "text-sm"} rounded-full border transition-colors ${
      active
        ? "bg-brand-600 text-white border-brand-600"
        : "bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-600"
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
        <p className={`${xs} font-semibold text-gray-500 mb-1.5`}>접근성</p>
        <div className="flex flex-wrap gap-1">
          {ACCESSIBILITY.map(a => (
            <button key={a} onClick={() => toggleList("accessibility", a)} className={chip(filters.accessibility.includes(a))}>{a}</button>
          ))}
        </div>
      </div>

      {/* 인원수 */}
      <div>
        <p className={`${xs} font-semibold text-gray-500 mb-1.5`}>인원수</p>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1.5 py-0.5 w-fit">
          <button onClick={() => set("headcount", Math.max(1, filters.headcount - 1))} className="p-0.5 hover:bg-gray-100 rounded">
            <Minus className="w-3 h-3 text-gray-600" />
          </button>
          <span className={`${xs} font-medium w-7 text-center`}>{filters.headcount}명</span>
          <button onClick={() => set("headcount", filters.headcount + 1)} className="p-0.5 hover:bg-gray-100 rounded">
            <Plus className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 테마 */}
      <div className={full}>
        <p className={`${xs} font-semibold text-gray-500 mb-1.5`}>테마</p>
        <div className="flex flex-wrap gap-1">
          {THEMES.map(t => (
            <button key={t} onClick={() => toggleList("themes", t)} className={chip(filters.themes.includes(t))}>{t}</button>
          ))}
        </div>
      </div>

      {/* 위치 */}
      <div>
        <p className={`${xs} font-semibold text-gray-500 mb-1.5`}>위치</p>
        <div className="flex gap-1.5">
          {[
            { val: filters.gu, onChange: (v: string) => { set("gu", v); set("dong", ""); }, opts: Object.keys(DISTRICTS), placeholder: "구 전체" },
            { val: filters.dong, onChange: (v: string) => set("dong", v), opts: DISTRICTS[filters.gu] ?? [], placeholder: "동 전체", disabled: !filters.gu },
          ].map((s, i) => (
            <div key={i} className="relative flex-1">
              <select value={s.val} onChange={e => s.onChange(e.target.value)} disabled={s.disabled}
                className={`w-full appearance-none border border-gray-200 rounded-lg px-2 py-1.5 ${xs} pr-6 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100 disabled:text-gray-400`}>
                <option value="">{s.placeholder}</option>
                {s.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>

      {/* 일정 */}
      <div>
        <p className={`${xs} font-semibold text-gray-500 mb-1.5`}>일정</p>
        <div className="flex items-center gap-1">
          <input type="date" value={filters.dateFrom} onChange={e => set("dateFrom", e.target.value)}
            className={`flex-1 border border-gray-200 rounded-lg px-2 py-1.5 ${xs} focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-0`} />
          <span className="text-gray-400 text-xs shrink-0">~</span>
          <input type="date" value={filters.dateTo} min={filters.dateFrom} onChange={e => set("dateTo", e.target.value)}
            className={`flex-1 border border-gray-200 rounded-lg px-2 py-1.5 ${xs} focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-0`} />
        </div>
      </div>

      {/* 별점 / 즐겨찾기 */}
      <div className={`${full} flex items-end justify-between gap-2`}>
        <div>
          <p className={`${xs} font-semibold text-gray-500 mb-1.5`}>별점</p>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => set("minRating", filters.minRating === s ? 0 : s)}>
                <Star className={`w-5 h-5 transition-colors ${s <= filters.minRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
              </button>
            ))}
            {filters.minRating > 0 && <span className="text-xs text-gray-500 ml-1">{filters.minRating}점↑</span>}
          </div>
        </div>
        <button onClick={() => set("favoritesOnly", !filters.favoritesOnly)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs transition-colors ${
            filters.favoritesOnly ? "bg-red-50 border-red-400 text-red-600" : "bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500"
          }`}>
          <Heart className={`w-3.5 h-3.5 ${filters.favoritesOnly ? "fill-red-500 text-red-500" : ""}`} />
          즐겨찾기
        </button>
      </div>
    </div>
  );
}
