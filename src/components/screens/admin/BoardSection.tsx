"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { AdminFormShell, AdminListShell } from "./AdminListShell";
import { AdminSearchBar } from "./AdminSearchBar";
import { useAdminListMode } from "./useAdminListMode";
import {
  tableBodyClass,
  tableClass,
  tableHeadRowClass,
  tableRowClass,
  tableTdCenterClass,
  tableThClass,
  tableThLeftClass,
  tableWrapClass
} from "./adminUi";

type AdminBoard = {
  board_id: number;
  board_nm: string;
  board_desc: string | null;
  board_type: string;
  sort_order: number;
  use_yn: boolean;
  comment_yn: boolean;
  reply_yn: boolean;
  rating_yn: boolean;
  allow_image: boolean;
  allow_file: boolean;
  allow_secret: boolean;
  max_upload_count: number;
  created_at: string;
  updated_at: string;
};

type BoardFormState = {
  boardNm: string;
  boardDesc: string;
  boardType: string;
  sortOrder: number;
  useYn: boolean;
  commentYn: boolean;
  replyYn: boolean;
  ratingYn: boolean;
  allowImage: boolean;
  allowFile: boolean;
  allowSecret: boolean;
  maxUploadCount: number;
};

const EMPTY_FORM: BoardFormState = {
  boardNm: "",
  boardDesc: "",
  boardType: "NORMAL",
  sortOrder: 0,
  useYn: true,
  commentYn: true,
  replyYn: false,
  ratingYn: false,
  allowImage: true,
  allowFile: false,
  allowSecret: false,
  maxUploadCount: 5
};

function boardToForm(board: AdminBoard): BoardFormState {
  return {
    boardNm: board.board_nm,
    boardDesc: board.board_desc ?? "",
    boardType: board.board_type,
    sortOrder: board.sort_order,
    useYn: board.use_yn,
    commentYn: board.comment_yn,
    replyYn: board.reply_yn,
    ratingYn: board.rating_yn,
    allowImage: board.allow_image,
    allowFile: board.allow_file,
    allowSecret: board.allow_secret,
    maxUploadCount: board.max_upload_count
  };
}

function formToPayload(form: BoardFormState) {
  return {
    board_nm: form.boardNm.trim(),
    board_desc: form.boardDesc.trim() || null,
    board_type: form.boardType.trim() || "NORMAL",
    sort_order: form.sortOrder,
    use_yn: form.useYn,
    comment_yn: form.commentYn,
    reply_yn: form.replyYn,
    rating_yn: form.ratingYn,
    allow_image: form.allowImage,
    allow_file: form.allowFile,
    allow_secret: form.allowSecret,
    max_upload_count: form.maxUploadCount
  };
}

