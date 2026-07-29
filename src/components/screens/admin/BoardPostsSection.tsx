"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { formatDate } from "./helpers";
import { AdminFormShell, AdminListShell } from "./AdminListShell";
import { AdminSearchBar } from "./AdminSearchBar";
import { useAdminListMode } from "./useAdminListMode";

type AdminBoardPost = {
  post_id: number;
  board_id: number;
  board_nm: string;
  title: string;
  content?: string;
  writer_nm: string;
  rating: number | null;
  view_cnt: number;
  like_cnt: number;
  comment_cnt: number;
  notice_yn: boolean;
  use_yn: boolean;
  created_at: string;
  updated_at?: string;
};

type BoardOption = { board_id: number; board_nm: string };

type PostFormState = {
  title: string;
  content: string;
  useYn: boolean;
};

export function BoardPostsSection() {
  const { mode, editingId, page, q, goList, goEdit, setPage, setQuery, setFilter, filterValue } =
    useAdminListMode();

  const [items, setItems] = useState<AdminBoardPost[]>([]);
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [editPost, setEditPost] = useState<AdminBoardPost | null>(null);
  const [form, setForm] = useState<PostFormState>({
    title: "",
    content: "",
    useYn: true
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(q);

  const boardFilter = filterValue("boardId");
  const isEditing = mode === "edit" && editingId !== null;

  useEffect(() => {
    fetch("/api/admin/boards?pageSize=100")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setBoards((json?.items as BoardOption[]) ?? []))
      .catch(() => {});
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("pageSize", String(DEFAULT_PAGE_SIZE));
      if (q) params.set("q", q);
      if (boardFilter !== "all") params.set("boardId", boardFilter);

      const res = await fetch(`/api/admin/board-posts?${params}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminBoardPost[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "게시글 목록을 불러오지 못했습니다.");
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [page, q, boardFilter]);

  const loadForEdit = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/board-posts?id=${id}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminBoardPost[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "게시글을 불러오지 못했습니다.");
      const post = json.items?.[0];
      if (!post) throw new Error("게시글을 찾을 수 없습니다.");
      setEditPost(post);
      setForm({
        title: post.title,
        content: post.content ?? "",
        useYn: post.use_yn
      });
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
    else setEditPost(null);
  }, [isEditing, editingId, loadForEdit]);

  useEffect(() => {
    if (mode !== "list") return;
    const t = setTimeout(() => setQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [mode, searchInput, setQuery]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const savePost = async () => {
    if (saving) return;
    if (!editingId) return;
    if (!form.title.trim() || !form.content.trim()) {
      setFormError("제목과 내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/board-posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          title: form.title.trim(),
          content: form.content.trim(),
          use_yn: form.useYn
        })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "수정에 실패했습니다.");
      goList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const togglePatch = async (id: number, patch: Record<string, boolean>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/board-posts", {
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

  const deletePost = async (id: number) => {
    if (!confirm("이 게시글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/board-posts?id=${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
      if (isEditing) goList();
      else await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <AdminFormShell
        title={`게시글 수정 (#${editingId})`}
        error={error}
        formError={formError}
        saving={saving || loading}
        onBack={goList}
        onSubmit={savePost}
        submitLabel="수정 저장"
      >
        {editPost && (
          <div className="text-stone flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>게시판: {editPost.board_nm}</span>
            <span>작성자: {editPost.writer_nm}</span>
            <span>조회 {editPost.view_cnt}</span>
            <span>좋아요 {editPost.like_cnt}</span>
            <span>댓글 {editPost.comment_cnt}</span>
            {editPost.rating != null && <span>평점 {editPost.rating}</span>}
            <span>작성일 {formatDate(editPost.created_at)}</span>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500">제목</label>
          <input
            value={form.title}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, title: e.target.value }));
              setFormError(null);
            }}
            className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500">내용</label>
          <textarea
            value={form.content}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, content: e.target.value }));
              setFormError(null);
            }}
            rows={8}
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
        </div>
        {editPost && (
          <div className="flex justify-end border-t pt-4">
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600"
              disabled={saving}
              onClick={() => deletePost(editPost.post_id)}
            >
              삭제
            </Button>
          </div>
        )}
      </AdminFormShell>
    );
  }

  return (
    <AdminListShell
      title="게시글 관리"
      subtitle="게시판 게시글을 조회·수정·삭제합니다."
      total={total}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      loading={loading}
      error={error}
      onPageChange={setPage}
      toolbar={
        <>
          <AdminSearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="제목 또는 작성자 검색"
          />
          <select
            value={boardFilter}
            onChange={(e) => setFilter("boardId", e.target.value === "all" ? null : e.target.value)}
            className="border-hairline bg-background text-foreground rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="all">전체 게시판</option>
            {boards.map((b) => (
              <option key={b.board_id} value={String(b.board_id)}>
                {b.board_nm}
              </option>
            ))}
          </select>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-hairline-soft bg-surface-soft border-b">
              {[
                "ID",
                "게시판",
                "제목",
                "작성자",
                "조회",
                "좋아요",
                "댓글",
                "공지",
                "사용 여부",
                "작성일",
                "액션"
              ].map((h) => (
                <th
                  key={h}
                  className="text-steel px-4 py-3 text-center text-xs font-bold whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="text-stone px-4 py-8 text-center">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={11} className="text-stone px-4 py-8 text-center">
                  게시글이 없습니다.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((p) => (
                <tr key={p.post_id} className="border-hairline-soft hover:bg-surface-soft border-b">
                  <td className="text-stone px-4 py-3">#{p.post_id}</td>
                  <td className="text-stone px-4 py-3 whitespace-nowrap">{p.board_nm}</td>
                  <td className="text-ink px-4 py-3 font-semibold">{p.title}</td>
                  <td className="text-stone px-4 py-3">{p.writer_nm}</td>
                  <td className="text-stone px-4 py-3">{p.view_cnt}</td>
                  <td className="text-stone px-4 py-3">{p.like_cnt}</td>
                  <td className="text-stone px-4 py-3">{p.comment_cnt}</td>
                  <td className="px-4 py-3">{p.notice_yn && <Badge tone="warn">공지</Badge>}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.use_yn ? "brand" : "error"}>
                      {p.use_yn ? "사용" : "미사용"}
                    </Badge>
                  </td>
                  <td className="text-stone px-4 py-3 text-xs whitespace-nowrap">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <Button
                        size="iconSm"
                        variant="ghost"
                        disabled={saving}
                        title="수정"
                        aria-label="수정"
                        onClick={() => goEdit(p.post_id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="iconSm"
                        variant="ghost"
                        disabled={saving}
                        title={p.use_yn ? "미사용으로 변경" : "사용으로 변경"}
                        aria-label={p.use_yn ? "미사용으로 변경" : "사용으로 변경"}
                        onClick={() => togglePatch(p.post_id, { use_yn: !p.use_yn })}
                      >
                        {p.use_yn ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </Button>
                      <Button
                        size="iconSm"
                        variant="ghost"
                        disabled={saving}
                        title="삭제"
                        aria-label="삭제"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deletePost(p.post_id)}
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
