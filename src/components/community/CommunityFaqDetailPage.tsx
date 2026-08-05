"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CommunityFaqDetailView } from "@/components/community/CommunityArticleDetail";

function DetailStatus({ message, tone = "muted" }: { message: string; tone?: "muted" | "error" }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/community?tab=faq"
        className="text-steel hover:text-ink inline-flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        FAQ
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

export default function CommunityFaqDetailPage({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faq, setFaq] = useState<{ question: string; answer: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/community/faq/${id}`);
        const json = (await res.json().catch(() => ({}))) as {
          faq?: { question: string; answer: string };
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "FAQ를 불러오지 못했습니다.");
        if (!cancelled) setFaq(json.faq ?? null);
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
        <div className="bg-surface h-9 w-16 animate-pulse rounded-lg" />
        <div className="border-hairline-soft overflow-hidden rounded-2xl border">
          <div className="border-hairline-soft space-y-3 border-b px-5 py-5 sm:px-7">
            <div className="bg-surface h-4 w-6 animate-pulse rounded" />
            <div className="bg-surface h-7 w-4/5 animate-pulse rounded" />
          </div>
          <div className="bg-surface-soft/40 space-y-3 px-5 py-6 sm:px-7">
            <div className="bg-surface h-4 w-full animate-pulse rounded" />
            <div className="bg-surface h-4 w-3/4 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !faq) {
    return <DetailStatus message={error ?? "FAQ를 찾을 수 없습니다."} tone="error" />;
  }

  return <CommunityFaqDetailView faq={faq} />;
}
