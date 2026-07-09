"use client";

import { useEffect, useState } from "react";
import { CommunityFaqDetailView } from "@/components/community/CommunityArticleDetail";

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

  if (loading) return <p className="text-stone text-sm">불러오는 중…</p>;
  if (error || !faq) {
    return <p className="text-error text-sm">{error ?? "FAQ를 찾을 수 없습니다."}</p>;
  }

  return <CommunityFaqDetailView faq={faq} />;
}
