import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getChatUsagePeriods } from "@/lib/chat/usage-period";

const HARD_MONTHLY_GLOBAL_REQUEST_LIMIT = 10_000;
const HARD_DAILY_CLIENT_REQUEST_LIMIT = 100;
const localMonthlyUsage = new Map<string, number>();
const localClientUsage = new Map<string, number>();

export class ChatUsageError extends Error {
  status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.name = "ChatUsageError";
    this.status = status;
  }
}

export async function reserveChatUsage(clientKey: string) {
  const globalLimit = resolveMonthlyGlobalRequestLimit();
  const clientLimit = resolveDailyClientRequestLimit();
  const { clientPeriod, globalPeriod } = getChatUsagePeriods();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("reserve_chat_usage", {
      p_client_key: clientKey,
      p_client_limit: clientLimit,
      p_client_period: clientPeriod,
      p_global_limit: globalLimit,
      p_global_period: globalPeriod,
      p_usage: 1
    });

    if (error) {
      if (error.code === "PGRST202" && isLocalFallbackEnabled()) {
        reserveLocalUsage({ clientKey, clientLimit, globalLimit });
        return;
      }

      if (error.code === "PGRST202") {
        throw new ChatUsageError("Chat usage tracking is not installed.", 503);
      }
      throw error;
    }

    const reservation = Array.isArray(data) ? data[0] : data;
    if (!reservation?.allowed) {
      const status = reservation?.reason === "client_limit" ? 429 : 402;
      throw new ChatUsageError(
        status === 429
          ? "Chat daily client usage limit has been reached."
          : "Chat monthly global usage limit has been reached.",
        status
      );
    }
  } catch (error) {
    if (error instanceof ChatUsageError) throw error;
    if (isLocalFallbackEnabled()) {
      reserveLocalUsage({ clientKey, clientLimit, globalLimit });
      return;
    }
    throw new ChatUsageError("Chat usage tracking is unavailable.", 503);
  }
}

function resolveMonthlyGlobalRequestLimit() {
  const configured = Number(process.env.CHAT_MONTHLY_GLOBAL_REQUEST_LIMIT);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), HARD_MONTHLY_GLOBAL_REQUEST_LIMIT)
    : HARD_MONTHLY_GLOBAL_REQUEST_LIMIT;
}

function resolveDailyClientRequestLimit() {
  const configured = Number(process.env.CHAT_DAILY_CLIENT_REQUEST_LIMIT);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), HARD_DAILY_CLIENT_REQUEST_LIMIT)
    : HARD_DAILY_CLIENT_REQUEST_LIMIT;
}

function isLocalFallbackEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.CHAT_USAGE_LOCAL_FALLBACK === "true";
}

function reserveLocalUsage({
  clientKey,
  clientLimit,
  globalLimit
}: {
  clientKey: string;
  clientLimit: number;
  globalLimit: number;
}) {
  const { clientPeriod, globalPeriod } = getChatUsagePeriods();
  const monthlyKey = `chat:${globalPeriod}`;
  const dailyClientKey = `chat:${clientPeriod}:${clientKey}`;
  const usedByClient = localClientUsage.get(dailyClientKey) ?? 0;
  const usedThisMonth = localMonthlyUsage.get(monthlyKey) ?? 0;

  if (usedByClient + 1 > clientLimit) {
    throw new ChatUsageError("Chat daily client usage limit has been reached.", 429);
  }
  if (usedThisMonth + 1 > globalLimit) {
    throw new ChatUsageError("Chat monthly global usage limit has been reached.", 402);
  }

  localClientUsage.set(dailyClientKey, usedByClient + 1);
  localMonthlyUsage.set(monthlyKey, usedThisMonth + 1);
}
