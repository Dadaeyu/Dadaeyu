"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { formatDate } from "./helpers";
import { AdminListShell } from "./AdminListShell";
import { AdminSearchBar } from "./AdminSearchBar";
import { useAdminListMode } from "./useAdminListMode";

type AdminPost = {
  id: number;
  title: string;
  content?: string;
  post_type: string;
  post_type_label: string;
  author_nickname: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at?: string;
  attached_place_id?: number | null;
  attached_course_id?: number | null;
};

export function PostsSection() {
  const { mode, editingId, page, q, goList, goView, setPage, setQuery, setFilter, filterValue } =
    useAdminListMode();

  const [items, setItems] = useState<AdminPost[]>([]);
  const [viewPost, setViewPost] = useState<AdminPost | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState(q);

  const typeFilter = filterValue("type");
  const isViewing = mode === "view" && editingId !== null;

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("pageSize", String(DEFAULT_PAGE_SIZE));
      if (q) params.set("q", q);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/admin/posts?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "게시물을 불러오지 못했습니다.");
      }
      const json = (await res.json()) as { items: AdminPost[]; total: number };
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [page, q, typeFilter]);

  const loadForView = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts?id=${id}`);
      const json = (await res.json().catch(() => ({}))) as { items?: AdminPost[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "게시물을 불러오지 못했습니다.");
      const post = json.items?.[0];
      if (!post) throw new Error("게시물을 찾을 수 없습니다.");
      setViewPost(post);
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
    queueMicrotask(() => {
      if (isViewing && editingId) void loadForView(editingId);
      else setViewPost(null);
    });
  }, [isViewing, editingId, loadForView]);

  useEffect(() => {
    if (mode !== "list") return;
    if (searchInput === q) return;
    const t = setTimeout(() => setQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [mode, searchInput, q, setQuery]);

  useEffect(() => {
    if (mode !== "list") return;
    queueMicrotask(() => setSearchInput(q));
  }, [mode, q]);

  const deletePost = async (id: number) => {
    if (!confirm("이 게시물을 삭제할까요? 되돌릴 수 없습니다.")) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts?id=${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
      if (isViewing) goList();
      else await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  if (isViewing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goList}>
            목록으로
          </Button>
          <h1 className="text-ink text-xl font-bold">게시물 상세 #{editingId}</h1>
        </div>

        {error && (
          <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading && <p className="text-stone text-sm">불러오는 중…</p>}

        {!loading && viewPost && (
          <div className="border-hairline-soft space-y-4 rounded-lg border bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{viewPost.post_type_label}</Badge>
              <span className="text-stone text-sm">
                {viewPost.author_nickname} · {formatDate(viewPost.created_at)}
              </span>
            </div>
            <h2 className="text-ink text-lg font-bold">{viewPost.title}</h2>
            <p className="text-slate leading-relaxed whitespace-pre-wrap">{viewPost.content}</p>
            <div className="text-stone flex gap-4 text-sm">
              <span>좋아요 {viewPost.like_count}</span>
              <span>댓글 {viewPost.comment_count}</span>
            </div>
            {(viewPost.attached_place_id || viewPost.attached_course_id) && (
              <div className="text-stone border-t pt-3 text-sm">
                {viewPost.attached_place_id && <p>첨부 장소 ID: {viewPost.attached_place_id}</p>}
                {viewPost.attached_course_id && <p>첨부 코스 ID: {viewPost.attached_course_id}</p>}
              </div>
            )}
            <div className="flex justify-end border-t pt-4">
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                disabled={deletingId === viewPost.id}
                onClick={() => deletePost(viewPost.id)}
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <AdminListShell
      title="게시판 관리"
      subtitle="커뮤니티 사용자 게시글을 조회·삭제합니다."
      total={total}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      loading={loading}
      error={error}
      onPageChange={setPage}
      toolbar={
        <>
          <AdminSearchBar value={searchInput} onChange={setSearchInput} placeholder="제목 검색" />
          <select
            value={typeFilter}
            onChange={(e) => setFilter("type", e.target.value === "all" ? null : e.target.value)}
            className="border-hairline rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="all">전체 타입</option>
            <option value="review">후기</option>
            <option value="tip">팁</option>
            <option value="question">질문</option>
            <option value="share">공유</option>
          </select>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-hairline-soft bg-surface-soft border-b">
              {["ID", "제목", "타입", "작성자", "좋아요", "댓글", "작성일", "액션"].map((h) => (
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
                <td colSpan={8} className="text-stone px-4 py-8 text-center">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="text-stone px-4 py-8 text-center">
                  게시물이 없습니다.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((p) => (
                <tr key={p.id} className="border-hairline-soft hover:bg-surface-soft border-b">
                  <td className="text-stone px-4 py-3">#{p.id}</td>
                  <td className="text-ink px-4 py-3 font-semibold">{p.title}</td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral" className="text-[10px]">
                      {p.post_type_label}
                    </Badge>
                  </td>
                  <td className="text-stone px-4 py-3">{p.author_nickname}</td>
                  <td className="text-stone px-4 py-3">{p.like_count}</td>
                  <td className="text-stone px-4 py-3">{p.comment_count}</td>
                  <td className="text-stone px-4 py-3 text-xs whitespace-nowrap">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => goView(p.id)}>
                        상세
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deletingId === p.id}
                        onClick={() => deletePost(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
