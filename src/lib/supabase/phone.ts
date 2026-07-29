import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/auth/phone";

/** 활성(active) 회원만 휴대폰 점유로 본다 — 탈퇴·정지 계정 번호는 재사용 가능 */
export async function isPhoneAvailable(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("tb_members")
    .select("id")
    .eq("phone", normalized)
    .eq("status", "active")
    .maybeSingle();

  return !data;
}
