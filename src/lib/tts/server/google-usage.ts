import "server-only";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { TextToSpeechProviderError } from "@/lib/tts/server/provider";
import { getGoogleTextToSpeechBillingPeriods } from "@/lib/tts/usage-period";

const HARD_MONTHLY_USAGE_LIMIT = 800_000;
const HARD_DAILY_CLIENT_USAGE_LIMIT = 50_000;
const localMonthlyUsage = new Map<string, number>();
const localClientUsage = new Map<string, number>();
const localRefundedReservationTokens = new Set<string>();

export type GoogleTextToSpeechUsageReservation = {
  billingPeriod: string;
  clientKey: string;
  clientPeriod: string;
  source: "local" | "supabase";
  token: string;
  usage: number;
};

export async function reserveGoogleTextToSpeechUsage(
  text: string,
  clientKey: string
): Promise<GoogleTextToSpeechUsageReservation | null> {
  const usage = Array.from(text).length;
  const monthlyLimit = resolveMonthlyUsageLimit();
  const clientLimit = resolveDailyClientUsageLimit();
  const reservationToken = randomUUID();
  const { billingPeriod, clientPeriod } = getGoogleTextToSpeechBillingPeriods();

  if (usage <= 0) return null;
  if (usage > monthlyLimit) {
    throw new TextToSpeechProviderError("Google TTS monthly usage limit has been reached.", 402);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("reserve_tts_usage", {
      p_billing_period: billingPeriod,
      p_client_key: clientKey,
      p_client_limit: clientLimit,
      p_client_period: clientPeriod,
      p_limit: monthlyLimit,
      p_provider: "google",
      p_reservation_token: reservationToken,
      p_usage: usage
    });

    if (error) {
      if (error.code === "PGRST202" && process.env.NODE_ENV !== "production") {
        return reserveLocalUsage({
          billingPeriod,
          clientKey,
          clientLimit,
          clientPeriod,
          monthlyLimit,
          reservationToken,
          usage
        });
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

    return {
      billingPeriod,
      clientKey,
      clientPeriod,
      source: "supabase",
      token: reservation.reservation_token ?? reservationToken,
      usage
    };
  } catch (error) {
    if (error instanceof TextToSpeechProviderError) throw error;
    throw new TextToSpeechProviderError("Google TTS usage tracking is unavailable.", 503);
  }
}

export async function refundGoogleTextToSpeechUsage(
  reservation: GoogleTextToSpeechUsageReservation | null
) {
  if (!reservation) return;

  if (reservation.source === "local") {
    refundLocalUsage(reservation);
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("refund_tts_usage", {
    p_reservation_token: reservation.token
  });

  if (error) {
    throw error;
  }
}

export async function finalizeGoogleTextToSpeechUsage(
  reservation: GoogleTextToSpeechUsageReservation | null
) {
  if (!reservation || reservation.source === "local") return;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("finalize_tts_usage", {
    p_reservation_token: reservation.token
  });

  if (error) {
    throw error;
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

function reserveLocalUsage({
  billingPeriod,
  clientKey,
  clientLimit,
  clientPeriod,
  monthlyLimit,
  reservationToken,
  usage
}: {
  billingPeriod: string;
  clientKey: string;
  clientLimit: number;
  clientPeriod: string;
  monthlyLimit: number;
  reservationToken: string;
  usage: number;
}): GoogleTextToSpeechUsageReservation {
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
  return {
    billingPeriod,
    clientKey,
    clientPeriod,
    source: "local",
    token: reservationToken,
    usage
  };
}

function refundLocalUsage({
  billingPeriod,
  clientKey,
  clientPeriod,
  token,
  usage
}: GoogleTextToSpeechUsageReservation) {
  if (localRefundedReservationTokens.has(token)) return;

  const monthlyKey = `google:${billingPeriod}`;
  const dailyClientKey = `google:${clientPeriod}:${clientKey}`;
  const usedByClient = localClientUsage.get(dailyClientKey) ?? 0;
  const usedThisMonth = localMonthlyUsage.get(monthlyKey) ?? 0;

  localClientUsage.set(dailyClientKey, Math.max(usedByClient - usage, 0));
  localMonthlyUsage.set(monthlyKey, Math.max(usedThisMonth - usage, 0));
  localRefundedReservationTokens.add(token);
}
