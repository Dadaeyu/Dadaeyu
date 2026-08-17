"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type AdminViewMode = "list" | "create" | "edit" | "view";

export function useAdminListMode() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawMode = searchParams.get("mode");
  const mode: AdminViewMode =
    rawMode === "create" || rawMode === "edit" || rawMode === "view" ? rawMode : "list";
  const editId = Number(searchParams.get("id"));
  const editingId = Number.isFinite(editId) && editId > 0 ? editId : null;

  const page = Math.max(0, (Number(searchParams.get("page")) || 1) - 1);
  const q = searchParams.get("q") ?? "";

  const buildUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      return qs ? `?${qs}` : "";
    },
    [searchParams]
  );

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const qs = buildUrl(updates);
      const next = `${pathname}${qs}`;
      const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      if (next === current) return;
      router.push(next);
    },
    [router, pathname, buildUrl, searchParams]
  );

  const setQuery = useCallback(
    (value: string) => {
      const next = value.trim();
      if (next === q) return;
      pushParams({ q: next || null, page: null });
    },
    [pushParams, q]
  );

  const goList = useCallback(() => {
    pushParams({ mode: null, id: null });
  }, [pushParams]);

  const goCreate = useCallback(() => {
    pushParams({ mode: "create", id: null });
  }, [pushParams]);

  const goEdit = useCallback(
    (id: number) => {
      pushParams({ mode: "edit", id: String(id) });
    },
    [pushParams]
  );

  const goView = useCallback(
    (id: number) => {
      pushParams({ mode: "view", id: String(id) });
    },
    [pushParams]
  );

  const setPage = useCallback(
    (zeroBasedPage: number) => {
      pushParams({ page: zeroBasedPage <= 0 ? null : String(zeroBasedPage + 1) });
    },
    [pushParams]
  );

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      pushParams({ [key]: value, page: null });
    },
    [pushParams]
  );

  const filterValue = useCallback(
    (key: string, fallback = "all") => searchParams.get(key) ?? fallback,
    [searchParams]
  );

  const listQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const pageNum = page + 1;
    if (pageNum > 1) params.set("page", String(pageNum));
    const filterKeys = ["active", "visible", "pinned", "type", "category"];
    for (const key of filterKeys) {
      const v = searchParams.get(key);
      if (v && v !== "all") params.set(key, v);
    }
    const qs = params.toString();
    return qs ? `&${qs}` : "";
  }, [q, page, searchParams]);

  return {
    mode,
    editingId,
    page,
    q,
    goList,
    goCreate,
    goEdit,
    goView,
    setPage,
    setQuery,
    setFilter,
    filterValue,
    listQueryString,
    searchParams
  };
}
