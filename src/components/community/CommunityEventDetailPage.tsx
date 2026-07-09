"use client";

import { useEffect, useState } from "react";
import { CommunityEventDetailView } from "@/components/community/CommunityArticleDetail";

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

  if (loading) return <p className="text-stone text-sm">불러오는 중…</p>;
  if (error || !event) {
    return <p className="text-error text-sm">{error ?? "이벤트를 찾을 수 없습니다."}</p>;
  }

  return <CommunityEventDetailView event={event} />;
}
