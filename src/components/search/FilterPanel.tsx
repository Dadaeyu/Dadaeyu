"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { FilterFields, type Filters } from "@/components/PlaceFilters";

interface FilterPanelProps {
  filters: Filters;
  set: <K extends keyof Filters>(key: K, val: Filters[K]) => void;
  toggleList: (key: "themes" | "accessibility", item: string) => void;
  guOptions?: string[];
  dongOptions?: string[];
  activeCount: number;
  onReset: () => void;
}

// 데스크탑용: 헤더를 눌러 여닫는 인라인 필터 섹션. useFilters()의 결과를 그대로 넘기면 된다.
// open/onOpenChange 를 넘기면 부모가 열림 상태를 제어한다(상세→뒤로 시에도 상태 유지).
// 안 넘기면 내부 상태(defaultOpen 초기값)를 쓴다.
export function FilterToggleSection({
  filters,
  set,
  toggleList,
  guOptions,
  dongOptions,
  activeCount,
  onReset,
  defaultOpen = false,
  open: openProp,
  onOpenChange
}: FilterPanelProps & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const toggleOpen = () => {
    const next = !open;
    if (onOpenChange) onOpenChange(next);
    else setOpenState(next);
  };

  return (
    <div className="shrink-0 border-b border-gray-100">
      <div className="flex items-center">
        <button
          onClick={toggleOpen}
          className="flex flex-1 items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span>필터</span>
            {activeCount > 0 && (
              <span className="bg-brand-600 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="shrink-0 border-l border-gray-100 px-3 py-2.5 text-xs text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            초기화
          </button>
        )}
      </div>
      {open && (
        <div
          className="overflow-y-auto border-t border-gray-100 px-3 pt-2 pb-3"
          style={{ maxHeight: "45vh" }}
        >
          <FilterFields
            filters={filters}
            set={set}
            toggleList={toggleList}
            guOptions={guOptions}
            dongOptions={dongOptions}
            compact
          />
        </div>
      )}
    </div>
  );
}

// 모바일용: 검색바 아래에 뜨는 오버레이 필터 패널.
export function FilterOverlayPanel({
  filters,
  set,
  toggleList,
  guOptions,
  dongOptions,
  onReset,
  onClose
}: Omit<FilterPanelProps, "activeCount"> & { onClose: () => void }) {
  return (
    <div className="absolute top-16 right-3 left-3 z-30 max-h-[60vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl md:hidden">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">필터</p>
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="text-xs text-red-400 underline hover:text-red-600">
            초기화
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <FilterFields
        filters={filters}
        set={set}
        toggleList={toggleList}
        guOptions={guOptions}
        dongOptions={dongOptions}
      />
    </div>
  );
}
