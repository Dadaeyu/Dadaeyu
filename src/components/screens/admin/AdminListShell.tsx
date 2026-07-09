"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TablePagination } from "./TablePagination";
import { totalPages as calcTotalPages } from "@/lib/pagination";

type AdminListShellProps = {
  title: string;
  subtitle?: string;
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  error?: string | null;
  headerExtra?: ReactNode;
  toolbar?: ReactNode;
  onPageChange: (page: number) => void;
  onCreateClick?: () => void;
  createLabel?: string;
  children: ReactNode;
};

type AdminFormShellProps = {
  title: string;
  subtitle?: string;
  error?: string | null;
  formError?: string | null;
  saving?: boolean;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  children: ReactNode;
};

export function AdminListShell({
  title,
  subtitle,
  total,
  page,
  pageSize,
  loading = false,
  error,
  headerExtra,
  toolbar,
  onPageChange,
  onCreateClick,
  createLabel = "새로 작성",
  children
}: AdminListShellProps) {
  const pages = calcTotalPages(total, pageSize);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-stone mt-1 text-sm">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {headerExtra}
          <span className="text-stone text-sm">총 {total}건</span>
          {onCreateClick && (
            <Button variant="accent" size="sm" onClick={onCreateClick}>
              <Plus className="h-4 w-4" />
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {toolbar && <div className="flex flex-wrap items-center gap-3">{toolbar}</div>}

      <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
        {children}
        {total > 0 && (
          <TablePagination
            page={page}
            totalPages={pages}
            total={total}
            pageSize={pageSize}
            disabled={loading}
            onChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
}

export function AdminFormShell({
  title,
  subtitle,
  error,
  formError,
  saving = false,
  onBack,
  onSubmit,
  submitLabel = "저장",
  children
}: AdminFormShellProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" disabled={saving} onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Button>
        <div>
          <h1 className="text-ink text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-stone mt-0.5 text-sm">{subtitle}</p>}
        </div>
      </div>

      {error && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="border-hairline-soft space-y-4 rounded-lg border bg-white p-4">
        {formError && (
          <div className="border-error/30 text-error rounded-lg border bg-red-50 px-3 py-2 text-sm">
            {formError}
          </div>
        )}
        {children}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="ghost" disabled={saving} onClick={onBack}>
            취소
          </Button>
          <Button variant="accent" disabled={saving} onClick={onSubmit}>
            {saving ? "저장 중…" : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
