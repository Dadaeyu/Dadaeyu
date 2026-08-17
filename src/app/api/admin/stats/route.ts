import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const dynamic = "force-dynamic";

async function fetchMonthlySignups(
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ month: string; count: number }[]> {
  const viewRes = await supabase.from("tb_admin_monthly_signups").select("month, count").limit(6);

  if (!viewRes.error && viewRes.data) {
    return viewRes.data.map((row) => ({
      month: row.month as string,
      count: row.count as number
    }));
  }

  const { data: rows, error } = await supabase
    .from("tb_members")
    .select("created_at")
    .order("created_at", { ascending: false });

  if (error || !rows?.length) return [];

  const counts = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(row.created_at as string);
    const key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([month, count]) => ({ month, count }));
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const [
      totalMembersRes,
      todaySignupsRes,
      activeMembersRes,
      suspendedMembersRes,
      pendingReportsRes,
      totalPostsRes
    ] = await Promise.all([
      supabase.from("tb_members").select("id", { count: "exact", head: true }),
      supabase
        .from("tb_members")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayIso),
      supabase
        .from("tb_members")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("tb_members")
        .select("id", { count: "exact", head: true })
        .eq("status", "suspended"),
      supabase
        .from("tb_place_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("tb_community_posts").select("id", { count: "exact", head: true })
    ]);

    const monthlySignups = await fetchMonthlySignups(supabase);

    const errors = [
      totalMembersRes.error,
      todaySignupsRes.error,
      activeMembersRes.error,
      suspendedMembersRes.error,
      pendingReportsRes.error,
      totalPostsRes.error
    ].filter(Boolean);

    if (errors.length > 0) {
      throw errors[0];
    }

    return NextResponse.json({
      totalMembers: totalMembersRes.count ?? 0,
      todaySignups: todaySignupsRes.count ?? 0,
      activeMembers: activeMembersRes.count ?? 0,
      suspendedMembers: suspendedMembersRes.count ?? 0,
      pendingReports: pendingReportsRes.count ?? 0,
      totalPosts: totalPostsRes.count ?? 0,
      monthlySignups
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
