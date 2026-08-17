"use client";

import { Suspense, useEffect, useState } from "react";

import Link from "next/link";

import { useSearchParams } from "next/navigation";

import AuthLayout from "@/components/AuthLayout";

import { resendSignupConfirmation } from "@/lib/auth/actions";

import { mapAuthError } from "@/lib/auth/errors";

const RESEND_COOLDOWN_SEC = 5;

function CheckEmailForm() {
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  const [devLink, setDevLink] = useState<string | null>(null);

  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    const link = sessionStorage.getItem("devConfirmationLink");
    const noticeText = sessionStorage.getItem("devConfirmationNotice");
    sessionStorage.removeItem("devConfirmationLink");
    sessionStorage.removeItem("devConfirmationNotice");
    queueMicrotask(() => {
      if (link) setDevLink(link);
      if (noticeText) setNotice(noticeText);
    });
  }, []);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = window.setTimeout(() => setCooldownSec((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSec]);

  const handleResend = async () => {
    if (!email) {
      setMessage("이메일 정보가 없습니다. 회원가입을 다시 진행해 주세요.");

      return;
    }

    if (cooldownSec > 0) return;

    setLoading(true);

    setMessage(null);

    setNotice(null);

    setDevLink(null);

    try {
      const { data, error } = await resendSignupConfirmation(email);

      if (error) throw error;

      setCooldownSec(RESEND_COOLDOWN_SEC);

      if (data?.devLink) {
        setDevLink(data.devLink);

        setNotice(
          data.message ?? "메일 한도에 걸려 테스트용 링크를 표시합니다. 아래 링크로 인증해 주세요."
        );
      } else {
        setNotice("인증 메일을 다시 보냈습니다.");
      }
    } catch (err) {
      const authErr =
        err && typeof err === "object"
          ? (err as { message?: string; code?: string; retryAfterMs?: number })
          : {};

      if (authErr.code === "resend_cooldown" && authErr.retryAfterMs) {
        setCooldownSec(Math.max(1, Math.ceil(authErr.retryAfterMs / 1000)));
      }

      setMessage(mapAuthError(authErr));
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading
    ? "발송 중..."
    : cooldownSec > 0
      ? `${cooldownSec}초 후 다시 보내기`
      : "인증 메일 다시 보내기";

  return (
    <AuthLayout
      title="이메일을 확인해 주세요"
      subtitle={
        devLink
          ? "메일 대신 아래 링크로 인증을 완료할 수 있습니다"
          : "가입을 완료하려면 메일함의 인증 링크를 눌러 주세요"
      }
      footer={
        <div className="mt-6 space-y-2 text-center text-sm text-gray-500">
          <Link href="/login" className="text-brand-600 font-semibold hover:underline">
            로그인으로 돌아가기
          </Link>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-gray-600">
        {devLink ? (
          <p className="text-center text-gray-600">
            <span className="font-semibold text-gray-800">{email || "입력하신 이메일"}</span>
            <br />
            아래 링크로 인증할 수 있습니다. 메일 앱에서 열어도 됩니다.
          </p>
        ) : email ? (
          <p className="text-center">
            <span className="font-semibold text-gray-800">{email}</span>
            <br />
            으로 인증 메일을 보냈습니다.
          </p>
        ) : (
          <p className="text-center">입력하신 이메일로 인증 메일을 보냈습니다.</p>
        )}

        <ul className="list-inside list-disc space-y-1 text-xs text-gray-500">
          <li>메일이 보이지 않으면 스팸함을 확인해 주세요.</li>

          <li>메일 링크를 누른 뒤 「이메일 인증 완료하기」 버튼을 눌러 주세요.</li>
          <li>가입한 브라우저와 같은 환경에서 링크를 여는 것이 가장 안정적입니다.</li>

          <li>인증 전에는 로그인할 수 없습니다.</li>

          <li>재발송 버튼은 {RESEND_COOLDOWN_SEC}초에 한 번 누를 수 있습니다.</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={handleResend}
        disabled={loading || !email || cooldownSec > 0}
        className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      {notice && (
        <p
          className={`text-center text-sm ${devLink ? "text-brand-700" : "text-green-600"}`}
          role="status"
        >
          {notice}
        </p>
      )}

      {devLink && (
        <div className="border-brand-200 bg-brand-50 space-y-3 rounded-xl border p-4 text-center">
          <p className="text-brand-800 text-sm font-medium">인증 링크</p>
          <a
            href={devLink}
            className="bg-brand-600 hover:bg-brand-700 inline-block w-full rounded-xl py-2.5 text-sm font-semibold text-white"
          >
            여기를 눌러 가입 완료하기
          </a>
          <p className="text-xs text-gray-500">메일의 링크가 안 되면 이 버튼을 사용해 주세요.</p>
        </div>
      )}

      {message && (
        <p className="text-center text-sm text-red-600" role="alert">
          {message}
        </p>
      )}
    </AuthLayout>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <CheckEmailForm />
    </Suspense>
  );
}
