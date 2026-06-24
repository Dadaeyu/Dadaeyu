import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/auth/phone";

export async function isPhoneAvailable(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("members")
    .select("id")
    .eq("phone", normalized)
    .maybeSingle();

  return !data;
}
