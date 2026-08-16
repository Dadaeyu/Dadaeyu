"use client";

import {
  formatRouteDistance,
  formatRouteDuration,
  formatRouteTollFare,
  type RouteOption
} from "@/lib/kakao/directions";

type Props = {
  options: RouteOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

/** 자동차 경로 — 추천·대안 카드 (2개 이상일 때만 렌더, 세로 목록) */
export default function RouteOptionPicker({ options, selectedId, onSelect, disabled }: Props) {
  if (options.length < 2) return null;

  return (
    <div className="flex flex-col gap-2" role="listbox" aria-label="추천 경로">
      {options.map((opt) => {
        const selected = opt.id === selectedId;
        const tollLabel = formatRouteTollFare(opt.tollFare);
        return (
          <button
            key={opt.id}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onSelect(opt.id)}
            className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs transition-colors disabled:opacity-50 ${
              selected
                ? "border-brand-600 bg-brand-100 text-ink"
                : "border-hairline bg-background text-stone hover:border-brand-300"
            }`}
          >
            <p className="font-semibold">{opt.label}</p>
            <p className="mt-0.5 leading-relaxed">
              {formatRouteDuration(opt.durationSec)} · {formatRouteDistance(opt.distanceM)}
              {tollLabel ? ` · ${tollLabel}` : ""}
            </p>
          </button>
        );
      })}
    </div>
  );
}
