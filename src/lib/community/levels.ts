import type { LucideIcon } from "lucide-react";
import { Footprints, MapPinned, Users, Compass, ShieldCheck } from "lucide-react";

/** 커뮤니티 등급 1~5 (DB calc_community_level과 동일) */
export const COMMUNITY_MAX_LEVEL = 5;

/** 다음 레벨에 필요한 누적 점수 (index 0 = Lv2 임계) */
export const COMMUNITY_LEVEL_THRESHOLDS = [50, 200, 500, 1000] as const;

export const COMMUNITY_LEVEL_LABELS: Record<number, string> = {
  1: "첫걸음",
  2: "나들이",
  3: "동행",
  4: "길잡이",
  5: "으뜸"
};

export type CommunityLevelMeta = {
  label: string;
  Icon: LucideIcon;
  /** 뱃지 컨테이너 클래스 */
  chipClass: string;
  iconClass: string;
};

export const COMMUNITY_LEVEL_META: Record<number, CommunityLevelMeta> = {
  1: {
    label: COMMUNITY_LEVEL_LABELS[1],
    Icon: Footprints,
    chipClass: "bg-surface-soft text-steel ring-hairline",
    iconClass: "text-stone"
  },
  2: {
    label: COMMUNITY_LEVEL_LABELS[2],
    Icon: MapPinned,
    chipClass: "bg-brand-50 text-brand-700 ring-brand-200/70",
    iconClass: "text-brand-600"
  },
  3: {
    label: COMMUNITY_LEVEL_LABELS[3],
    Icon: Users,
    chipClass: "bg-navy-50 text-navy-700 ring-navy-200/70",
    iconClass: "text-navy-600"
  },
  4: {
    label: COMMUNITY_LEVEL_LABELS[4],
    Icon: Compass,
    chipClass: "bg-brand-100 text-brand-800 ring-brand-300/60",
    iconClass: "text-brand-700"
  },
  5: {
    label: COMMUNITY_LEVEL_LABELS[5],
    Icon: ShieldCheck,
    chipClass: "bg-gold-100 text-navy-900 ring-gold-300/70",
    iconClass: "text-gold-700"
  }
};

export function clampCommunityLevel(level: number | null | undefined): number {
  const n = typeof level === "number" && Number.isFinite(level) ? Math.floor(level) : 1;
  return Math.min(COMMUNITY_MAX_LEVEL, Math.max(1, n));
}

export function getCommunityLevelMeta(level: number | null | undefined): CommunityLevelMeta {
  const lv = clampCommunityLevel(level);
  return COMMUNITY_LEVEL_META[lv] ?? COMMUNITY_LEVEL_META[1];
}

export function nextLevelThreshold(level: number | null | undefined): number | null {
  const lv = clampCommunityLevel(level);
  if (lv >= COMMUNITY_MAX_LEVEL) return null;
  return COMMUNITY_LEVEL_THRESHOLDS[lv - 1] ?? null;
}
