"use client";

import * as React from "react";

import { cn } from "./utils";

// Mintlify 탭 (DESIGN.md segmented-tab / pill-tab).
// segmented = 밑줄형, pill = 알약형(활성은 브랜드 민트 강조).
export interface TabItem {
  key: string;
  label: React.ReactNode;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (key: string) => void;
  variant?: "segmented" | "pill";
  className?: string;
}

export function Tabs({ items, value, onValueChange, variant = "segmented", className }: TabsProps) {
  if (variant === "pill") {
    return (
      <div className={cn("flex gap-2 overflow-x-auto", className)}>
        {items.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => onValueChange(key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              value === key ? "bg-brand-500 text-ink" : "bg-surface text-slate hover:bg-hairline"
            )}
          >
            {label}
            {count !== undefined && <span className="ml-1 opacity-70">{count}</span>}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("border-hairline flex overflow-x-auto border-b", className)}>
      {items.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onValueChange(key)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
            value === key
              ? "text-brand-600 border-brand-600 border-b-2"
              : "text-steel hover:text-ink"
          )}
        >
          {label}
          {count !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                value === key ? "bg-brand-50 text-brand-700" : "bg-surface text-steel"
              )}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
