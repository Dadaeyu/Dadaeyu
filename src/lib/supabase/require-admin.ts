import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabase
    .from("tb_members")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!member || member.role !== "admin" || member.status !== "active") {
    return null;
  }

  return user;
}
