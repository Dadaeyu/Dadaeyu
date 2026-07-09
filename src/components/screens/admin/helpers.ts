import type { ReportStatus } from "@/lib/supabase/types";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "대기",
  reviewing: "검토중",
  approved: "반영됨",
  rejected: "반려"
};

export function reportTone(status: ReportStatus): "error" | "warn" | "brand" | "neutral" {
  if (status === "pending") return "error";
  if (status === "reviewing") return "warn";
  if (status === "approved") return "brand";
  return "neutral";
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function formatMonthLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}
