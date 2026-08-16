import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal/legalRoutes";
import { cn } from "@/components/ui/utils";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label="정책 안내"
      className={cn(
        "text-stone flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs",
        className
      )}
    >
      {LEGAL_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="hover:text-ink focus-visible:ring-brand-500 rounded-sm py-1 underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
