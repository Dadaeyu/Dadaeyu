"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CommunityNoticeDetailView } from "@/components/community/CommunityArticleDetail";

function DetailStatus({
  message,
  tone = "muted",
  backHref = "/community?tab=notice",
  backLabel = "공지사항"
}: {
  message: string;
  tone?: "muted" | "error";
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={backHref}
        className="text-steel hover:text-ink inline-flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <div
        className={`border-hairline-soft rounded-2xl border px-5 py-10 text-center text-sm ${
          tone === "error"
            ? "text-error bg-red-50/50 dark:bg-red-950/20"
            : "text-stone bg-surface-soft"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

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

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="bg-surface h-9 w-28 animate-pulse rounded-lg" />
        <div className="border-hairline-soft overflow-hidden rounded-2xl border">
          <div className="border-hairline-soft space-y-3 border-b px-5 py-5 sm:px-7">
            <div className="bg-surface h-7 w-3/4 animate-pulse rounded" />
            <div className="bg-surface h-4 w-24 animate-pulse rounded" />
          </div>
          <div className="bg-surface-soft/40 space-y-3 px-5 py-6 sm:px-7">
            <div className="bg-surface h-4 w-full animate-pulse rounded" />
            <div className="bg-surface h-4 w-5/6 animate-pulse rounded" />
            <div className="bg-surface h-4 w-2/3 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !notice) {
    return (
      <DetailStatus
        message={error ?? "공지를 찾을 수 없습니다."}
        tone="error"
        backHref="/community?tab=notice"
        backLabel="공지사항"
      />
    );
  }

  return <CommunityNoticeDetailView notice={notice} />;
}
