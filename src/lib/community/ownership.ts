import type { createClient } from "@/lib/supabase/server";

/** 로그인한 사용자가 관리자인지 확인 (본인 글/댓글이 아니어도 수정·삭제 가능하게 하는 데 사용) */
export async function isAdminMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("tb_members")
    .select("role, status")
    .eq("id", userId)
    .maybeSingle();
  return !!data && data.role === "admin" && data.status === "active";
}
