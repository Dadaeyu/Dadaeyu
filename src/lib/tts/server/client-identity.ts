import "server-only";

import { createHmac } from "node:crypto";
import { isAllowedRequestOrigin } from "@/lib/server/origin-policy";
import { createClient } from "@/lib/supabase/server";
import { TextToSpeechProviderError } from "@/lib/tts/server/provider";

export async function resolveTextToSpeechClientKey(request: Request) {
  const authenticatedUserId = await getAuthenticatedUserId();
  const source = authenticatedUserId
    ? `user:${authenticatedUserId}`
    : `guest:${getClientAddress(request)}:${request.headers.get("user-agent")?.slice(0, 256) ?? ""}`;
  const secret = resolveHashSecret();

  return createHmac("sha256", secret).update(source).digest("hex");
}

export function isAllowedTextToSpeechOrigin(request: Request) {
  return isAllowedRequestOrigin({
    configuredOrigins: process.env.TTS_ALLOWED_ORIGINS,
    origin: request.headers.get("origin"),
    requestOrigin: new URL(request.url).origin
  });
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
  const secret =
    process.env.TTS_CLIENT_HASH_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "dadaeyu-local-tts-client-key";

  throw new TextToSpeechProviderError("TTS client identity is not configured.", 503);
}
