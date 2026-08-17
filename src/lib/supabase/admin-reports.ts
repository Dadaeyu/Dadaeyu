import { createAdminClient } from "./admin";
import type { DbPlaceReport, ReportStatus } from "./types";
import { awardPoints, POINT_REASON } from "@/lib/community/points";

export async function fetchAllReports(): Promise<DbPlaceReport[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tb_place_reports")
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
    .from("tb_place_reports")
    .update({
      status,
      admin_note: adminNote ?? null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;

  const report = data as DbPlaceReport;

  // 원격 트리거가 아직 30P면 20P 보정해 총 50P (schema-community-points.sql 적용 후엔 불필요)
  if (status === "approved" && report.points_awarded === 30 && report.user_id) {
    try {
      await awardPoints({
        userId: report.user_id,
        reason: POINT_REASON.REPORT_APPROVED,
        amount: 20,
        refType: "report_topup",
        refId: report.id
      });
      const { data: patched } = await supabase
        .from("tb_place_reports")
        .update({ points_awarded: 50 })
        .eq("id", reportId)
        .select()
        .single();
      if (patched) return patched as DbPlaceReport;
    } catch {
      // ignore top-up failure
    }
  }

  return report;
}
