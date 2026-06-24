"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import { updatePassword } from "@/lib/auth/actions";
import { mapAuthError } from "@/lib/auth/errors";
import {
  getPasswordValidationError,
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES_HINT,
} from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "invalid">("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const establishSession = async () => {
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) {
          setSessionState(error ? "invalid" : "ready");
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        setSessionState(session ? "ready" : "invalid");
      }
    };

    establishSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionState("ready");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const passwordValid = isPasswordValid(password);
  const passwordsMatch = password === passwordConfirm && passwordValid;
  const passwordError = password ? getPasswordValidationError(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      setMessage(getPasswordValidationError(password) ?? "비밀번호 규칙을 확인해 주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await updatePassword(password);
      if (error) throw error;
      await supabase.auth.signOut();
      router.push("/login?notice=password_reset");
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

  if (sessionState === "checking") {
    return (
      <AuthLayout title="비밀번호 재설정" subtitle="링크를 확인하는 중...">
        <p className="text-sm text-center text-gray-500">잠시만 기다려 주세요.</p>
      </AuthLayout>
    );
  }

  if (sessionState === "invalid") {
    return (
      <AuthLayout title="비밀번호 재설정" subtitle="링크를 확인할 수 없습니다">
        <p className="text-sm text-center text-gray-500">
          유효하지 않거나 만료된 링크입니다.{" "}
          <Link href="/forgot-password" className="text-brand-600 hover:underline">
            다시 요청하기
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="새 비밀번호 설정" subtitle="새 비밀번호를 입력해 주세요">
      <p className="text-xs text-gray-500 -mt-2 mb-1">{PASSWORD_RULES_HINT}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="새 비밀번호"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {passwordError && (
          <p className="text-xs text-red-600 -mt-1">{passwordError}</p>
        )}
        <input
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="새 비밀번호 확인"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {passwordConfirm && password !== passwordConfirm && (
          <p className="text-xs text-red-600 -mt-1">비밀번호가 일치하지 않습니다.</p>
        )}
        <button
          type="submit"
          disabled={loading || !passwordsMatch}
          className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "변경 중..." : "비밀번호 변경"}
        </button>
        {message && (
          <p className="text-sm text-center text-red-600" role="alert">
            {message}
          </p>
        )}
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
