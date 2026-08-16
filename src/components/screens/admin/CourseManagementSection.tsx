"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star, Heart, ShieldCheck, User, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { AdminListShell } from "./AdminListShell";
import { AdminSearchBar } from "./AdminSearchBar";
import { useAdminListMode } from "./useAdminListMode";

type AdminCourse = {
  course_id: number;
  course_nm: string;
  open_yn: string | null;
  delete_yn: string | null;
  startdate: string | null;
  enddate: string | null;
  registtime: string | null;
  updatetime: string | null;
  register: string | null;
  author_nickname: string;
  author_role: string;
  average_rating: number;
  like_count: number;
  place_count: number;
  hashtags: string[];
};

function formatDotDate(value?: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10).replaceAll("-", ".");
}

// 코스 메뉴(Course.tsx)의 CourseAuthorRow와 동일한 스타일 — 관리 화면 카드에서도 같은 모양으로 쓴다.
function CourseAuthorRow({ authorType, author }: { authorType: "admin" | "user"; author: string }) {
  const badge =
    authorType === "admin" ? (
      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
        <ShieldCheck className="h-3 w-3" />
        관리자
      </span>
    ) : (
      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
        <User className="h-3 w-3" />
        유저
      </span>
    );
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500">{author}</span>
      {badge}
    </div>
  );
}

export function CourseManagementSection() {
  const { page, q, setPage, setQuery } = useAdminListMode();

  const [items, setItems] = useState<AdminCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(q);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("pageSize", String(DEFAULT_PAGE_SIZE));
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/courses?${params}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminCourse[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "목록을 불러오지 못했습니다.");
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (searchInput === q) return;
    const t = setTimeout(() => setQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput, q, setQuery]);

  useEffect(() => {
    queueMicrotask(() => setSearchInput(q));
  }, [q]);

  const deleteCourse = async (id: number) => {
    if (!confirm("이 코스를 삭제할까요?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/courses?id=${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "삭제 실패");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  const restoreCourse = async (id: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quickAction: "restore" })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "복구 실패");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "복구 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminListShell
      title="코스 관리"
      subtitle="공유여부·삭제여부와 관계없이 등록된 모든 코스를 관리합니다."
      total={total}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      loading={loading}
      error={error}
      onPageChange={setPage}
      toolbar={<AdminSearchBar value={searchInput} onChange={setSearchInput} placeholder="코스명 검색" />}
    >
      <div className="p-4">
        {loading && <p className="text-stone py-8 text-center text-sm">불러오는 중…</p>}
        {!loading && items.length === 0 && (
          <p className="text-stone py-8 text-center text-sm">등록된 코스가 없습니다.</p>
        )}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((course) => {
              const deleted = course.delete_yn === "Y";
              return (
                <Card key={course.course_id} className={deleted ? "opacity-60" : undefined}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Link
                        href={`/course/${course.course_id}`}
                        target="_blank"
                        className="text-ink truncate font-semibold hover:underline"
                      >
                        {course.course_nm}
                      </Link>
                      <Badge tone={course.open_yn === "N" ? "neutral" : "brand"} shape="tag">
                        {course.open_yn === "N" ? "비공개" : "공개"}
                      </Badge>
                      {deleted && <Badge tone="neutral">삭제됨</Badge>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-gray-700">{course.average_rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
                        <span>{course.like_count}</span>
                      </div>
                    </div>
                  </div>
                  <CourseAuthorRow
                    authorType={course.author_role === "admin" ? "admin" : "user"}
                    author={course.author_nickname}
                  />
                  {course.hashtags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {course.hashtags.map((label) => (
                        <Badge key={label} tone="brand" shape="pill">
                          #{label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-gray-500">
                    <div className="flex shrink-0 gap-2 whitespace-nowrap">
                      {(course.startdate || course.enddate) && (
                        <>
                          <span className="text-steel">
                            {course.startdate?.slice(0, 10) ?? ""}
                            {" ~ "}
                            {course.enddate?.slice(0, 10) ?? ""}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>{course.place_count}곳</span>
                    </div>
                    <span className="text-steel shrink-0 text-xs whitespace-nowrap">
                      등록 {formatDotDate(course.registtime)}
                      {course.updatetime && ` · 수정 ${formatDotDate(course.updatetime)}`}
                    </span>
                  </div>
                  <div className="border-hairline-soft flex justify-end gap-1.5 border-t pt-3">
                    {deleted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => restoreCourse(course.course_id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        복구
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={saving}
                        onClick={() => deleteCourse(course.course_id)}
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminListShell>
  );
}
