"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
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
  summary?: string;
  content: string;
  /** FAQ처럼 본문 앞에 A 라벨을 둘 때 */
  contentLabel?: string;
  titlePrefix?: React.ReactNode;
};

function ArticleBody({ content }: { content: string }) {
  const isHtml = looksLikeHtml(content);
  const lines = isHtml ? [] : renderMultilineText(content);
  const safeHtml = isHtml ? sanitizeCommunityHtml(content) : "";

  if (isHtml) {
    return (
      <div
        className="prose prose-sm md:prose-base prose-headings:text-ink prose-p:text-steel prose-li:text-steel prose-strong:text-ink [&_a]:text-brand-600 dark:prose-invert max-w-none text-sm leading-relaxed md:text-base [&_a]:underline [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  return (
    <div className="text-steel space-y-3 text-sm leading-relaxed whitespace-pre-wrap md:text-base">
      {lines.map((line, i) => (
        <p key={i}>{line || "\u00A0"}</p>
      ))}
    </div>
  );
}

export function CommunityArticleDetail({
  backHref,
  backLabel = "목록",
  title,
  meta,
  badge,
  hero,
  summary,
  content,
  contentLabel,
  titlePrefix
}: Props) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(backHref)}
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-steel text-sm font-medium">{backLabel}</span>
        {badge ? <div className="ml-auto">{badge}</div> : null}
      </div>

      <article className="border-hairline-soft bg-background overflow-hidden rounded-2xl border shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        {hero ? <div className="border-hairline-soft border-b">{hero}</div> : null}

        <header className="border-hairline-soft space-y-3 border-b px-5 py-5 sm:px-7 sm:py-6">
          {titlePrefix}
          <h1 className="text-ink text-xl leading-snug font-semibold tracking-[-0.03em] sm:text-2xl">
            {title}
          </h1>
          {summary ? (
            <p className="text-slate text-sm leading-6 sm:text-[15px]">{summary}</p>
          ) : null}
          {meta ? (
            <div className="text-stone flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {meta}
            </div>
          ) : null}
        </header>

        <div className="bg-surface-soft/40 px-5 py-6 sm:px-7 sm:py-8">
          {contentLabel ? (
            <div className="flex gap-3">
              <span className="text-brand-600 mt-0.5 shrink-0 text-sm font-bold">
                {contentLabel}
              </span>
              <div className="min-w-0 flex-1">
                <ArticleBody content={content} />
              </div>
            </div>
          ) : (
            <ArticleBody content={content} />
          )}
        </div>
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
      backLabel="공지사항"
      title={notice.title}
      badge={
        notice.pinned ? (
          <Badge tone="brand" shape="tag">
            상단 고정
          </Badge>
        ) : (
          <Badge tone="tag" shape="tag">
            공지
          </Badge>
        )
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
      backLabel="이벤트"
      title={event.title}
      summary={event.summary || undefined}
      hero={
        <div
          className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-56 ${event.cover_gradient || "from-brand-700 to-navy-800"}`}
        >
          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.cover_image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="relative z-10 text-6xl drop-shadow-sm">{event.emoji || "🎉"}</span>
          )}
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,24,22,0.05)_30%,rgba(8,24,22,0.4)_100%)]" />
          {(event.badge_label || event.period_label) && (
            <span className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-4">
              {event.badge_label ? (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${event.badge_color || "bg-brand-300/90 text-brand-900"}`}
                >
                  {event.badge_label}
                </span>
              ) : (
                <span />
              )}
              {event.period_label ? (
                <span className="text-fixed-white border-fixed-white/25 inline-flex max-w-[60%] items-center gap-1 rounded-full border bg-black/30 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">
                  <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{event.period_label}</span>
                </span>
              ) : null}
            </span>
          )}
        </div>
      }
      meta={
        event.period_label ? (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            {event.period_label}
          </span>
        ) : undefined
      }
      content={event.content}
    />
  );
}

export function CommunityFaqDetailView({ faq }: { faq: { question: string; answer: string } }) {
  return (
    <CommunityArticleDetail
      backHref="/community?tab=faq"
      backLabel="FAQ"
      title={faq.question}
      badge={
        <Badge tone="brand" shape="tag">
          FAQ
        </Badge>
      }
      titlePrefix={<span className="text-brand-600 text-sm font-bold">Q</span>}
      contentLabel="A"
      content={faq.answer}
    />
  );
}
