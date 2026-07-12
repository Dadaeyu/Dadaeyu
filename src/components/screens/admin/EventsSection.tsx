"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { validateEventFields } from "@/lib/community/validation";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { AdminFormShell, AdminListShell } from "./AdminListShell";
import { AdminSearchBar } from "./AdminSearchBar";
import { useAdminListMode } from "./useAdminListMode";

type CommunityEvent = {
  id: number;
  title: string;
  summary: string;
  content: string;
  emoji: string;
  badge_label: string;
  badge_color: string;
  cover_gradient: string;
  period_label: string;
  is_visible: boolean;
  sort_order: number;
};

type FormState = {
  title: string;
  summary: string;
  content: string;
  emoji: string;
  badgeLabel: string;
  badgeColor: string;
  coverGradient: string;
  periodLabel: string;
  isVisible: boolean;
  sortOrder: number;
};

const EMPTY_FORM: FormState = {
  title: "",
  summary: "",
  content: "",
  emoji: "🎉",
  badgeLabel: "",
  badgeColor: "bg-brand-100 text-brand-700",
  coverGradient: "from-brand-400 to-brand-500",
  periodLabel: "",
  isVisible: true,
  sortOrder: 0
};

function eventToForm(event: CommunityEvent): FormState {
  return {
    title: event.title,
    summary: event.summary,
    content: event.content,
    emoji: event.emoji,
    badgeLabel: event.badge_label,
    badgeColor: event.badge_color,
    coverGradient: event.cover_gradient,
    periodLabel: event.period_label,
    isVisible: event.is_visible,
    sortOrder: event.sort_order
  };
}

export function EventsSection() {
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

  const [items, setItems] = useState<CommunityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [searchInput, setSearchInput] = useState(q);

  const visibleFilter = filterValue("visible");
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

      const res = await fetch(`/api/admin/community-events?${params}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: CommunityEvent[];
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
  }, [page, q, visibleFilter]);

  const loadForEdit = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/community-events?id=${id}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: CommunityEvent[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "이벤트를 불러오지 못했습니다.");
      const event = json.items?.[0];
      if (!event) throw new Error("이벤트를 찾을 수 없습니다.");
      setForm(eventToForm(event));
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
    const validationError = validateEventFields({
      title: form.title,
      summary: form.summary,
      content: form.content
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.content.trim(),
      emoji: form.emoji.trim(),
      badge_label: form.badgeLabel.trim(),
      badge_color: form.badgeColor.trim(),
      cover_gradient: form.coverGradient.trim(),
      period_label: form.periodLabel.trim(),
      is_visible: form.isVisible,
      sort_order: form.sortOrder
    };
    try {
      const res = await fetch("/api/admin/community-events", {
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

  const toggleVisible = async (event: CommunityEvent) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/community-events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, is_visible: !event.is_visible })
      });
      if (!res.ok) throw new Error("변경 실패");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("이 이벤트를 삭제할까요?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/community-events?id=${id}`, { method: "DELETE" });
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
        title={isEditing ? `이벤트 수정 (#${editingId})` : "새 이벤트 작성"}
        subtitle="커뮤니티 이벤트 탭 카드와 상세 페이지 내용을 관리합니다."
        error={error}
        formError={formError}
        saving={saving || loading}
        onBack={goList}
        onSubmit={submit}
        submitLabel={isEditing ? "수정 저장" : "등록"}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.emoji}
            onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
            placeholder="이모지"
            className="border-hairline rounded-lg border px-3 py-2 text-sm"
          />
          <input
            value={form.badgeLabel}
            onChange={(e) => setForm((f) => ({ ...f, badgeLabel: e.target.value }))}
            placeholder="배지 (예: 진행중)"
            className="border-hairline rounded-lg border px-3 py-2 text-sm"
          />
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="이벤트명"
            className="border-hairline rounded-lg border px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={form.periodLabel}
            onChange={(e) => setForm((f) => ({ ...f, periodLabel: e.target.value }))}
            placeholder="기간 표시"
            className="border-hairline rounded-lg border px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={form.badgeColor}
            onChange={(e) => setForm((f) => ({ ...f, badgeColor: e.target.value }))}
            placeholder="배지 색 클래스"
            className="border-hairline rounded-lg border px-3 py-2 text-sm"
          />
          <input
            value={form.coverGradient}
            onChange={(e) => setForm((f) => ({ ...f, coverGradient: e.target.value }))}
            placeholder="커버 그라데이션"
            className="border-hairline rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={form.summary}
          onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
          placeholder="목록용 요약"
          rows={2}
          className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
        />
        <textarea
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder="상세 내용"
          rows={8}
          className="border-hairline w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-steel flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
            />
            커뮤니티 노출
          </label>
          <label className="text-steel text-sm">
            정렬
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
              className="border-hairline ml-2 w-20 rounded-lg border px-2 py-1 text-sm"
            />
          </label>
        </div>
      </AdminFormShell>
    );
  }

  return (
    <AdminListShell
      title="이벤트 관리"
      subtitle="커뮤니티 이벤트 탭 카드와 상세 페이지 내용을 관리합니다."
      total={total}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      loading={loading}
      error={error}
      onPageChange={setPage}
      onCreateClick={goCreate}
      createLabel="새 이벤트"
      toolbar={
        <>
          <AdminSearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="제목·요약 검색"
          />
          <select
            value={visibleFilter}
            onChange={(e) => setFilter("visible", e.target.value === "all" ? null : e.target.value)}
            className="border-hairline rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="all">전체 노출</option>
            <option value="visible">노출</option>
            <option value="hidden">숨김</option>
          </select>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-hairline-soft bg-surface-soft border-b">
              {["ID", "제목", "배지", "기간", "노출", "액션"].map((h) => (
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
                <td colSpan={6} className="text-stone px-4 py-8 text-center">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-stone px-4 py-8 text-center">
                  등록된 이벤트가 없습니다.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((event) => (
                <tr key={event.id} className="border-hairline-soft hover:bg-surface-soft border-b">
                  <td className="text-stone px-4 py-3">#{event.id}</td>
                  <td className="text-ink px-4 py-3">
                    <span className="mr-2">{event.emoji}</span>
                    <span className="font-semibold">{event.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    {event.badge_label ? (
                      <Badge tone="custom" className={event.badge_color}>
                        {event.badge_label}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-stone px-4 py-3 text-xs">{event.period_label || "—"}</td>
                  <td className="px-4 py-3">
                    {event.is_visible ? (
                      <Badge tone="brand">노출</Badge>
                    ) : (
                      <Badge tone="neutral">숨김</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={() => goEdit(event.id)}>
                        수정
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleVisible(event)}>
                        {event.is_visible ? "숨기기" : "노출"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => deleteEvent(event.id)}
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
