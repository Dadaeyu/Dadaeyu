import { NextResponse } from "next/server";
import { fetchAllReports, updateReportStatus } from "@/lib/supabase/admin-reports";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { ReportStatus } from "@/lib/supabase/types";

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const reports = await fetchAllReports();
    return NextResponse.json({ reports });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, status, admin_note } = body as {
    id: number;
    status: ReportStatus;
    admin_note?: string;
  };

  if (!id || !status) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const report = await updateReportStatus(id, status, user.id, admin_note);
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update report" },
      { status: 500 }
    );
  }
}
