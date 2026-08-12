import { trafficStateToColor } from "@/lib/kakao/directions";

const LEGEND = [
  { state: 4, label: "원활" },
  { state: 3, label: "서행" },
  { state: 2, label: "지체" },
  { state: 1, label: "정체" }
] as const;

/** 자동차 경로 — 구간별 교통 혼잡도 범례 */
export default function TrafficLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {LEGEND.map(({ state, label }) => (
        <span key={state} className="text-stone inline-flex items-center gap-1 text-[10px]">
          <span
            className="inline-block h-1.5 w-4 rounded-full"
            style={{ backgroundColor: trafficStateToColor(state) }}
            aria-hidden
          />
          {label}
        </span>
      ))}
    </div>
  );
}
