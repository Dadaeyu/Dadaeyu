import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "./utils";

// 섹션 제목 + 우측 "전체보기" 액션 링크 (Home 섹션 헤더 패턴).
interface SectionHeadingProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: { href: string; label: string };
  className?: string;
}

export function SectionHeading({ title, icon, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-2", className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-ink text-lg font-semibold">{title}</h3>
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-brand-600 hover:text-brand-700 flex items-center text-sm font-medium"
        >
          {action.label}
          <ChevronRight className="inline h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
