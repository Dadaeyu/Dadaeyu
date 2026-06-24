"use client";

import { useEffect, useState } from "react";
import {
  isNicknameAvailable,
  NICKNAME_MIN_LENGTH,
  normalizeNickname,
} from "@/lib/supabase/member";

export type NicknameAvailabilityStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

const DEBOUNCE_MS = 450;

export function useNicknameAvailability(
  nickname: string,
  userId: string | undefined,
  initialNickname?: string
) {
  const [status, setStatus] = useState<NicknameAvailabilityStatus>("idle");

  useEffect(() => {
    const trimmed = normalizeNickname(nickname);

    if (trimmed.length < NICKNAME_MIN_LENGTH) {
      setStatus(trimmed.length === 0 ? "idle" : "invalid");
      return;
    }

    if (initialNickname && trimmed === normalizeNickname(initialNickname)) {
      setStatus("available");
      return;
    }

    setStatus("checking");
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const available = await isNicknameAvailable(trimmed, userId);
        if (!cancelled) {
          setStatus(available ? "available" : "taken");
        }
      } catch {
        if (!cancelled) setStatus("idle");
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nickname, userId, initialNickname]);

  const canSubmit = status === "available";

  return { status, canSubmit };
}
