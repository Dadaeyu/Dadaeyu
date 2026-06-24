"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import { resetPasswordForEmail } from "@/lib/auth/actions";
import { mapAuthError } from "@/lib/auth/errors";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement | null;
    const submittedEmail = (emailInput?.value ?? email).trim();

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await resetPasswordForEmail(submittedEmail);
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setMessage(
        mapAuthError(
          err && typeof err === "object" ? (err as { message?: string; code?: string }) : {}
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="비밀번호 찾기"
      subtitle="가입 시 사용한 이메일로 재설정 링크를 보내 드립니다"
      footer={
        <p className="text-center mt-6 text-sm text-gray-500">
          <Link href="/login" className="text-brand-600 font-semibold hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      }
    >
      {success ? (
        <p className="text-sm text-center text-gray-700" role="status">
          등록된 이메일이면 비밀번호 재설정 링크를 보냈습니다. 메일함을 확인해 주세요.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onInput={(e) => setEmail(e.currentTarget.value)}
            placeholder="가입 이메일"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "전송 중..." : "재설정 링크 보내기"}
          </button>
          {message && (
            <p className="text-sm text-center text-red-600" role="alert">
              {message}
            </p>
          )}
        </form>
      )}
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
