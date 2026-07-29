"use client";

import { useAccessibility, FONT_SCALE_MIN, FONT_SCALE_MAX } from "@/context/AccessibilityContext";

const settingsConfig = [
  {
    key: "readAloud" as const,
    label: "음성 읽어주기",
    description: "포커스·마우스 올린 내용 음성 안내",
    toggle: "toggleReadAloud" as const
  },
  {
    key: "highContrast" as const,
    label: "고대비",
    description: "글자·테두리 대비 살짝 강화",
    toggle: "toggleHighContrast" as const
  },
  {
    key: "darkMode" as const,
    label: "다크모드",
    description: "어두운 테마",
    toggle: "toggleDarkMode" as const
  }
];

interface Props {
  onClose: () => void;
}

export default function AccessibilitySettings({ onClose }: Props) {
  const {
    readAloud,
    highContrast,
    darkMode,
    fontScale,
    toggleReadAloud,
    toggleHighContrast,
    toggleDarkMode,
    increaseFontScale,
    decreaseFontScale
  } = useAccessibility();

  const values = { readAloud, highContrast, darkMode };
  const toggles = {
    toggleReadAloud,
    toggleHighContrast,
    toggleDarkMode
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="접근성 설정"
        className="border-hairline absolute top-full right-4 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-white p-3 shadow-lg"
      >
        <p className="text-stone mb-2 px-1 text-xs font-semibold">접근성 설정</p>
        <div className="space-y-1">
          {settingsConfig.map(({ key, label, description, toggle }) => (
            <button
              key={key}
              type="button"
              onClick={toggles[toggle]}
              className="hover:bg-surface flex w-full items-center justify-between rounded-lg px-2 py-2 transition-colors"
              aria-pressed={values[key]}
            >
              <div className="text-left">
                <p className="text-ink text-sm font-medium">{label}</p>
                <p className="text-stone text-xs">{description}</p>
              </div>
              <div
                className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                  values[key] ? "bg-brand-500" : "bg-gray-200"
                }`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${
                    values[key] ? "left-5" : "left-1"
                  }`}
                />
              </div>
            </button>
          ))}

          <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2">
            <div className="text-left">
              <p className="text-ink text-sm font-medium">화면 확대</p>
              <p className="text-stone text-xs">텍스트 크기 조절</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={decreaseFontScale}
                disabled={fontScale <= FONT_SCALE_MIN}
                className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-lg font-bold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="화면 축소"
              >
                −
              </button>
              <span
                className="w-10 text-center text-sm font-semibold text-gray-800 tabular-nums"
                aria-live="polite"
              >
                {fontScale}%
              </span>
              <button
                type="button"
                onClick={increaseFontScale}
                disabled={fontScale >= FONT_SCALE_MAX}
                className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-lg font-bold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="화면 확대"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
