"use client";

import { formatPhoneDisplay, isValidPhone, normalizePhone } from "@/lib/auth/phone";

interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputClassName?: string;
}

export default function PhoneField({
  value,
  onChange,
  required = true,
  inputClassName = "border-hairline bg-background text-ink placeholder:text-stone focus:ring-brand-500 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
}: PhoneFieldProps) {
  const digits = normalizePhone(value);
  const valid = digits.length === 0 ? null : isValidPhone(value);
  const message =
    digits.length === 0
      ? null
      : valid
        ? "올바른 휴대폰 번호입니다."
        : "010으로 시작하는 10~11자리 번호를 입력해 주세요.";

  const messageColor = valid ? "text-green-600" : "text-red-600";

  return (
    <div>
      <input
        type="tel"
        inputMode="numeric"
        required={required}
        value={formatPhoneDisplay(value)}
        onChange={(e) => onChange(normalizePhone(e.target.value))}
        placeholder="010-1234-5678"
        aria-invalid={valid === false}
        aria-describedby="phone-status"
        className={inputClassName}
      />
      <p
        id="phone-status"
        aria-live="polite"
        className={`mt-1 min-h-[1rem] text-xs ${message ? messageColor : "invisible"}`}
      >
        {message ?? "\u00a0"}
      </p>
    </div>
  );
}

export function isPhoneReady(value: string): boolean {
  return isValidPhone(value);
}
