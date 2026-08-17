"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CommunityEventDetailView } from "@/components/community/CommunityArticleDetail";

function DetailStatus({ message, tone = "muted" }: { message: string; tone?: "muted" | "error" }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/community?tab=event"
        className="text-steel hover:text-ink inline-flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        이벤트
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

export default function CommunityEventDetailPage({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<{
    title: string;
    summary: string;
    content: string;
    emoji: string;
    badge_label: string;
    badge_color: string;
    cover_gradient: string;
    cover_image_url?: string | null;
    period_label: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/community/events/${id}`);
        const json = (await res.json().catch(() => ({}))) as {
          event?: {
            title: string;
            summary: string;
            content: string;
            emoji: string;
            badge_label: string;
            badge_color: string;
            cover_gradient: string;
            cover_image_url?: string | null;
            period_label: string;
          };
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "이벤트를 불러오지 못했습니다.");
        if (!cancelled) setEvent(json.event ?? null);
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
        <div className="bg-surface h-9 w-24 animate-pulse rounded-lg" />
        <div className="border-hairline-soft overflow-hidden rounded-2xl border">
          <div className="bg-surface h-44 animate-pulse sm:h-56" />
          <div className="border-hairline-soft space-y-3 border-b px-5 py-5 sm:px-7">
            <div className="bg-surface h-7 w-3/4 animate-pulse rounded" />
            <div className="bg-surface h-4 w-40 animate-pulse rounded" />
          </div>
          <div className="bg-surface-soft/40 space-y-3 px-5 py-6 sm:px-7">
            <div className="bg-surface h-4 w-full animate-pulse rounded" />
            <div className="bg-surface h-4 w-5/6 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return <DetailStatus message={error ?? "이벤트를 찾을 수 없습니다."} tone="error" />;
  }

  return <CommunityEventDetailView event={event} />;
}
