import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function establishSessionForEmail(
  email: string,
  metadata?: {
    nickname?: string;
    name?: string;
    avatar_url?: string;
    naver_id?: string;
  }
): Promise<User> {
  const admin = createAdminClient();

  await admin.auth.admin
    .createUser({
      email,
      email_confirm: true,
      user_metadata: {
        nickname: metadata?.nickname,
        name: metadata?.name,
        avatar_url: metadata?.avatar_url,
        naver_id: metadata?.naver_id,
      },
      app_metadata: {
        provider: "naver",
        providers: ["naver"],
      },
    })
    .catch(() => null);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    throw new Error(linkError?.message ?? "session_link_failed");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "email",
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "session_verify_failed");
  }

  return data.user;
}