export function BoardSection() {
  const { mode, editingId, page, q, goList, goCreate, goEdit, setPage, setQuery } =
    useAdminListMode();

  const [items, setItems] = useState<AdminBoard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<BoardFormState>(EMPTY_FORM);
  const [searchInput, setSearchInput] = useState(q);

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

      const res = await fetch(`/api/admin/boards?${params}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminBoard[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "게시판 목록을 불러오지 못했습니다.");
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  const loadForEdit = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/boards?id=${id}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminBoard[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "게시판을 불러오지 못했습니다.");
      const board = json.items?.[0];
      if (!board) throw new Error("게시판을 찾을 수 없습니다.");
      setForm(boardToForm(board));
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "list") queueMicrotask(() => void loadList());
  }, [mode, loadList]);

  useEffect(() => {
    if (isEditing && editingId) queueMicrotask(() => void loadForEdit(editingId));
    else if (isCreating)
      queueMicrotask(() => {
        setForm(EMPTY_FORM);
        setLoading(false);
      });
  }, [isEditing, isCreating, editingId, loadForEdit]);

  useEffect(() => {
    if (mode !== "list") return;
    const t = setTimeout(() => setQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [mode, searchInput, setQuery]);

  useEffect(() => {
    queueMicrotask(() => setSearchInput(q));
  }, [q]);

  const saveBoard = async () => {
    if (saving) return;
    if (!form.boardNm.trim()) {
      setFormError("게시판명을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/boards", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing ? { id: editingId, ...formToPayload(form) } : formToPayload(form)
        )
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

  const toggleUse = async (board: AdminBoard) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: board.board_id, use_yn: !board.use_yn })
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

  const deleteBoard = async (board: AdminBoard) => {
    if (!confirm(`"${board.board_nm}" 게시판을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/boards?id=${board.board_id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
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
        title={isEditing ? "게시판 수정" : "새 게시판 만들기"}
        subtitle={isEditing && editingId != null ? `번호 ${editingId}` : undefined}
        error={error}
        formError={formError}
        saving={saving || loading}
        onBack={goList}
        onSubmit={saveBoard}
        submitLabel={isEditing ? "저장" : "게시판 등록"}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">게시판명</label>
            <input
              value={form.boardNm}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, boardNm: e.target.value }));
                setFormError(null);
              }}
              className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="예) 자유게시판"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">타입</label>
            <input
              value={form.boardType}
              onChange={(e) => setForm((prev) => ({ ...prev, boardType: e.target.value }))}
              className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="예) NORMAL, NOTICE, GALLERY"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">정렬순서</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
              className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500">설명(선택)</label>
          <textarea
            value={form.boardDesc}
            onChange={(e) => setForm((prev) => ({ ...prev, boardDesc: e.target.value }))}
            rows={3}
            className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-4 pt-1">
          <label className="text-stone flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.useYn}
              onChange={(e) => setForm((prev) => ({ ...prev, useYn: e.target.checked }))}
            />
            사용 여부
          </label>
          <label className="text-stone flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.commentYn}
              onChange={(e) => setForm((prev) => ({ ...prev, commentYn: e.target.checked }))}
            />
            댓글 허용
          </label>
          <label className="text-stone flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.replyYn}
              onChange={(e) => setForm((prev) => ({ ...prev, replyYn: e.target.checked }))}
            />
            답글 허용
          </label>
          <label className="text-stone flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ratingYn}
              onChange={(e) => setForm((prev) => ({ ...prev, ratingYn: e.target.checked }))}
            />
            별점 사용
          </label>
          <label className="text-stone flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowImage}
              onChange={(e) => setForm((prev) => ({ ...prev, allowImage: e.target.checked }))}
            />
            이미지 첨부 허용
          </label>
          <label className="text-stone flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowFile}
              onChange={(e) => setForm((prev) => ({ ...prev, allowFile: e.target.checked }))}
            />
            파일 첨부 허용
          </label>
          <label className="text-stone flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowSecret}
              onChange={(e) => setForm((prev) => ({ ...prev, allowSecret: e.target.checked }))}
            />
            비밀글 허용
          </label>
        </div>
        <div className="max-w-[10rem] space-y-1">
          <label className="text-xs font-semibold text-gray-500">첨부 최대 개수</label>
          <input
            type="number"
            min={0}
            value={form.maxUploadCount}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, maxUploadCount: Number(e.target.value) }))
            }
            className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      </AdminFormShell>
    );
  }

  return (
    <AdminListShell
      title="게시판 관리"
      subtitle="게시판을 추가·수정하고 사용 여부를 관리합니다."
      total={total}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      loading={loading}
      error={error}
      onPageChange={setPage}
      onCreateClick={goCreate}
      createLabel="새 게시판"
      toolbar={
        <AdminSearchBar value={searchInput} onChange={setSearchInput} placeholder="게시판명 검색" />
      }
    >
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableThClass}>ID</th>
              <th className={`${tableThLeftClass} min-w-[10rem]`}>게시판명</th>
              <th className={tableThClass}>타입</th>
              <th className={tableThClass}>정렬</th>
              <th className={tableThClass}>댓글</th>
              <th className={tableThClass}>답글</th>
              <th className={tableThClass}>별점</th>
              <th className={tableThClass}>사용 여부</th>
              <th className={tableThClass}>
                <span className="sr-only">작업</span>
              </th>
            </tr>
          </thead>
          <tbody className={tableBodyClass}>
            {loading && (
              <tr>
                <td colSpan={9} className="text-stone px-4 py-8 text-center">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="text-stone px-4 py-8 text-center">
                  게시판이 없습니다.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((b) => (
                <tr key={b.board_id} className={tableRowClass}>
                  <td className={`${tableTdCenterClass} text-stone whitespace-nowrap`}>
                    #{b.board_id}
                  </td>
                  <td className="text-ink min-w-[10rem] px-4 py-3.5 text-left font-semibold">
                    {b.board_nm}
                  </td>
                  <td className={tableTdCenterClass}>
                    <Badge tone="neutral" className="text-[10px]">
                      {b.board_type}
                    </Badge>
                  </td>
                  <td className={`${tableTdCenterClass} text-stone`}>{b.sort_order}</td>
                  <td className={tableTdCenterClass}>
                    <Badge tone={b.comment_yn ? "brand" : "neutral"}>
                      {b.comment_yn ? "허용" : "미허용"}
                    </Badge>
                  </td>
                  <td className={tableTdCenterClass}>
                    <Badge tone={b.reply_yn ? "brand" : "neutral"}>
                      {b.reply_yn ? "허용" : "미허용"}
                    </Badge>
                  </td>
                  <td className={tableTdCenterClass}>
                    <Badge tone={b.rating_yn ? "brand" : "neutral"}>
                      {b.rating_yn ? "사용" : "미사용"}
                    </Badge>
                  </td>
                  <td className={tableTdCenterClass}>
                    <Badge tone={b.use_yn ? "brand" : "error"}>
                      {b.use_yn ? "사용" : "미사용"}
                    </Badge>
                  </td>
                  <td className={tableTdCenterClass}>
                    <div className="flex justify-center gap-1.5">
                      <Button
                        size="iconSm"
                        variant="outline"
                        disabled={saving}
                        title="수정"
                        aria-label="수정"
                        onClick={() => goEdit(b.board_id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="iconSm"
                        variant={b.use_yn ? "secondary" : "accent"}
                        disabled={saving}
                        title={b.use_yn ? "미사용으로 변경" : "사용으로 변경"}
                        aria-label={b.use_yn ? "미사용으로 변경" : "사용으로 변경"}
                        onClick={() => toggleUse(b)}
                      >
                        {b.use_yn ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </Button>
                      <Button
                        size="iconSm"
                        variant="destructive"
                        disabled={saving}
                        title="삭제"
                        aria-label="삭제"
                        onClick={() => deleteBoard(b)}
                      >
                        <Trash2 className="size-4" />
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
