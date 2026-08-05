import { getAllowedRequestOrigins, isAllowedRequestOrigin } from "../server/origin-policy.ts";

export const CHAT_MAX_BODY_BYTES = 32 * 1024;
export const CHAT_MAX_MESSAGE_LENGTH = 500;
export const CHAT_DEFAULT_RATE_LIMIT_PER_MINUTE = 20;

export type ChatPolicyEnv = Partial<Pick<NodeJS.ProcessEnv, "CHAT_DEBUG" | "NODE_ENV">>;

export type ChatDebuggableResponse = {
  card?: unknown;
  debug?: unknown;
  sources?: unknown[];
};

export function shouldIncludeChatDebug(env: ChatPolicyEnv = process.env) {
  return env.NODE_ENV !== "production" && env.CHAT_DEBUG === "true";
}

export function stripChatDebugForPolicy<T extends ChatDebuggableResponse>(
  response: T,
  env: ChatPolicyEnv = process.env
): T {
  if (shouldIncludeChatDebug(env)) return response;
  const safeResponse = { ...response } as T & ChatDebuggableResponse;
  delete safeResponse.card;
  delete safeResponse.debug;
  if ("sources" in safeResponse) safeResponse.sources = [];
  return safeResponse as T;
}

export function getRequestBodySizeBytes(headers: Headers) {
  const rawLength = headers.get("content-length");
  if (!rawLength) return null;

  const parsed = Number(rawLength);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function isChatBodySizeAllowed(sizeBytes: number | null) {
  return sizeBytes === null || sizeBytes <= CHAT_MAX_BODY_BYTES;
}

export function isChatMessageLengthAllowed(message: string) {
  return Array.from(message).length <= CHAT_MAX_MESSAGE_LENGTH;
}

export function resolveChatRateLimitPerMinute(env: NodeJS.ProcessEnv = process.env) {
  const configured = Number(env.CHAT_RATE_LIMIT_PER_MINUTE);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : CHAT_DEFAULT_RATE_LIMIT_PER_MINUTE;
}

export function getAllowedChatOrigins({
  configuredOrigins,
  requestOrigin
}: {
  configuredOrigins: string | undefined;
  requestOrigin: string;
}) {
  return getAllowedRequestOrigins({ configuredOrigins, requestOrigin });
}

export function isAllowedChatOrigin({
  configuredOrigins,
  origin,
  requestOrigin
}: {
  configuredOrigins: string | undefined;
  origin: string | null;
  requestOrigin: string;
}) {
  return isAllowedRequestOrigin({ configuredOrigins, origin, requestOrigin });
}

export function isValidChatClassifierEnvelope(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.in_scope === "boolean" &&
    typeof record.scope_reason === "string" &&
    record.scope_reason.trim().length > 0 &&
    (record.intent === "recommend_place" ||
      record.intent === "check_accessibility" ||
      record.intent === "ask_info") &&
    Array.isArray(record.accessibility_needs) &&
    record.accessibility_needs.every((item) => typeof item === "string") &&
    typeof record.weather_sensitive === "boolean" &&
    (record.place_name === null || typeof record.place_name === "string") &&
    typeof record.location === "string" &&
    record.location.trim().length > 0 &&
    Array.isArray(record.keywords) &&
    record.keywords.every((item) => typeof item === "string")
  );
}
