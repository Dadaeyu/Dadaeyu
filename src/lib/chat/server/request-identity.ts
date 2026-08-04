import "server-only";

import { createHmac } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export class ChatIdentityError extends Error {
  status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.name = "ChatIdentityError";
    this.status = status;
  }
}

export async function resolveChatClientKey(request: Request) {
  const authenticatedUserId = await getAuthenticatedUserId();
  const source = authenticatedUserId
    ? `user:${authenticatedUserId}`
    : `guest:${getClientAddress(request)}:${request.headers.get("user-agent")?.slice(0, 256) ?? ""}`;
  const secret = resolveHashSecret();

  return createHmac("sha256", secret).update(source).digest("hex");
}

async function getAuthenticatedUserId() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function getClientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function resolveHashSecret() {
  const dedicatedSecret = process.env.CHAT_CLIENT_HASH_SECRET?.trim();
  if (dedicatedSecret) return dedicatedSecret;

  if (process.env.NODE_ENV !== "production") {
    return (
      process.env.SUPABASE_SECRET_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      "dadaeyu-local-chat-client-key"
    );
  }

  throw new ChatIdentityError("Chat client identity is not configured.");
}
