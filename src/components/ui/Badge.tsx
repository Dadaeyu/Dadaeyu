import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

// Mintlify 배지/칩 (DESIGN.md badge-*). 색은 허용 팔레트 톤만.
// tone 미지정 + style 전달 시 커스텀 색(예: place.bg/color) 사용 가능.
const badgeVariants = cva("inline-flex items-center gap-1 font-medium whitespace-nowrap", {
  variants: {
    tone: {
      brand: "bg-brand-50 text-brand-700",
      tag: "bg-navy-50 text-navy-700",
      warn: "bg-gold-100 text-gold-700",
      error: "bg-red-50 text-red-700",
      orange: "bg-orange/10 text-orange-deep",
      neutral: "bg-surface text-steel",
      mintSoft: "bg-mint-soft/30 text-brand-800",
      // 커스텀 색을 style 로 직접 줄 때
      custom: ""
    },
    shape: {
      pill: "rounded-full px-2.5 py-0.5 text-xs",
      tag: "rounded-sm px-2 py-1 text-xs"
    }
  },
  defaultVariants: {
    tone: "neutral",
    shape: "pill"
  }
});

function Badge({
  className,
  tone,
  shape,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ tone, shape, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
