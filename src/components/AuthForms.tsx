"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { OAuthProvider } from "@/lib/auth/actions";

const OAUTH_BUTTONS: { provider: OAuthProvider; label: string; className: string; icon: ReactNode }[] = [
  {
    provider: "kakao",
    label: "카카오",
    className: "bg-[#FEE500] hover:bg-[#f5dc00] text-[#3C1E1E]",
    icon: <span className="text-lg">💬</span>,
  },
  {
    provider: "naver",
    label: "네이버",
    className: "bg-[#03C75A] hover:bg-[#02b351] text-white",
    icon: <span className="text-lg font-bold">N</span>,
  },
  {
    provider: "google",
    label: "구글",
    className: "border border-gray-200 hover:bg-gray-50 text-gray-700",
    icon: <span className="text-lg">G</span>,
  },
];

interface OAuthButtonsProps {
  disabled?: boolean;
  onOAuth: (provider: OAuthProvider) => void;
}

export default function OAuthButtons({ disabled, onOAuth }: OAuthButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OAUTH_BUTTONS.map(({ provider, label, className, icon }) => (
        <button
          key={provider}
          type="button"
          disabled={disabled}
          onClick={() => onOAuth(provider)}
          className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${className}`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400">또는 이메일</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export function AuthLinks({ variant }: { variant: "login" | "signup" }) {
  if (variant === "login") {
    return (
      <div className="flex flex-col gap-2 text-center text-sm text-gray-500">
        <p>
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-brand-600 font-semibold hover:underline">
            회원가입
          </Link>
        </p>
        <p className="flex justify-center gap-3 text-xs">
          <Link href="/forgot-password" className="hover:text-brand-600">
            비밀번호 찾기
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/find-email" className="hover:text-brand-600">
            이메일 찾기
          </Link>
        </p>
      </div>
    );
  }

  return (
    <p className="text-center text-sm text-gray-500">
      이미 계정이 있으신가요?{" "}
      <Link href="/login" className="text-brand-600 font-semibold hover:underline">
        로그인
      </Link>
    </p>
  );
}
