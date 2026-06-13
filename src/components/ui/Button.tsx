import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

// Mintlify 버튼 시스템 (DESIGN.md): 모든 버튼은 필(rounded-full).
// default = 블랙 필 주 CTA, accent = 민트 필(브랜드 강조), onDark = 다크밴드용 화이트 필.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // 블랙 필 — 라이트 배경의 지배적 CTA
        default: "bg-primary text-primary-foreground hover:bg-charcoal active:bg-charcoal",
        // 민트 필 — 브랜드 강조 CTA (활성/핵심 액션 1개 정도)
        accent: "bg-brand-500 text-primary hover:bg-brand-600 active:bg-brand-600",
        // 다크 밴드 위 화이트 필
        onDark: "bg-white text-primary hover:bg-white/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        // 아웃라인 필
        outline: "border border-hairline bg-background text-foreground hover:bg-surface",
        secondary: "border border-hairline bg-background text-foreground hover:bg-surface",
        // 사각 고스트 (보조/3차 내비)
        ghost: "rounded-md text-foreground hover:bg-surface",
        link: "text-foreground underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-11 px-6 has-[>svg]:px-5",
        icon: "size-9",
        iconSm: "size-7"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
