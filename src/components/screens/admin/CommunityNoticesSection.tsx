"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { validateTitleContent } from "@/lib/community/validation";
import { formatCommunityDate } from "@/lib/community/format";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { AdminFormShell, AdminListShell } from "./AdminListShell";
import { AdminSearchBar } from "./AdminSearchBar";
import { useAdminListMode } from "./useAdminListMode";

type CommunityNotice = {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  is_visible: boolean;
  published_at: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type FormState = {
  title: string;
  content: string;
  pinned: boolean;
  isVisible: boolean;
  publishedAt: string;
  sortOrder: number;
};

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  pinned: false,
  isVisible: true,
  publishedAt: "",
  sortOrder: 0
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInputValue(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function noticeToForm(notice: CommunityNotice): FormState {
  return {
    title: notice.title,
    content: notice.content,
    pinned: notice.pinned,
    isVisible: notice.is_visible,
    publishedAt: toLocalInputValue(notice.published_at),
    sortOrder: notice.sort_order
  };
}

export function CommunityNoticesSection() {
  const {
    mode,
    editingId,
    page,
    q,
    goList,
    goCreate,
    goEdit,
    setPage,
    setQuery,
    setFilter,
    filterValue
  } = useAdminListMode();

  const [items, setItems] = useState<CommunityNotice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [searchInput, setSearchInput] = useState(q);

  const visibleFilter = filterValue("visible");
  const pinnedFilter = filterValue("pinned");
  const isEditing = mode === "edit" && editingId !== null;
  const isCreating = mode === "create";

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("pageSize", String(DEFAULT_PAGE_SIZE));
      if (q) params.set("q", q);
      if (visibleFilter !== "all") params.set("visible", visibleFilter);
      if (pinnedFilter !== "all") params.set("pinned", pinnedFilter);

      const res = await fetch(`/api/admin/community-notices?${params}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: CommunityNotice[];
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
  }, [page, q, visibleFilter, pinnedFilter]);

  const loadForEdit = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/community-notices?id=${id}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: CommunityNotice[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "공지를 불러오지 못했습니다.");
      const notice = json.items?.[0];
      if (!notice) throw new Error("공지를 찾을 수 없습니다.");
      setForm(noticeToForm(notice));
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "list") loadList();
  }, [mode, loadList]);

  useEffect(() => {
    if (isEditing && editingId) loadForEdit(editingId);
    else if (isCreating) setForm(EMPTY_FORM);
  }, [isEditing, isCreating, editingId, loadForEdit]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput, setQuery]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const submit = async () => {
    const validationError = validateTitleContent(form.title, form.content);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      pinned: form.pinned,
      is_visible: form.isVisible,
      published_at: fromLocalInputValue(form.publishedAt),
      sort_order: form.sortOrder
    };
    try {
      const res = await fetch("/api/admin/community-notices", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { id: editingId, ...payload } : payload)
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "저장에 실패했습니다.");
      goList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisible = async (notice: CommunityNotice) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/community-notices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notice.id, is_visible: !notice.is_visible })
      });
      if (!res.ok) throw new Error("변경 실패");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    } finally {
      setSaving(false);
    }
  };

  const deleteNotice = async (id: number) => {
    if (!confirm("이 공지를 삭제할까요?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/community-notices?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  if (isCreating || isEditing) {
    return (
      <AdminFormShell
        title={isEditing ? `공지 수정 (#${editingId})` : "새 공지 작성"}
        subtitle="커뮤니티 공지사항 탭에 노출되는 게시글입니다."
        error={error}
        formError={formError}
        saving={saving || loading}
        onBack={goList}
        onSubmit={submit}
        submitLabel={isEditing ? "수정 저장" : "등록"}
      >
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="제목"
          className="border-hairline focus:ring-navy-400 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
        <textarea
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder="상세 내용"
          rows={8}
          className="border-hairline focus:ring-navy-400 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed focus:ring-2 focus:outline-none"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-steel flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
            />
            중요 공지
          </label>
          <label className="text-steel flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
            />
            커뮤니티 노출
          </label>
          <label className="text-steel text-sm">
            <span className="mb-1 block text-xs font-semibold">정렬 순서</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
              className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="text-steel block text-sm">
          <span className="mb-1 block text-xs font-semibold">게시일</span>
          <input
            type="datetime-local"
            value={form.publishedAt}
            onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
            className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
      </AdminFormShell>
    );
  }

  return (
    <AdminListShell
      title="공지 관리"
      subtitle="커뮤니티 공지사항 탭에 노출되는 게시글입니다."
      total={total}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      loading={loading}
      error={error}
      onPageChange={setPage}
      onCreateClick={goCreate}
      createLabel="새 공지"
      toolbar={
        <>
          <AdminSearchBar value={searchInput} onChange={setSearchInput} placeholder="제목 검색" />
          <select
            value={visibleFilter}
            onChange={(e) => setFilter("visible", e.target.value === "all" ? null : e.target.value)}
            className="border-hairline rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="all">전체 노출</option>
            <option value="visible">노출</option>
            <option value="hidden">숨김</option>
          </select>
          <select
            value={pinnedFilter}
            onChange={(e) => setFilter("pinned", e.target.value === "all" ? null : e.target.value)}
            className="border-hairline rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="all">전체 고정</option>
            <option value="pinned">고정</option>
            <option value="unpinned">일반</option>
          </select>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-hairline-soft bg-surface-soft border-b">
              {["ID", "제목", "고정", "노출", "게시일", "정렬", "액션"].map((h) => (
                <th
                  key={h}
                  className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-stone px-4 py-8 text-center">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-stone px-4 py-8 text-center">
                  등록된 공지가 없습니다.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((notice) => (
                <tr key={notice.id} className="border-hairline-soft hover:bg-surface-soft border-b">
                  <td className="text-stone px-4 py-3">#{notice.id}</td>
                  <td className="text-ink px-4 py-3 font-semibold">{notice.title}</td>
                  <td className="px-4 py-3">
                    {notice.pinned ? <Badge tone="brand">중요</Badge> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {notice.is_visible ? (
                      <Badge tone="brand">노출</Badge>
                    ) : (
                      <Badge tone="neutral">숨김</Badge>
                    )}
                  </td>
                  <td className="text-stone px-4 py-3 text-xs whitespace-nowrap">
                    {formatCommunityDate(notice.published_at)}
                  </td>
                  <td className="text-stone px-4 py-3">{notice.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={() => goEdit(notice.id)}>
                        수정
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleVisible(notice)}>
                        {notice.is_visible ? "숨기기" : "노출"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => deleteNotice(notice.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </AdminListShell>
  );
}
