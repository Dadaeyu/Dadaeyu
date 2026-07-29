import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/auth/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length > 3 && EMAIL_RE.test(normalized);
}

/** Auth(users)에 동일 이메일이 없으면 true */
export async function isEmailAvailable(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!isValidEmailFormat(normalized)) return false;

  const admin = createAdminClient();
  const perPage = 200;
  let page = 1;

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users ?? [];
    if (users.some((u) => normalizeEmail(u.email ?? "") === normalized)) {
      return false;
    }
    if (users.length < perPage) break;
    page += 1;
  }

  return true;
}
