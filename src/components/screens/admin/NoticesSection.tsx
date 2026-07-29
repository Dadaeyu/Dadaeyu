"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { validateNoticeFields } from "@/lib/notices/validation";
import { isEndBeforeStart, resolveEndAfterStartChange } from "@/lib/date-range";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { AdminFormShell, AdminListShell } from "./AdminListShell";
import { AdminSearchBar } from "./AdminSearchBar";
import { useAdminListMode } from "./useAdminListMode";

type AdminNotice = {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
};

type NoticeFormState = {
  title: string;
  content: string;
  priority: number;
  startsAt: string;
  endsAt: string;
  activateNow: boolean;
};

const EMPTY_FORM: NoticeFormState = {
  title: "",
  content: "",
  priority: 0,
  startsAt: "",
  endsAt: "",
  activateNow: true
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

function noticeToForm(notice: AdminNotice): NoticeFormState {
  return {
    title: notice.title,
    content: notice.content,
    priority: notice.priority,
    startsAt: toLocalInputValue(notice.starts_at),
    endsAt: toLocalInputValue(notice.ends_at),
    activateNow: notice.is_active
  };
}

function formToPayload(form: NoticeFormState) {
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    priority: form.priority,
    starts_at: fromLocalInputValue(form.startsAt),
    ends_at: fromLocalInputValue(form.endsAt),
    is_active: form.activateNow
  };
}

type ExposureStatus = "live" | "scheduled" | "expired" | "inactive";

function getExposureStatus(notice: AdminNotice): ExposureStatus {
  if (!notice.is_active) return "inactive";
  const now = Date.now();
  if (notice.starts_at && new Date(notice.starts_at).getTime() > now) return "scheduled";
  if (notice.ends_at && new Date(notice.ends_at).getTime() <= now) return "expired";
  return "live";
}

const EXPOSURE_LABELS: Record<ExposureStatus, string> = {
  live: "앱 노출 중",
  scheduled: "노출 예정",
  expired: "기간 만료",
  inactive: "비활성"
};

const EXPOSURE_TONES: Record<ExposureStatus, "brand" | "warn" | "error" | "neutral"> = {
  live: "brand",
  scheduled: "warn",
  expired: "error",
  inactive: "neutral"
};

