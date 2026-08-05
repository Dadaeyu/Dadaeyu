"use client";

import { Search } from "lucide-react";

type AdminSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function AdminSearchBar({ value, onChange, placeholder = "검색" }: AdminSearchBarProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-hairline bg-background text-ink placeholder:text-stone focus:border-navy-400 focus:ring-navy-400/30 w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
      />
    </div>
  );
}
