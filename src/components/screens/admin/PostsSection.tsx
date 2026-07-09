"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "./helpers";

type AdminPost = {
  id: number;
  title: string;
  post_type: string;
  post_type_label: string;
  author_nickname: string;
  like_count: number;
  comment_count: number;
  created_at: string;
};

export function PostsSection() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/admin/posts?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "게시물을 불러오지 못했습니다.");
      }
      const json = (await res.json()) as { posts: AdminPost[] };
      setPosts(json.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(loadPosts, 300);
    return () => clearTimeout(t);
  }, [loadPosts]);

  const deletePost = async (id: number) => {
    if (!confirm("이 게시물을 삭제할까요? 되돌릴 수 없습니다.")) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts?id=${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-ink text-xl font-bold">게시물 관리</h1>
        <span className="text-stone text-sm">총 {posts.length}건</span>
      </div>

      {error && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목 또는 작성자 검색"
          className="border-hairline focus:ring-navy-400 w-full rounded-lg border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      <div className="space-y-3">
        {loading && <Card className="border-hairline-soft animate-pulse p-6">불러오는 중…</Card>}
        {!loading && posts.length === 0 && (
          <Card className="border-hairline-soft p-8 text-center">
            <p className="text-stone text-sm">게시물이 없습니다.</p>
          </Card>
        )}
        {!loading &&
          posts.map((p) => (
            <Card key={p.id} className="border-hairline-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-ink font-bold">{p.title}</span>
                    <Badge tone="neutral" className="text-[10px]">
                      {p.post_type_label}
                    </Badge>
                  </div>
                  <p className="text-stone text-xs">
                    {p.author_nickname} · {formatDate(p.created_at)} · 좋아요 {p.like_count} · 댓글{" "}
                    {p.comment_count}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deletingId === p.id}
                  onClick={() => deletePost(p.id)}
                  className="text-error shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
