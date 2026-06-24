"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import PhoneField, { isPhoneReady } from "@/components/PhoneField";
import { normalizePhone } from "@/lib/auth/phone";

function FindEmailForm() {
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneReady(phone) || nickname.trim().length < 2) {
      return;
    }

    setLoading(true);
    setResult(null);
    setNotFound(false);

    try {
      const res = await fetch("/api/auth/find-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          phone: normalizePhone(phone),
        }),
      });

      if (res.status === 429) {
        setNotFound(true);
        return;
      }

      const data = await res.json();
      if (data.found && data.email) {
        setResult(data.email);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="이메일 찾기"
      subtitle="가입 시 등록한 닉네임과 휴대폰 번호로 조회합니다"
      footer={
        <div className="text-center mt-6 space-y-2 text-sm text-gray-500">
          <p>
            소셜 로그인(카카오·네이버)은{" "}
            <Link href="/login" className="text-brand-600 hover:underline">
              해당 계정으로 로그인
            </Link>
            해 주세요.
          </p>
          <Link href="/login" className="text-brand-600 font-semibold hover:underline">
            로그인으로 돌아가기
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">닉네임</label>
          <input
            required
            minLength={2}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="가입 시 설정한 닉네임"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">휴대폰</label>
          <PhoneField
            value={phone}
            onChange={setPhone}
            inputClassName="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !isPhoneReady(phone) || nickname.trim().length < 2}
          className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "조회 중..." : "이메일 찾기"}
        </button>
      </form>

      {result && (
        <div className="text-center p-4 bg-brand-50 rounded-xl" role="status">
          <p className="text-xs text-gray-500 mb-1">등록된 이메일</p>
          <p className="text-lg font-bold text-brand-700">{result}</p>
        </div>
      )}

      {notFound && !result && (
        <p className="text-sm text-center text-gray-600" role="alert">
          일치하는 계정을 찾을 수 없습니다. 닉네임·휴대폰 번호를 확인해 주세요.
        </p>
      )}
    </AuthLayout>
  );
}

export default function FindEmailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <FindEmailForm />
    </Suspense>
  );
}
