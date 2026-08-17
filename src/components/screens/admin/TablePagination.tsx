"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const PAGE_WINDOW = 10;

type TablePaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  disabled?: boolean;
  onChange: (targetPage: number) => void;
};

export function TablePagination({
  page,
  totalPages: totalPagesCount,
  total,
  pageSize,
  disabled = false,
  onChange
}: TablePaginationProps) {
  const windowStart = Math.floor(page / PAGE_WINDOW) * PAGE_WINDOW;
  const windowEnd = Math.min(windowStart + PAGE_WINDOW, totalPagesCount);
  const pages: number[] = [];
  for (let i = windowStart; i < windowEnd; i += 1) pages.push(i);

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  const navBtn =
    "border-hairline text-steel hover:bg-surface-soft flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="border-hairline-soft flex items-center justify-between gap-3 border-t px-4 py-3">
      <span className="text-stone text-xs">
        {from}–{to} / {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(0)}
          disabled={disabled || page <= 0}
          aria-label="맨 앞"
          className={navBtn}
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.max(0, windowStart - PAGE_WINDOW))}
          disabled={disabled || windowStart <= 0}
          aria-label="이전 페이지들"
          className={navBtn}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            disabled={disabled}
            aria-current={p === page ? "page" : undefined}
            className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
              p === page
                ? "bg-navy-600 text-fixed-white"
                : "border-hairline text-steel hover:bg-surface-soft bg-background border"
            }`}
          >
            {p + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(windowStart + PAGE_WINDOW)}
          disabled={disabled || windowEnd >= totalPagesCount}
          aria-label="다음 페이지들"
          className={navBtn}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onChange(totalPagesCount - 1)}
          disabled={disabled || page >= totalPagesCount - 1}
          aria-label="맨 뒤"
          className={navBtn}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
