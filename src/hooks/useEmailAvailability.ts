"use client";

import { useEffect, useState } from "react";
import { normalizeEmail } from "@/lib/auth/email";

export type EmailAvailabilityStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const DEBOUNCE_MS = 450;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidFormat(email: string) {
  const n = normalizeEmail(email);
  return n.length > 3 && EMAIL_RE.test(n);
}

export function useEmailAvailability(email: string) {
  const [status, setStatus] = useState<EmailAvailabilityStatus>("idle");

  useEffect(() => {
    const trimmed = normalizeEmail(email);

    if (!trimmed) {
      setStatus("idle");
      return;
    }

    if (!isValidFormat(trimmed)) {
      setStatus("invalid");
      return;
    }

    setStatus("checking");
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed })
        });
        if (!res.ok) {
          if (!cancelled) setStatus("idle");
          return;
        }
        const data = (await res.json()) as { available?: boolean };
        if (!cancelled) {
          setStatus(data.available ? "available" : "taken");
        }
      } catch {
        if (!cancelled) setStatus("idle");
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email]);

  const canSubmit = status === "available";

  return { status, canSubmit };
}
