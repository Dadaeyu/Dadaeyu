"use client";

import { useEffect, useId } from "react";
import {
  useNicknameAvailability,
  type NicknameAvailabilityStatus
} from "@/hooks/useNicknameAvailability";

const STATUS_MESSAGES: Partial<Record<NicknameAvailabilityStatus, string>> = {
  checking: "확인 중...",
  available: "사용 가능한 닉네임입니다.",
  taken: "이미 사용 중인 닉네임입니다.",
  invalid: "닉네임을 2자 이상 입력해 주세요."
};

interface NicknameFieldProps {
  value: string;
  onChange: (value: string) => void;
  userId?: string;
  initialNickname?: string;
  onCanSubmitChange?: (canSubmit: boolean) => void;
  required?: boolean;
  inputClassName?: string;
}

export default function NicknameField({
  value,
  onChange,
  userId,
  initialNickname,
  onCanSubmitChange,
  required = true,
  inputClassName = "border-hairline bg-background text-ink placeholder:text-stone focus:ring-brand-500 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
}: NicknameFieldProps) {
  const statusId = useId();
  const { status, canSubmit } = useNicknameAvailability(value, userId, initialNickname);

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
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
