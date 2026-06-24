"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import OAuthButtons, { AuthDivider, AuthLinks } from "@/components/AuthForms";
import {
  getSafeNextPath,
  resolvePostLoginPath,
  signInWithEmail,
  signInWithOAuth,
  type OAuthProvider,
} from "@/lib/auth/actions";
import { mapAuthError } from "@/lib/auth/errors";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"), "/");
  const authError = searchParams.get("error");
  const authNotice = searchParams.get("notice");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    authError === "account_suspended"
      ? "정지된 계정입니다. 관리자에게 문의해 주세요."
      : authError === "naver_config"
        ? "네이버 로그인 설정이 없습니다. .env.local에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET을 추가해 주세요."
        : authError === "email_not_provided"
          ? "네이버에서 이메일 정보를 받지 못했습니다. 네이버 개발자센터에서 이메일 제공 동의 항목을 확인해 주세요."
          : authError === "naver_provider_id"
            ? "네이버 로그인 연동 형식 오류입니다. 페이지를 새로고침한 뒤 다시 시도해 주세요."
            : authError === "auth_callback_failed"
              ? "로그인에 실패했습니다. 다시 시도해 주세요."
              : null
  );
  const [notice, setNotice] = useState<string | null>(
    authNotice === "password_reset"
      ? "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요."
      : null
  );

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement | null;
    const submittedEmail = (emailInput?.value ?? email).trim();

    setLoading(true);
    setMessage(null);
    setNotice(null);

    try {
      const { error } = await signInWithEmail(submittedEmail, password);
      if (error) throw error;
      const dest = await resolvePostLoginPath(next);
      router.push(dest);
      router.refresh();
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

  const handleOAuth = async (provider: OAuthProvider) => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await signInWithOAuth(provider, next);
      if (error) throw error;
    } catch (err) {
      setMessage(
        mapAuthError(
          err && typeof err === "object" ? (err as { message?: string; code?: string }) : {}
        )
      );
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="로그인" subtitle="다대유와 함께 무장애 여행을 시작해 보세요">
      <OAuthButtons disabled={loading} onOAuth={handleOAuth} />
      <AuthDivider />

      <form onSubmit={handleEmailSubmit} className="space-y-3">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onInput={(e) => setEmail(e.currentTarget.value)}
          placeholder="이메일"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {loading ? "처리 중..." : "로그인"}
        </button>
      </form>

      {message && (
        <p className="text-sm text-center text-red-600" role="alert">
          {message}
        </p>
      )}
      {notice && (
        <p className="text-sm text-center text-green-600" role="status">
          {notice}
        </p>
      )}

      <AuthLinks variant="login" />
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
