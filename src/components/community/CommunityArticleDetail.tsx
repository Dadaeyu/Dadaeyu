"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  formatCommunityDate,
  looksLikeHtml,
  renderMultilineText,
  sanitizeCommunityHtml
} from "@/lib/community/format";

type Props = {
  backHref: string;
  backLabel?: string;
  title: string;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  hero?: React.ReactNode;
  content: string;
};

export function CommunityArticleDetail({
  backHref,
  backLabel = "목록",
  title,
  meta,
  badge,
  hero,
  content
}: Props) {
  const router = useRouter();
  const isHtml = looksLikeHtml(content);
  const lines = isHtml ? [] : renderMultilineText(content);
  const safeHtml = isHtml ? sanitizeCommunityHtml(content) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(backHref)}
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {badge}
      </div>

      {hero}

      <article className="border-hairline-soft rounded-lg border bg-white p-5 md:p-6">
        <h1 className="text-ink mb-3 text-xl leading-snug font-bold">{title}</h1>
        {meta && (
          <div className="text-stone border-hairline-soft mb-5 border-b pb-4 text-sm">{meta}</div>
        )}
        {isHtml ? (
          <div
            className="prose prose-sm text-steel md:prose-base [&_a]:text-brand-600 max-w-none text-sm leading-relaxed md:text-base [&_a]:underline [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : (
          <div className="text-steel space-y-3 text-sm leading-relaxed md:text-base">
            {lines.map((line, i) => (
              <p key={i}>{line || "\u00A0"}</p>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

export function CommunityNoticeDetailView({
  notice
}: {
  notice: { title: string; content: string; pinned: boolean; published_at: string };
}) {
  return (
    <CommunityArticleDetail
      backHref="/community?tab=notice"
      title={notice.title}
      badge={
        notice.pinned ? (
          <Badge tone="brand" shape="tag">
            상단 고정
          </Badge>
        ) : undefined
      }
      meta={<span>{formatCommunityDate(notice.published_at)}</span>}
      content={notice.content}
    />
  );
}

export function CommunityEventDetailView({
  event
}: {
  event: {
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
}) {
  return (
    <CommunityArticleDetail
      backHref="/community?tab=event"
      title={event.title}
      hero={
        <div
          className={`relative flex h-40 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${event.cover_gradient}`}
        >
          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.cover_image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="text-6xl">{event.emoji}</span>
          )}
        </div>
      }
      badge={
        event.badge_label ? (
          <Badge tone="custom" className={`font-semibold ${event.badge_color}`}>
            {event.badge_label}
          </Badge>
        ) : undefined
      }
      meta={event.period_label ? <span>{event.period_label}</span> : undefined}
      content={event.content}
    />
  );
}

export function CommunityFaqDetailView({ faq }: { faq: { question: string; answer: string } }) {
  return (
    <CommunityArticleDetail
      backHref="/community?tab=faq"
      title={faq.question}
      badge={
        <Badge tone="brand" shape="tag">
          FAQ
        </Badge>
      }
      content={faq.answer}
    />
  );
}
