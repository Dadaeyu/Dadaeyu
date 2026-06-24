"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import OAuthButtons, { AuthDivider, AuthLinks } from "@/components/AuthForms";
import NicknameField from "@/components/NicknameField";
import PhoneField, { isPhoneReady } from "@/components/PhoneField";
import {
  getNicknameSubmitError,
  isNicknameAvailable,
} from "@/lib/supabase/member";
import { normalizePhone } from "@/lib/auth/phone";
import {
  getPasswordValidationError,
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES_HINT,
} from "@/lib/auth/password";
import { mapAuthError } from "@/lib/auth/errors";
import {
  getSafeNextPath,
  resolvePostLoginPath,
  signInWithEmail,
  signInWithOAuth,
  type OAuthProvider,
} from "@/lib/auth/actions";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"), "/mypage");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nicknameCanSubmit, setNicknameCanSubmit] = useState(false);

  const passwordValid = isPasswordValid(password);
  const passwordsMatch = password === passwordConfirm && passwordValid;
  const passwordError = password ? getPasswordValidationError(password) : null;
  const phoneReady = isPhoneReady(phone);
  const canSubmit = nicknameCanSubmit && passwordsMatch && phoneReady && !loading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement | null;
    const submittedEmail = (emailInput?.value ?? email).trim();

    if (!submittedEmail) {
      setMessage("이메일을 입력해 주세요.");
      return;
    }
    if (submittedEmail !== email) {
      setEmail(submittedEmail);
    }

    if (!passwordValid) {
      setMessage(getPasswordValidationError(password) ?? "비밀번호 규칙을 확인해 주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!phoneReady) {
      setMessage("올바른 휴대폰 번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setSuccess(null);

    try {
      const trimmedNick = nickname.trim();
      const available = await isNicknameAvailable(trimmedNick);
      const nickError = getNicknameSubmitError(trimmedNick, available);
      if (nickError) {
        setMessage(nickError);
        return;
      }

      const phoneRes = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone) }),
      });
      if (!phoneRes.ok) {
        setMessage("휴대폰 번호 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const phoneData = await phoneRes.json();
      if (!phoneData.available) {
        setMessage("이미 가입된 휴대폰 번호입니다.");
        return;
      }

      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: submittedEmail,
          password,
          nickname: trimmedNick,
          phone: normalizePhone(phone),
        }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        setMessage(signupData.error ?? "가입에 실패했습니다.");
        return;
      }

      const { error: loginError } = await signInWithEmail(submittedEmail, password);
      if (loginError) throw loginError;

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
    <AuthLayout title="회원가입" subtitle="이메일로 가입하고 맞춤 여행을 시작해 보세요">
      <OAuthButtons disabled={loading} onOAuth={handleOAuth} />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">이메일</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onInput={(e) => setEmail(e.currentTarget.value)}
            placeholder="example@email.com"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">비밀번호</label>
          <p className="text-xs text-gray-400 mb-1">{PASSWORD_RULES_HINT}</p>
          <input
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {passwordError && (
            <p className="text-xs text-red-600 mt-1">{passwordError}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">비밀번호 확인</label>
          <input
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 다시 입력"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {passwordConfirm && password !== passwordConfirm && (
            <p className="text-xs text-red-600 mt-1">비밀번호가 일치하지 않습니다.</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">닉네임</label>
          <NicknameField
            value={nickname}
            onChange={setNickname}
            onCanSubmitChange={setNicknameCanSubmit}
            inputClassName="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">
            휴대폰 <span className="text-gray-400 font-normal">(이메일 찾기용)</span>
          </label>
          <PhoneField
            value={phone}
            onChange={setPhone}
            inputClassName="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {loading ? "가입 중..." : "가입하기"}
        </button>
      </form>

      {message && (
        <p className="text-sm text-center text-red-600" role="alert">
          {message}
        </p>
      )}
      {success && (
        <p className="text-sm text-center text-green-600" role="status">
          {success}
        </p>
      )}

      <AuthLinks variant="signup" />
    </AuthLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <SignupForm />
    </Suspense>
  );
}
