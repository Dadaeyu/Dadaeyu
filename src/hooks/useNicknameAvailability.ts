"use client";

import { useEffect, useState } from "react";
import { isNicknameAvailable, NICKNAME_MIN_LENGTH, normalizeNickname } from "@/lib/supabase/member";

export type NicknameAvailabilityStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const DEBOUNCE_MS = 450;

export function useNicknameAvailability(
  nickname: string,
  userId: string | undefined,
  initialNickname?: string
) {
  const trimmed = normalizeNickname(nickname);
  const requestKey = `${trimmed}:${userId ?? ""}:${initialNickname ?? ""}`;
  const [result, setResult] = useState<{
    key: string;
    status: "available" | "taken" | "idle";
  } | null>(null);

  useEffect(() => {
    if (trimmed.length < NICKNAME_MIN_LENGTH) return;
    if (initialNickname && trimmed === normalizeNickname(initialNickname)) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const available = await isNicknameAvailable(trimmed, userId);
        if (!cancelled) {
          setResult({ key: requestKey, status: available ? "available" : "taken" });
        }
      } catch {
        if (!cancelled) setResult({ key: requestKey, status: "idle" });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [initialNickname, requestKey, trimmed, userId]);

  const status: NicknameAvailabilityStatus =
    trimmed.length < NICKNAME_MIN_LENGTH
      ? trimmed.length === 0
        ? "idle"
        : "invalid"
      : initialNickname && trimmed === normalizeNickname(initialNickname)
        ? "available"
        : result?.key === requestKey
          ? result.status
          : "checking";

  const canSubmit = status === "available";

  return { status, canSubmit };
}
