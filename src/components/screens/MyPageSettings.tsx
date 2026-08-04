"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, Palette, Accessibility, Monitor, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ProfileSection } from "@/components/screens/mypage-settings/ProfileSection";
import { ThemesSection } from "@/components/screens/mypage-settings/ThemesSection";
import { AccessibilityNeedsSection } from "@/components/screens/mypage-settings/AccessibilityNeedsSection";
import { DisplaySettingsSection } from "@/components/screens/mypage-settings/DisplaySettingsSection";
import { AccountSection } from "@/components/screens/mypage-settings/AccountSection";

const SECTIONS = [
  { key: "profile", label: "개인정보", icon: User },
  { key: "themes", label: "선호 테마", icon: Palette },
  { key: "accessibility", label: "여행 접근성", icon: Accessibility },
  { key: "display", label: "화면 설정", icon: Monitor },
  { key: "account", label: "계정", icon: Shield }
] as const;

export type SettingsSectionKey = (typeof SECTIONS)[number]["key"];

const SECTION_KEYS = new Set<string>(SECTIONS.map((s) => s.key));

function resolveSection(sectionParam: string | string[] | undefined): SettingsSectionKey {
  const raw =
    typeof sectionParam === "string"
      ? sectionParam
      : Array.isArray(sectionParam)
        ? sectionParam[0]
        : undefined;
  if (raw && SECTION_KEYS.has(raw)) return raw as SettingsSectionKey;
  return "profile";
}

function sectionHref(key: SettingsSectionKey) {
  return key === "profile" ? "/mypage/settings" : `/mypage/settings/${key}`;
}

export default function MyPageSettings() {
  const params = useParams();
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const section = resolveSection(params.section as string | string[] | undefined);
  const dirtyRef = useRef(false);
  const [, setDirtyTick] = useState(0);

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
    setDirtyTick((n) => n + 1);
  }, []);

  const confirmLeave = useCallback(() => {
    if (!dirtyRef.current) return true;
    return window.confirm("저장하지 않은 변경사항이 있습니다. 이동할까요?");
  }, []);

  const goSection = useCallback(
    (key: SettingsSectionKey) => {
      if (key === section) return;
      if (!confirmLeave()) return;
      dirtyRef.current = false;
      router.push(sectionHref(key));
    },
    [confirmLeave, router, section]
  );

  const goBack = useCallback(() => {
    if (!confirmLeave()) return;
    dirtyRef.current = false;
    router.push("/mypage");
  }, [confirmLeave, router]);

  const title = useMemo(() => SECTIONS.find((s) => s.key === section)?.label ?? "설정", [section]);

  if (authLoading) {
    return <div className="text-stone py-20 text-center text-sm">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="text-steel hover:bg-surface-soft inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          마이페이지
        </button>
        <span className="text-stone text-sm">/</span>
        <h1 className="text-ink text-lg font-bold">프로필 설정</h1>
      </div>

      <div
        className="border-hairline-soft flex overflow-hidden rounded-2xl border bg-white"
        style={{ minHeight: "min(70vh, 640px)" }}
      >
        <aside className="border-hairline-soft hidden w-52 shrink-0 flex-col gap-0.5 border-r px-3 py-5 md:flex">
          <p className="text-stone mb-2 px-3 text-[10px] font-bold tracking-widest uppercase">
            카테고리
          </p>
          {SECTIONS.map(({ key, label, icon: Icon }) => {
            const active = section === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => goSection(key)}
                className={`flex items-center gap-2.5 rounded-full px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  active
                    ? "bg-navy-50 text-navy-700"
                    : "text-steel hover:bg-surface-soft hover:text-ink"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-navy-600" : "text-stone"}`} />
                {label}
              </button>
            );
          })}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-hairline-soft flex gap-1 overflow-x-auto border-b px-3 py-2 md:hidden">
            {SECTIONS.map(({ key, label, icon: Icon }) => {
              const active = section === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => goSection(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    active ? "bg-navy-50 text-navy-700" : "text-steel hover:bg-surface-soft"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-auto px-4 py-5 md:px-6">
            <div className="mb-5">
              <h2 className="text-ink text-xl font-bold">{title}</h2>
              <p className="text-stone mt-1 text-sm">
                {section === "profile" && "닉네임, 성별, 나이대, 프로필 사진을 관리합니다."}
                {section === "themes" && "관심 테마를 다시 선택할 수 있습니다."}
                {section === "accessibility" && "여행·장소 추천에 반영할 접근성 니즈를 설정합니다."}
                {section === "display" && "다크모드, 글자 크기 등 화면 접근성 설정을 조정합니다."}
                {section === "account" && "이메일 확인, 비밀번호 변경, 로그아웃을 관리합니다."}
              </p>
            </div>

            {section === "profile" && <ProfileSection onDirtyChange={setDirty} />}
            {section === "themes" && <ThemesSection onDirtyChange={setDirty} />}
            {section === "accessibility" && <AccessibilityNeedsSection onDirtyChange={setDirty} />}
            {section === "display" && <DisplaySettingsSection />}
            {section === "account" && <AccountSection />}
          </div>
        </div>
      </div>

      <p className="text-stone text-center text-xs md:hidden">
        <button
          type="button"
          onClick={goBack}
          className="text-brand-600 underline-offset-2 hover:underline"
        >
          마이페이지로 돌아가기
        </button>
      </p>
    </div>
  );
}
