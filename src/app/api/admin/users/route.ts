import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { UserRole, UserStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type AdminUserRow = {
  id: string;
  nickname: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  community_level: number;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
};

async function buildEmailMap(supabase: ReturnType<typeof createAdminClient>) {
  const emailMap = new Map<string, string>();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const u of data.users) {
      if (u.id) emailMap.set(u.id, u.email ?? "");
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return emailMap;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const roleFilter = searchParams.get("role") as UserRole | "all" | null;

  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("tb_members")
      .select(
        "id, nickname, role, status, community_level, suspended_reason, suspended_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (roleFilter && roleFilter !== "all") {
      query = query.eq("role", roleFilter);
    }

    const { data: members, error } = await query;
    if (error) throw error;

    const emailMap = await buildEmailMap(supabase);

    let users: AdminUserRow[] = (members ?? []).map((m) => ({
      id: m.id,
      nickname: m.nickname,
      email: emailMap.get(m.id) ?? null,
      role: m.role as UserRole,
      status: m.status as UserStatus,
      community_level: m.community_level,
      suspended_reason: m.suspended_reason ?? null,
      suspended_at: m.suspended_at ?? null,
      created_at: m.created_at
    }));

    if (q) {
      users = users.filter(
        (u) => u.nickname.toLowerCase().includes(q) || (u.email?.toLowerCase().includes(q) ?? false)
      );
    }

    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, role, status, suspended_reason } = body as {
    id: string;
    role?: UserRole;
    status?: UserStatus;
    suspended_reason?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (id === admin.id && role === "user") {
    return NextResponse.json(
      { error: "자신의 관리자 권한은 해제할 수 없습니다." },
      { status: 400 }
    );
  }

  if (id === admin.id && status === "suspended") {
    return NextResponse.json({ error: "자신의 계정은 정지할 수 없습니다." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const updates: Record<string, unknown> = {};

    if (role !== undefined) {
      if (role !== "user" && role !== "admin") {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updates.role = role;
    }

    if (status !== undefined) {
      if (status !== "active" && status !== "suspended") {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = status;

      if (status === "suspended") {
        updates.suspended_reason = suspended_reason?.trim() || "관리자에 의한 활동 정지";
        updates.suspended_at = new Date().toISOString();
        updates.suspended_by = admin.id;
      } else {
        updates.suspended_reason = null;
        updates.suspended_at = null;
        updates.suspended_by = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tb_members")
      .update(updates)
      .eq("id", id)
      .select(
        "id, nickname, role, status, community_level, suspended_reason, suspended_at, created_at"
      )
      .single();

    if (error) throw error;

    const { data: authUser } = await supabase.auth.admin.getUserById(id);

    return NextResponse.json({
      user: {
        ...data,
        email: authUser.user?.email ?? null
      }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update user" },
      { status: 500 }
    );
  }
}
