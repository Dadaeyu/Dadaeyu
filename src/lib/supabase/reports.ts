import { createClient } from "./client";
import type { DbPlaceReport, ReportStatus } from "./types";

export async function fetchMyReports(userId: string): Promise<DbPlaceReport[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("place_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbPlaceReport[];
}

export async function createPlaceReport(input: {
  user_id: string;
  place_id?: number | null;
  target_name: string;
  content: string;
}): Promise<DbPlaceReport> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("place_reports")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as DbPlaceReport;
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "대기",
  reviewing: "검토중",
  approved: "반영됨",
  rejected: "반려",
};
