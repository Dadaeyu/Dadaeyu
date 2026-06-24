"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import NicknameField from "@/components/NicknameField";
import { getNicknameSubmitError, isNicknameAvailable, updateMember } from "@/lib/supabase/member";
import { getSafeNextPath, isEmailSignupMember } from "@/lib/auth/actions";
import {
  ageGroupFromLabel,
  genderFromLabel,
  type AgeGroup,
} from "@/lib/supabase/types";

const GENDERS = ["남성", "여성", "비공개"] as const;
const AGES = ["10대", "20대", "30대", "40대", "50대+"] as const;

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"), "/mypage");
  const { user, member, refreshMember, loading: authLoading } = useAuth();

  const skipNickname = isEmailSignupMember(member);

  const [nickname, setNickname] = useState("");
  const [genderLabel, setGenderLabel] = useState<typeof GENDERS[number]>("비공개");
  const [ageLabel, setAgeLabel] = useState<typeof AGES[number]>("30대");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nicknameCanSubmit, setNicknameCanSubmit] = useState(skipNickname);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    if (member?.nickname) {
      setNickname(member.nickname);
      setSetupError(null);
    }
  }, [member?.nickname]);

  useEffect(() => {
    if (skipNickname) {
      setNicknameCanSubmit(true);
    }
  }, [skipNickname]);

  useEffect(() => {
    if (authLoading || !user || member) return;

    fetch("/api/auth/ensure-member", { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          await refreshMember();
          return;
        }
        setSetupError("프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      })
      .catch(() => {
        setSetupError("프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      });
  }, [authLoading, user, member, refreshMember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmed = skipNickname ? (member?.nickname ?? nickname.trim()) : nickname.trim();

    if (!skipNickname) {
      const available = await isNicknameAvailable(trimmed, user.id);
      const validationError = getNicknameSubmitError(trimmed, available);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const patch: Parameters<typeof updateMember>[1] = {
        gender: genderFromLabel(genderLabel),
        age_group: ageGroupFromLabel(ageLabel) as AgeGroup,
        onboarding_completed: true,
      };
      if (!skipNickname) {
        patch.nickname = trimmed;
      }

      await updateMember(user.id, patch);
      await refreshMember();
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="py-20 text-center text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">프로필 설정</h1>
      <p className="text-sm text-gray-500 mb-6">
        {skipNickname
          ? "맞춤 추천을 위해 성별과 나이를 선택해 주세요."
          : "맞춤 추천을 위해 기본 정보를 입력해 주세요."}
      </p>

      {setupError && (
        <p className="text-sm text-red-600 mb-4" role="alert">{setupError}</p>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        {skipNickname ? (
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">닉네임</p>
            <p className="text-sm font-semibold text-gray-800">{member?.nickname}</p>
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">닉네임</label>
            <NicknameField
              value={nickname}
              onChange={setNickname}
              userId={user?.id}
              initialNickname={member?.nickname}
              onCanSubmitChange={setNicknameCanSubmit}
            />
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">성별</p>
          <div className="flex gap-2">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenderLabel(g)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                  genderLabel === g
                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">나이</p>
          <div className="flex flex-wrap gap-2">
            {AGES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAgeLabel(a)}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  ageLabel === a
                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={loading || !nicknameCanSubmit}
          className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "저장 중..." : "시작하기"}
        </button>
      </form>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <OnboardingForm />
    </Suspense>
  );
}