export function NoticesSection() {
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

  const [items, setItems] = useState<AdminNotice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<NoticeFormState>(EMPTY_FORM);
  const [searchInput, setSearchInput] = useState(q);
  const [activePopupIds, setActivePopupIds] = useState<number[]>([]);

  const activeFilter = filterValue("active");
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
      if (activeFilter !== "all") params.set("active", activeFilter);

      const res = await fetch(`/api/admin/notices?${params}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminNotice[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "팝업 목록을 불러오지 못했습니다.");
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [page, q, activeFilter]);

  const loadForEdit = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/notices?id=${id}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminNotice[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "팝업을 불러오지 못했습니다.");
      const notice = json.items?.[0];
      if (!notice) throw new Error("팝업을 찾을 수 없습니다.");
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
    if (mode !== "list") return;
    fetch("/api/notices/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const notices = (data as { notices?: { id: number }[] } | null)?.notices ?? [];
        setActivePopupIds(notices.map((n) => n.id));
      })
      .catch(() => setActivePopupIds([]));
  }, [mode, items]);

  useEffect(() => {
    if (isEditing && editingId) loadForEdit(editingId);
    else if (isCreating) setForm(EMPTY_FORM);
  }, [isEditing, isCreating, editingId, loadForEdit]);

  useEffect(() => {
    if (mode !== "list") return;
    if (searchInput === q) return;
    const t = setTimeout(() => setQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [mode, searchInput, q, setQuery]);

  useEffect(() => {
    if (mode !== "list") return;
    setSearchInput(q);
  }, [mode, q]);

  const validateForm = (): string | null => {
    const payload = formToPayload(form);
    return validateNoticeFields({
      title: payload.title,
      content: payload.content,
      priority: payload.priority,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at
    });
  };

  const saveNotice = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const payload = formToPayload(form);
    setSaving(true);
    setError(null);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/notices", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { id: editingId, ...payload } : payload)
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok)
        throw new Error(
          json.error ?? (isEditing ? "수정에 실패했습니다." : "생성에 실패했습니다.")
        );
      goList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const patchNotice = async (id: number, patch: Partial<AdminNotice>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "변경에 실패했습니다.");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    } finally {
      setSaving(false);
    }
  };

  const deleteNotice = async (id: number) => {
    if (!confirm("이 팝업을 삭제할까요?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/notices?id=${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleStartsAtChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      startsAt: value,
      endsAt: resolveEndAfterStartChange(value, prev.endsAt, false)
    }));
    setFormError(null);
  };

  const handleEndsAtChange = (value: string) => {
    if (isEndBeforeStart(form.startsAt, value, false)) {
      setFormError("종료일은 시작일보다 이후여야 합니다.");
      return;
    }
    setForm((prev) => ({ ...prev, endsAt: value }));
    setFormError(null);
  };

  if (isCreating || isEditing) {
    return (
      <AdminFormShell
        title={isEditing ? `팝업 수정 (#${editingId})` : "새 팝업 작성"}
        error={error}
        formError={formError}
        saving={saving || loading}
        onBack={goList}
        onSubmit={saveNotice}
        submitLabel={isEditing ? "수정 저장" : "팝업 등록"}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">제목</label>
            <input
              value={form.title}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, title: e.target.value }));
                setFormError(null);
              }}
              className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="예) 서비스 점검 안내"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">우선순위</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, priority: Number(e.target.value) }));
                setFormError(null);
              }}
              className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
              min={0}
            />
            <p className="text-stone text-xs">
              숫자가 클수록 먼저 노출됩니다. 여러 팝업을 동시에 활성화할 수 있습니다.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">시작(선택)</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              max={form.endsAt || undefined}
              onChange={(e) => handleStartsAtChange(e.target.value)}
              className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">종료(선택)</label>
            <input
              type="datetime-local"
              value={form.endsAt}
              min={form.startsAt || undefined}
              onChange={(e) => handleEndsAtChange(e.target.value)}
              className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500">내용</label>
          <textarea
            value={form.content}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, content: e.target.value }));
              setFormError(null);
            }}
            rows={5}
            className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <label className="text-stone flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.activateNow}
            onChange={(e) => setForm((prev) => ({ ...prev, activateNow: e.target.checked }))}
          />
          {isEditing ? "활성 팝업으로 유지" : "저장 후 바로 활성화"} (다른 활성 팝업과 함께
          노출됩니다)
        </label>
      </AdminFormShell>
    );
  }

  return (
    <AdminListShell
      title="팝업 관리"
      total={total}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      loading={loading}
      error={error}
      onPageChange={setPage}
      onCreateClick={goCreate}
      createLabel="새 팝업"
      headerExtra={
        activePopupIds.length > 0 ? (
          <span className="text-stone text-sm">
            앱 노출 {activePopupIds.length}건:{" "}
            <span className="text-ink font-semibold">
              {activePopupIds.map((id) => `#${id}`).join(", ")}
            </span>
          </span>
        ) : (
          <span className="text-stone text-sm">현재 앱에 노출되는 팝업 없음</span>
        )
      }
      toolbar={
        <>
          <AdminSearchBar value={searchInput} onChange={setSearchInput} placeholder="제목 검색" />
          <select
            value={activeFilter}
            onChange={(e) => setFilter("active", e.target.value === "all" ? null : e.target.value)}
            className="border-hairline rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="all">전체 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-hairline-soft bg-surface-soft border-b">
              {["ID", "노출 상태", "제목", "우선순위", "노출 기간", "액션"].map((h) => (
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
                  팝업이 없습니다.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((n) => {
                const exposure = getExposureStatus(n);
                return (
                  <tr key={n.id} className="border-hairline-soft hover:bg-surface-soft border-b">
                    <td className="text-stone px-4 py-3">#{n.id}</td>
                    <td className="px-4 py-3">
                      <Badge tone={EXPOSURE_TONES[exposure]}>{EXPOSURE_LABELS[exposure]}</Badge>
                    </td>
                    <td className="text-ink px-4 py-3 font-semibold">{n.title}</td>
                    <td className="text-stone px-4 py-3">{n.priority}</td>
                    <td className="text-stone px-4 py-3 text-xs whitespace-nowrap">
                      {n.starts_at || n.ends_at
                        ? `${toLocalInputValue(n.starts_at) || "즉시"} ~ ${toLocalInputValue(n.ends_at) || "무기한"}`
                        : "항상"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={saving}
                          onClick={() => goEdit(n.id)}
                        >
                          수정
                        </Button>
                        {n.is_active ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={saving}
                            onClick={() => patchNotice(n.id, { is_active: false })}
                          >
                            비활성
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={saving}
                            onClick={() => patchNotice(n.id, { is_active: true })}
                          >
                            활성화
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={saving}
                          onClick={() => deleteNotice(n.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </AdminListShell>
  );
}
