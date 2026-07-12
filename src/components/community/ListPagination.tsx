"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { totalPages as calcTotalPages } from "@/lib/pagination";

type ListPaginationProps = {
  page: number;
  total: number;
  pageSize: number;
  disabled?: boolean;
  onChange: (page: number) => void;
};

export function ListPagination({
  page,
  total,
  pageSize,
  disabled = false,
  onChange
}: ListPaginationProps) {
  const pages = calcTotalPages(total, pageSize);
  if (total <= pageSize) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page <= 0}
        onClick={() => onChange(page - 1)}
        aria-label="이전 페이지"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-stone text-sm">
        {page + 1} / {pages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page >= pages - 1}
        onClick={() => onChange(page + 1)}
        aria-label="다음 페이지"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
