import { createAdminClient } from "./admin";
import type { DbPlaceReport, ReportStatus } from "./types";

export async function fetchAllReports(): Promise<DbPlaceReport[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("place_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbPlaceReport[];
}

export async function updateReportStatus(
  reportId: number,
  status: ReportStatus,
  adminId: string,
  adminNote?: string
): Promise<DbPlaceReport> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("place_reports")
    .update({
      status,
      admin_note: adminNote ?? null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;
  return data as DbPlaceReport;
}
