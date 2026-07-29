import { clampCommunityLevel, getCommunityLevelMeta } from "@/lib/community/levels";

type Props = {
  level: number | null | undefined;
  /** sm: 목록/댓글, md: 상세/마이페이지 */
  size?: "sm" | "md";
  /** 명칭 표시 (기본 true). false면 아이콘+Lv만 */
  showLabel?: boolean;
  /** onDark: 마이페이지 그라데이션 카드용 */
  tone?: "default" | "onDark";
  className?: string;
};

export function CommunityLevelBadge({
  level,
  size = "sm",
  showLabel = true,
  tone = "default",
  className = ""
}: Props) {
  const lv = clampCommunityLevel(level);
  const meta = getCommunityLevelMeta(lv);
  const { Icon } = meta;
  const isMd = size === "md";
  const onDark = tone === "onDark";

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full ring-1 ring-inset ${
        onDark ? "bg-white/15 text-white ring-white/25" : meta.chipClass
      } ${isMd ? "px-2.5 py-1 text-xs font-semibold" : "px-1.5 py-0.5 text-[11px] font-semibold"} ${className}`}
      title={`Lv.${lv} ${meta.label}`}
    >
      <Icon
        className={`${isMd ? "h-3.5 w-3.5" : "h-3 w-3"} shrink-0 ${onDark ? "text-white" : meta.iconClass}`}
        aria-hidden
      />
      <span className="tabular-nums">Lv.{lv}</span>
      {showLabel ? <span className="truncate">{meta.label}</span> : null}
    </span>
  );
}
