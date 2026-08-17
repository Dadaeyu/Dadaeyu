import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

// Mintlify 카드 (DESIGN.md card-base): flat + hairline 보더 + rounded-lg.
// asChild 로 <Link>/<button> 을 감싸 인터랙티브 카드로 쓴다.
const cardVariants = cva("rounded-lg bg-white", {
  variants: {
    variant: {
      default: "border border-hairline",
      // 호버 시 민트 보더로 강조되는 클릭형 카드
      interactive: "border border-hairline transition-colors hover:border-brand-300",
      // 옅은 surface 패널 (보더 없음)
      feature: "bg-surface",
      // 보더 없는 플랫 표면
      flat: ""
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6"
    }
  },
  defaultVariants: {
    variant: "default",
    padding: "md"
  }
});

function Card({
  className,
  variant,
  padding,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="card"
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  );
}

export { Card, cardVariants };
