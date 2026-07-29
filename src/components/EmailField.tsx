"use client";

import { useEffect, useId } from "react";
import { useEmailAvailability, type EmailAvailabilityStatus } from "@/hooks/useEmailAvailability";

const STATUS_MESSAGES: Partial<Record<EmailAvailabilityStatus, string>> = {
  checking: "확인 중...",
  available: "사용 가능한 이메일입니다.",
  taken: "이미 가입된 이메일입니다.",
  invalid: "올바른 이메일 주소를 입력해 주세요."
};

interface EmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  onCanSubmitChange?: (canSubmit: boolean) => void;
  required?: boolean;
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  inputClassName?: string;
}

export default function EmailField({
  value,
  onChange,
  onCanSubmitChange,
  required = true,
  name = "email",
  autoComplete = "email",
  placeholder = "example@email.com",
  inputClassName = "border-hairline bg-background text-ink placeholder:text-stone focus:ring-brand-500 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
}: EmailFieldProps) {
  const statusId = useId();
  const { status, canSubmit } = useEmailAvailability(value);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  const message = STATUS_MESSAGES[status];
  const messageColor =
    status === "available"
      ? "text-green-600"
      : status === "checking"
        ? "text-gray-500"
        : status === "taken" || status === "invalid"
          ? "text-red-600"
          : "text-gray-500";

  return (
    <div>
      <input
        type="email"
        name={name}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onInput={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        aria-invalid={status === "taken" || status === "invalid"}
        aria-describedby={statusId}
        className={inputClassName}
      />
      <p
        id={statusId}
        aria-live="polite"
        className={`mt-1 min-h-[1rem] text-xs ${message ? messageColor : "invisible"}`}
      >
        {message ?? "\u00a0"}
      </p>
    </div>
  );
}
