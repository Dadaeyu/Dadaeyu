import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { TextToSpeechProviderError } from "@/lib/tts/server/provider";
import { getGoogleTextToSpeechBillingPeriods } from "@/lib/tts/usage-period";

const HARD_MONTHLY_USAGE_LIMIT = 800_000;
const HARD_DAILY_CLIENT_USAGE_LIMIT = 50_000;
const localMonthlyUsage = new Map<string, number>();
const localClientUsage = new Map<string, number>();

export async function reserveGoogleTextToSpeechUsage(text: string, clientKey: string) {
  const usage = Array.from(text).length;
  const monthlyLimit = resolveMonthlyUsageLimit();
  const clientLimit = resolveDailyClientUsageLimit();

  if (usage <= 0) return;
  if (usage > monthlyLimit) {
    throw new TextToSpeechProviderError("Google TTS monthly usage limit has been reached.", 402);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("reserve_tts_usage", {
      p_billing_period: getBillingPeriod(),
      p_client_key: clientKey,
      p_client_limit: clientLimit,
      p_client_period: getClientPeriod(),
      p_limit: monthlyLimit,
      p_provider: "google",
      p_usage: usage
    });

    if (error) {
      if (error.code === "PGRST202" && process.env.NODE_ENV !== "production") {
        reserveLocalUsage({ clientKey, clientLimit, monthlyLimit, usage });
        return;
      }

      if (error.code === "PGRST202") {
        throw new TextToSpeechProviderError("Google TTS usage tracking is not installed.", 503);
      }
      throw error;
    }

    const reservation = Array.isArray(data) ? data[0] : data;
    if (!reservation?.allowed) {
      const status = reservation?.reason === "client_limit" ? 429 : 402;
      throw new TextToSpeechProviderError(
        status === 429
          ? "Google TTS client usage limit has been reached."
          : "Google TTS monthly usage limit has been reached.",
        status
      );
    }
  } catch (error) {
    if (error instanceof TextToSpeechProviderError) throw error;
    throw new TextToSpeechProviderError("Google TTS usage tracking is unavailable.", 503);
  }
}

function resolveMonthlyUsageLimit() {
  const configured = Number(process.env.GOOGLE_TTS_MONTHLY_USAGE_LIMIT);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), HARD_MONTHLY_USAGE_LIMIT)
    : HARD_MONTHLY_USAGE_LIMIT;
}

function resolveDailyClientUsageLimit() {
  const configured = Number(process.env.TTS_DAILY_USAGE_LIMIT_PER_CLIENT);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), HARD_DAILY_CLIENT_USAGE_LIMIT)
    : HARD_DAILY_CLIENT_USAGE_LIMIT;
}

function getBillingPeriod() {
  return getGoogleTextToSpeechBillingPeriods().billingPeriod;
}

function getClientPeriod() {
  return getGoogleTextToSpeechBillingPeriods().clientPeriod;
}

function reserveLocalUsage({
  clientKey,
  clientLimit,
  monthlyLimit,
  usage
}: {
  clientKey: string;
  clientLimit: number;
  monthlyLimit: number;
  usage: number;
}) {
  const { billingPeriod, clientPeriod } = getGoogleTextToSpeechBillingPeriods();
  const monthlyKey = `google:${billingPeriod}`;
  const dailyClientKey = `google:${clientPeriod}:${clientKey}`;
  const usedByClient = localClientUsage.get(dailyClientKey) ?? 0;
  const usedThisMonth = localMonthlyUsage.get(monthlyKey) ?? 0;

  if (usedByClient + usage > clientLimit) {
    throw new TextToSpeechProviderError("Google TTS client usage limit has been reached.", 429);
  }
  if (usedThisMonth + usage > monthlyLimit) {
    throw new TextToSpeechProviderError("Google TTS monthly usage limit has been reached.", 402);
  }

  localClientUsage.set(dailyClientKey, usedByClient + usage);
  localMonthlyUsage.set(monthlyKey, usedThisMonth + usage);
}
