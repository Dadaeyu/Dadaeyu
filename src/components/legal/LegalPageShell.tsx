import Link from "next/link";
import type React from "react";
import { ChevronDown, Mail } from "lucide-react";
import { LEGAL_LINKS } from "@/lib/legal/legalRoutes";
import type { PolicySection } from "@/lib/legal/policyContent";
import { cn } from "@/components/ui/utils";

type Highlight = {
  title: string;
  description: string;
};

type TocSection = {
  id: string;
  title: string;
};

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  effectiveDate?: string;
  sections: readonly TocSection[];
  highlights?: readonly Highlight[];
  renderPolicySections?: boolean;
  children?: React.ReactNode;
};

export function LegalPageShell({
  eyebrow,
  title,
  description,
  effectiveDate,
  sections,
  highlights,
  renderPolicySections = true,
  children
}: LegalPageShellProps) {
  return (
    <div className="bg-background text-ink mx-auto max-w-5xl">
      <header className="border-hairline border-b pt-2 pb-6 md:pt-6 md:pb-8">
        <div className="flex flex-col gap-5">
          <div className="text-steel flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="border-hairline bg-surface rounded-full border px-3 py-1.5">
              {eyebrow}
            </span>
            {effectiveDate ? (
              <span className="border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/25 dark:text-brand-200 rounded-full border px-3 py-1.5">
                시행일 {effectiveDate}
              </span>
            ) : null}
          </div>

          <div className="max-w-3xl">
            <h1 className="text-ink text-3xl leading-tight font-semibold tracking-normal md:text-5xl">
              {title}
            </h1>
            <p className="text-steel mt-4 text-base leading-7 md:text-lg md:leading-8">
              {description}
            </p>
          </div>

          <LegalRouteNav />
        </div>
      </header>

      {highlights && highlights.length > 0 ? (
        <section
          aria-labelledby="legal-highlights"
          className="border-hairline border-b py-5 md:py-6"
        >
          <h2 id="legal-highlights" className="sr-only">
            핵심 안내
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {highlights.map((highlight) => (
              <article
                key={highlight.title}
                className="border-hairline bg-surface rounded-lg border p-4"
              >
                <h3 className="text-ink text-base leading-6 font-semibold">{highlight.title}</h3>
                <p className="text-steel mt-2 text-[15px] leading-7">{highlight.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <MobileSectionNav sections={sections} />

      <div className="grid gap-8 py-6 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10 md:py-10">
        <aside className="hidden md:block">
          <nav
            aria-label="문서 목차"
            className="border-hairline bg-background sticky top-24 rounded-lg border p-3"
          >
            <p className="text-stone px-3 pb-2 text-xs font-semibold">목차</p>
            <ol className="space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-steel hover:bg-surface hover:text-ink focus-visible:ring-brand-500 block rounded-md px-3 py-2 text-sm leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0">
          {children}
          {renderPolicySections ? (
            <div className="space-y-5">
              {(sections as readonly PolicySection[]).map((section) => (
                <PolicySectionArticle key={section.id} section={section} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LegalRouteNav() {
  return (
    <nav aria-label="정책 페이지" className="flex flex-wrap gap-2">
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="border-hairline bg-background text-ink hover:border-brand-300 hover:bg-brand-50 focus-visible:ring-brand-500 dark:hover:border-brand-700 dark:hover:bg-brand-900/25 min-h-11 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function MobileSectionNav({ sections }: { sections: readonly TocSection[] }) {
  return (
    <nav aria-label="문서 목차" className="border-hairline border-b py-4 md:hidden">
      <details className="border-hairline bg-surface group rounded-lg border">
        <summary className="text-ink focus-visible:ring-brand-500 flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          문서 목차
          <ChevronDown
            aria-hidden="true"
            className="text-stone h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>
        <ol className="border-hairline grid gap-1 border-t p-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-steel hover:bg-background hover:text-ink focus-visible:ring-brand-500 block min-h-11 rounded-md px-3 py-3 text-sm leading-5 font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}

function PolicySectionArticle({ section }: { section: PolicySection }) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24">
      <article className="border-hairline bg-background rounded-lg border p-5 md:p-6">
        <div className="border-hairline border-b pb-4">
          <h2 id={`${section.id}-title`} className="text-ink text-xl leading-8 font-semibold">
            {section.title}
          </h2>
          {section.description ? (
            <p className="text-steel mt-2 text-[15px] leading-7 md:text-base">
              {section.description}
            </p>
          ) : null}
        </div>

        {section.blocks && section.blocks.length > 0 ? (
          <div className="divide-hairline divide-y">
            {section.blocks.map((block) => (
              <div key={block.title} className="py-4">
                <h3 className="text-ink text-base leading-6 font-semibold">{block.title}</h3>
                {block.description ? (
                  <p className="text-steel mt-2 text-[15px] leading-7 md:text-base">
                    {block.description}
                  </p>
                ) : null}
                {block.items && block.items.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {block.items.map((item) => (
                      <li key={item} className="text-steel flex gap-3 text-[15px] leading-7">
                        <span
                          aria-hidden="true"
                          className="bg-brand-500 mt-2 h-1.5 w-1.5 flex-none rounded-full"
                        />
                        <PolicyItemText item={item} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {section.note ? (
          <p className="border-brand-200 bg-brand-50 text-ink dark:border-brand-800 dark:bg-brand-900/25 mt-4 rounded-lg border p-4 text-[15px] leading-7">
            {section.note}
          </p>
        ) : null}
      </article>
    </section>
  );
}

function PolicyItemText({ item }: { item: string }) {
  const match = item.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu);
  if (!match || match.index === undefined) return <span>{item}</span>;

  const email = match[0];
  const before = item.slice(0, match.index);
  const after = item.slice(match.index + email.length);

  return (
    <span>
      {before}
      <a
        href={`mailto:${email}`}
        className="text-ink hover:text-brand-700 focus-visible:ring-brand-500 rounded-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
      >
        {email}
      </a>
      {after}
    </span>
  );
}

export function OrderedSteps({
  id = "account-deletion-steps",
  title,
  steps
}: {
  id?: string;
  title: string;
  steps: readonly Highlight[];
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mb-5 scroll-mt-24">
      <div className="border-hairline bg-surface rounded-lg border p-5 md:p-6">
        <h2 id={`${id}-title`} className="text-ink text-xl leading-8 font-semibold">
          {title}
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="border-hairline bg-background rounded-lg border p-4">
              <span className="bg-brand-700 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white">
                {index + 1}
              </span>
              <h3 className="text-ink mt-3 text-base leading-6 font-semibold">{step.title}</h3>
              <p className="text-steel mt-2 text-[15px] leading-7">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function EmailRequestCard({
  id = "email-request",
  title,
  description,
  email,
  subject,
  requiredItems,
  response
}: {
  id?: string;
  title: string;
  description: string;
  email: string;
  subject: string;
  requiredItems: readonly string[];
  response: string;
}) {
  const body = [
    "다대유 계정 및 개인정보 삭제를 요청합니다.",
    "",
    ...requiredItems.map((item) => (item.includes(":") ? item : `${item}: `))
  ].join("\n");
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mb-5 scroll-mt-24">
      <div className="border-hairline bg-background rounded-lg border p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 id={`${id}-title`} className="text-ink text-xl leading-8 font-semibold">
              {title}
            </h2>
            <p className="text-steel mt-2 text-[15px] leading-7 md:text-base">{description}</p>
            <a
              href={href}
              className="text-ink hover:text-brand-700 focus-visible:ring-brand-500 mt-2 inline-flex rounded-sm text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
            >
              {email}
            </a>
          </div>
          <a
            href={href}
            aria-label="다대유 계정 삭제 요청 이메일 작성"
            className="bg-primary text-primary-foreground hover:bg-charcoal focus-visible:ring-brand-500 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            이메일로 요청
          </a>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="border-hairline bg-surface rounded-lg border p-4">
            <h3 className="text-ink text-base leading-6 font-semibold">메일에 포함할 내용</h3>
            <ul className="mt-3 space-y-2">
              {requiredItems.map((item) => (
                <li key={item} className="text-steel flex gap-3 text-[15px] leading-7">
                  <span
                    aria-hidden="true"
                    className="bg-brand-500 mt-2 h-1.5 w-1.5 flex-none rounded-full"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/25 rounded-lg border p-4">
            <h3 className="text-ink text-base leading-6 font-semibold">처리 안내</h3>
            <p className="text-steel mt-2 text-[15px] leading-7">{response}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ItemListSection({
  id,
  title,
  items,
  accent = false
}: {
  id: string;
  title: string;
  items: readonly string[];
  accent?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <article
        className={cn(
          "rounded-lg border p-5 md:p-6",
          accent
            ? "border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/25"
            : "border-hairline bg-background"
        )}
      >
        <h2 id={`${id}-title`} className="text-ink text-xl leading-8 font-semibold">
          {title}
        </h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item} className="text-steel flex gap-3 text-[15px] leading-7">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-2 h-1.5 w-1.5 flex-none rounded-full",
                  accent ? "bg-brand-600" : "bg-brand-500"
                )}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
