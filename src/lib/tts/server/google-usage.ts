import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { TextToSpeechProviderError } from "@/lib/tts/server/provider";

const HARD_MONTHLY_USAGE_LIMIT = 800_000;
const localUsage = new Map<string, number>();

export async function reserveGoogleTextToSpeechUsage(text: string) {
  const usage = Array.from(text).length;
  const limit = resolveMonthlyUsageLimit();

  if (usage <= 0) return;
  if (usage > limit) {
    throw new TextToSpeechProviderError("Google TTS monthly usage limit has been reached.", 402);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("reserve_tts_usage", {
      p_billing_period: getBillingPeriod(),
      p_limit: limit,
      p_provider: "google",
      p_usage: usage
    });

    if (error) {
      if (error.code === "PGRST202") {
        if (process.env.NODE_ENV !== "production") {
          reserveLocalUsage(usage, limit);
          return;
        }

        throw new TextToSpeechProviderError("Google TTS usage tracking is not installed.", 503);
      }
      throw error;
    }

    const reservation = Array.isArray(data) ? data[0] : data;
    if (!reservation?.allowed) {
      throw new TextToSpeechProviderError("Google TTS monthly usage limit has been reached.", 402);
    }
  } catch (error) {
    if (error instanceof TextToSpeechProviderError) {
      throw error;
    }

    throw new TextToSpeechProviderError("Google TTS usage tracking is unavailable.", 503);
  }
}

function resolveMonthlyUsageLimit() {
  const configured = Number(process.env.GOOGLE_TTS_MONTHLY_USAGE_LIMIT);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), HARD_MONTHLY_USAGE_LIMIT)
    : HARD_MONTHLY_USAGE_LIMIT;
}

function getBillingPeriod() {
  return new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric"
  }).format(new Date());
}

function reserveLocalUsage(usage: number, limit: number) {
  const billingPeriod = getBillingPeriod();
  const used = localUsage.get(billingPeriod) ?? 0;

  if (used + usage > limit) {
    throw new TextToSpeechProviderError("Google TTS monthly usage limit has been reached.", 402);
  }

  localUsage.set(billingPeriod, used + usage);
}
