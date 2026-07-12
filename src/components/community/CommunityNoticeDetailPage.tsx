"use client";

import { useEffect, useState } from "react";
import { CommunityNoticeDetailView } from "@/components/community/CommunityArticleDetail";

export default function CommunityNoticeDetailPage({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    title: string;
    content: string;
    pinned: boolean;
    published_at: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/community/notices/${id}`);
        const json = (await res.json().catch(() => ({}))) as {
          notice?: { title: string; content: string; pinned: boolean; published_at: string };
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "공지를 불러오지 못했습니다.");
        if (!cancelled) setNotice(json.notice ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="text-stone text-sm">불러오는 중…</p>;
  if (error || !notice) {
    return <p className="text-error text-sm">{error ?? "공지를 찾을 수 없습니다."}</p>;
  }

  return <CommunityNoticeDetailView notice={notice} />;
}
